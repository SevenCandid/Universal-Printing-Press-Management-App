'use client'

import { useState, useEffect } from 'react'
import { Dialog } from '@headlessui/react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

export function NewStaffModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    role: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [staffProfiles, setStaffProfiles] = useState<any[]>([]) // profiles with role='staff'

  // ✅ Fetch available staff from profiles table
  useEffect(() => {
    const fetchStaffProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, staff_id')
        .eq('role', 'staff')

      if (error) {
        console.error('Error fetching staff profiles:', error)
        toast.error('Could not load staff profiles')
      } else {
        setStaffProfiles(data)
      }
    }

    if (isOpen) fetchStaffProfiles()
  }, [isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // ✅ Automatically match staff_id from profiles
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const profileMatch = staffProfiles.find((p) => p.email === formData.email)
      if (!profileMatch) {
        toast.error('No matching staff profile found for this email.')
        setLoading(false)
        return
      }

      const { staff_id, id } = profileMatch

      const { error } = await supabase.from('staff').insert([
        {
          staff_id, // 🔗 comes directly from profiles
          name: formData.name,
          email: formData.email,
          department: formData.department,
          role: formData.role,
          phone: formData.phone,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ])

      if (error) throw error

      toast.success('✅ Staff member added successfully!')
      setFormData({ name: '', email: '', department: '', role: '', phone: '' })
      onClose()
    } catch (err) {
      console.error('Error adding staff:', err)
      toast.error('Failed to add staff.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl border border-border">
          <Dialog.Title className="text-lg font-semibold text-foreground mb-4">
            Add New Staff Member
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name"
              required
              className="w-full rounded-md border border-border bg-background p-2"
            />

            <select
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-border bg-background p-2"
            >
              <option value="">Select Staff Email</option>
              {staffProfiles.map((p) => (
                <option key={p.id} value={p.email}>
                  {p.email} ({p.staff_id})
                </option>
              ))}
            </select>

            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Department"
              required
              className="w-full rounded-md border border-border bg-background p-2"
            />

            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-border bg-background p-2"
            >
              <option value="">Select Role</option>
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
              <option value="technician">Technician</option>
              <option value="assistant">Assistant</option>
            </select>

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              required
              className="w-full rounded-md border border-border bg-background p-2"
            />

            <div className="flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md border border-border text-sm hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                {loading ? 'Saving...' : 'Add Staff'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
