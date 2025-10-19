'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export function NewTaskModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const { supabase, session } = useSupabase()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    order_id: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
  })

  const [orders, setOrders] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])

  // ✅ Fetch current user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) return
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, email')
        .eq('id', session.user.id)
        .single()

      if (error) {
        console.error('Failed to fetch user profile:', error)
        return
      }
      setUserProfile(data)
      setRole(data.role)
    }

    fetchUserProfile()
  }, [session, supabase])

  // ✅ Fetch orders and available assignees
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, customer_name')
          .order('created_at', { ascending: false })

        if (ordersError) throw ordersError

        let { data: staffData, error: staffError } = await supabase
          .from('profiles')
          .select('id, name, email, staff_id, role, is_active')
          .order('created_at', { ascending: true })

        if (staffError) throw staffError

        // ✅ CEO & Manager can assign to staff or manager
        if (role === 'ceo' || role === 'manager') {
          staffData = staffData?.filter(
            (p) => (p.role === 'staff' || p.role === 'manager') && p.is_active
          )
        }

        setOrders(ordersData || [])
        setStaff(staffData || [])
      } catch (err) {
        console.error('Error fetching dropdown data:', err)
        toast.error('Failed to load staff or orders.')
      }
    }

    if (isOpen && role) fetchData()
  }, [isOpen, role, supabase])

  // ✅ Handle form input
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // ✅ Handle task creation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (role === 'staff') {
      toast.error('You are not authorized to create tasks.')
      return
    }

    setLoading(true)

    const { error } = await supabase.from('tasks').insert([
      {
        title: formData.title,
        description: formData.description,
        assigned_to: formData.assigned_to || null,
        order_id: formData.order_id || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date ? new Date(formData.due_date) : null,
        assigned_by: userProfile?.name || session?.user?.email || 'System',
      },
    ])

    if (error) {
      console.error('Task creation failed:', error)
      toast.error(`Failed to create task: ${error.message}`)
    } else {
      toast.success('✅ Task created successfully!')
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        order_id: '',
        status: 'pending',
        priority: 'medium',
        due_date: '',
      })
      onClose()
    }

    setLoading(false)
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-lg bg-card p-6 border border-border shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-xl font-semibold text-foreground">
              New Task
            </Dialog.Title>
            <button onClick={onClose}>
              <XMarkIcon className="h-6 w-6 text-muted-foreground hover:text-primary" />
            </button>
          </div>

          {/* ✅ Block staff from creating tasks */}
          {role === 'staff' ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                🚫 You do not have permission to create or assign tasks.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="title"
                placeholder="Task Title"
                value={formData.title}
                onChange={handleChange}
                className="w-full rounded-md border border-border p-2 bg-background"
                required
              />

              <textarea
                name="description"
                placeholder="Task Description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-md border border-border p-2 bg-background"
              />

              <div className="grid grid-cols-2 gap-4">
                <select
                  name="order_id"
                  value={formData.order_id}
                  onChange={handleChange}
                  className="rounded-md border border-border p-2 bg-background"
                >
                  <option value="">Select Order</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.customer_name}
                    </option>
                  ))}
                </select>

                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  className="rounded-md border border-border p-2 bg-background"
                >
                  <option value="">Assign Staff or Manager</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email}) — {s.staff_id || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="rounded-md border border-border p-2 bg-background"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="rounded-md border border-border p-2 bg-background"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full rounded-md border border-border p-2 bg-background"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground p-2 rounded-md hover:bg-primary/90 transition"
              >
                {loading ? 'Creating...' : 'Create Task'}
              </button>
            </form>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
