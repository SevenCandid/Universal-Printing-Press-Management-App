'use client'

import { useEffect, useState, useCallback } from 'react'
import { PlusIcon, PencilSquareIcon, TrashIcon, UserIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { NewTaskModal } from '@/components/ui/NewTaskModal'
import { EditTaskModal } from '@/components/ui/EditTaskModal'
import toast from 'react-hot-toast'
import debounce from 'lodash.debounce'

export default function TasksPage() {
  const { supabase } = useSupabase()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<any | null>(null)
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string>('')

  const [periodFilter, setPeriodFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch user + role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!supabase) return
      const { data, error } = await supabase.auth.getUser()
      if (error || !data?.user) return
      setUser(data.user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile?.role) setRole(profile.role.toLowerCase())
    }

    fetchUserRole()
  }, [supabase])

  // Fetch tasks
  const fetchTasks = async (term = '') => {
    setLoading(true)

    let query = supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        created_at,
        order_id,
        assigned_to,
        assigned_by,
        orders:orders!tasks_order_id_fkey(
          id,
          order_number,
          order_status,
          customer_name
        ),
        profiles:profiles!tasks_assigned_to_fkey(
          id,
          name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false })

    if (role === 'staff' && user) query = query.eq('assigned_to', user.id)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)

    const today = new Date()
    const startDate = new Date()

    if (periodFilter === 'daily') {
      startDate.setHours(0, 0, 0, 0)
      query = query.gte('created_at', startDate.toISOString())
    } else if (periodFilter === 'weekly') {
      const day = today.getDay()
      const diff = today.getDate() - day + (day === 0 ? -6 : 1)
      startDate.setDate(diff)
      startDate.setHours(0, 0, 0, 0)
      query = query.gte('created_at', startDate.toISOString())
    } else if (periodFilter === 'monthly') {
      startDate.setDate(1)
      query = query.gte('created_at', startDate.toISOString())
    } else if (periodFilter === 'yearly') {
      startDate.setMonth(0, 1)
      query = query.gte('created_at', startDate.toISOString())
    }

    if (term.trim()) query = query.ilike('title', `%${term}%`)

    const { data, error } = await query

    if (error) {
      toast.error(error.message)
    } else {
      setTasks(data || [])
    }

    setLoading(false)
  }

  const debouncedSearch = useCallback(debounce(fetchTasks, 400), [role, statusFilter, periodFilter])

  useEffect(() => {
    if (role) fetchTasks()
  }, [role, statusFilter, periodFilter])

  useEffect(() => {
    debouncedSearch(searchTerm)
  }, [searchTerm])

  // Realtime updates
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('realtime-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchTasks(searchTerm))
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, role, searchTerm])

  const openEdit = (task: any) => {
    if (role === 'staff' && task.assigned_to !== user?.id) {
      toast.error('You can only update your own tasks.')
      return
    }
    setEditingTask(task)
  }

  const reassignTask = async (taskId: string, newAssigneeId: string) => {
    const { error } = await supabase.from('tasks').update({ assigned_to: newAssigneeId }).eq('id', taskId)
    if (error) toast.error('Failed to reassign task')
    else {
      toast.success('Task reassigned successfully')
      fetchTasks()
    }
  }

  const handleDeleted = async (id: string) => {
    const prevTasks = tasks
    setTasks((prev) => prev.filter((t) => t.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) {
      setTasks(prevTasks)
      toast.error('Failed to delete task')
    } else toast.success('Task deleted')
  }

  const handleStatusChange = async (taskId: string, newStatus: string, orderId: string | null) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (error) {
      toast.error('Failed to update task')
      fetchTasks()
      return
    }

    if (orderId) {
      const orderStatus =
        newStatus === 'completed' ? 'completed' : newStatus === 'in_progress' ? 'in_progress' : 'pending'
      await supabase.from('orders').update({ status: orderStatus }).eq('id', orderId)
    }

    toast.success('Task updated successfully')
  }

  // ✅ Split tasks for manager (NEW SECTION ADDED BELOW)
  // ✅ Improved logic for managers
const myTasks =
role === 'manager' && user
  ? tasks.filter((t) => t.assigned_to === user.id)
  : []

