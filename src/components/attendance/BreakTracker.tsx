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
          () => {
            fetchBreaks()
          }
        )
        .subscribe()

      return () => {
        channel?.unsubscribe()
      }
    }
  }, [userId, isCheckedIn])

  const fetchBreaks = async () => {
    if (!supabase || !userId) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await supabase
        .from('breaks')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('break_start', { ascending: false })

      if (error) {
        // Silently fail if table doesn't exist (setup not done)
        if (error.code === '42P01') {
          console.warn('Breaks table not found. Run ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql')
          setTodayBreaks([])
          return
        }
        throw error
      }

      setTodayBreaks(data || [])
      
      // Find active break
      const active = data?.find(b => !b.break_end)
      setActiveBreak(active || null)
    } catch (err) {
      console.error('Fetch breaks error:', err)
    }
  }

  const handleStartBreak = async () => {
    if (!supabase || !attendanceId || !userId) {
      toast.error('Cannot start break without active check-in')
      return
    }

    setLoading(true)
    try {
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
        console.error('Start break error details:', {
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

      setActiveBreak(data)
      toast.success('☕ Break started')
      fetchBreaks()
    } catch (err: any) {
      console.error('Start break error:', err)
      toast.error(err.message || 'Failed to start break. Please ensure the database is set up correctly.')
    } finally {
      setLoading(false)
    }
  }

  const handleEndBreak = async () => {
    if (!supabase || !activeBreak) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('breaks')
        .update({
          break_end: new Date().toISOString()
        })
        .eq('id', activeBreak.id)

      if (error) {
        console.error('End break error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw new Error(error.message || 'Failed to end break')
      }

      setActiveBreak(null)
      toast.success('✅ Break ended')
      fetchBreaks()
    } catch (err: any) {
      console.error('End break error:', err)
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
    const total = todayBreaks.reduce((acc, b) => {
      if (b.break_duration) {
        return acc + b.break_duration
      }
      return acc
    }, 0)
    
    const hours = Math.floor(total / 60)
    const minutes = Math.round(total % 60)
    
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
          <div className="text-xs text-muted-foreground">
            Total: {getTotalBreakTime()}
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
            onClick={handleStartBreak}
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
            onClick={handleEndBreak}
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
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Today's Breaks</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {todayBreaks.map((breakItem) => (
              <div
                key={breakItem.id}
                className="flex items-center justify-between text-xs bg-muted/50 rounded p-2"
              >
                <div className="flex items-center space-x-2">
                  <span>{getBreakTypeIcon(breakItem.break_type)}</span>
                  <div>
                    <p className="font-medium capitalize">{breakItem.break_type.replace('_', ' ')}</p>
                    <p className="text-muted-foreground">
                      {new Date(breakItem.break_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {breakItem.break_end && ` - ${new Date(breakItem.break_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                </div>
                <span className="font-medium text-primary">
                  {formatBreakDuration(breakItem.break_start, breakItem.break_end)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

