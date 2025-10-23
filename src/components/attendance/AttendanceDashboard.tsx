// src/components/attendance/AttendanceDashboard.tsx
'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// icons (you can swap if you have lucide/react)
import { ArrowRightOnRectangleIcon, ArrowLeftOnRectangleIcon, ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline'



type AttendanceRow = {
  id: string
  user_id: string
  user_name?: string
  check_in?: string | null
  check_out?: string | null
  work_date?: string | null
  status?: string | null
  location?: any
  created_at?: string | null
}

const OFFICE_LOCATION = { lat: 7.000, lng: -1.000 } // <-- set to your office coords
const radiusMeters = 120 // permit only within 120m (tweak as needed)

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const φ1 = toRad(lat1)
  const φ2 = toRad(lat2)
  const Δφ = toRad(lat2 - lat1)
  const Δλ = toRad(lon2 - lon1)
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default function AttendanceDashboard() {
  const { supabase, session } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [todayRecord, setTodayRecord] = useState<AttendanceRow | null>(null)
  const [rows, setRows] = useState<AttendanceRow[]>([])
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([])
  const [filters, setFilters] = useState({
    staffId: 'all',
    dateFrom: '',
    dateTo: '',
    status: 'all',
    period: 'monthly', // unused but available
  })
  const [isAdminish, setIsAdminish] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const tableRef = useRef<HTMLDivElement | null>(null)
  const [checking, setChecking] = useState(false)

  // load current user id and whether admin-ish role
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user) return
      // load profile role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .single()
      const role = (profile?.role || '').toLowerCase()
      setIsAdminish(['ceo', 'manager', 'admin', 'hr'].includes(role))
    })()
  }, [supabase, session])

  // fetch staff list for filter dropdown
  const fetchStaffList = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('profiles').select('id, name').order('name')
    if (error) {
      console.warn('staff list error', error)
      return
    }
    setStaffOptions((data || []).map((d: any) => ({ id: d.id, name: d.name || d.email || 'Unknown' })))
  }, [supabase])

  useEffect(() => {
    fetchStaffList()
  }, [fetchStaffList])

  // build query with filters
  const fetchRows = useCallback(
    async (opts?: { page?: number }) => {
      if (!supabase) return
      setLoading(true)
      try {
        let q = supabase
          .from('attendance')
          .select(`
            id,
            user_id,
            check_in,
            check_out,
            work_date,
            status,
            location,
            created_at,
            profiles:profiles!attendance_user_id_fkey(name)
          `)
          .order('work_date', { ascending: false })

        if (filters.staffId !== 'all') q = q.eq('user_id', filters.staffId)
        if (filters.status !== 'all') q = q.eq('status', filters.status)

        if (filters.dateFrom) {
          const d = new Date(filters.dateFrom)
          d.setHours(0, 0, 0, 0)
          q = q.gte('work_date', d.toISOString().slice(0, 10))
        }
        if (filters.dateTo) {
          const d = new Date(filters.dateTo)
          d.setHours(23, 59, 59, 999)
          q = q.lte('work_date', d.toISOString().slice(0, 10))
        }

        const { data, error } = await q
        if (error) throw error
        const mapped: AttendanceRow[] = (data || []).map((r: any) => ({
          id: r.id,
          user_id: r.user_id,
          user_name: r.profiles?.name,
          check_in: r.check_in,
          check_out: r.check_out,
          work_date: r.work_date,
          status: r.status,
          location: r.location,
          created_at: r.created_at,
        }))

        setRows(mapped)
      } catch (err) {
        console.error('fetchRows', err)
        toast.error('Failed to load attendance records')
      } finally {
        setLoading(false)
      }
    },
    [supabase, filters]
  )

  useEffect(() => {
    fetchRows()
  }, [fetchRows, refreshKey])

  // load today's record for current user
  const fetchToday = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getUser()
    const uid = data?.user?.id
    if (!uid) return setTodayRecord(null)
    const todayStr = new Date().toISOString().slice(0, 10)
    const { data: rec, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', uid)
      .eq('work_date', todayStr)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') {
      // PGRST116 may mean no row
      console.warn('today fetch error', error)
    }
    setTodayRecord(rec || null)
  }, [supabase])

  useEffect(() => {
    fetchToday()
  }, [fetchToday, refreshKey])

  // helper: canCheckIn (geolocation + not already checked in)
  const handleCheckIn = async () => {
    if (!supabase) return
    setChecking(true)
    try {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not available in this browser.')
        setChecking(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const dist = haversineDistanceMeters(lat, lng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng)
          if (dist > radiusMeters) {
            toast.error('You must be at the office to check in.')
            setChecking(false)
            return
          }

          // check if today already has a record with check_in
          const { data } = await supabase.auth.getUser()
          const uid = data?.user?.id
          if (!uid) {
            toast.error('Not authenticated')
            setChecking(false)
            return
          }
          const today = new Date().toISOString().slice(0, 10)
          const { data: exists } = await supabase
            .from('attendance')
            .select('id, check_in, check_out')
            .eq('user_id', uid)
            .eq('work_date', today)
            .limit(1)
            .single()

          if (exists && exists.check_in) {
            toast('You already checked in today.')
            setChecking(false)
            return
          }

          const payload = {
            user_id: uid,
            check_in: new Date().toISOString(),
            location: { lat, lng, accuracy: pos.coords.accuracy },
            status: 'present',
          }
          const { error } = await supabase.from('attendance').insert(payload)
          if (error) {
            throw error
          }
          toast.success('Checked in — have a productive day!')
          setRefreshKey((k) => k + 1)
        },
        (err) => {
          console.error('geo err', err)
          toast.error('Failed to get location. Allow location permissions.')
        },
        { enableHighAccuracy: true, timeout: 15000 }
      )
    } catch (err) {
      console.error(err)
      toast.error('Check-in failed')
    } finally {
      setChecking(false)
    }
  }

  // handle check out: only if today record exists and has check_in and no check_out
  const handleCheckOut = async () => {
    if (!supabase) return
    setChecking(true)
    try {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not available in this browser.')
        setChecking(false)
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const dist = haversineDistanceMeters(lat, lng, OFFICE_LOCATION.lat, OFFICE_LOCATION.lng)
          if (dist > radiusMeters) {
            toast.error('You must be at the office to check out.')
            setChecking(false)
            return
          }

          const { data } = await supabase.auth.getUser()
          const uid = data?.user?.id
          if (!uid) {
            toast.error('Not authenticated')
            setChecking(false)
            return
          }
          const today = new Date().toISOString().slice(0, 10)
          const { data: rec, error } = await supabase
            .from('attendance')
            .select('*')
            .eq('user_id', uid)
            .eq('work_date', today)
            .limit(1)
            .single()
          if (error && error.code !== 'PGRST116') throw error
          if (!rec || !rec.check_in) {
            toast.error('No check-in found for today.')
            setChecking(false)
            return
          }
          if (rec.check_out) {
            toast('You already checked out today.')
            setChecking(false)
            return
          }

          const { error: upErr } = await supabase
            .from('attendance')
            .update({
              check_out: new Date().toISOString(),
              location: { lat, lng, accuracy: pos.coords.accuracy },
            })
            .eq('id', rec.id)
          if (upErr) throw upErr
          toast.success('Checked out — good job!')
          setRefreshKey((k) => k + 1)
        },
        (err) => {
          console.error('geo err', err)
          toast.error('Failed to get location. Allow location permissions.')
        },
        { enableHighAccuracy: true, timeout: 15000 }
      )
    } catch (err) {
      console.error(err)
      toast.error('Check-out failed')
    } finally {
      setChecking(false)
    }
  }

  // Exports
  const exportCSV = () => {
    if (!rows.length) {
      toast('No records to export')
      return
    }
    const headers = ['Staff', 'Date', 'Check In', 'Check Out', 'Status']
    const csvRows = [headers.join(',')]
    rows.forEach((r) => {
      csvRows.push(
        [
          `"${(r.user_name || r.user_id || '').replace(/"/g, '""')}"`,
          r.work_date || '',
          r.check_in || '',
          r.check_out || '',
          r.status || '',
        ].join(',')
      )
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const exportPDF = async () => {
    if (!tableRef.current) {
      toast('Nothing to export')
      return
    }
    try {
      const canvas = await html2canvas(tableRef.current, { scale: 1.2 })
      const imgData = canvas.toDataURL('image/png')
      const doc = new jsPDF('p', 'pt', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const imgProps = (doc as any).getImageProperties(imgData)
      const imgWidth = pageWidth - 40
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width
      doc.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight)
      doc.save(`attendance_${new Date().toISOString()}.pdf`)
      toast.success('PDF exported')
    } catch (err) {
      console.error('pdf export', err)
      toast.error('Failed to export PDF')
    }
  }

  // small helpers
  const todaysStatus = useMemo(() => {
    if (!todayRecord) return 'Not checked in'
    if (todayRecord.check_in && !todayRecord.check_out) return 'Checked in'
    if (todayRecord.check_out) return 'Checked out'
    return 'Unknown'
  }, [todayRecord])

  return (
    <div className="space-y-4 p-4">
      {/* Header + check controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Attendance</h2>
          <p className="text-sm text-muted-foreground">Clock in/out and view attendance logs</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-2 hidden sm:block">Today: <span className="font-medium ml-1">{todaysStatus}</span></div>

          <div className="flex gap-2">
            <Button onClick={() => setRefreshKey((k) => k + 1)} variant="outline" className="flex items-center gap-2">
            <ArrowPathIcon className="h-5 w-5" />
            Refresh
            </Button>

            {/* Check in / Check out controls */}
            <Button onClick={handleCheckIn} disabled={checking} className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
              <ArrowRightOnRectangleIcon className="h-4 w-4" /> Check In
            </Button>
            <Button onClick={handleCheckOut} disabled={checking} className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700">
              <ArrowLeftOnRectangleIcon className="h-4 w-4" /> Check Out
            </Button>
          </div>
        </div>
      </div>

      {/* Toolbar (filters) - horizontally scrollable on small screens */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((s) => ({ ...s, dateFrom: e.target.value }))}
                  placeholder="From"
                  className="px-2 py-1 border border-border rounded-md text-sm w-[130px]"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((s) => ({ ...s, dateTo: e.target.value }))}
                  placeholder="To"
                  className="px-2 py-1 border border-border rounded-md text-sm w-[130px]"
                />

                <select
                  value={filters.status}
                  onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
                  className="px-2 py-1 border border-border rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                </select>

                {isAdminish && (
                  <select
                    value={filters.staffId}
                    onChange={(e) => setFilters((s) => ({ ...s, staffId: e.target.value }))}
                    className="px-2 py-1 border border-border rounded-md text-sm"
                  >
                    <option value="all">All Staff</option>
                    {staffOptions.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <Button onClick={() => setRefreshKey((k) => k + 1)} variant="ghost" className="text-sm">
                    Refresh
                  </Button>

                  <Button onClick={exportCSV} variant="outline" className="flex items-center gap-2 text-sm">
                    <ArrowDownTrayIcon className="h-4 w-4" /> CSV
                  </Button>
                  <Button onClick={exportPDF} variant="outline" className="flex items-center gap-2 text-sm">
                    PDF
                  </Button>
                </div>
              </div>

              {/* small horizontal token row for mobile (allow scrolling) */}
              <div className="mt-2 block sm:hidden overflow-x-auto flex gap-2 pb-1">
                <div className="min-w-[110px] px-2 py-1 border rounded-md text-xs bg-background">From</div>
                <div className="min-w-[110px] px-2 py-1 border rounded-md text-xs bg-background">To</div>
                <div className="min-w-[110px] px-2 py-1 border rounded-md text-xs bg-background">Status</div>
                <div className="min-w-[110px] px-2 py-1 border rounded-md text-xs bg-background">Staff</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary (horizontal on mobile, smaller cards) */}
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card border border-border rounded-md p-3 text-center">
              <div className="text-xs text-muted-foreground">Total (shown)</div>
              <div className="text-base font-semibold">—</div>
            </div>
            <div className="bg-card border border-border rounded-md p-3 text-center">
              <div className="text-xs text-muted-foreground">Present</div>
              <div className="text-base font-semibold">—</div>
            </div>
            <div className="bg-card border border-border rounded-md p-3 text-center">
              <div className="text-xs text-muted-foreground">Absent</div>
              <div className="text-base font-semibold">—</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef} className="rounded-lg border bg-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="p-2 text-left">Staff</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Check In</th>
              <th className="p-2 text-left">Check Out</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted-foreground">
                  No records found
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="p-2">{r.user_name || r.user_id}</td>
                  <td className="p-2">{r.work_date || '-'}</td>
                  <td className="p-2">{r.check_in ? new Date(r.check_in).toLocaleString() : '-'}</td>
                  <td className="p-2">{r.check_out ? new Date(r.check_out).toLocaleString() : '-'}</td>
                  <td className="p-2">{r.status || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
