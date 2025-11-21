'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { TRACKING_START_DATE } from '@/lib/constants'

export function useRealtimeDashboard() {
  const [stats, setStats] = useState({
    ordersCount: 0,
    tasksCount: 0,
    totalRevenue: 0,
    activeStaffCount: 0,
  })

  // Helper to fetch the latest stats once
  const fetchStats = async () => {
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', TRACKING_START_DATE.toISOString())

    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })

    const { data: ordersData } = await supabase
      .from('orders')
      .select('total_amount')
      .not('payment_status', 'eq', 'cancelled')
      .gte('created_at', TRACKING_START_DATE.toISOString())

    const { count: activeStaffCount } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    const totalRevenue =
      ordersData?.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0) || 0

    setStats({
      ordersCount: ordersCount ?? 0,
      tasksCount: tasksCount ?? 0,
      totalRevenue,
      activeStaffCount: activeStaffCount ?? 0,
    })
  }

  // Realtime listeners
  useEffect(() => {
    fetchStats()

    const ordersSub = supabase
      .channel('orders-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchStats)
      .subscribe()

    const tasksSub = supabase
      .channel('tasks-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchStats)
      .subscribe()

    const staffSub = supabase
      .channel('staff-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchStats)
      .subscribe()

    return () => {
      supabase.removeChannel(ordersSub)
      supabase.removeChannel(tasksSub)
      supabase.removeChannel(staffSub)
    }
  }, [])

  return stats
}
