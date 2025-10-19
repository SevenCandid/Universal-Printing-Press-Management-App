import { supabase } from '@/lib/supabaseClient'

export async function fetchDashboardData() {
  try {
    // --- Total Orders ---
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    // --- Total Revenue ---
    const { data: paidOrders } = await supabase
      .from('orders')
      .select('total_amount, payment_status')
      .eq('payment_status', 'paid')

    const totalRevenue = paidOrders?.reduce(
      (sum, o) => sum + Number(o.total_amount || 0),
      0
    ) || 0

    // --- Active Staff ---
    const { count: activeStaff } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // --- Pending Tasks ---
    const { count: pendingTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'completed')

    return {
      totalOrders: totalOrders || 0,
      totalRevenue,
      activeStaff: activeStaff || 0,
      pendingTasks: pendingTasks || 0,
    }
  } catch (error: any) {
    console.error('Dashboard fetch error:', error.message)
    return null
  }
}
