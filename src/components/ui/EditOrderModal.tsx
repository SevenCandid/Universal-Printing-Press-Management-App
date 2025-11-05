'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  item_description?: string
  quantity?: number
  unit_price?: number
  total_amount?: number
  payment_method?: string
  payment_status?: string
  order_status?: string
  due_date?: string
  notes?: string
}

interface EditOrderModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order | null
  onSuccess: () => void
}

export function EditOrderModal({ isOpen, onClose, order, onSuccess }: EditOrderModalProps) {
  const { supabase } = useSupabase()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Order>>({})

  useEffect(() => {
    if (order) {
      setFormData({
        customer_name: order.customer_name || '',
        customer_phone: order.customer_phone || '',
        customer_email: order.customer_email || '',
        item_description: order.item_description || '',
        quantity: order.quantity || 0,
        unit_price: order.unit_price || 0,
        total_amount: order.total_amount || 0,
        payment_method: order.payment_method || 'cash',
        payment_status: order.payment_status || 'pending',
        order_status: order.order_status || 'pending',
        due_date: order.due_date || '',
        notes: order.notes || '',
      })
    }
  }, [order])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order || !supabase) return

    setLoading(true)
    try {
      // Build update object with only non-empty values
      const updateData: any = {
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        item_description: formData.item_description,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        total_amount: formData.total_amount,
        payment_method: formData.payment_method,
        payment_status: formData.payment_status,
        order_status: formData.order_status,
      }

      // Add optional fields only if they have values
      if (formData.customer_email) updateData.customer_email = formData.customer_email
      if (formData.due_date) updateData.due_date = formData.due_date
      if (formData.notes) updateData.notes = formData.notes

      // Try to add updated_at timestamp
      try {
        updateData.updated_at = new Date().toISOString()
      } catch (e) {
        console.warn('Cannot set updated_at, column may not exist')
      }

      console.log('Updating order with data:', updateData)
      
      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)
        .select()

      console.log('Update response:', { data, error })

      if (error) {
        console.error('Order update error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        })
        throw new Error(error.message || 'Failed to update order')
      }

      // Create notification for order edit (optional, won't fail if notifications table doesn't exist)
      try {
        await supabase.from('notifications').insert({
          title: '📝 Order Updated',
          message: `Order #${order.order_number} has been updated`,
          type: 'order',
          link: '/orders',
          user_role: 'all',
          read: false,
        })
      } catch (notifErr) {
        // Silently fail if notifications table doesn't exist
        console.warn('Notification insert failed:', notifErr)
      }

      toast.success('Order updated successfully!')
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Update order error:', err)
      const errorMessage = err?.message || err?.error_description || 'Failed to update order'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background border border-border shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold">Edit Order</h2>
            <p className="text-sm text-muted-foreground">Order #{order.order_number}</p>
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
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Customer Name <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={formData.customer_name || ''}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  required
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  type="tel"
                  value={formData.customer_phone || ''}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="+233 123 456 789"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.customer_email || ''}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="customer@example.com"
                />
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Order Details</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Item Description</label>
              <Textarea
                value={formData.item_description || ''}
                onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
                placeholder="Describe the printing job..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <Input
                  type="number"
                  value={formData.quantity || 0}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit Price (₵)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.unit_price || 0}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Total Amount (₵) <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_amount || 0}
                  onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                  required
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Payment & Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Payment & Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  value={formData.payment_method || 'cash'}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="cash">Cash</option>
                  <option value="momo">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Status</label>
                <select
                  value={formData.payment_status || 'pending'}
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="pending">Pending</option>
                  <option value="partial payment">Partial Payment</option>
                  <option value="full payment">Full Payment</option>
                  <option value="pending on contract">Pending on Contract</option>
                  <option value="partially paid on contract">Partially Paid on Contract</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Order Status</label>
                <select
                  value={formData.order_status || 'pending'}
                  onChange={(e) => setFormData({ ...formData, order_status: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <Input
                  type="date"
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={2}
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

