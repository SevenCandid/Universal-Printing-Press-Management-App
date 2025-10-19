'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'


import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { MessageCircle, Clock, ArrowRightCircle } from 'lucide-react'

export default function EnquiriesBase() {
  const router = useRouter()
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newEnquiry, setNewEnquiry] = useState({
    client_name: '',
    contact_number: '',
    whatsapp_number: '',
    message: '',
    follow_up_date: '',
  })

  // Fetch enquiries
  const fetchEnquiries = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('enquiries').select('*').order('created_at', { ascending: false })
    if (error) {
      toast.error('Failed to load enquiries.')
      console.error('Fetch Error:', error)
    } else {
      setEnquiries(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEnquiries()
  }, [])

  // Handle new enquiry
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data, error } = await supabase.from('enquiries').insert([
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
      console.error('Insert Error:', error.message)
      toast.error('Failed to add enquiry.')
    } else {
      toast.success('Enquiry added successfully!')
      setNewEnquiry({ client_name: '', contact_number: '', whatsapp_number: '', message: '', follow_up_date: '' })
      fetchEnquiries()
    }
  }

  // Convert enquiry to order
  const markAsConverted = async (id: number) => {
    const { error } = await supabase.from('enquiries').update({ converted_to_order: true, status: 'converted' }).eq('id', id)
    if (error) {
      console.error('Conversion Error:', error.message)
      toast.error('Failed to mark as converted.')
    } else {
      toast.success('Marked as converted!')
      fetchEnquiries()
    }
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📋 Enquiries Base</h1>

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
                    <Button variant="default" size="sm" onClick={() => markAsConverted(enquiry.id)}>
                      <ArrowRightCircle className="w-4 h-4 mr-1" />
                      Convert
                    </Button>
                  ) : (
                    <span className="text-green-600 font-semibold">✅ Converted</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
