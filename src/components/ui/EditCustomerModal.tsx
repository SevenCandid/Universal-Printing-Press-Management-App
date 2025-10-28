'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Customer = {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  notes?: string | null
}

interface EditCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  customer: Customer | null
  onSuccess: () => void
}

export function EditCustomerModal({ isOpen, onClose, customer, onSuccess }: EditCustomerModalProps) {
  const { supabase } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    company: '',
    notes: '',
  })

  useEffect(() => {
    if (customer) {
      setFormData({
        full_name: customer.full_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        company: customer.company || '',
        notes: customer.notes || '',
      })
    }
  }, [customer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer || !supabase) return

    // Validation
    if (!formData.full_name.trim()) {
      toast.error('Customer name is required')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          full_name: formData.full_name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          company: formData.company.trim() || null,
          notes: formData.notes.trim() || null,
        })
        .eq('id', customer.id)

      if (error) throw error

      toast.success('Customer updated successfully!')
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Update customer error:', err)
      toast.error('Failed to update customer')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !customer) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border border-border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold">Edit Customer</h2>
            <p className="text-sm text-muted-foreground">Update customer information</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
              placeholder="Seven Frank"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="seven@example.com"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <Input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+233 123 456 789"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium mb-1">Company/Organization</label>
            <Input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="SevenLink Technologies"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this customer..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

