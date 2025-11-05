'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { 
  ClockIcon,
  PauseIcon,
  PlayIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import { BreakConfirmDialog } from '@/components/ui/BreakConfirmDialog'

type Break = {
  id: string
  attendance_id: string
  user_id: string
  break_start: string
  break_end?: string
  break_duration?: number
  break_type: string
  created_at: string
}

type BreakTrackerProps = {
  attendanceId: string | null
  userId: string
  isCheckedIn: boolean
}

export default function BreakTracker({ attendanceId, userId, isCheckedIn }: BreakTrackerProps) {
  const { supabase } = useSupabase()
  const [activeBreak, setActiveBreak] = useState<Break | null>(null)
  const [todayBreaks, setTodayBreaks] = useState<Break[]>([])
  const [loading, setLoading] = useState(false)
  const [breakType, setBreakType] = useState<string>('regular')
  const [showStartBreakConfirm, setShowStartBreakConfirm] = useState(false)
  const [showEndBreakConfirm, setShowEndBreakConfirm] = useState(false)

  useEffect(() => {
    if (userId && isCheckedIn) {
      fetchBreaks()
      
      // Set up real-time subscription for breaks
      const channel = supabase
        ?.channel('breaks_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'breaks',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('🔔 Break change detected:', payload)
            fetchBreaks()
          }
        )
        .subscribe()

      return () => {
        channel?.unsubscribe()
      }
    }
  }, [userId, isCheckedIn, supabase])

  const fetchBreaks = async () => {
    if (!supabase || !userId) return

    try {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      
      console.log('🔍 Fetching breaks for today:', {
        start: todayStart.toISOString(),
        end: todayEnd.toISOString()
      })
      
      const { data, error } = await supabase
        .from('breaks')
        .select('*')
        .eq('user_id', userId)
        .gte('break_start', todayStart.toISOString())
        .lte('break_start', todayEnd.toISOString())
        .order('break_start', { ascending: false })

      if (error) {
        // Silently fail if table doesn't exist (setup not done)
        if (error.code === '42P01') {
          console.warn('Breaks table not found. Run ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql')
          setTodayBreaks([])
          setActiveBreak(null)
          return
        }
        throw error
      }

      console.log('✅ Fetched breaks:', data?.length || 0, 'breaks')
      if (data && data.length > 0) {
        console.log('Break records:', data.map(b => ({
          id: b.id.substring(0, 8),
          type: b.break_type,
          start: b.break_start,
          end: b.break_end,
          hasEnd: !!b.break_end
        })))
      }
      
      setTodayBreaks(data || [])
      
      // Find active break (one without break_end)
      const active = data?.find(b => !b.break_end)
      console.log('🔍 Active break:', active ? `Found (ID: ${active.id.substring(0, 8)}, Type: ${active.break_type})` : 'None')
      
      // Always update activeBreak based on what we find
      // This ensures UI stays in sync with database
      setActiveBreak(active || null)
    } catch (err) {
      console.error('❌ Fetch breaks error:', err)
    }
  }

  const handleStartBreak = async () => {
    if (!supabase || !attendanceId || !userId) {
      toast.error('Cannot start break without active check-in')
      return
    }

    setLoading(true)
    try {
      console.log('🔄 Starting break...', { attendanceId, userId, breakType })
      
      const { data, error } = await supabase
        .from('breaks')
        .insert([{
          attendance_id: attendanceId,
          user_id: userId,
          break_start: new Date().toISOString(),
          break_type: breakType
        }])
        .select()
        .single()

      if (error) {
        console.error('❌ Start break error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        
        // User-friendly error messages
        if (error.code === '42P01') {
          throw new Error('Breaks table not found. Please run ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql in Supabase.')
        } else if (error.code === '42501') {
          throw new Error('Permission denied. Please check database policies.')
        } else if (error.code === '23503') {
          throw new Error('Invalid attendance ID. Please check in first.')
        } else {
          throw new Error(error.message || 'Failed to start break')
        }
      }

      console.log('✅ Break started successfully:', data)
      
      toast.success('☕ Break started')
      
      // Immediately set the active break to prevent UI flicker
      if (data) {
        const breakData = data as Break
        console.log('📝 Setting active break state:', {
          id: breakData.id.substring(0, 8),
          type: breakData.break_type,
          start: breakData.break_start
        })
        setActiveBreak(breakData)
        setTodayBreaks(prev => {
          // Avoid duplicates
          const filtered = prev.filter(b => b.id !== breakData.id)
          return [breakData, ...filtered]
        })
        console.log('✅ Active break state set immediately')
      }
      
      // Wait longer before refreshing to ensure database has propagated
      setTimeout(async () => {
        console.log('🔄 Refreshing breaks from database...')
        await fetchBreaks()
        console.log('✅ Breaks list refreshed from database')
      }, 1500)
    } catch (err: any) {
      console.error('❌ Start break error:', err)
      toast.error(err.message || 'Failed to start break. Please ensure the database is set up correctly.')
    } finally {
      setLoading(false)
    }
  }

  const handleEndBreak = async () => {
    if (!supabase || !activeBreak) return

    setLoading(true)
    try {
      console.log('🔄 Ending break:', activeBreak.id)
      
      const endTime = new Date().toISOString()
      const startTime = new Date(activeBreak.break_start).getTime()
      const endTimeMs = new Date(endTime).getTime()
      const durationMinutes = Math.floor((endTimeMs - startTime) / (1000 * 60))
      
      const { error } = await supabase
        .from('breaks')
        .update({
          break_end: endTime,
          break_duration: durationMinutes
        })
        .eq('id', activeBreak.id)

      if (error) {
        console.error('❌ End break error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw new Error(error.message || 'Failed to end break')
      }

      console.log('✅ Break ended successfully', {
        duration: `${durationMinutes} minutes`,
        start: activeBreak.break_start,
        end: endTime
      })
      
      // Update the break in todayBreaks list with end time and duration
      setTodayBreaks(prev => prev.map(b => 
        b.id === activeBreak.id 
          ? { ...b, break_end: endTime, break_duration: durationMinutes }
          : b
      ))
      
      // Clear active break immediately
      setActiveBreak(null)
      
      const hours = Math.floor(durationMinutes / 60)
      const mins = durationMinutes % 60
      const durationText = hours > 0 ? `${hours}h ${mins}m` : `${durationMinutes}m`
      
      toast.success(`✅ Break ended (${durationText})`)
      
      // Refresh breaks list after a delay
      setTimeout(async () => {
        console.log('🔄 Refreshing breaks list...')
        await fetchBreaks()
      }, 500)
    } catch (err: any) {
      console.error('❌ End break error:', err)
      toast.error(err.message || 'Failed to end break')
    } finally {
      setLoading(false)
    }
  }

  const formatBreakDuration = (start: string, end?: string) => {
    if (!end) {
      const now = new Date().getTime()
      const startTime = new Date(start).getTime()
      const diff = now - startTime
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}m (ongoing)`
    }
    
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const minutes = Math.floor(duration / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${minutes}m`
  }

  const getTotalBreakTime = () => {
    // Only count completed breaks (those with break_end)
    const completedBreaks = todayBreaks.filter(b => b.break_end)
    const total = completedBreaks.reduce((acc, b) => {
      if (b.break_duration) {
        return acc + b.break_duration
      }
      // Fallback calculation if break_duration not set
      if (b.break_end) {
        const duration = Math.floor(
          (new Date(b.break_end).getTime() - new Date(b.break_start).getTime()) / (1000 * 60)
        )
        return acc + duration
      }
      return acc
    }, 0)
    
    const hours = Math.floor(total / 60)
    const minutes = Math.round(total % 60)
    
    if (total === 0) return '0m'
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  const getBreakTypeIcon = (type: string) => {
    switch (type) {
      case 'lunch':
        return '🍽️'
      case 'personal':
        return '🚻'
      default:
        return '☕'
    }
  }

  if (!isCheckedIn) {
    return (
      <div className="bg-muted/30 border border-border rounded-lg p-4 text-center">
        <div className="text-4xl mb-2">☕</div>
        <p className="text-sm text-muted-foreground">Check in first to track breaks</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xl">☕</span>
          <h3 className="text-base font-semibold">Break Tracker</h3>
        </div>
        {todayBreaks.length > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold text-primary">{getTotalBreakTime()}</span>
            <span className="text-muted-foreground ml-1">
              ({todayBreaks.filter(b => b.break_end).length} completed)
            </span>
          </div>
        )}
      </div>

      {/* Break Controls */}
      {!activeBreak ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1.5">Break Type</label>
            <select
              value={breakType}
              onChange={(e) => setBreakType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={loading}
            >
              <option value="regular">☕ Regular Break</option>
              <option value="lunch">🍽️ Lunch Break</option>
              <option value="personal">🚻 Personal Break</option>
            </select>
          </div>
          <Button
            onClick={() => setShowStartBreakConfirm(true)}
            disabled={loading || !attendanceId}
            size="sm"
            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          >
            <PauseIcon className="h-4 w-4 mr-2" />
            {loading ? 'Starting Break...' : 'Start Break'}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-md p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                {getBreakTypeIcon(activeBreak.break_type)} Break In Progress
              </span>
              <div className="flex items-center text-orange-600 dark:text-orange-400">
                <ClockIcon className="h-4 w-4 mr-1 animate-pulse" />
                <span className="text-sm font-mono">
                  {formatBreakDuration(activeBreak.break_start)}
                </span>
              </div>
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Started at {new Date(activeBreak.break_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <Button
            onClick={() => setShowEndBreakConfirm(true)}
            disabled={loading}
            size="sm"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            {loading ? 'Ending Break...' : 'End Break'}
          </Button>
        </div>
      )}

      {/* Today's Breaks List */}
      {todayBreaks.length > 0 && (
        <div className="pt-3 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Today's Breaks ({todayBreaks.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {todayBreaks.map((breakItem) => {
              const isActive = !breakItem.break_end
              const duration = formatBreakDuration(breakItem.break_start, breakItem.break_end)
              
              return (
                <div
                  key={breakItem.id}
                  className={`flex items-center justify-between text-xs rounded p-2 ${
                    isActive 
                      ? 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800' 
                      : 'bg-muted/50 border border-border'
                  }`}
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-base">{getBreakTypeIcon(breakItem.break_type)}</span>
                    <div className="flex-1">
                      <p className="font-medium capitalize flex items-center gap-1.5">
                        {breakItem.break_type.replace('_', ' ')}
                        {isActive && (
                          <span className="px-1.5 py-0.5 bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-[10px] font-semibold">
                            ACTIVE
                          </span>
                        )}
                        {!isActive && (
                          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-[10px] font-semibold">
                            COMPLETED
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {new Date(breakItem.break_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        {breakItem.break_end && ` - ${new Date(breakItem.break_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <span className={`font-bold ${
                      isActive 
                        ? 'text-orange-600 dark:text-orange-400' 
                        : 'text-green-600 dark:text-green-400'
                    }`}>
                      {duration}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <BreakConfirmDialog
        isOpen={showStartBreakConfirm}
        onClose={() => setShowStartBreakConfirm(false)}
        onConfirm={() => {
          setShowStartBreakConfirm(false)
          handleStartBreak()
        }}
        type="start"
        breakType={breakType}
        loading={loading}
      />
      
      <BreakConfirmDialog
        isOpen={showEndBreakConfirm}
        onClose={() => setShowEndBreakConfirm(false)}
        onConfirm={() => {
          setShowEndBreakConfirm(false)
          handleEndBreak()
        }}
        type="end"
        loading={loading}
      />
    </div>
  )
}

