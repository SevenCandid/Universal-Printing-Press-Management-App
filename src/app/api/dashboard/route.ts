import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
    // Fetch counts
    const { count: ordersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    const { count: tasksCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })

    const { data: revenueData } = await supabase
      .from('orders')
      .select('total_amount')
      .not('status', 'eq', 'cancelled')

    const totalRevenue =
      revenueData?.reduce((acc, row) => acc + (Number(row.total_amount) || 0), 0) ?? 0

    const { count: activeStaffCount } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    return NextResponse.json({
      success: true,
      stats: {
        ordersCount: ordersCount ?? 0,
        tasksCount: tasksCount ?? 0,
        totalRevenue,
        activeStaffCount: activeStaffCount ?? 0,
      },
    })
  } catch (error: any) {
    console.error('Dashboard API error:', error.message)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
