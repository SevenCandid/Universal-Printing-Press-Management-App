'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { NewStaffModal } from '@/components/ui/NewStaffModal'
import toast from 'react-hot-toast'
import debounce from 'lodash.debounce'

type UserProfile = {
  id: string
  name: string
  email: string
  role: string
  staff_id?: string
  phone?: string
  is_active: boolean
  created_at: string
}

export default function StaffBase() {
  const { supabase } = useSupabase()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState({ role: '', is_active: true })
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // ✅ Fetch current user role
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user.id)
        .single()
      setUserRole(profile?.role?.toLowerCase() || null)
    }
    fetchUserRole()
  }, [supabase])

  // ✅ Fetch all users
  const fetchUsers = async (term = '') => {
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (term.trim()) {
        query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%`)
      }
      const { data, error } = await query
      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const debouncedSearch = useCallback(debounce(fetchUsers, 400), [])
  useEffect(() => {
    debouncedSearch(searchTerm)
  }, [searchTerm])

  // ✅ Edit user
  const handleEditClick = (user: UserProfile) => {
    if (userRole !== 'ceo') return toast.error('Only CEO can edit users')
    if (user.role.toLowerCase() === 'ceo') return toast.error('CEO account cannot be edited')
    setEditing(user.id)
    setEditData({ role: user.role, is_active: user.is_active })
  }

  const handleSaveEdit = async (id: string) => {
    if (userRole !== 'ceo') return toast.error('Only CEO can edit users')
    const userToEdit = users.find((u) => u.id === id)
    if (userToEdit?.role.toLowerCase() === 'ceo') return toast.error('Cannot modify CEO account')

    const prevUsers = users
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...editData } : u)))

    const { error } = await supabase.from('profiles').update(editData).eq('id', id)
    if (error) {
      toast.error(`Failed to update: ${error.message}`)
      setUsers(prevUsers)
    } else {
      toast.success('✅ User updated successfully')
      setEditing(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (userRole !== 'ceo') return toast.error('Only CEO can delete users')
    const userToDelete = users.find((u) => u.id === id)
    if (userToDelete?.role.toLowerCase() === 'ceo')
      return toast.error('Cannot delete CEO account')
    if (!confirm('Are you sure you want to delete this user?')) return

    const prevUsers = users
    setUsers((prev) => prev.filter((u) => u.id !== id))

    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) {
      toast.error(`Failed to delete: ${error.message}`)
      setUsers(prevUsers)
    } else {
      toast.success('🗑️ User deleted')
    }
  }

  if (loading)
    return <div className="flex items-center justify-center h-64">Loading users...</div>

  const grouped = users.reduce((acc, u) => {
    const role = u.role?.toLowerCase() || 'unknown'
    if (!acc[role]) acc[role] = []
    acc[role].push(u)
    return acc
  }, {} as Record<string, UserProfile[]>)

  Object.keys(grouped).forEach((r) =>
    grouped[r].sort((a, b) => (a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1))
  )

  const rolesOrder = ['ceo', 'manager', 'board', 'staff', 'unknown']

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="text-center sm:text-left space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage your organization’s users and permissions.
            {userRole === 'ceo' && (
              <span className="ml-2 text-xs sm:text-sm text-green-600">
                (You can edit users)
              </span>
            )}
          </p>
        </div>

        {userRole === 'ceo' && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition w-full sm:w-auto"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="border p-2 sm:p-3 rounded-md bg-muted/30 shadow-sm">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* User Tables */}
      {rolesOrder.map(
        (role) =>
          grouped[role]?.length > 0 && (
            <div key={role} className="space-y-3">
              <h2 className="text-lg sm:text-xl font-semibold">
                  {{
                    ceo: 'Chief Executive Officer',
                    manager: 'Manager(s)',
                    board: 'Board of Directors',
                    staff: 'Staff Members',
                    unknown: 'Others',
                  }[role] || role}
                </h2>

              <div className="overflow-x-auto border bg-card rounded-lg shadow-sm">
                <table className="min-w-full divide-y text-xs sm:text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {[
                        'Staff ID',
                        'Name',
                        'Email',
                        'Role',
                        'Status',
                        'Joined',
                        userRole === 'ceo' ? 'Actions' : '',
                      ]
                        .filter(Boolean)
                        .map((h) => (
                          <th
                            key={h}
                            className="px-4 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-medium uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grouped[role].map((u) => (
                      <tr
                        key={u.id}
                        className={`${!u.is_active ? 'opacity-60 italic' : ''} hover:bg-muted/30`}
                      >
                        <td className="px-4 sm:px-6 py-3 font-mono text-[11px] sm:text-xs whitespace-nowrap">
                          {u.staff_id || '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-3 flex items-center gap-2 whitespace-nowrap">
                          <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[120px] sm:max-w-none">
                            {u.name}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{u.email}</td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap">{u.role}</td>
                        <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                          {u.is_active ? (
                            <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-[11px] sm:text-xs whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        {userRole === 'ceo' && (
                          <td className="px-4 sm:px-6 py-3 flex gap-2 whitespace-nowrap">
                            <button
                              onClick={() => handleEditClick(u)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <PencilSquareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}

      {userRole === 'ceo' && (
        <NewStaffModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      )}
    </div>
  )
}
