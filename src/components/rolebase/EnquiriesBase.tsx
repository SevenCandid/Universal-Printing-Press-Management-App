'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { MessageCircle, Clock, ArrowRightCircle, Pencil, Trash } from 'lucide-react'
import { useSupabase } from '@/components/providers/SupabaseProvider'

export default function EnquiriesBase() {
  const { supabase } = useSupabase()
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const [periodFilter, setPeriodFilter] = useState<string>('all')
  const [convertingId, setConvertingId] = useState<number | null>(null)

  const [newEnquiry, setNewEnquiry] = useState({
    client_name: '',
    contact_number: '',
    whatsapp_number: '',
    message: '',
    follow_up_date: '',
  })

  const [editingEnquiry, setEditingEnquiry] = useState<any | null>(null)

  // ✅ Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id
      if (!userId) return

      const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
      if (data?.role) setUserRole(data.role.toLowerCase())
    }
    fetchRole()
  }, [supabase])

  // ✅ Fetch enquiries with period filter
  const fetchEnquiries = async () => {
    setLoading(true)
    let query = supabase.from('enquiries').select('*').order('created_at', { ascending: false })

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

    const { data, error } = await query
    if (error) {
      toast.error('Failed to load enquiries.')
      console.error('Fetch Error:', error)
    } else {
      setEnquiries(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEnquiries()
  }, [periodFilter])

  // ✅ Handle new enquiry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('enquiries').insert([
      {
        client_name: newEnquiry.client_name,
        contact_number: newEnquiry.contact_number,
        whatsapp_number: newEnquiry.whatsapp_number,
        message: newEnquiry.message,
        follow_up_date: newEnquiry.follow_up_date || null,
        status: 'new',
        converted_to_order: false,
      },
    ])

    if (error) {
      toast.error('Failed to add enquiry.')
    } else {
      toast.success('Enquiry added successfully!')
      setNewEnquiry({ client_name: '', contact_number: '', whatsapp_number: '', message: '', follow_up_date: '' })
      fetchEnquiries()
    }
  }

  // ✅ Convert to order - Actually creates an order!
  const markAsConverted = async (id: number) => {
    setConvertingId(id) // Set loading state
    
    try {
      // Get the enquiry details
      const { data: enquiry, error: fetchError } = await supabase
        .from('enquiries')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !enquiry) {
        toast.error('Failed to fetch enquiry details.')
        setConvertingId(null)
        return
      }

      // Get current user ID
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData?.user?.id

      // Generate order number
      const orderNumber = 'ORD-' + Math.floor(100000 + Math.random() * 900000)

      // Create the order
      const orderData = {
        order_number: orderNumber,
        customer_name: enquiry.client_name,
        customer_phone: enquiry.contact_number || '',
        item_description: enquiry.message || 'Converted from enquiry',
        quantity: 1,
        total_amount: 0, // Default - can be updated later
        payment_method: 'cash',
        payment_status: 'pending',
        order_status: 'pending',
        created_by: userId,
      }

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single()

      if (orderError) {
        console.error('Order creation error:', orderError)
        toast.error('Failed to create order: ' + orderError.message)
        setConvertingId(null)
        return
      }

      // Now mark the enquiry as converted
      const { error: updateError } = await supabase
        .from('enquiries')
        .update({ 
          converted_to_order: true, 
          status: 'converted'
        })
        .eq('id', id)

      if (updateError) {
        toast.error('Order created but failed to update enquiry status.')
        setConvertingId(null)
        return
      }

      toast.success(
        `✅ Enquiry converted to Order ${orderNumber}!\n\nYou can find it in Orders page.`,
        { duration: 5000 }
      )
      fetchEnquiries()
    } catch (error: any) {
      console.error('Conversion error:', error)
      toast.error('Failed to convert enquiry to order.')
    } finally {
      setConvertingId(null)
    }
  }

  // ✅ Edit enquiry
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('enquiries')
      .update({
        client_name: editingEnquiry.client_name,
        contact_number: editingEnquiry.contact_number,
        whatsapp_number: editingEnquiry.whatsapp_number,
        message: editingEnquiry.message,
        follow_up_date: editingEnquiry.follow_up_date || null,
      })
      .eq('id', editingEnquiry.id)

    if (error) {
      toast.error('Failed to update enquiry.')
    } else {
      toast.success('Enquiry updated!')
      setEditingEnquiry(null)
      fetchEnquiries()
    }
  }

  // ✅ Delete enquiry (only CEO / Manager)
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this enquiry?')) return

    const { error } = await supabase.from('enquiries').delete().eq('id', id)
    if (error) {
      toast.error('Failed to delete enquiry.')
    } else {
      toast.success('Enquiry deleted successfully.')
      fetchEnquiries()
    }
  }

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
        <h1 className="text-3xl font-bold">📋 Enquiries Base</h1>

        {/* Period Filter */}
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

        <Dialog>
          <DialogTrigger asChild>
            <Button>Add New Enquiry</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Enquiry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="Client Name"
                value={newEnquiry.client_name}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, client_name: e.target.value })}
                required
              />
              <Input
                placeholder="Contact Number"
                value={newEnquiry.contact_number}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, contact_number: e.target.value })}
              />
              <Input
                placeholder="WhatsApp Number"
                value={newEnquiry.whatsapp_number}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, whatsapp_number: e.target.value })}
              />
              <Textarea
                placeholder="Message"
                value={newEnquiry.message}
                onChange={(e) => setNewEnquiry({ ...newEnquiry, message: e.target.value })}
              />
              <div>
                <label className="block text-sm mb-1">Follow-up Date</label>
                <Input
                  type="date"
                  value={newEnquiry.follow_up_date}
                  onChange={(e) => setNewEnquiry({ ...newEnquiry, follow_up_date: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Save Enquiry</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p>Loading enquiries...</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enquiries.map((enquiry) => (
            <Card key={enquiry.id} className="shadow-lg">
              <CardHeader>
                <CardTitle>{enquiry.client_name}</CardTitle>
                <p className="text-sm text-gray-500">{enquiry.contact_number || 'No contact'}</p>
              </CardHeader>
              <CardContent>
                <p className="mb-2">{enquiry.message}</p>
                {enquiry.follow_up_date && (
                  <p className="flex items-center gap-2 text-sm text-blue-500">
                    <Clock className="w-4 h-4" />
                    Follow-up: {format(new Date(enquiry.follow_up_date), 'dd MMM yyyy')}
                  </p>
                )}

                <div className="flex justify-between mt-4">
                  {enquiry.whatsapp_number && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `https://wa.me/${enquiry.whatsapp_number.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(
                            enquiry.client_name || ''
                          )}%2C%20following%20up%20on%20your%20enquiry.`,
                          '_blank'
                        )
                      }
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                  )}

                  {!enquiry.converted_to_order ? (
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => markAsConverted(enquiry.id)}
                      disabled={convertingId === enquiry.id}
                    >
                      <ArrowRightCircle className="w-4 h-4 mr-1" />
                      {convertingId === enquiry.id ? 'Converting...' : 'Convert to Order'}
                    </Button>
                  ) : (
                    <span className="text-green-600 font-semibold">✅ Converted</span>
                  )}
                </div>

                {(userRole === 'manager' || userRole === 'ceo') && (
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingEnquiry(enquiry)}
                    >
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(enquiry.id)}
                    >
                      <Trash className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ✅ Edit Enquiry Dialog */}
      {editingEnquiry && (
        <Dialog open={!!editingEnquiry} onOpenChange={() => setEditingEnquiry(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Enquiry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-3">
              <Input
                placeholder="Client Name"
                value={editingEnquiry.client_name}
                onChange={(e) => setEditingEnquiry({ ...editingEnquiry, client_name: e.target.value })}
              />
              <Input
                placeholder="Contact Number"
                value={editingEnquiry.contact_number}
                onChange={(e) => setEditingEnquiry({ ...editingEnquiry, contact_number: e.target.value })}
              />
              <Input
                placeholder="WhatsApp Number"
                value={editingEnquiry.whatsapp_number}
                onChange={(e) => setEditingEnquiry({ ...editingEnquiry, whatsapp_number: e.target.value })}
              />
              <Textarea
                placeholder="Message"
                value={editingEnquiry.message}
                onChange={(e) => setEditingEnquiry({ ...editingEnquiry, message: e.target.value })}
              />
              <Input
                type="date"
                value={editingEnquiry.follow_up_date || ''}
                onChange={(e) => setEditingEnquiry({ ...editingEnquiry, follow_up_date: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingEnquiry(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
