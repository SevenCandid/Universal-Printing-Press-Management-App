'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { 
  ClockIcon, 
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import BreakTracker from '@/components/attendance/BreakTracker'
import LeaveRequestModal from '@/components/attendance/LeaveRequestModal'

// 📍 Office coordinates - Sampa
// Reference: https://maps.app.goo.gl/8jiRTLWJu2gCpKew7
const OFFICE_LOCATION = {
  latitude: 7.952755,  // Sampa office location (updated)
  longitude: -2.698595, // Sampa office location (updated)
  radius: 300, // meters allowed from office (300m = ~3 minute walk, accounts for GPS accuracy)
  maxAcceptableGPSAccuracy: 500, // meters - reject if GPS accuracy is worse than this
}

// 🔧 Development mode: Set to true to bypass location check for testing
const DEV_MODE = false // PRODUCTION MODE - GPS verification ENABLED with smart accuracy checks

// Utility: calculate distance between two coordinates (Haversine formula)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3 // meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // distance in meters
}

type AttendanceRecord = {
  id: string
  user_id: string
  check_in: string
  check_out?: string
  latitude: number
  longitude: number
  status: string
  created_at: string
  distance_from_office?: number
  gps_accuracy?: number
  checkout_distance?: number
  checkout_gps_accuracy?: number
  profiles?: {
    name?: string
    email?: string
    role?: string
  }
  activeBreak?: {
    id: string
    attendance_id: string
    user_id: string
    break_start: string
    break_end?: string
    break_type: string
    break_duration?: number
  } | null
  allBreaks?: any[]
  completedBreaks?: any[]
  totalBreakMinutes?: number
}

type StaffMember = {
  user_id: string
  name: string
  email: string
  role: string
}

type LeaveRequest = {
  id: string
  user_id: string
  request_type: string
  start_date: string
  end_date: string
  reason: string
  status: string
  reviewed_by?: string
  reviewed_at?: string
  reviewer_comments?: string
  created_at: string
  requester_name?: string
  requester_email?: string
  requester_role?: string
  reviewer_name?: string
  days_requested?: number
}

