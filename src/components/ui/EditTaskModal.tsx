'use client'

import { useEffect, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

type TaskPayload = {
  id: string
  title: string
  description?: string
  assigned_to?: string | null
  order_id?: string | null
  status?: string
  priority?: string
  due_date?: string | null
}

export function EditTaskModal({
  isOpen,
  onClose,
  task,
  onSaved,
  onDeleted,
}: {
  isOpen: boolean
  onClose: () => void
  task: TaskPayload | null
  onSaved?: (updated: any) => void
  onDeleted?: (deletedId: string) => void
}) {
  const [form, setForm] = useState<TaskPayload | null>(null)
  const [staff, setStaff] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  useEffect(() => {
    if (task) {
      // map due_date to yyyy-mm-dd if present
      setForm({
        ...task,
        due_date:
          task.due_date && task.due_date !== null
            ? new Date(task.due_date).toISOString().slice(0, 10)
            : '',
      })
    } else {
      setForm(null)
    }
  }, [task])

  useEffect(() => {
    if (!isOpen) return
    // fetch staff and orders for dropdowns
    const fetch = async () => {
      const { data: staffData, error: staffErr } = await supabase
        .from('staff')
        .select('id, name')
        .order('name', { ascending: true })
      if (staffErr) toast.error('Failed to load staff')

      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('id, order_number, customer_name')
        .order('created_at', { ascending: false })
      if (ordersErr) toast.error('Failed to load orders')

      setStaff(staffData || [])
      setOrders(ordersData || [])
    }
    fetch()
  }, [isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!form) return
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!form) return
    setLoading(true)
    const payload: any = {
      title: form.title,
      description: form.description ?? null,
      assigned_to: form.assigned_to || null,
      order_id: form.order_id || null,
      status: form.status ?? 'pending',
      priority: form.priority ?? 'medium',
      due_date: form.due_date ? new Date(form.due_date) : null,
      updated_at: new Date(),
    }

    const { data, error } = await supabase.from('tasks').update(payload).eq('id', form.id).select().single()
    if (error) {
      toast.error(`Failed to save: ${error.message}`)
    } else {
      toast.success('✅ Task updated')
      onSaved?.(data)
      onClose()
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!form) return
    setDeleting(true)
    const { error } = await supabase.from('tasks').delete().eq('id', form.id)
    if (error) toast.error(`Delete failed: ${error.message}`)
    else {
      toast.success('🗑️ Task deleted')
      onDeleted?.(form.id)
      setConfirmDeleteOpen(false)
      onClose()
    }
    setDeleting(false)
  }

  return (
    <>
      {/* Edit Modal */}
      <Dialog open={isOpen} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-xl rounded-lg bg-card p-6 border border-border shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-xl font-semibold text-foreground">Edit Task</Dialog.Title>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                >
                  <div className="flex items-center gap-2">
                    <TrashIcon className="h-5 w-5" /> <span>Delete</span>
                  </div>
                </button>
                <button onClick={onClose} aria-label="Close">
                  <XMarkIcon className="h-6 w-6 text-muted-foreground hover:text-primary" />
                </button>
              </div>
            </div>

            {!form ? (
              <div className="text-center text-muted-foreground py-10">No task selected</div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Task Title"
                  required
                  className="w-full rounded-md border border-border p-2 bg-background"
                />

                <textarea
                  name="description"
                  value={form.description ?? ''}
                  onChange={handleChange}
                  placeholder="Description"
                  rows={3}
                  className="w-full rounded-md border border-border p-2 bg-background"
                />

                <div className="grid grid-cols-2 gap-4">
                  <select
                    name="assigned_to"
                    value={form.assigned_to ?? ''}
                    onChange={handleChange}
                    className="rounded-md border border-border p-2 bg-background"
                  >
                    <option value="">Unassigned</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <select
                    name="order_id"
                    value={form.order_id ?? ''}
                    onChange={handleChange}
                    className="rounded-md border border-border p-2 bg-background"
                  >
                    <option value="">No Order</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.order_number ?? o.id.slice(0, 8)} — {o.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <select
                    name="status"
                    value={form.status ?? 'pending'}
                    onChange={handleChange}
                    className="rounded-md border border-border p-2 bg-background"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="on_hold">On Hold</option>
                  </select>

                  <select
                    name="priority"
                    value={form.priority ?? 'medium'}
                    onChange={handleChange}
                    className="rounded-md border border-border p-2 bg-background"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>

                  <input
                    name="due_date"
                    type="date"
                    value={form.due_date ?? ''}
                    onChange={handleChange}
                    className="rounded-md border border-border p-2 bg-background"
                  />
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-md border border-border hover:bg-muted/10"
                    disabled={loading || deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
                    disabled={loading || deleting}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-lg bg-card p-5 border border-border shadow-lg">
            <Dialog.Title className="text-lg font-semibold text-foreground">Confirm Delete</Dialog.Title>
            <p className="text-sm text-muted-foreground mt-2">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteOpen(false)} className="px-4 py-2 rounded-md border border-border">Cancel</button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-md bg-red-600 text-white"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  )
}
