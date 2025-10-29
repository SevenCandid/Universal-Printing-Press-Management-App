'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { 
  XMarkIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

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
  reviewer_name?: string
  days_requested?: number
}

type LeaveRequestModalProps = {
  isOpen: boolean
  onClose: () => void
  role: string
}

export default function LeaveRequestModal({ isOpen, onClose, role }: LeaveRequestModalProps) {
  const { supabase, session } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'request' | 'history' | 'manage'>('request')
  
  // Request form state
  const [requestType, setRequestType] = useState('leave')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  
  // Leave requests
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([])
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([])

  const canManageRequests = role === 'ceo' || role === 'manager' || role === 'executive_assistant'

  useEffect(() => {
    if (isOpen && session?.user) {
      fetchMyRequests()
      if (canManageRequests) {
        fetchPendingRequests()
      }
    }
  }, [isOpen, session])

  const fetchMyRequests = async () => {
    if (!supabase || !session?.user) return

    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        // Silently fail if table doesn't exist (setup not done)
        if (error.code === '42P01') {
          console.warn('Leave requests table not found. Run ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql')
          setMyRequests([])
          return
        }
        throw error
      }
      setMyRequests(data || [])
    } catch (err) {
      console.error('Fetch my requests error:', err)
    }
  }

  const fetchPendingRequests = async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('leave_requests_detailed')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true})

      if (error) {
        // Silently fail if view doesn't exist (setup not done)
        if (error.code === '42P01') {
          console.warn('Leave requests view not found. Run ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql')
          setPendingRequests([])
          return
        }
        throw error
      }
      setPendingRequests(data || [])
    } catch (err) {
      console.error('Fetch pending requests error:', err)
    }
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!supabase || !session?.user) {
      toast.error('Please sign in to submit a request')
      return
    }

    if (!startDate || !endDate || !reason.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      toast.error('End date must be after start date')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('leave_requests')
        .insert([{
          user_id: session.user.id,
          request_type: requestType,
          start_date: startDate,
          end_date: endDate,
          reason: reason.trim(),
          status: 'pending'
        }])

      if (error) {
        console.error('Leave request error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        
        // User-friendly error messages
        if (error.code === '42P01') {
          throw new Error('Leave requests table not found. Please run ATTENDANCE_BREAKS_AND_LEAVE_SETUP.sql in Supabase.')
        } else if (error.code === '42501') {
          throw new Error('Permission denied. Please check database policies.')
        } else if (error.message?.includes('violates check constraint')) {
          // Show which constraint failed
          if (error.message?.includes('valid_date_range')) {
            throw new Error('End date must be on or after start date.')
          } else if (error.message?.includes('request_type')) {
            throw new Error(`Invalid request type. Must be one of: leave, holiday, sick_leave, personal, emergency, excuse`)
          } else {
            throw new Error(`Check constraint violation: ${error.message}`)
          }
        } else if (error.code === '23514') {
          // Check constraint violation
          throw new Error(`Invalid data: ${error.message}`)
        } else {
          throw new Error(error.message || 'Failed to submit leave request')
        }
      }

      toast.success('✅ Leave request submitted successfully')
      
      // Reset form
      setRequestType('leave')
      setStartDate('')
      setEndDate('')
      setReason('')
      
      // Refresh requests
      fetchMyRequests()
      if (canManageRequests) {
        fetchPendingRequests()
      }
      
      // Switch to history tab
      setActiveTab('history')
    } catch (err: any) {
      console.error('Submit request error:', err)
      toast.error(err.message || 'Failed to submit request. Please ensure the database is set up correctly.')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveReject = async (requestId: string, newStatus: 'approved' | 'rejected', comments?: string) => {
    if (!supabase || !session?.user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: newStatus,
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
          reviewer_comments: comments || null
        })
        .eq('id', requestId)

      if (error) throw error

      toast.success(`✅ Request ${newStatus}`)
      fetchPendingRequests()
    } catch (err: any) {
      console.error('Update request error:', err)
      toast.error(err.message || 'Failed to update request')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRequest = async (requestId: string) => {
    if (!supabase) return

    if (!confirm('Are you sure you want to cancel this request?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)

      if (error) throw error

      toast.success('Request cancelled')
      fetchMyRequests()
    } catch (err: any) {
      console.error('Cancel request error:', err)
      toast.error(err.message || 'Failed to cancel request')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
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

  const getRequestTypeEmoji = (type: string) => {
    switch (type) {
      case 'holiday':
        return '🏖️'
      case 'sick_leave':
        return '🤒'
      case 'emergency':
        return '🚨'
      case 'personal':
        return '👤'
      case 'excuse':
        return '📝'
      default:
        return '📅'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-primary/5">
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-6 w-6 text-primary" />
            <h2 className="text-lg font-semibold">Leave & Absence Management</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-muted/30">
          <button
            onClick={() => setActiveTab('request')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'request'
                ? 'bg-card text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📝 New Request
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-card text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📋 My Requests ({myRequests.length})
          </button>
          {canManageRequests && (
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'manage'
                  ? 'bg-card text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ⚡ Pending ({pendingRequests.length})
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* New Request Tab */}
          {activeTab === 'request' && (
            <form onSubmit={handleSubmitRequest} className="space-y-4 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Request Type</label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  >
                    <option value="leave">📅 Annual Leave</option>
                    <option value="holiday">🏖️ Holiday</option>
                    <option value="sick_leave">🤒 Sick Leave</option>
                    <option value="personal">👤 Personal Leave</option>
                    <option value="emergency">🚨 Emergency</option>
                    <option value="excuse">📝 Excuse/Explanation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Duration</label>
                  <div className="w-full px-3 py-2 text-sm border border-border rounded-md bg-muted text-foreground">
                    {startDate && endDate ? (
                      `${Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)`
                    ) : (
                      'Select dates'
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Reason / Explanation</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Please provide details..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button
                  type="button"
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* My Requests History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {myRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarDaysIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No leave requests yet</p>
                  <Button
                    onClick={() => setActiveTab('request')}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    Create Request
                  </Button>
                </div>
              ) : (
                myRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getRequestTypeEmoji(request.request_type)}</span>
                        <div>
                          <h4 className="font-medium capitalize">
                            {request.request_type.replace('_', ' ')}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {request.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{request.reason}</p>
                    
                    {request.reviewer_comments && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <p className="font-medium mb-1">Manager's Comment:</p>
                        <p className="text-muted-foreground">{request.reviewer_comments}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        Submitted {new Date(request.created_at).toLocaleDateString()}
                      </span>
                      {request.status === 'pending' && (
                        <Button
                          onClick={() => handleCancelRequest(request.id)}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          disabled={loading}
                        >
                          Cancel Request
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Manage Requests Tab (CEO/Manager only) */}
          {activeTab === 'manage' && canManageRequests && (
            <div className="space-y-3">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">No pending requests</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                          {request.requester_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-medium">{request.requester_name}</h4>
                          <p className="text-xs text-muted-foreground">{request.requester_email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl">{getRequestTypeEmoji(request.request_type)}</span>
                        <p className="text-xs text-muted-foreground capitalize mt-1">
                          {request.request_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-card rounded p-2">
                        <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                        <p className="text-sm font-medium">
                          {new Date(request.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="bg-card rounded p-2">
                        <p className="text-xs text-muted-foreground mb-1">End Date</p>
                        <p className="text-sm font-medium">
                          {new Date(request.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="bg-card rounded p-3 mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Reason:</p>
                      <p className="text-sm">{request.reason}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const comments = prompt('Add optional comments:')
                          handleApproveReject(request.id, 'approved', comments || undefined)
                        }}
                        disabled={loading}
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => {
                          const comments = prompt('Reason for rejection:')
                          if (comments) {
                            handleApproveReject(request.id, 'rejected', comments)
                          }
                        }}
                        disabled={loading}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                      >
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground text-center">
                      <ClockIcon className="h-3 w-3 inline mr-1" />
                      Requested {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