export default function AttendanceBase({ role }: { role: string }) {
  const { supabase, session } = useSupabase()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  
  // 🔍 Filter States
  const [periodFilter, setPeriodFilter] = useState<string>('today')
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)
  
  // 👥 Currently checked in staff (for CEO)
  const [currentlyCheckedIn, setCurrentlyCheckedIn] = useState<AttendanceRecord[]>([])
  
  // 📊 Attendance Statistics
  const [monthlyStats, setMonthlyStats] = useState<{ month: string; count: number; completed: number }[]>([])
  const [staffMonthlyStats, setStaffMonthlyStats] = useState<{ 
    staffName: string; 
    staffEmail: string;
    userId: string;
    stats: { month: string; daysCheckedIn: number; totalDays: number; percentage: number }[] 
  }[]>([])
  
  // Leave request modal
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  
  // 🗓️ Leave Request Management (CEO only)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [leaveRequestFilter, setLeaveRequestFilter] = useState<'pending' | 'all' | 'approved' | 'rejected'>('pending')
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const [showLeaveRequests, setShowLeaveRequests] = useState(false)

  // Helper: Check if user can view all staff (CEO only)
  const canViewAllStaff = () => role === 'ceo'

  // Helper: Handle JWT expiration by redirecting to login
  const handleJWTExpiration = async (error: any) => {
    if (error?.message?.includes('JWT') || error?.message?.includes('expired') || error?.code === 'PGRST301') {
      console.error('🔐 Session expired - redirecting to login')
      toast.error('Your session has expired. Please log in again.', { duration: 5000 })
      await supabase.auth.signOut()
      window.location.href = '/login'
      return true
    }
    return false
  }

  // 📊 Calculate monthly attendance statistics
  const calculateMonthlyStats = (records: AttendanceRecord[]) => {
    const monthlyData: { [key: string]: { count: number; completed: number } } = {}
    
    records.forEach(record => {
      const date = new Date(record.check_in)
      const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = { count: 0, completed: 0 }
      }
      
      monthlyData[monthYear].count++
      if (record.status === 'checked_out') {
        monthlyData[monthYear].completed++
      }
    })
    
    // Convert to array and sort by date (most recent first)
    const statsArray = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      count: data.count,
      completed: data.completed
    }))
    
    // Sort by date
    statsArray.sort((a, b) => {
      const dateA = new Date(a.month)
      const dateB = new Date(b.month)
      return dateB.getTime() - dateA.getTime()
    })
    
    return statsArray
  }

  // 📊 Calculate per-staff monthly attendance statistics (for CEO)
  const calculateStaffMonthlyStats = (records: AttendanceRecord[]) => {
    // Group by staff
    const staffData: { [userId: string]: { 
      name: string; 
      email: string;
      months: { [month: string]: Set<string> } 
    } } = {}
    
    records.forEach(record => {
      const userId = record.user_id
      const staffName = record.profiles?.name || 'Unknown'
      const staffEmail = record.profiles?.email || ''
      const checkInDate = new Date(record.check_in)
      const monthYear = checkInDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const dayOfMonth = checkInDate.toISOString().split('T')[0] // YYYY-MM-DD
      
      if (!staffData[userId]) {
        staffData[userId] = {
          name: staffName,
          email: staffEmail,
          months: {}
        }
      }
      
      if (!staffData[userId].months[monthYear]) {
        staffData[userId].months[monthYear] = new Set()
      }
      
      // Add unique day to the set
      staffData[userId].months[monthYear].add(dayOfMonth)
    })
    
    // Convert to array format
    const staffStatsArray = Object.entries(staffData).map(([userId, data]) => {
      const monthStats = Object.entries(data.months).map(([month, daysSet]) => {
        const daysCheckedIn = daysSet.size
        // Get total days in that month
        const [monthName, year] = month.split(' ')
        const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth()
        const totalDays = new Date(parseInt(year), monthIndex + 1, 0).getDate()
        const percentage = Math.round((daysCheckedIn / totalDays) * 100)
        
        return {
          month,
          daysCheckedIn,
          totalDays,
          percentage
        }
      })
      
      // Sort months by date (most recent first)
      monthStats.sort((a, b) => {
        const dateA = new Date(a.month)
        const dateB = new Date(b.month)
        return dateB.getTime() - dateA.getTime()
      })
      
      return {
        staffName: data.name,
        staffEmail: data.email,
        userId,
        stats: monthStats
      }
    })
    
    // Sort by staff name
    staffStatsArray.sort((a, b) => a.staffName.localeCompare(b.staffName))
    
    return staffStatsArray
  }

  useEffect(() => {
    if (session?.user) {
      fetchTodayRecord() // Always fetch today's record first
      fetchAttendance()
      if (canViewAllStaff()) {
        fetchStaffMembers()
        fetchCurrentlyCheckedIn()
        fetchLeaveRequests()
      }
    }
  }, [session])

  // Refetch when filters change
  useEffect(() => {
    if (session?.user) {
      fetchAttendance()
      // Don't refetch today's record when filters change - it's independent
      if (canViewAllStaff()) {
        fetchCurrentlyCheckedIn()
      }
    }
  }, [periodFilter, selectedStaff, customStartDate, customEndDate])
  
  // Refetch leave requests when filter changes
  useEffect(() => {
    if (canViewAllStaff() && session?.user) {
      fetchLeaveRequests()
    }
  }, [leaveRequestFilter])
  
  // Auto-refresh currently checked-in staff every 30 seconds (for CEO)
  useEffect(() => {
    if (!canViewAllStaff()) return
    
    const interval = setInterval(() => {
      fetchCurrentlyCheckedIn()
    }, 30000) // 30 seconds
    
    return () => clearInterval(interval)
  }, [session])

  // 👥 Fetch staff members (for managers/CEO)
  const fetchStaffMembers = async () => {
    if (!supabase) {
      console.log('⚠️ fetchStaffMembers skipped - supabase not ready')
      return
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .order('name', { ascending: true })

      if (error) throw error
      
      // Map id to user_id for consistency
      const mappedData = data?.map(staff => ({
        user_id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role
      })) || []
      
      setStaffMembers(mappedData)
    } catch (err: any) {
      console.error('Fetch staff error:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        fullError: err
      })
    }
  }

  // 👥 Fetch currently checked-in staff (for CEO real-time monitoring)
  const fetchCurrentlyCheckedIn = async () => {
    if (!supabase || !canViewAllStaff()) return
    
    try {
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('status', 'checked_in')
        .gte('check_in', todayStart.toISOString())
        .order('check_in', { ascending: false })
      
      if (error) {
        console.error('Error fetching currently checked in:', error)
        return
      }
      
      if (data && data.length > 0) {
        // Fetch profiles for each checked-in user
        const userIds = [...new Set(data.map(r => r.user_id))]
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, email, role')
          .in('id', userIds)
        
        // Fetch ALL breaks for checked-in users (both active and completed)
        const attendanceIds = data.map(r => r.id)
        const { data: breaksData } = await supabase
          .from('breaks')
          .select('*')
          .in('attendance_id', attendanceIds)
          .order('break_start', { ascending: false })
        
        if (profilesData) {
          const profilesMap = new Map(profilesData.map(p => [p.id, p]))
          
          // Group breaks by attendance_id
          const breaksGrouped = (breaksData || []).reduce((acc, breakItem) => {
            if (!acc[breakItem.attendance_id]) {
              acc[breakItem.attendance_id] = []
            }
            acc[breakItem.attendance_id].push(breakItem)
            return acc
          }, {} as Record<string, any[]>)
          
          const enrichedData = data.map(record => {
            const breaks = breaksGrouped[record.id] || []
            const activeBreak = breaks.find(b => !b.break_end) || null
            const completedBreaks = breaks.filter(b => b.break_end)
            
            // Calculate total break time
            const totalBreakMinutes = completedBreaks.reduce((acc, b) => {
              if (b.break_duration) return acc + b.break_duration
              if (b.break_end) {
                const duration = Math.floor(
                  (new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / (1000 * 60)
                )
                return acc + duration
              }
              return acc
            }, 0)
            
            return {
              ...record,
              profiles: profilesMap.get(record.user_id) || null,
              activeBreak,
              allBreaks: breaks,
              completedBreaks,
              totalBreakMinutes
            }
          })
          setCurrentlyCheckedIn(enrichedData)
          console.log('✅ Currently checked in:', enrichedData.length, 'staff')
        }
      } else {
        setCurrentlyCheckedIn([])
      }
    } catch (err) {
      console.error('Error in fetchCurrentlyCheckedIn:', err)
    }
  }

  // 📅 Fetch today's attendance record for current user (independent of filters)
  const fetchTodayRecord = async () => {
    if (!session?.user || !supabase) {
      console.log('⚠️ fetchTodayRecord skipped - session or supabase not ready:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasSupabase: !!supabase
      })
      return
    }
    
    try {
      // Get today's date in UTC with proper timezone handling
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      
      console.log('🔍 Fetching today\'s record for:', session.user.id)
      console.log('📅 Date range:', todayStart.toISOString(), 'to', todayEnd.toISOString())
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('check_in', todayStart.toISOString())
        .lte('check_in', todayEnd.toISOString())
        .order('check_in', { ascending: false })
        .limit(1)

      if (error) {
        console.error('❌ Error fetching today record:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        
        // Check for JWT expiration
        if (await handleJWTExpiration(error)) return
        return
      }

      if (data && data.length > 0) {
        console.log('✅ Today\'s record found:', data[0])
        setTodayRecord(data[0] as AttendanceRecord)
      } else {
        console.log('ℹ️ No record found for today')
        setTodayRecord(null)
      }
    } catch (err) {
      console.error('❌ Error in fetchTodayRecord:', err)
    }
  }

  // 📅 Get date range based on period filter
  const getDateRange = (): { startDate: string; endDate: string } => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = new Date()

    switch (periodFilter) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        endDate = new Date(now.setHours(23, 59, 59, 999))
        break
      case 'this_week':
        const firstDay = now.getDate() - now.getDay()
        startDate = new Date(now.setDate(firstDay))
        startDate.setHours(0, 0, 0, 0)
        break
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: customStartDate,
            endDate: customEndDate
          }
        }
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  const fetchAttendance = async () => {
    if (!session?.user || !supabase) {
      console.log('⚠️ fetchAttendance skipped - session or supabase not ready:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasSupabase: !!supabase
      })
      return
    }
    
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange()
      
      console.log('🔍 Fetching attendance...', {
        dateRange: `${startDate} to ${endDate}`,
        isCEO: canViewAllStaff(),
        selectedStaff
      })
      
      // Build query - Note: profiles join might fail if foreign key doesn't exist
      // Use check_in for date filtering (not created_at) to avoid timezone issues
      const startDateTime = new Date(`${startDate}T00:00:00`)
      const endDateTime = new Date(`${endDate}T23:59:59`)
      
      console.log('📅 Date range for query:', {
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString()
      })
      
      let query = supabase
        .from('attendance')
        .select('*')
        .gte('check_in', startDateTime.toISOString())
        .lte('check_in', endDateTime.toISOString())
        .order('check_in', { ascending: false })

      // For CEO, only show checked-out records in history (active check-ins shown separately)
      // For others, show all their records
      if (canViewAllStaff()) {
        console.log('📋 CEO view: Filtering for checked_out status only')
        query = query.eq('status', 'checked_out')
      }

      // Filter by user if not viewing all staff
      if (!canViewAllStaff()) {
        // Regular staff can only see their own attendance
        console.log('👤 Staff view: Filtering for user', session.user.id)
        query = query.eq('user_id', session.user.id)
      } else if (selectedStaff && selectedStaff !== 'all') {
        // CEO viewing a specific staff member
        console.log('👤 CEO view: Filtering for staff', selectedStaff)
        query = query.eq('user_id', selectedStaff)
      }
      // Otherwise show all staff (for CEO when selectedStaff === 'all')

      const { data, error } = await query
      
      if (!error) {
        console.log('✅ Fetched attendance records:', data?.length || 0, 'records')
        if (data && data.length > 0) {
          console.log('📋 Sample records:', data.slice(0, 3).map(r => ({
            id: r.id.substring(0, 8),
            user_id: r.user_id.substring(0, 8),
            status: r.status,
            check_in: r.check_in,
            check_out: r.check_out,
            created_at: r.created_at
          })))
        }
      }

      if (error) {
        console.error('❌ Query error:', error)
        
        // Check for JWT expiration
        if (await handleJWTExpiration(error)) return
        
        throw error
      }
      
      // Fetch profile data for each attendance record (if viewing all staff)
      let enrichedData = data || []
      if (canViewAllStaff() && data && data.length > 0) {
        try {
          // Get unique user IDs
          const userIds = [...new Set(data.map(r => r.user_id))]
          
          // Fetch profiles
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .in('id', userIds)
          
          if (!profilesError && profilesData) {
            // Create a map for quick lookup
            const profilesMap = new Map(profilesData.map(p => [p.id, p]))
            
            // Enrich attendance data with profile info
            enrichedData = data.map(record => ({
              ...record,
              profiles: profilesMap.get(record.user_id) || null
            }))
          }
        } catch (profileErr) {
          console.error('Error fetching profiles:', profileErr)
          // Continue with non-enriched data
        }
      }
      
      console.log('📊 Setting attendance state with', enrichedData.length, 'records')
      console.log('Records:', enrichedData.map(r => ({
        id: r.id.substring(0, 8),
        status: r.status,
        check_in: r.check_in,
        check_out: r.check_out
      })))
      
      setAttendance(enrichedData)
      
      // Calculate monthly statistics
      const stats = calculateMonthlyStats(enrichedData)
      setMonthlyStats(stats)
      console.log('📊 Monthly stats calculated:', stats)
      
      // Calculate per-staff monthly statistics (for CEO)
      if (canViewAllStaff()) {
        const staffStats = calculateStaffMonthlyStats(enrichedData)
        setStaffMonthlyStats(staffStats)
        console.log('📊 Per-staff monthly stats calculated:', staffStats)
      }
      
      // Note: todayRecord is now managed by fetchTodayRecord() separately
      // This keeps the filter-based attendance list and today's status independent
    } catch (err: any) {
      console.error('Fetch attendance error:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        fullError: err
      })
      
      // Check for JWT expiration
      if (await handleJWTExpiration(err)) {
        setLoading(false)
        return
      }
      
      // User-friendly error message
      if (err.code === '42P01') {
        toast.error('Attendance table not found. Please run the database setup.')
      } else if (err?.message) {
        toast.error(`Failed to load attendance: ${err.message}`)
      } else {
        toast.error('Failed to load attendance records')
      }
    } finally {
      setLoading(false)
    }
  }

  // 📥 Export to CSV
  const exportToCSV = () => {
    if (attendance.length === 0) {
      toast.error('No attendance records to export')
      return
    }

    try {
      // Create CSV header
      const headers = ['Date', 'Staff Name', 'Email', 'Check-In', 'Check-Out', 'Work Hours', 'Check-In Distance (m)', 'Check-In GPS (±m)', 'Check-Out Distance (m)', 'Check-Out GPS (±m)', 'Status']
      
      // Create CSV rows
      const rows = attendance.map(record => {
        const staffName = record.profiles?.name || 'Unknown'
        const email = record.profiles?.email || 'N/A'
        
        return [
          new Date(record.created_at).toLocaleDateString(),
          staffName,
          email,
          record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-',
          record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-',
          calculateWorkHours(record.check_in, record.check_out),
          record.distance_from_office ?? '-',
          record.gps_accuracy ?? '-',
          record.checkout_distance ?? '-',
          record.checkout_gps_accuracy ?? '-',
          record.status.replace('_', ' ').toUpperCase()
        ]
      })

      // Add statistics section if available
      let csvLines: string[] = []
      
      // Add per-staff monthly statistics (CEO only)
      if (canViewAllStaff() && staffMonthlyStats.length > 0) {
        csvLines.push('STAFF MONTHLY ATTENDANCE STATISTICS')
        csvLines.push('')
        csvLines.push('Staff Name,Email,Month,Days Checked In,Total Days,Attendance Rate')
        staffMonthlyStats.forEach(staff => {
          staff.stats.forEach(monthStat => {
            csvLines.push(`"${staff.staffName}","${staff.staffEmail}","${monthStat.month}",${monthStat.daysCheckedIn},${monthStat.totalDays},${monthStat.percentage}%`)
          })
        })
        csvLines.push('')
      }
      
      // Add overall monthly statistics
      if (monthlyStats.length > 0) {
        csvLines.push('MONTHLY ATTENDANCE STATISTICS')
        csvLines.push('')
        csvLines.push('Month,Total Check-ins,Completed,Active,Completion Rate')
        monthlyStats.forEach(stat => {
          const completionRate = Math.round((stat.completed / stat.count) * 100)
          csvLines.push(`"${stat.month}",${stat.count},${stat.completed},${stat.count - stat.completed},${completionRate}%`)
        })
        csvLines.push('')
      }
      
      csvLines.push('DETAILED ATTENDANCE RECORDS')
      csvLines.push('')
      
      // Combine headers and rows
      csvLines.push(headers.join(','))
      csvLines.push(...rows.map(row => row.map(cell => `"${cell}"`).join(',')))
      
      const csvContent = csvLines.join('\n')

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      
      const { startDate, endDate } = getDateRange()
      const filename = `attendance_${startDate}_to_${endDate}.csv`
      
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('✅ Attendance exported to CSV!')
    } catch (err) {
      console.error('CSV export error:', err)
      toast.error('Failed to export CSV')
    }
  }

  // 📄 Export to PDF
  const exportToPDF = async () => {
    if (attendance.length === 0) {
      toast.error('No attendance records to export')
      return
    }

    try {
      const doc = new jsPDF()
      const { startDate, endDate } = getDateRange()

      // Add company branding header with logo
      try {
        // Load logo image
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        
        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => {
            try {
              // Calculate aspect ratio to prevent stretching
              const logoWidth = 25 // Base width in mm
              const aspectRatio = logoImg.width / logoImg.height
              const logoHeight = logoWidth / aspectRatio
              
              doc.addImage(logoImg, 'PNG', 14, 10, logoWidth, logoHeight)
              console.log(`Logo added: ${logoImg.width}x${logoImg.height}px, aspect ratio: ${aspectRatio.toFixed(2)}`)
              resolve()
            } catch (err) {
              console.log('Error adding logo to PDF:', err)
              resolve() // Still resolve to continue without logo
            }
          }
          logoImg.onerror = () => {
            console.log('Logo image failed to load')
            resolve() // Continue without logo
          }
          logoImg.src = '/assets/logo/UPPLOGO.png'
        })
      } catch (error) {
        console.log('Logo could not be loaded:', error)
      }
      
      // Add company name next to logo
      doc.setFontSize(20)
      doc.setTextColor(0, 0, 0)
      doc.text('Universal Printing Press', 48, 18)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text('Attendance Management System', 48, 25)
      
      // Add separator line
      doc.setDrawColor(200, 200, 200)
      doc.line(14, 35, 196, 35)
      
      // Add report title
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(18)
      doc.text('Attendance Report', 14, 48)
      
      // Add period info
      doc.setFontSize(11)
      doc.setTextColor(80, 80, 80)
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 58)
      
      // Add staff filter info if applicable
      if (selectedStaff && selectedStaff !== 'all') {
        const staff = staffMembers.find(s => s.user_id === selectedStaff)
        if (staff) {
          doc.text(`Staff: ${staff.name}`, 14, 64)
        }
      }

      // Add Per-Staff Monthly Statistics (CEO Only)
      let statsStartY = selectedStaff && selectedStaff !== 'all' ? 71 : 65
      if (canViewAllStaff() && staffMonthlyStats.length > 0) {
        doc.setFontSize(12)
        doc.text('Staff Monthly Attendance Statistics', 14, statsStartY)
        
        const staffStatsData: any[] = []
        staffMonthlyStats.forEach(staff => {
          staff.stats.forEach(monthStat => {
            staffStatsData.push([
              staff.staffName,
              monthStat.month,
              `${monthStat.daysCheckedIn}/${monthStat.totalDays}`,
              `${monthStat.percentage}%`
            ])
          })
        })
        
        autoTable(doc, {
          head: [['Staff Name', 'Month', 'Days Checked In', 'Attendance Rate']],
          body: staffStatsData,
          startY: statsStartY + 4,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [14, 165, 233] }, // Sky blue
          margin: { left: 14, right: 14 }
        })
        
        statsStartY = (doc as any).lastAutoTable.finalY + 10
      }
      
      // Add Monthly Statistics Summary (overall)
      if (monthlyStats.length > 0) {
        doc.setFontSize(12)
        doc.text('Monthly Statistics', 14, statsStartY)
        
        const statsData = monthlyStats.map(stat => [
          stat.month,
          stat.count.toString(),
          stat.completed.toString(),
          (stat.count - stat.completed).toString(),
          `${Math.round((stat.completed / stat.count) * 100)}%`
        ])
        
        autoTable(doc, {
          head: [['Month', 'Total Check-ins', 'Completed', 'Active', 'Completion Rate']],
          body: statsData,
          startY: statsStartY + 4,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [16, 185, 129] }, // Green
          margin: { left: 14, right: 14 }
        })
        
        statsStartY = (doc as any).lastAutoTable.finalY + 10
      }

      // Prepare table data
      const tableData = attendance.map(record => [
        new Date(record.created_at).toLocaleDateString(),
        record.profiles?.name || 'Unknown',
        record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-',
        record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-',
        calculateWorkHours(record.check_in, record.check_out),
        record.distance_from_office ? `${record.distance_from_office}m (±${record.gps_accuracy || '?'}m)` : '-',
        record.checkout_distance ? `${record.checkout_distance}m (±${record.checkout_gps_accuracy || '?'}m)` : '-',
        record.status.replace('_', ' ').toUpperCase()
      ])

      // Add section header for detailed records
      doc.setFontSize(12)
      doc.text('Detailed Attendance Records', 14, monthlyStats.length > 0 ? statsStartY : (selectedStaff && selectedStaff !== 'all' ? 44 : 38))
      
      // Generate table
      autoTable(doc, {
        head: [['Date', 'Staff', 'In', 'Out', 'Hours', 'In Loc', 'Out Loc', 'Status']],
        body: tableData,
        startY: monthlyStats.length > 0 ? statsStartY + 4 : (selectedStaff && selectedStaff !== 'all' ? 50 : 44),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [59, 130, 246] }, // Primary blue
        columnStyles: {
          0: { cellWidth: 20 }, // Date
          1: { cellWidth: 25 }, // Staff
          2: { cellWidth: 18 }, // Check-In
          3: { cellWidth: 18 }, // Check-Out
          4: { cellWidth: 16 }, // Hours
          5: { cellWidth: 30 }, // In Location
          6: { cellWidth: 30 }, // Out Location
          7: { cellWidth: 18 }, // Status
        }
      })

      // Add footer
      const pageCount = (doc as any).internal.getNumberOfPages()
      doc.setFontSize(10)
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        )
      }

      // Save PDF
      const filename = `attendance_${startDate}_to_${endDate}.pdf`
      doc.save(filename)

      toast.success('✅ Attendance exported to PDF!')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Failed to export PDF')
    }
  }

  const handleCheckIn = async () => {
    if (!session?.user) {
      toast.error('Please sign in first')
      return
    }

    setCheckingIn(true)
    toast.loading('📍 Verifying your location...', { id: 'location-check' })

    if (!navigator.geolocation) {
      toast.dismiss('location-check')
      toast.error('Geolocation is not supported by your browser')
      setCheckingIn(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        
        // 🔍 Debug logging
        console.log('📍 Your Location:', { 
          latitude, 
          longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed
        })
        console.log('🏢 Office Location:', OFFICE_LOCATION)
        
        const distance = getDistance(
          latitude,
          longitude,
          OFFICE_LOCATION.latitude,
          OFFICE_LOCATION.longitude
        )
        
        console.log('📏 Calculated Distance:', Math.round(distance), 'meters')
        console.log('🎯 GPS Accuracy:', Math.round(pos.coords.accuracy), 'meters')
        
        // ⚠️ Check GPS accuracy first - reject if too poor
        if (pos.coords.accuracy > OFFICE_LOCATION.maxAcceptableGPSAccuracy) {
          toast.dismiss('location-check')
          setCheckingIn(false)
          toast.error(
            `📡 GPS signal too weak!\n\nYour GPS accuracy: ±${Math.round(pos.coords.accuracy)}m\nRequired: Better than ±${OFFICE_LOCATION.maxAcceptableGPSAccuracy}m\n\n💡 Tips:\n- Move closer to a window\n- Go outdoors briefly\n- Enable high-accuracy mode\n- Restart your device GPS`,
            { duration: 10000 }
          )
          console.error('❌ Check-in failed: GPS accuracy too poor', {
            gpsAccuracy: Math.round(pos.coords.accuracy),
            maxAcceptable: OFFICE_LOCATION.maxAcceptableGPSAccuracy,
            coordinates: { latitude, longitude }
          })
          return
        }

        // 📊 Alert if GPS accuracy is moderate (warning, but allow)
        if (pos.coords.accuracy > 100) {
          console.warn('⚠️ WARNING: Moderate GPS accuracy', pos.coords.accuracy, 'meters')
          toast('⚠️ GPS accuracy is moderate. For best results, move closer to a window.', { 
            duration: 4000,
            icon: '📡'
          })
        }

        // 🎯 Location verification (ALWAYS ENFORCED when DEV_MODE = false)
        if (!DEV_MODE && distance > OFFICE_LOCATION.radius) {
          toast.dismiss('location-check')
          setCheckingIn(false)
          
          // Calculate if GPS uncertainty could account for the distance
          const uncertaintyRange = distance - pos.coords.accuracy
          const suggestRetry = pos.coords.accuracy > 50
          
          toast.error(
            `🚫 Check-in denied!\n\nYou must be at the workplace to check in.\n\nRequired: Within ${OFFICE_LOCATION.radius}m of office\nYour distance: ${Math.round(distance)}m away\nGPS Accuracy: ±${Math.round(pos.coords.accuracy)}m${suggestRetry ? '\n\n💡 Try again for better GPS accuracy' : ''}`,
            { duration: 8000 }
          )
          console.error('❌ Check-in failed: Too far from office', {
            required: OFFICE_LOCATION.radius,
            actual: Math.round(distance),
            gpsAccuracy: Math.round(pos.coords.accuracy),
            uncertaintyRange: Math.round(uncertaintyRange),
            yourLocation: { latitude, longitude },
            officeLocation: { 
              latitude: OFFICE_LOCATION.latitude, 
              longitude: OFFICE_LOCATION.longitude 
            }
          })
          return
        }
        
        toast.dismiss('location-check')
        
        console.log('✅ Location verified - proceeding with check-in', {
          distance: Math.round(distance),
          withinRadius: true
        })

        try {
          console.log('🔄 Attempting check-in...', {
            userId: session.user.id,
            distance: Math.round(distance),
            gpsAccuracy: Math.round(pos.coords.accuracy)
          })

          const { data, error } = await supabase
            .from('attendance')
            .insert([
              {
                user_id: session.user.id,
                check_in: new Date().toISOString(),
                latitude,
                longitude,
                status: 'checked_in',
                distance_from_office: Math.round(distance),
                gps_accuracy: Math.round(pos.coords.accuracy),
              },
            ])
            .select()

          if (error) {
            console.error('❌ Check-in error details:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            })
            
            // User-friendly error messages
            if (error.code === '42P01') {
              throw new Error('Attendance table not found. Please run ATTENDANCE_FIX_ALL_ROLES.sql')
            } else if (error.code === '42501') {
              throw new Error('Permission denied. Please run ATTENDANCE_FIX_ALL_ROLES.sql in Supabase SQL Editor.')
            } else if (error.message?.includes('attendance_status_check') || error.message?.includes('check constraint')) {
              throw new Error('Database constraint error. Please run ATTENDANCE_FIX_ALL_ROLES.sql')
            } else {
              throw new Error(error.message || 'Failed to record attendance')
            }
          }

          console.log('✅ Check-in successful! Data returned:', data)

          // Immediately set today's record with the returned data
          if (data && data.length > 0) {
            const newRecord = data[0] as AttendanceRecord
            console.log('📝 Setting todayRecord state with:', newRecord)
            setTodayRecord(newRecord)
            console.log('✅ todayRecord state updated!')
          } else {
            console.warn('⚠️ No data returned from insert, will fetch manually')
            // Fetch the record we just created
            const today = new Date().toISOString().split('T')[0]
            const { data: fetchedData } = await supabase
              .from('attendance')
              .select('*')
              .eq('user_id', session.user.id)
              .gte('created_at', `${today}T00:00:00`)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
            
            if (fetchedData) {
              console.log('📝 Fetched today record:', fetchedData)
              setTodayRecord(fetchedData as AttendanceRecord)
            }
          }

          toast.success(
            `✅ Checked in successfully!\n\n📍 Location verified: ${Math.round(distance)}m from office\n🎯 GPS accuracy: ±${Math.round(pos.coords.accuracy)}m`,
            { duration: 4000 }
          )
          
          // Force refresh to ensure data is updated
          console.log('🔄 Refreshing all attendance data...')
          await fetchTodayRecord()
          await fetchAttendance()
          
          // Refresh currently checked-in list if CEO
          if (canViewAllStaff()) {
            await fetchCurrentlyCheckedIn()
            console.log('🔄 Currently checked-in list refreshed')
          }
          
          // Small delay to ensure database is updated, then refetch again
          setTimeout(() => {
            console.log('🔄 Final refresh...')
            fetchTodayRecord()
            fetchAttendance()
            if (canViewAllStaff()) {
              fetchCurrentlyCheckedIn()
            }
            console.log('🔄 Refresh completed')
          }, 500)
        } catch (err: any) {
          console.error('❌ Check-in error:', err)
          toast.error(err.message || 'Failed to check in')
        } finally {
          setCheckingIn(false)
        }
      },
      (err) => {
        toast.dismiss('location-check')
        console.error('Geolocation error:', err)
        console.error('Error code:', err.code, 'Message:', err.message)
        
        let errorMessage = 'Failed to get your location.'
        
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage = '🚫 Location access denied!\n\nPlease enable location permissions in your browser settings to check in.'
            break
          case err.POSITION_UNAVAILABLE:
            errorMessage = '📍 Location unavailable!\n\nYour device cannot determine your location. Please try again.'
            break
          case err.TIMEOUT:
            errorMessage = '⏱️ Location request timed out!\n\nPlease check your GPS/location settings and try again.'
            break
          default:
            errorMessage = '❌ Location error!\n\nPlease enable location services and try again.'
        }
        
        toast.error(errorMessage, { duration: 6000 })
        setCheckingIn(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout for better reliability
        maximumAge: 0
      }
    )
  }

  const handleCheckOut = async () => {
    if (!session?.user) {
      toast.error('Please sign in first')
      return
    }

    setCheckingOut(true)
    toast.loading('📍 Verifying your location...', { id: 'location-check-out' })

    try {
      const { data: lastRecord, error: fetchError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'checked_in')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError || !lastRecord) {
        toast.dismiss('location-check-out')
        setCheckingOut(false)
        toast.error('No active check-in found.')
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          
          // 🔍 Debug logging for checkout
          console.log('📍 Your Location (Check-out):', { 
            latitude, 
            longitude,
            accuracy: pos.coords.accuracy,
            altitude: pos.coords.altitude
          })
          console.log('🏢 Office Location:', OFFICE_LOCATION)
          
          const distance = getDistance(
            latitude,
            longitude,
            OFFICE_LOCATION.latitude,
            OFFICE_LOCATION.longitude
          )
          
          console.log('📏 Calculated Distance (Check-out):', Math.round(distance), 'meters')
          console.log('🎯 GPS Accuracy:', Math.round(pos.coords.accuracy), 'meters')
          
          // ⚠️ Check GPS accuracy first - reject if too poor
          if (pos.coords.accuracy > OFFICE_LOCATION.maxAcceptableGPSAccuracy) {
            toast.dismiss('location-check-out')
            setCheckingOut(false)
            toast.error(
              `📡 GPS signal too weak!\n\nYour GPS accuracy: ±${Math.round(pos.coords.accuracy)}m\nRequired: Better than ±${OFFICE_LOCATION.maxAcceptableGPSAccuracy}m\n\n💡 Tips:\n- Move closer to a window\n- Go outdoors briefly\n- Enable high-accuracy mode\n- Restart your device GPS`,
              { duration: 10000 }
            )
            console.error('❌ Check-out failed: GPS accuracy too poor', {
              gpsAccuracy: Math.round(pos.coords.accuracy),
              maxAcceptable: OFFICE_LOCATION.maxAcceptableGPSAccuracy,
              coordinates: { latitude, longitude }
            })
            return
          }

          // 📊 Alert if GPS accuracy is moderate (warning, but allow)
          if (pos.coords.accuracy > 100) {
            console.warn('⚠️ WARNING: Moderate GPS accuracy', pos.coords.accuracy, 'meters')
            toast('⚠️ GPS accuracy is moderate. For best results, move closer to a window.', { 
              duration: 4000,
              icon: '📡'
            })
          }

          // 🎯 Location verification (ALWAYS ENFORCED when DEV_MODE = false)
          if (!DEV_MODE && distance > OFFICE_LOCATION.radius) {
            toast.dismiss('location-check-out')
            setCheckingOut(false)
            
            // Calculate if GPS uncertainty could account for the distance
            const uncertaintyRange = distance - pos.coords.accuracy
            const suggestRetry = pos.coords.accuracy > 50
            
            toast.error(
              `🚫 Check-out denied!\n\nYou must be at the workplace to check out.\n\nRequired: Within ${OFFICE_LOCATION.radius}m of office\nYour distance: ${Math.round(distance)}m away\nGPS Accuracy: ±${Math.round(pos.coords.accuracy)}m${suggestRetry ? '\n\n💡 Try again for better GPS accuracy' : ''}`,
              { duration: 8000 }
            )
            console.error('❌ Check-out failed: Too far from office', {
              required: OFFICE_LOCATION.radius,
              actual: Math.round(distance),
              gpsAccuracy: Math.round(pos.coords.accuracy),
              uncertaintyRange: Math.round(uncertaintyRange),
              yourLocation: { latitude, longitude },
              officeLocation: { 
                latitude: OFFICE_LOCATION.latitude, 
                longitude: OFFICE_LOCATION.longitude 
              }
            })
            return
          }
          
          toast.dismiss('location-check-out')
          
          console.log('✅ Location verified - proceeding with check-out', {
            distance: Math.round(distance),
            withinRadius: true
          })

          try {
            const checkOutTime = new Date().toISOString()
            const { error } = await supabase
              .from('attendance')
              .update({
                check_out: checkOutTime,
                status: 'checked_out',
                checkout_distance: Math.round(distance),
                checkout_gps_accuracy: Math.round(pos.coords.accuracy),
              })
              .eq('id', lastRecord.id)

            if (error) {
              console.error('Check-out error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
              })
              throw new Error(error.message || 'Failed to update attendance')
            }

            console.log('✅ Check-out successful')

            // Immediately update today's record with checkout data
            if (todayRecord && todayRecord.id === lastRecord.id) {
              setTodayRecord({
                ...todayRecord,
                check_out: checkOutTime,
                status: 'checked_out',
                checkout_distance: Math.round(distance),
                checkout_gps_accuracy: Math.round(pos.coords.accuracy),
              })
              console.log('📝 Today record updated immediately with checkout')
            }

            toast.success(
              `✅ Checked out successfully!\n\n📍 Location verified: ${Math.round(distance)}m from office\n🎯 GPS accuracy: ±${Math.round(pos.coords.accuracy)}m`,
              { duration: 4000 }
            )
            
            // Force refresh to ensure data is updated
            console.log('🔄 Refreshing all attendance data...')
            await fetchTodayRecord()
            await fetchAttendance()
            
            // Refresh currently checked-in list if CEO
            if (canViewAllStaff()) {
              await fetchCurrentlyCheckedIn()
              console.log('🔄 Currently checked-in list refreshed')
            }
            
            // Small delay to ensure database is updated, then refetch again
            setTimeout(() => {
              fetchTodayRecord()
              fetchAttendance()
              if (canViewAllStaff()) {
                fetchCurrentlyCheckedIn()
              }
              console.log('🔄 Final refresh completed')
            }, 500)
          } catch (err: any) {
            console.error('Check-out error:', err)
            toast.error(err.message || 'Failed to check out')
          } finally {
            setCheckingOut(false)
          }
        },
        (err) => {
          toast.dismiss('location-check-out')
          console.error('Geolocation error:', err)
          console.error('Error code:', err.code, 'Message:', err.message)
          
          let errorMessage = 'Failed to get your location.'
          
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = '🚫 Location access denied!\n\nPlease enable location permissions in your browser settings to check out.'
              break
            case err.POSITION_UNAVAILABLE:
              errorMessage = '📍 Location unavailable!\n\nYour device cannot determine your location. Please try again.'
              break
            case err.TIMEOUT:
              errorMessage = '⏱️ Location request timed out!\n\nPlease check your GPS/location settings and try again.'
              break
            default:
              errorMessage = '❌ Location error!\n\nPlease enable location services and try again.'
          }
          
          toast.error(errorMessage, { duration: 6000 })
          setCheckingOut(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 15000, // Increased timeout for better reliability
          maximumAge: 0
        }
      )
    } catch (err: any) {
      console.error('Check-out error:', err)
      toast.error('Failed to check out')
      setCheckingOut(false)
    }
  }

  const calculateWorkHours = (checkIn: string, checkOut?: string) => {
    if (!checkOut) return '-'
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  // 🗓️ Fetch leave requests (CEO only)
  const fetchLeaveRequests = async () => {
    if (!supabase || !canViewAllStaff()) return

    try {
      let query = supabase
        .from('leave_requests_detailed')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filter
      if (leaveRequestFilter !== 'all') {
        query = query.eq('status', leaveRequestFilter)
      }

      const { data, error } = await query

      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist, silently fail
          console.warn('Leave requests table not found. Run ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql')
          setLeaveRequests([])
          return
        }
        throw error
      }

      setLeaveRequests((data || []) as LeaveRequest[])
    } catch (err: any) {
      console.error('Fetch leave requests error:', err)
      toast.error('Failed to load leave requests')
    }
  }

  // 🗓️ Handle approve/reject leave request
  const handleLeaveRequestAction = async (
    requestId: string,
    action: 'approved' | 'rejected',
    comments?: string
  ) => {
    if (!supabase || !session?.user) return

    setProcessingRequest(requestId)
    try {
      const updateData: any = {
        status: action,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      }

      if (comments) {
        updateData.reviewer_comments = comments.trim()
      }

      const { error } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId)

      if (error) throw error

      toast.success(`✅ Request ${action === 'approved' ? 'approved' : 'rejected'}`)
      
      // Refresh leave requests
      await fetchLeaveRequests()
      
      // Create notification for the requester
      const request = leaveRequests.find(r => r.id === requestId)
      if (request) {
        try {
          await supabase.from('notifications').insert({
            title: action === 'approved' ? '✅ Leave Request Approved' : '❌ Leave Request Rejected',
            message: `Your ${request.request_type.replace('_', ' ')} request (${new Date(request.start_date).toLocaleDateString()} - ${new Date(request.end_date).toLocaleDateString()}) has been ${action === 'approved' ? 'approved' : 'rejected'}`,
            type: 'leave_update',
            link: '/attendance',
            user_role: 'all',
            read: false,
          })
        } catch (notifErr) {
          // Silently fail if notifications don't work
          console.warn('Failed to create notification:', notifErr)
        }
      }
    } catch (err: any) {
      console.error('Leave request action error:', err)
      toast.error(err.message || `Failed to ${action} request`)
    } finally {
      setProcessingRequest(null)
    }
  }

  // Helper: Get request type emoji
  const getRequestTypeEmoji = (type: string) => {
    switch (type) {
      case 'holiday': return '🏖️'
      case 'sick_leave': return '🤒'
      case 'emergency': return '🚨'
      case 'personal': return '👤'
      case 'excuse': return '📝'
      default: return '📅'
    }
  }

  // Helper: Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800'
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800'
      case 'cancelled':
        return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-800'
      default:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800'
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Smart Attendance</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {canViewAllStaff() 
              ? 'Monitor and manage staff attendance records' 
              : 'Track your work hours, breaks, and leave requests'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canViewAllStaff() && (
            <Button
              onClick={() => setShowLeaveModal(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 bg-primary/5 border-primary/30 hover:bg-primary/10"
            >
              <CalendarDaysIcon className="h-3.5 w-3.5" />
              <span className="text-xs">Leave Request</span>
            </Button>
          )}
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <FunnelIcon className="h-3.5 w-3.5" />
            <span className="text-xs">Filters</span>
          </Button>
          <ClockIcon className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* 🔍 Filters Section */}
      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Period Filter */}
            <div>
              <label className="block text-xs font-medium mb-1.5">Period</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Staff Filter (for managers/CEO) */}
            {canViewAllStaff() && (
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  <UserGroupIcon className="h-3.5 w-3.5 inline mr-1" />
                  Staff Member
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="all">All Staff</option>
                  {staffMembers.map((staff) => (
                    <option key={staff.user_id} value={staff.user_id}>
                      {staff.name} ({staff.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Date Range */}
            {periodFilter === 'custom' && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Export:</span>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-7 text-xs px-2.5"
              disabled={attendance.length === 0}
            >
              <ArrowDownTrayIcon className="h-3 w-3" />
              CSV
            </Button>
            <Button
              onClick={exportToPDF}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-7 text-xs px-2.5"
              disabled={attendance.length === 0}
            >
              <ArrowDownTrayIcon className="h-3 w-3" />
              PDF
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {attendance.length} record{attendance.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Today's Attendance and Breaks Grid - Only for staff who need to check in/out */}
      {!canViewAllStaff() && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Today's Status Card */}
          <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1.5">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Daily Attendance</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>

        {todayRecord ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="border border-border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Check-In</p>
                <p className="text-base font-semibold text-green-600">
                  {todayRecord.check_in ? new Date(todayRecord.check_in).toLocaleTimeString() : '-'}
                </p>
                {todayRecord.distance_from_office !== undefined && todayRecord.distance_from_office !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {todayRecord.distance_from_office}m away
                  </p>
                )}
                {todayRecord.gps_accuracy !== undefined && todayRecord.gps_accuracy !== null && (
                  <p className="text-xs text-muted-foreground">
                    🎯 ±{todayRecord.gps_accuracy}m accuracy
                  </p>
                )}
              </div>
              <div className="border border-border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Check-Out</p>
                <p className="text-base font-semibold text-blue-600">
                  {todayRecord.check_out ? new Date(todayRecord.check_out).toLocaleTimeString() : '-'}
                </p>
                {todayRecord.checkout_distance !== undefined && todayRecord.checkout_distance !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    📍 {todayRecord.checkout_distance}m away
                  </p>
                )}
                {todayRecord.checkout_gps_accuracy !== undefined && todayRecord.checkout_gps_accuracy !== null && (
                  <p className="text-xs text-muted-foreground">
                    🎯 ±{todayRecord.checkout_gps_accuracy}m accuracy
                  </p>
                )}
              </div>
              <div className="border border-border rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Work Hours</p>
                <p className="text-base font-semibold">
                  {calculateWorkHours(todayRecord.check_in, todayRecord.check_out)}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="mb-4 p-3 bg-muted/30 border border-border rounded-md text-center">
            <p className="text-xs text-muted-foreground">No attendance record for today</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleCheckIn}
            disabled={checkingIn || (todayRecord?.status === 'checked_in')}
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 text-white h-9"
          >
            <CheckCircleIcon className="h-4 w-4 mr-1.5" />
            <span className="text-sm">{checkingIn ? 'Checking In...' : 'Check In'}</span>
          </Button>
          <Button
            onClick={handleCheckOut}
            disabled={checkingOut || !todayRecord || todayRecord.status === 'checked_out'}
            size="sm"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-9"
          >
            <XCircleIcon className="h-4 w-4 mr-1.5" />
            <span className="text-sm">{checkingOut ? 'Checking Out...' : 'Check Out'}</span>
          </Button>
        </div>

          <div className="mt-3 flex items-start space-x-1.5 text-xs">
            <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-green-600" />
            <p className="leading-relaxed">
              <span className="text-green-600 font-medium">
                🔒 Smart GPS Verification ACTIVE
              </span>
              <br />
              <span className="text-muted-foreground">
                Within {OFFICE_LOCATION.radius}m of office required • GPS accuracy must be better than ±{OFFICE_LOCATION.maxAcceptableGPSAccuracy}m
              </span>
            </p>
          </div>
        </div>

        {/* Break Tracker */}
        <BreakTracker 
          attendanceId={todayRecord?.id || null}
          userId={session?.user?.id || ''}
          isCheckedIn={todayRecord?.status === 'checked_in'}
        />
      </div>
      )}

      {/* 🗓️ Leave Requests Management - CEO Only */}
      {canViewAllStaff() && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">Leave Requests Management</h2>
            </div>
            <Button
              onClick={() => setShowLeaveRequests(!showLeaveRequests)}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-7 text-xs"
            >
              {showLeaveRequests ? 'Hide' : 'Show'} Requests
              {leaveRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-full text-[10px] font-bold">
                  {leaveRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </Button>
          </div>

          {showLeaveRequests && (
            <>
              {/* Filter Tabs */}
              <div className="flex gap-2 mb-4 border-b border-border">
                {(['pending', 'all', 'approved', 'rejected'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLeaveRequestFilter(filter)}
                    className={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                      leaveRequestFilter === filter
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {filter === 'pending' && (
                      <span className="relative">
                        Pending
                        {leaveRequests.filter(r => r.status === 'pending').length > 0 && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-500 text-white rounded-full text-[10px]">
                            {leaveRequests.filter(r => r.status === 'pending').length}
                          </span>
                        )}
                      </span>
                    )}
                    {filter === 'all' && 'All Requests'}
                    {filter === 'approved' && 'Approved'}
                    {filter === 'rejected' && 'Rejected'}
                  </button>
                ))}
              </div>

              {/* Leave Requests List */}
              {leaveRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDaysIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {leaveRequestFilter === 'pending'
                      ? 'No pending leave requests'
                      : `No ${leaveRequestFilter} leave requests`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveRequests.map((request) => {
                    const daysRequested = request.days_requested || 
                      Math.ceil((new Date(request.end_date).getTime() - new Date(request.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
                    const isPending = request.status === 'pending'
                    
                    return (
                      <div
                        key={request.id}
                        className={`border rounded-lg p-4 transition-all ${
                          isPending
                            ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
                            : 'border-border bg-card hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold">
                              {request.requester_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm truncate">
                                  {request.requester_name || 'Unknown'}
                                </h4>
                                <span className="text-2xl">{getRequestTypeEmoji(request.request_type)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {request.requester_email || ''}
                              </p>
                              {request.requester_role && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-muted text-xs rounded-full">
                                  {request.requester_role}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(request.status)}`}>
                            {request.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Request Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div className="bg-background rounded-md p-2 border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Type</p>
                            <p className="text-sm font-medium capitalize">
                              {request.request_type.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="bg-background rounded-md p-2 border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                            <p className="text-sm font-medium">
                              {new Date(request.start_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                          <div className="bg-background rounded-md p-2 border border-border">
                            <p className="text-xs text-muted-foreground mb-1">End Date</p>
                            <p className="text-sm font-medium">
                              {new Date(request.end_date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                          <div className="bg-background rounded-md p-2 border border-border">
                            <p className="text-xs text-muted-foreground mb-1">Duration</p>
                            <p className="text-sm font-medium">
                              {daysRequested} {daysRequested === 1 ? 'day' : 'days'}
                            </p>
                          </div>
                        </div>

                        {/* Reason */}
                        <div className="bg-background rounded-md p-3 mb-3 border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Reason:</p>
                          <p className="text-sm text-foreground leading-relaxed">{request.reason}</p>
                        </div>

                        {/* Reviewer Comments (if reviewed) */}
                        {request.reviewer_comments && (
                          <div className="bg-muted/50 rounded-md p-3 mb-3 border border-border">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-xs font-medium text-muted-foreground">
                                {request.reviewer_name ? `${request.reviewer_name}'s Comment:` : 'Manager Comment:'}
                              </span>
                              {request.reviewed_at && (
                                <span className="text-xs text-muted-foreground">
                                  ({new Date(request.reviewed_at).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground">{request.reviewer_comments}</p>
                          </div>
                        )}

                        {/* Action Buttons (for pending requests) */}
                        {isPending && (
                          <div className="flex gap-2 pt-3 border-t border-border">
                            <Button
                              onClick={() => {
                                const comments = prompt('Add optional comments (or leave blank):')
                                if (comments !== null) {
                                  handleLeaveRequestAction(request.id, 'approved', comments || undefined)
                                }
                              }}
                              disabled={processingRequest === request.id}
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8"
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                              {processingRequest === request.id ? 'Processing...' : 'Approve'}
                            </Button>
                            <Button
                              onClick={() => {
                                const comments = prompt('Add optional reason for rejection (or leave blank):')
                                if (comments !== null) {
                                  handleLeaveRequestAction(request.id, 'rejected', comments || undefined)
                                }
                              }}
                              disabled={processingRequest === request.id}
                              size="sm"
                              variant="outline"
                              className="flex-1 text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-8"
                            >
                              <XCircleIcon className="h-4 w-4 mr-1.5" />
                              {processingRequest === request.id ? 'Processing...' : 'Reject'}
                            </Button>
                          </div>
                        )}

                        {/* Request Meta */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <ClockIcon className="h-3 w-3" />
                            Submitted {new Date(request.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })} at {new Date(request.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {request.reviewed_at && !isPending && (
                            <span className="text-xs text-muted-foreground">
                              Reviewed {new Date(request.reviewed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Currently Checked In - CEO Only */}
      {canViewAllStaff() && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              Currently Checked In
            </h2>
            <span className="text-xs text-muted-foreground">
              {currentlyCheckedIn.length} staff • Auto-updates every 30s
            </span>
          </div>

          {currentlyCheckedIn.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No staff currently checked in
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {currentlyCheckedIn.map((record) => (
                <div 
                  key={record.id} 
                  className="bg-muted/30 border border-border rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {record.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{record.profiles?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground uppercase">{record.profiles?.role || 'staff'}</p>
                      </div>
                    </div>
                    {record.activeBreak ? (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300 rounded-full text-xs font-medium flex items-center gap-1">
                        ☕ On Break
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 rounded-full text-xs font-medium">
                        Active
                      </span>
                    )}
                  </div>
                  
                  {/* Break Status Alert (if on break) */}
                  {record.activeBreak && (
                    <div className="mb-2 px-2 py-1.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-orange-900 dark:text-orange-100">
                          {record.activeBreak.break_type === 'lunch' && '🍽️ Lunch Break'}
                          {record.activeBreak.break_type === 'personal' && '🚻 Personal Break'}
                          {record.activeBreak.break_type === 'regular' && '☕ Break'}
                        </span>
                        <span className="text-orange-600 dark:text-orange-400">
                          {(() => {
                            const now = new Date().getTime()
                            const start = new Date(record.activeBreak.break_start).getTime()
                            const diff = Math.floor((now - start) / (1000 * 60))
                            return `${diff}m`
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-1.5 mt-3">
                    <div className="flex items-center gap-2 text-xs">
                      <ClockIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Check-in:</span>
                      <span className="font-medium">
                        {new Date(record.check_in).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    
                    {record.distance_from_office !== undefined && record.distance_from_office !== null && (
                      <div className="flex items-center gap-2 text-xs">
                        <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Distance:</span>
                        <span className="font-medium">{record.distance_from_office}m from office</span>
                      </div>
                    )}
                    
                    {record.gps_accuracy !== undefined && record.gps_accuracy !== null && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">GPS Accuracy:</span>
                        <span className="font-medium">±{record.gps_accuracy}m</span>
                      </div>
                    )}
                    
                    {record.profiles?.email && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Email:</span>
                        <span className="font-medium truncate">{record.profiles.email}</span>
                      </div>
                    )}
                    
                    {/* Break Summary */}
                    {record.completedBreaks && record.completedBreaks.length > 0 && (
                      <div className="flex items-center gap-2 text-xs pt-1.5 border-t border-border">
                        <span className="text-muted-foreground">Breaks:</span>
                        <span className="font-medium">
                          {record.completedBreaks.length} completed
                        </span>
                        {record.totalBreakMinutes !== undefined && record.totalBreakMinutes > 0 && (
                          <span className="text-primary font-semibold">
                            • {(() => {
                              const hours = Math.floor(record.totalBreakMinutes / 60)
                              const mins = record.totalBreakMinutes % 60
                              return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
                            })()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Detailed Break List (collapsible or expandable) */}
                  {record.allBreaks && record.allBreaks.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium mb-1">
                          Break Details ({record.allBreaks.length} total)
                        </summary>
                        <div className="space-y-1 mt-1.5 ml-2">
                          {record.allBreaks.map((breakItem: any, idx: number) => {
                            const isActive = !breakItem.break_end
                            const duration = isActive 
                              ? `${Math.floor((Date.now() - new Date(breakItem.break_start).getTime()) / (1000 * 60))}m (ongoing)`
                              : breakItem.break_duration 
                                ? `${breakItem.break_duration}m`
                                : `${Math.floor((new Date(breakItem.break_end).getTime() - new Date(breakItem.break_start).getTime()) / (1000 * 60))}m`
                            
                            const breakIcon = breakItem.break_type === 'lunch' ? '🍽️' : breakItem.break_type === 'personal' ? '🚻' : '☕'
                            
                            return (
                              <div 
                                key={idx}
                                className={`flex items-center justify-between px-2 py-1 rounded ${
                                  isActive 
                                    ? 'bg-orange-50 dark:bg-orange-950/20' 
                                    : 'bg-muted/50'
                                }`}
                              >
                                <span className="flex items-center gap-1">
                                  <span>{breakIcon}</span>
                                  <span className="capitalize">{breakItem.break_type}</span>
                                  {isActive && (
                                    <span className="px-1 py-0.5 bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-[9px] font-semibold">
                                      NOW
                                    </span>
                                  )}
                                </span>
                                <span className={isActive ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-green-600 dark:text-green-400 font-medium'}>
                                  {duration}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Monthly Attendance Statistics */}
      {monthlyStats.length > 0 && !canViewAllStaff() && (
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span>📊</span>
            Monthly Attendance Statistics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {monthlyStats.map((stat) => (
              <div
                key={stat.month}
                className="border border-border rounded-lg p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="text-xs text-muted-foreground mb-1">{stat.month}</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-primary">{stat.count}</div>
                  <div className="text-xs text-muted-foreground">check-ins</div>
                </div>
                <div className="mt-1.5 text-xs">
                  <span className="text-green-600 font-medium">{stat.completed}</span>
                  <span className="text-muted-foreground"> completed</span>
                  {stat.count > stat.completed && (
                    <>
                      <span className="text-muted-foreground"> • </span>
                      <span className="text-orange-600 font-medium">{stat.count - stat.completed}</span>
                      <span className="text-muted-foreground"> active</span>
                    </>
                  )}
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${(stat.completed / stat.count) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Staff Monthly Attendance Statistics (CEO Only) */}
      {canViewAllStaff() && staffMonthlyStats.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <span>📊</span>
            Staff Monthly Attendance Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {staffMonthlyStats.map((staffStat) => (
              <div
                key={staffStat.userId}
                className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="mb-3">
                  <h3 className="font-semibold text-sm truncate">{staffStat.staffName}</h3>
                  <p className="text-xs text-muted-foreground truncate">{staffStat.staffEmail}</p>
                </div>
                <div className="space-y-3">
                  {staffStat.stats.slice(0, 3).map((monthStat) => (
                    <div
                      key={monthStat.month}
                      className="border border-border rounded-lg p-2.5 bg-muted/20"
                    >
                      <div className="text-xs text-muted-foreground mb-1">{monthStat.month}</div>
                      <div className="flex items-baseline gap-1.5">
                        <div className="text-lg font-bold text-primary">
                          {monthStat.daysCheckedIn}/{monthStat.totalDays}
                        </div>
                        <div className="text-xs text-muted-foreground">days</div>
                      </div>
                      <div className="mt-1 text-xs">
                        <span className={`font-medium ${
                          monthStat.percentage >= 90 ? 'text-green-600' :
                          monthStat.percentage >= 75 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {monthStat.percentage}%
                        </span>
                        <span className="text-muted-foreground"> attendance</span>
                      </div>
                      <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            monthStat.percentage >= 90 ? 'bg-green-500' :
                            monthStat.percentage >= 75 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${monthStat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {staffStat.stats.length > 3 && (
                    <p className="text-xs text-center text-muted-foreground">
                      +{staffStat.stats.length - 3} more months
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance History */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">
            {canViewAllStaff() ? 'Completed Records (Checked Out)' : 'Attendance History'}
          </h2>
          {!showFilters && attendance.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-7 text-xs px-2.5"
              >
                <ArrowDownTrayIcon className="h-3 w-3" />
                CSV
              </Button>
              <Button
                onClick={exportToPDF}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 h-7 text-xs px-2.5"
              >
                <ArrowDownTrayIcon className="h-3 w-3" />
                PDF
              </Button>
            </div>
          )}
        </div>
        
        {loading ? (
          <p className="text-center py-6 text-sm text-muted-foreground">Loading...</p>
        ) : attendance.length === 0 ? (
          <p className="text-center py-6 text-sm text-muted-foreground">No attendance records found for the selected period</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  {canViewAllStaff() && (
                    <th className="px-3 py-2 text-left">Staff Name</th>
                  )}
                  <th className="px-3 py-2 text-left">Check-In</th>
                  <th className="px-3 py-2 text-left">Check-Out</th>
                  <th className="px-3 py-2 text-left">Work Hours</th>
                  <th className="px-3 py-2 text-left">Location</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2.5 text-xs">
                      {new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    {canViewAllStaff() && (
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {record.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium">{record.profiles?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{record.profiles?.email || ''}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-xs">
                      {record.check_in ? new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {record.check_out ? new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-medium">
                      {calculateWorkHours(record.check_in, record.check_out)}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <div className="space-y-1">
                        {/* Check-in Location */}
                        {record.distance_from_office !== null && record.distance_from_office !== undefined && (
                          <div className="flex items-center gap-1 text-green-600">
                            <span className="font-medium">In:</span>
                            <span>{record.distance_from_office}m</span>
                            {record.gps_accuracy !== null && record.gps_accuracy !== undefined && (
                              <span className="text-muted-foreground">±{record.gps_accuracy}m</span>
                            )}
                          </div>
                        )}
                        {/* Check-out Location */}
                        {record.checkout_distance !== null && record.checkout_distance !== undefined && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <span className="font-medium">Out:</span>
                            <span>{record.checkout_distance}m</span>
                            {record.checkout_gps_accuracy !== null && record.checkout_gps_accuracy !== undefined && (
                              <span className="text-muted-foreground">±{record.checkout_gps_accuracy}m</span>
                            )}
                          </div>
                        )}
                        {/* No location data */}
                        {(record.distance_from_office === null || record.distance_from_office === undefined) &&
                         (record.checkout_distance === null || record.checkout_distance === undefined) && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'checked_out'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-green-50 text-green-600'
                        }`}
                      >
                        {record.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leave Request Modal - Only for staff */}
      {!canViewAllStaff() && (
        <LeaveRequestModal 
          isOpen={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          role={role}
        />
      )}
    </div>
  )
}
