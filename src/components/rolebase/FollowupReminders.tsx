'use client'
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, Clock, CheckCircle } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'

export default function FollowupReminders() {
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchReminders() {
    try {
      const res = await fetch('/api/enquiries/reminders')
      const data = await res.json()
      if (res.ok) setReminders(data)
      else toast.error(data.error)
    } catch {
      toast.error('Failed to fetch reminders')
    } finally {
      setLoading(false)
    }
  }

  async function markDone(id: number) {
    const res = await fetch('/api/enquiries/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    if (res.ok) {
      toast.success('Marked as converted')
      fetchReminders()
    } else toast.error('Failed to update')
  }

  useEffect(() => { fetchReminders() }, [])

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Clock className="w-5 h-5" /> Follow-Up Reminders
      </h2>

      {loading ? (
        <p>Loading reminders...</p>
      ) : reminders.length === 0 ? (
        <p className="text-muted-foreground">No follow-ups due soon 🎉</p>
      ) : (
        reminders.map((r) => {
          const days = differenceInDays(new Date(r.follow_up_date), new Date())
          const statusText =
            days < 0 ? `Overdue by ${Math.abs(days)} day(s)` :
            days === 0 ? 'Due today' :
            `Due in ${days} day(s)`

          return (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{r.client_name}</span>
                  <span className="text-sm text-muted-foreground">{statusText}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-2">{r.message}</p>
                <p className="text-sm">
                  📞 {r.contact_number} • WhatsApp {r.whatsapp_number || 'N/A'}
                </p>
                <div className="flex gap-2 mt-3">
                  {r.whatsapp_number && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        window.open(`https://wa.me/${r.whatsapp_number}`, '_blank')
                      }
                    >
                      <MessageCircle className="w-4 h-4 mr-1" /> Message Client
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => markDone(r.id)}>
                    <CheckCircle className="w-4 h-4 mr-1" /> Mark Converted
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