const otherTasks =
role === 'manager' && user
  ? tasks.filter(
      (t) =>
        (t.assigned_by === user.id || t.assigned_by === user.email || t.assigned_by === user.name) &&
        t.assigned_to !== user.id
    )
  : []



  if (!supabase) return null

  const renderTaskTable = (taskList: any[]) => (
    <table className="min-w-full divide-y divide-border">
      <thead className="bg-muted/50">
        <tr>
          {['Title', 'Assigned', 'Order', 'Priority', 'Status', 'Due', 'Created', 'Actions'].map((h) => (
            <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {loading ? (
          <tr>
            <td colSpan={8} className="text-center py-8 text-muted-foreground">Loading tasks...</td>
          </tr>
        ) : taskList.length === 0 ? (
          <tr>
            <td colSpan={8} className="text-center py-8 text-muted-foreground">No tasks found</td>
          </tr>
        ) : (
          taskList.map((t) => (
            <tr key={t.id} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-medium flex flex-col">
                {t.title}
                {role === 'manager' && (
                  <span className="text-xs text-muted-foreground mt-1">
                    Assigned by: {t.assigned_by === user?.id ? 'You' : t.profiles?.name || 'Unknown'}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-primary" />
                {t.profiles?.name || 'Unassigned'}
              </td>
              <td className="px-4 py-3 text-sm">{t.orders?.customer_name || '—'}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    t.priority === 'high'
                      ? 'bg-red-100 text-red-800'
                      : t.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {t.priority}
                </span>
              </td>
              <td className="px-4 py-3">
                {role === 'staff' && t.assigned_to === user?.id ? (
                  <select
                    value={t.status}
                    onChange={(e) => handleStatusChange(t.id, e.target.value, t.order_id)}
                    className="border rounded-md px-2 py-1 text-xs"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                ) : (
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      t.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : t.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {t.status.replace('_', ' ')}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">{t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}</td>
              <td className="px-4 py-3 text-sm">{new Date(t.created_at).toLocaleDateString()}</td>
              <td className="px-4 py-3 flex gap-2">
                {(role === 'admin' || role === 'manager' || t.assigned_to === user?.id) && (
                  <button onClick={() => openEdit(t)} title="Edit" className="text-blue-600 hover:text-blue-800">
                    <PencilSquareIcon className="h-5 w-5" />
                  </button>
                )}
                {(role === 'ceo' || role === 'manager') && (
                  <button
                    onClick={() => {
                      const newAssignee = prompt('Enter new staff ID to reassign:')
                      if (newAssignee) reassignTask(t.id, newAssignee)
                    }}
                    title="Reassign Task"
                    className="text-yellow-600 hover:text-yellow-800"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                  </button>
                )}
                {(role === 'admin' || role === 'manager' || role === 'ceo') && (
                  <button onClick={() => handleDeleted(t.id)} title="Delete" className="text-red-600 hover:text-red-800">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                )}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ArrowPathIcon className="h-8 w-8 text-primary" /> Task Management
          </h1>
          <p className="text-muted-foreground">Assign, track and update task statuses.</p>
        </div>

        {(role === 'admin' || role === 'manager' || role === 'ceo') && (
          <button
            onClick={() => setIsNewOpen(true)}
            className="px-4 py-2 rounded-md bg-primary text-white flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" /> New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 border p-3 rounded-md bg-muted/30">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Search:</label>
          <input
            type="text"
            placeholder="Search by title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Period:</label>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="daily">Today</option>
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-md px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* ✅ Manager View: Three Sections */}
      {role === 'manager' && (
        <>
          <h2 className="text-xl font-semibold mt-6">My Tasks</h2>
<div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
  {renderTaskTable(myTasks)}
</div>

<h2 className="text-xl font-semibold mt-8">Other Tasks</h2>
<div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
  {renderTaskTable(otherTasks)}
</div>

        </>
      )}

      {/* Default single table for all other roles */}
      {role !== 'manager' && (
        <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
          {renderTaskTable(tasks)}
        </div>
      )}

      {(role === 'admin' || role === 'manager' || role === 'ceo') && (
        <NewTaskModal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} />
      )}

      {editingTask && (
        <EditTaskModal
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
          onSaved={() => fetchTasks()}
          onDeleted={() => fetchTasks()}
        />
      )}
    </div>
  )
}
