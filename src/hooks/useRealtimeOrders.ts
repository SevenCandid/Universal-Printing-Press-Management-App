'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'

interface Order {
  id: string
  order_number: string
  customer_name: string
  item_description: string
  quantity: number
  total_amount: number
  payment_method: string
  payment_status: string
  order_status: string
  created_at: string
}

export function useRealtimeOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setOrders(data || [])
      }

      setLoading(false)
    }

    fetchOrders()

    // Subscribe to realtime updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Realtime order change:', payload)

          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as Order, ...prev])
            toast.success(`🆕 New order from ${payload.new.customer_name}`)
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === payload.new.id ? (payload.new as Order) : order
              )
            )
            toast.success(`Order ${payload.new.order_number} updated`)

          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((order) => order.id !== payload.old.id))
            toast.error(`Order ${payload.old.order_number} deleted`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { orders, loading, error }
}
