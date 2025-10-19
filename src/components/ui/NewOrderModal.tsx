'use client'

import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

export function NewOrderModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    item_description: '',
    quantity: '',
    total_amount: '',
    payment_method: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000)

    const { error } = await supabase.from('orders').insert([
      {
        order_number: orderNumber,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        item_description: formData.item_description,
        quantity: Number(formData.quantity),
        total_amount: Number(formData.total_amount),
        payment_method: formData.payment_method,
        payment_status: 'pending',
        order_status: 'pending',
        created_by: 'Admin',
      },
    ])

    if (error) {
      toast.error(`❌ Failed to create order: ${error.message}`)
    } else {
      toast.success('✅ Order created successfully!')
      setFormData({
        customer_name: '',
        customer_phone: '',
        item_description: '',
        quantity: '',
        total_amount: '',
        payment_method: '',
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
            <Dialog.Title className="text-xl font-semibold text-foreground">New Order</Dialog.Title>
            <button onClick={onClose}>
              <XMarkIcon className="h-6 w-6 text-muted-foreground hover:text-primary" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              name="customer_name"
              placeholder="Customer Name"
              value={formData.customer_name}
              onChange={handleChange}
              className="w-full rounded-md border border-border p-2 bg-background"
              required
            />
            <input
              type="text"
              name="customer_phone"
              placeholder="Customer Mobile Number"
              value={formData.customer_phone}
              onChange={handleChange}
              className="w-full rounded-md border border-border p-2 bg-background"
              required
            />
            <textarea
              name="item_description"
              placeholder="Item Description"
              value={formData.item_description}
              onChange={handleChange}
              className="w-full rounded-md border border-border p-2 bg-background"
              rows={3}
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                name="quantity"
                placeholder="Quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="rounded-md border border-border p-2 bg-background"
              />
              <input
                type="number"
                name="total_amount"
                placeholder="Total Amount (₵)"
                value={formData.total_amount}
                onChange={handleChange}
                className="rounded-md border border-border p-2 bg-background"
              />
            </div>
            <input
              type="text"
              name="payment_method"
              placeholder="Payment Method (Cash, MoMo, etc)"
              value={formData.payment_method}
              onChange={handleChange}
              className="w-full rounded-md border border-border p-2 bg-background"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground p-2 rounded-md hover:bg-primary/90 transition"
            >
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
