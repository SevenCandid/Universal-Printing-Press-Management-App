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
  UserGroupIcon
} from '@heroicons/react/24/outline'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// 📍 Office coordinates - Sampa
// Reference: https://maps.app.goo.gl/6iTYHQdTsbey9jkm8
const OFFICE_LOCATION = {
  latitude: 7.952673,  // Sampa office location
  longitude: -2.698856, // Sampa office location
  radius: 500, // meters allowed from office (500m = ~5 minute walk)
}

// 🔧 Development mode: Set to true to bypass location check for testing
const DEV_MODE = true // Temporarily enabled for debugging coordinates

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
  profiles?: {
    name?: string
    email?: string
  }
}

type StaffMember = {
  user_id: string
  name: string
  email: string
  role: string
}

export default function AttendanceBase({ role }: { role: string }) {
  const { supabase, session } = useSupabase()
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  
  // 🔍 Filter States
  const [periodFilter, setPeriodFilter] = useState<string>('this_month')
  const [selectedStaff, setSelectedStaff] = useState<string>('all')
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  // Helper: Check if user can view all staff
  const canViewAllStaff = () => role === 'ceo' || role === 'manager' || role === 'executive_assistant'

  useEffect(() => {
    if (session?.user) {
      fetchAttendance()
      if (canViewAllStaff()) {
        fetchStaffMembers()
      }
    }
  }, [session])

  // Refetch when filters change
  useEffect(() => {
    if (session?.user) {
      fetchAttendance()
    }
  }, [periodFilter, selectedStaff, customStartDate, customEndDate])

  // 👥 Fetch staff members (for managers/CEO)
  const fetchStaffMembers = async () => {
    if (!supabase) return
    
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
      console.error('Fetch staff error:', err)
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
    if (!session?.user || !supabase) return
    
    setLoading(true)
    try {
      const { startDate, endDate } = getDateRange()
      
      // Build query - Note: profiles join might fail if foreign key doesn't exist
      let query = supabase
        .from('attendance')
        .select('*')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false })

      // Filter by user if not viewing all staff
      if (!canViewAllStaff() || selectedStaff === 'self') {
        query = query.eq('user_id', session.user.id)
      } else if (selectedStaff && selectedStaff !== 'all') {
        query = query.eq('user_id', selectedStaff)
      }

      const { data, error } = await query

      if (error) throw error
      
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
      
      setAttendance(enrichedData)
      
      // Check if there's a record for today (for current user only)
      const today = new Date().toISOString().split('T')[0]
      const todayRecords = data?.filter((record: AttendanceRecord) => 
        record.created_at.startsWith(today) && record.user_id === session.user.id
      )
      
      if (todayRecords && todayRecords.length > 0) {
        const activeRecord = todayRecords.find((r: AttendanceRecord) => r.status === 'checked_in')
        setTodayRecord(activeRecord || todayRecords[0])
      } else {
        setTodayRecord(null)
      }
    } catch (err: any) {
      console.error('Fetch attendance error:', err)
      
      // User-friendly error message
      if (err.code === '42P01') {
        toast.error('Attendance table not found. Please run the database setup.')
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
      const headers = ['Date', 'Staff Name', 'Email', 'Check-In', 'Check-Out', 'Work Hours', 'Status']
      
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
          record.status.replace('_', ' ').toUpperCase()
        ]
      })

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

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
  const exportToPDF = () => {
    if (attendance.length === 0) {
      toast.error('No attendance records to export')
      return
    }

    try {
      const doc = new jsPDF()
      const { startDate, endDate } = getDateRange()

      // Add title
      doc.setFontSize(18)
      doc.text('Attendance Report', 14, 22)
      
      // Add period info
      doc.setFontSize(11)
      doc.text(`Period: ${startDate} to ${endDate}`, 14, 32)
      
      // Add staff filter info if applicable
      if (selectedStaff && selectedStaff !== 'all') {
        const staff = staffMembers.find(s => s.user_id === selectedStaff)
        if (staff) {
          doc.text(`Staff: ${staff.name}`, 14, 38)
        }
      }

      // Prepare table data
      const tableData = attendance.map(record => [
        new Date(record.created_at).toLocaleDateString(),
        record.profiles?.name || 'Unknown',
        record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-',
        record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-',
        calculateWorkHours(record.check_in, record.check_out),
        record.status.replace('_', ' ').toUpperCase()
      ])

      // Generate table
      ;(doc as any).autoTable({
        head: [['Date', 'Staff Name', 'Check-In', 'Check-Out', 'Work Hours', 'Status']],
        body: tableData,
        startY: selectedStaff && selectedStaff !== 'all' ? 44 : 38,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] }, // Primary blue
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

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      setCheckingIn(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        
        // 🔍 Debug logging
        console.log('📍 Your Location:', { latitude, longitude })
        console.log('🏢 Office Location:', OFFICE_LOCATION)
        
        const distance = getDistance(
          latitude,
          longitude,
          OFFICE_LOCATION.latitude,
          OFFICE_LOCATION.longitude
        )
        
        console.log('📏 Calculated Distance:', Math.round(distance), 'meters')

        // Location verification (bypassed in DEV_MODE)
        if (!DEV_MODE && distance > OFFICE_LOCATION.radius) {
          setCheckingIn(false)
          toast.error(`You must be within ${OFFICE_LOCATION.radius}m of the office to check in. Current distance: ${Math.round(distance)}m`)
          console.error('❌ Check-in failed: Too far from office')
          return
        }
        
        // Dev mode notification
        if (DEV_MODE) {
          console.log(`[DEV MODE] Location check bypassed. Distance from office: ${Math.round(distance)}m`)
        }
        
        console.log('✅ Location verified - proceeding with check-in')

        try {
          const { data, error } = await supabase
            .from('attendance')
            .insert([
              {
                user_id: session.user.id,
                check_in: new Date().toISOString(),
                latitude,
                longitude,
                status: 'checked_in',
              },
            ])
            .select()

          if (error) {
            console.error('Check-in error details:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
            })
            
            // User-friendly error messages
            if (error.code === '42P01') {
              throw new Error('Attendance table not found. Please run the database setup script.')
            } else if (error.code === '42501') {
              throw new Error('Permission denied. Please check database policies.')
            } else if (error.message?.includes('attendance_status_check') || error.message?.includes('check constraint')) {
              throw new Error('Database constraint error. Please run FIX_ATTENDANCE_STATUS_CONSTRAINT.sql in Supabase.')
            } else {
              throw new Error(error.message || 'Failed to record attendance')
            }
          }

          toast.success('✅ Checked in successfully!')
          fetchAttendance()
        } catch (err: any) {
          console.error('Check-in error:', err)
          toast.error(err.message || 'Failed to check in')
        } finally {
          setCheckingIn(false)
        }
      },
      (err) => {
        console.error('Geolocation error:', err)
        console.error('Error code:', err.code, 'Message:', err.message)
        toast.error('Failed to get your location. Please enable location services.')
        setCheckingIn(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
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
        setCheckingOut(false)
        toast.error('No active check-in found.')
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          const distance = getDistance(
            latitude,
            longitude,
            OFFICE_LOCATION.latitude,
            OFFICE_LOCATION.longitude
          )

          // Location verification (bypassed in DEV_MODE)
          if (!DEV_MODE && distance > OFFICE_LOCATION.radius) {
            setCheckingOut(false)
            toast.error(`You must be within ${OFFICE_LOCATION.radius}m of the office to check out. Current distance: ${Math.round(distance)}m`)
            return
          }
          
          // Dev mode notification
          if (DEV_MODE) {
            console.log(`[DEV MODE] Location check bypassed. Distance from office: ${Math.round(distance)}m`)
          }

          try {
            const { error } = await supabase
              .from('attendance')
              .update({
                check_out: new Date().toISOString(),
                status: 'checked_out',
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

            toast.success('✅ Checked out successfully!')
            fetchAttendance()
          } catch (err: any) {
            console.error('Check-out error:', err)
            toast.error(err.message || 'Failed to check out')
          } finally {
            setCheckingOut(false)
          }
        },
        (err) => {
          console.error('Geolocation error:', err)
          console.error('Error code:', err.code, 'Message:', err.message)
          toast.error('Failed to get your location. Please enable location services.')
          setCheckingOut(false)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Smart Attendance</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Track your work hours with location verification</p>
        </div>
        <div className="flex items-center gap-2">
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
                  <option value="self">My Attendance</option>
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

      {/* Today's Status Card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-1.5">
            <CalendarIcon className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Today's Attendance</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {todayRecord ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="border border-border rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Check-In</p>
              <p className="text-base font-semibold text-green-600">
                {todayRecord.check_in ? new Date(todayRecord.check_in).toLocaleTimeString() : '-'}
              </p>
            </div>
            <div className="border border-border rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Check-Out</p>
              <p className="text-base font-semibold text-blue-600">
                {todayRecord.check_out ? new Date(todayRecord.check_out).toLocaleTimeString() : '-'}
              </p>
            </div>
            <div className="border border-border rounded-md p-3">
              <p className="text-xs text-muted-foreground mb-0.5">Work Hours</p>
              <p className="text-base font-semibold">
                {calculateWorkHours(todayRecord.check_in, todayRecord.check_out)}
              </p>
            </div>
          </div>
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

        <div className="mt-3 flex items-start space-x-1.5 text-xs text-muted-foreground">
          <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {DEV_MODE ? (
              <span className="text-orange-500 font-medium">
                🔧 DEV MODE: Location verification disabled
              </span>
            ) : (
              <>Within {OFFICE_LOCATION.radius}m of office required</>
            )}
          </p>
        </div>
      </div>

      {/* Attendance History */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Attendance History</h2>
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
                  {canViewAllStaff() && selectedStaff !== 'self' && (
                    <th className="px-3 py-2 text-left">Staff Name</th>
                  )}
                  <th className="px-3 py-2 text-left">Check-In</th>
                  <th className="px-3 py-2 text-left">Check-Out</th>
                  <th className="px-3 py-2 text-left">Work Hours</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2.5 text-xs">
                      {new Date(record.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                    </td>
                    {canViewAllStaff() && selectedStaff !== 'self' && (
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
    </div>
  )
}
