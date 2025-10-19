'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

interface StaffAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderTitle: string
  currentStaffId?: string
  onAssignmentComplete: () => void
}

export function StaffAssignmentModal({
  isOpen,
  onClose,
  orderId,
  orderTitle,
  currentStaffId,
  onAssignmentComplete,
}: StaffAssignmentModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(currentStaffId || null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [staff, setStaff] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  // ✅ Fetch current user (to know who assigns)
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email) setCurrentUserEmail(user.email)
    }
    fetchCurrentUser()
  }, [])

  // ✅ Fetch assignable users (staff + managers only)
  useEffect(() => {
    const fetchAssignableUsers = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, role')
          .in('role', ['staff', 'manager'])
          .order('role', { ascending: true })

        if (error) {
          console.error('Error fetching staff:', error.message || error)
          toast.error('Failed to fetch users.')
        } else {
          setStaff(data || [])
        }
      } catch (err) {
        console.error('Unexpected fetch error:', err)
        toast.error('Unexpected error fetching users.')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) fetchAssignableUsers()
  }, [isOpen])

  // ✅ Filter users by name/email
  const filteredStaff = staff.filter(
    (member) =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ✅ Handle task assignment
  const handleAssignment = async () => {
    if (!selectedStaffId) {
      toast.error('Please select a staff or manager.')
      return
    }

    setIsAssigning(true)
    try {
      // Check for an existing task linked to this order
      const { data: existingTask, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

      if (existingTask) {
        // 🔁 Update existing task assignment
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            assigned_to: selectedStaffId,
            updated_at: new Date().toISOString(),
            assigned_by: currentUserEmail || 'System',
          })
          .eq('id', existingTask.id)

        if (updateError) throw updateError
        toast.success('Task reassigned successfully ✅')
      } else {
        // 🆕 Create new task linked to the order
        const { error: insertError } = await supabase.from('tasks').insert([
          {
            title: `Order: ${orderTitle}`,
            description: `Task automatically created for Order ${orderId}`,
            order_id: orderId,
            assigned_to: selectedStaffId,
            assigned_at: new Date().toISOString(),
            status: 'pending',
            priority: 'medium',
            assigned_by: currentUserEmail || 'System',
          },
        ])

        if (insertError) throw insertError
        toast.success('Task created and assigned successfully ✅')
      }

      onAssignmentComplete()
      onClose()
    } catch (error: any) {
      console.error('Error assigning task:', error?.message || error)
      toast.error(`Failed to assign task: ${error?.message || 'Unknown error'}`)
    } finally {
      setIsAssigning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">Assign User</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Order: {orderTitle}</p>
            <p className="text-xs text-muted-foreground">Order ID: {orderId}</p>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* User List */}
          <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-muted-foreground">Loading users...</span>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No users found</div>
            ) : (
              filteredStaff.map((member) => (
                <div
                  key={member.id}
                  onClick={() => setSelectedStaffId(member.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedStaffId === member.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {member.name || 'Unnamed User'}
                      </p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {member.role}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignment}
              disabled={!selectedStaffId || isAssigning}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAssigning ? 'Assigning...' : 'Assign Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
