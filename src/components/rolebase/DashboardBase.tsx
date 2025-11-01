'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Card, CardContent } from '@/components/ui/card'
import { RefreshCwIcon } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import EnquiriesBase from '@/components/rolebase/EnquiriesBase'
import FollowupReminders from '@/components/rolebase/FollowupReminders'

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(amount)

export default function DashboardBase({ role }: { role: string }) {
  const { supabase, session } = useSupabase()
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfyear' | 'yearly'>('monthly')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [viewMode, setViewMode] = useState<'amount' | 'percent'>('amount')

  const [totals, setTotals] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalFull: 0,
    totalPartial: 0,
    totalPending: 0,
    totalExpenses: 0,
    totalDebts: 0,
  })

  const [activeStaffCount, setActiveStaffCount] = useState(0)
  const [expensesData, setExpensesData] = useState<{ amount: number; created_at: string }[]>([])
  const [debtsData, setDebtsData] = useState<{ amount: number; created_at: string }[]>([])

  const fetchSummary = async () => {
    if (!session) return
    setLoading(true)
    try {
      const { data: rpcData, error } = await supabase.rpc('get_revenue_summary', {
        p_period_type: period,
      })
      if (error) throw error

      const formatted = (rpcData || []).map((r: any) => ({
        summary_period: r.summary_period,
        total_revenue: Number(r.total_revenue ?? 0),
        total_full: Number(r.total_full_payments ?? 0),
        total_partial: Number(r.total_partial_payments ?? 0),
        total_pending: Number(r.total_pending ?? 0),
        total_orders: Number(r.total_orders ?? 0),
        full_payment_percent: Number(r.full_payment_percent ?? 0),
        partial_payment_percent: Number(r.partial_payment_percent ?? 0),
        pending_payment_percent: Number(r.pending_payment_percent ?? 0),
      }))

      setData(formatted)
      const total = formatted.find((d) => d.summary_period === 'TOTAL')
      if (total) {
        setTotals({
          totalOrders: total.total_orders,
          totalRevenue: total.total_revenue,
          totalFull: total.total_full,
          totalPartial: total.total_partial,
          totalPending: total.total_pending,
        })
      }
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch active staff count
  const fetchActiveStaffCount = async () => {
    if (!supabase) return
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['staff', 'ceo', 'executive_assistant', 'manager', 'intern', 'sales_representative'])
        .eq('is_active', true)
      
      if (error) throw error
      setActiveStaffCount(count || 0)
    } catch (err) {
      console.error('Error fetching active staff count:', err)
    }
  }

  // Fetch ALL expenses - always get fresh data (like ReportsBase does)
  const fetchExpenses = async () => {
    if (!supabase || !session) return
    
    try {
      // Fetch ALL expenses first (like ReportsBase does)
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching expenses:', error)
        throw error
      }

      // Store raw expenses data for grouping - ensure amounts are properly formatted
      const formattedExpenses = (data || []).map((e: any) => ({
        amount: Number(e?.amount) || 0,
        created_at: e?.created_at || '',
      }))
      
      console.log('Fetched expenses:', formattedExpenses.length, 'items', formattedExpenses)
      setExpensesData(formattedExpenses)
    } catch (err) {
      console.error('Error fetching expenses:', err)
      // Silent fail - expenses might not be set up yet
      setExpensesData([])
    }
  }

  // Fetch debts - completed orders with pending payments
  const fetchDebts = async () => {
    if (!supabase || !session) return
    
    try {
      // Fetch completed orders with pending payment status
      // Debt = completed orders where payment_status contains 'pending'
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at, order_status, payment_status')
        .eq('order_status', 'completed')
        .ilike('payment_status', '%pending%')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching debts:', error)
        throw error
      }

      // Format debts data
      const formattedDebts = (data || []).map((d: any) => ({
        amount: Number(d?.total_amount) || 0,
        created_at: d?.created_at || '',
      }))
      
      console.log('Fetched debts:', formattedDebts.length, 'items', formattedDebts)
      setDebtsData(formattedDebts)
    } catch (err) {
      console.error('Error fetching debts:', err)
      // Silent fail - debts might not be available yet
      setDebtsData([])
    }
  }

  // Initial fetch and refetch on period change
  useEffect(() => {
    if (session) {
      fetchSummary()
      fetchActiveStaffCount()
      fetchExpenses()
      fetchDebts()
    }
  }, [period, session])

  // ✅ Realtime updates for orders - always keep data fresh
  useEffect(() => {
    if (!supabase || !session) return
    
    // Fetch summary initially
    fetchSummary()
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('orders-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order change detected in dashboard:', payload.eventType)
          fetchSummary()
        }
      )
      .subscribe()

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // fallback for older SDKs
        // @ts-ignore
        channel?.unsubscribe?.()
      }
    }
  }, [supabase, session, period]) // Include period so it refetches when period changes

  // ✅ Realtime updates for staff - always keep data fresh
  useEffect(() => {
    if (!supabase) return
    
    // Fetch staff count initially
    fetchActiveStaffCount()
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('staff-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('Profile change detected in dashboard:', payload.eventType)
          fetchActiveStaffCount()
        }
      )
      .subscribe()

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // fallback for older SDKs
        // @ts-ignore
        channel?.unsubscribe?.()
      }
    }
  }, [supabase])

  // ✅ Realtime updates for expenses - always keep data fresh
  useEffect(() => {
    if (!supabase || !session) return
    
    // Fetch expenses initially
    fetchExpenses()
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('expenses-dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses'
        },
        (payload) => {
          console.log('Expense change detected in dashboard:', payload.eventType)
          // Always refetch to ensure data is current with current period
          fetchExpenses()
        }
      )
      .subscribe()

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // fallback for older SDKs
        // @ts-ignore
        channel?.unsubscribe?.()
      }
    }
  }, [supabase, session, period]) // Include period so it refetches when period changes

  // Group expenses by period (matching ReportsBase logic exactly)
  const expensesByPeriod = useMemo(() => {
    const grouped: Record<string, number> = {}
    
    expensesData.forEach((expense) => {
      const date = new Date(expense.created_at)
      let key = ''
      
      // Match the exact format used in ReportsBase
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0] // YYYY-MM-DD
          break
        case 'weekly': {
          const startOfWeek = new Date(date)
          startOfWeek.setDate(date.getDate() - date.getDay())
          key = startOfWeek.toISOString().split('T')[0]
          break
        }
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'quarterly': {
          const quarter = Math.floor(date.getMonth() / 3) + 1
          key = `${date.getFullYear()}-Q${quarter}`
          break
        }
        case 'halfyear': {
          const half = date.getMonth() < 6 ? 'H1' : 'H2'
          key = `${date.getFullYear()}-${half}`
          break
        }
        case 'yearly':
          key = String(date.getFullYear())
          break
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      
      grouped[key] = (grouped[key] || 0) + Number(expense.amount || 0)
    })
    
    return grouped
  }, [expensesData, period])

  // Group debts by period (same logic as expenses)
  const debtsByPeriod = useMemo(() => {
    const grouped: Record<string, number> = {}
    
    debtsData.forEach((debt) => {
      const date = new Date(debt.created_at)
      let key = ''
      
      // Match the exact format used in ReportsBase
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0] // YYYY-MM-DD
          break
        case 'weekly': {
          const startOfWeek = new Date(date)
          startOfWeek.setDate(date.getDate() - date.getDay())
          key = startOfWeek.toISOString().split('T')[0]
          break
        }
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'quarterly': {
          const quarter = Math.floor(date.getMonth() / 3) + 1
          key = `${date.getFullYear()}-Q${quarter}`
          break
        }
        case 'halfyear': {
          const half = date.getMonth() < 6 ? 'H1' : 'H2'
          key = `${date.getFullYear()}-${half}`
          break
        }
        case 'yearly':
          key = String(date.getFullYear())
          break
        default:
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
      
      grouped[key] = (grouped[key] || 0) + Number(debt.amount || 0)
    })
    
    return grouped
  }, [debtsData, period])

  // Calculate total expenses - sum from expensesByPeriod (matches what graph shows)
  // The graph uses expensesByPeriod, so the card should too to ensure consistency
  const totalExpensesForPeriod = useMemo(() => {
    if (!expensesByPeriod || Object.keys(expensesByPeriod).length === 0) {
      console.log('No expensesByPeriod data')
      return 0
    }
    
    try {
      // Sum all values from expensesByPeriod (same data the graph uses)
      const total = Object.values(expensesByPeriod).reduce((sum, amount) => {
        const numAmount = Number(amount) || 0
        return sum + (isNaN(numAmount) ? 0 : numAmount)
      }, 0)
      
      console.log('Calculating total expenses from expensesByPeriod:', {
        periodsCount: Object.keys(expensesByPeriod).length,
        expensesByPeriod,
        total
      })
      
      return isNaN(total) ? 0 : total
    } catch (err) {
      console.error('Error calculating total expenses:', err)
      return 0
    }
  }, [expensesByPeriod])

  // Calculate total debts - sum from debtsByPeriod (matches what graph shows)
  const totalDebtsForPeriod = useMemo(() => {
    if (!debtsByPeriod || Object.keys(debtsByPeriod).length === 0) {
      return 0
    }
    
    try {
      const total = Object.values(debtsByPeriod).reduce((sum, amount) => {
        const numAmount = Number(amount) || 0
        return sum + (isNaN(numAmount) ? 0 : numAmount)
      }, 0)
      
      return isNaN(total) ? 0 : total
    } catch (err) {
      console.error('Error calculating total debts:', err)
      return 0
    }
  }, [debtsByPeriod])

  // Update totals when expenses change - always update to ensure state is in sync
  useEffect(() => {
    const total = Number(totalExpensesForPeriod) || 0
    const finalTotal = isNaN(total) ? 0 : total
    
    console.log('Setting totals.totalExpenses:', finalTotal, 'from totalExpensesForPeriod:', totalExpensesForPeriod)
    
    setTotals(prev => ({ ...prev, totalExpenses: finalTotal }))
  }, [totalExpensesForPeriod])

  // Update totals when debts change
  useEffect(() => {
    const total = Number(totalDebtsForPeriod) || 0
    const finalTotal = isNaN(total) ? 0 : total
    
    setTotals(prev => ({ ...prev, totalDebts: finalTotal }))
  }, [totalDebtsForPeriod])

  const chartContent = useMemo(() => {
    if (!data.length && !expensesData.length && !debtsData.length) return null

    const chartData = data.filter((d) => d.summary_period !== 'TOTAL')
    
    // Map revenue period keys to expense period keys
    // Revenue uses formats like "Jan", "Week 1", "Q1", etc.
    // Expenses use formats like "2024-01", "2024-01-01", "2024-Q1", etc.
    const mapRevenuePeriodToExpenseKey = (revenuePeriod: string): string => {
      // Try direct match first
      if (expensesByPeriod[revenuePeriod]) {
        return revenuePeriod
      }
      
      // Map revenue format to expense format
      const now = new Date()
      let expenseKey = ''
      
      // Try to convert revenue period format to expense format
      // For monthly like "Jan" - convert to "2024-01"
      if (revenuePeriod.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i)) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === revenuePeriod.toLowerCase())
        if (monthIndex !== -1) {
          expenseKey = `${now.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}`
        }
      }
      // For quarterly like "Q1" - convert to "2024-Q1"
      else if (revenuePeriod.match(/^Q[1-4]$/i)) {
        expenseKey = `${now.getFullYear()}-${revenuePeriod.toUpperCase()}`
      }
      // For yearly - direct match
      else if (revenuePeriod.match(/^\d{4}$/)) {
        expenseKey = revenuePeriod
      }
      // For weekly like "Week 1" - try to find matching date
      else if (revenuePeriod.startsWith('Week ')) {
        // Try to find expense key that matches this week
        const weekNum = parseInt(revenuePeriod.replace('Week ', ''))
        // This is approximate - would need better logic for exact matching
        expenseKey = revenuePeriod // Keep as-is for now
      }
      // For daily like "Jan 1" - try to find matching date
      else if (revenuePeriod.match(/^\w{3} \d{1,2}$/)) {
        // Try to find expense key that matches this date
        expenseKey = revenuePeriod // Keep as-is for now
      }
      
      return expenseKey || revenuePeriod
    }
    
    // Merge expenses and debts data with revenue data
    const mergedData = chartData.map((item) => {
      const revenuePeriod = item.summary_period || ''
      const expenseKey = mapRevenuePeriodToExpenseKey(revenuePeriod)
      const expenseAmount = expensesByPeriod[expenseKey] || 0
      const debtAmount = debtsByPeriod[expenseKey] || 0
      
      // Calculate percentage for expenses (expense / period revenue * 100)
      // This matches how revenue percentages work - as a % of that period's revenue
      const periodRevenue = Number(item.total_revenue) || 0
      const expensePercent = periodRevenue > 0 
        ? ((expenseAmount / periodRevenue) * 100).toFixed(2)
        : 0
      const debtPercent = periodRevenue > 0 
        ? ((debtAmount / periodRevenue) * 100).toFixed(2)
        : 0
      
      return {
        ...item,
        total_expenses: expenseAmount,
        total_expenses_percent: Number(expensePercent),
        total_debts: debtAmount,
        total_debts_percent: Number(debtPercent),
      }
    })

    // Add expense-only periods if any (only those in current period)
    const now = new Date()
    let periodStartDate: Date
    switch (period) {
      case 'daily':
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        break
      case 'weekly': {
        const weekDay = now.getDay()
        periodStartDate = new Date(now)
        periodStartDate.setDate(now.getDate() - weekDay)
        periodStartDate.setHours(0, 0, 0, 0)
        break
      }
      case 'monthly':
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        break
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3)
        periodStartDate = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0)
        break
      case 'halfyear':
        const half = Math.floor(now.getMonth() / 6)
        periodStartDate = new Date(now.getFullYear(), half * 6, 1, 0, 0, 0, 0)
        break
      case 'yearly':
        periodStartDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
        break
      default:
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    }

    // Only add expense periods that don't have revenue but are in the current period
    Object.entries(expensesByPeriod).forEach(([expenseKey, amount]) => {
      if (amount > 0 && !mergedData.find((d) => {
        const mappedKey = mapRevenuePeriodToExpenseKey(d.summary_period || '')
        return mappedKey === expenseKey || d.summary_period === expenseKey
      })) {
        // Check if this expense period falls within the selected period
        try {
          let expenseDate: Date | null = null
          if (expenseKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Daily format YYYY-MM-DD
            expenseDate = new Date(expenseKey)
          } else if (expenseKey.match(/^\d{4}-\d{2}$/)) {
            // Monthly format YYYY-MM
            const [year, month] = expenseKey.split('-')
            expenseDate = new Date(parseInt(year), parseInt(month) - 1, 1)
          } else if (expenseKey.match(/^\d{4}-Q\d$/)) {
            // Quarterly format YYYY-QN
            const [year, q] = expenseKey.split('-Q')
            expenseDate = new Date(parseInt(year), (parseInt(q) - 1) * 3, 1)
          } else if (expenseKey.match(/^\d{4}-H[12]$/)) {
            // Half-year format YYYY-HN
            const [year, h] = expenseKey.split('-H')
            expenseDate = new Date(parseInt(year), h === '1' ? 0 : 6, 1)
          } else if (expenseKey.match(/^\d{4}$/)) {
            // Yearly format
            expenseDate = new Date(parseInt(expenseKey), 0, 1)
          }
          
          if (expenseDate && expenseDate >= periodStartDate) {
            const debtAmount = debtsByPeriod[expenseKey] || 0
            // For expense-only periods (no revenue), percentage is 0 since there's no revenue to compare
            mergedData.push({
              summary_period: expenseKey,
              total_revenue: 0,
              total_full: 0,
              total_partial: 0,
              total_pending: 0,
              total_orders: 0,
              total_expenses: amount,
              total_expenses_percent: 0, // No revenue means 0%
              total_debts: debtAmount,
              total_debts_percent: 0, // No revenue means 0%
              // Add percentage fields for consistency (all 0 since no revenue)
              full_payment_percent: 0,
              partial_payment_percent: 0,
              pending_payment_percent: 0,
            })
          }
        } catch {
          // Invalid date format, skip
        }
      }
    })

    // Sort by period
    mergedData.sort((a, b) => a.summary_period.localeCompare(b.summary_period))

    const valueKey = (key: string) => (viewMode === 'percent' ? `${key}_percent` : key)

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={mergedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="summary_period" />
            <YAxis />
            <Tooltip
              formatter={(val: any) =>
                viewMode === 'percent' ? `${val}%` : formatCurrency(Number(val))
              }
            />
            <Legend />
            <Bar dataKey={valueKey('total_full')} fill="#22c55e" name="Full Payments" />
            <Bar dataKey={valueKey('total_partial')} fill="#facc15" name="Partial Payments" />
            <Bar dataKey={valueKey('total_pending')} fill="#ef4444" name="Pending Payments" />
            <Bar dataKey={valueKey('total_expenses')} fill="#8b5cf6" name="Expenses" />
            <Bar dataKey={valueKey('total_debts')} fill="#dc2626" name="Debts" />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mergedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="summary_period" />
          <YAxis />
          <Tooltip
            formatter={(val: any) =>
              viewMode === 'percent' ? `${val}%` : formatCurrency(Number(val))
            }
          />
          <Legend />
          <Line type="monotone" dataKey={valueKey('total_full')} stroke="#22c55e" strokeWidth={3} name="Full Payments" />
          <Line type="monotone" dataKey={valueKey('total_partial')} stroke="#facc15" strokeWidth={3} name="Partial Payments" />
          <Line type="monotone" dataKey={valueKey('total_pending')} stroke="#ef4444" strokeWidth={3} name="Pending Payments" />
          <Line type="monotone" dataKey={valueKey('total_expenses')} stroke="#8b5cf6" strokeWidth={3} name="Expenses" />
          <Line type="monotone" dataKey={valueKey('total_debts')} stroke="#dc2626" strokeWidth={3} name="Debts" />
        </LineChart>
      </ResponsiveContainer>
    )
  }, [data, expensesData, expensesByPeriod, debtsData, debtsByPeriod, chartType, viewMode, period])

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center sm:text-left">
          {role.toUpperCase()} Dashboard
        </h1>
        <div className="flex justify-center sm:justify-end">
            <Button 
            onClick={() => {
              fetchSummary()
              fetchActiveStaffCount()
              fetchExpenses()
              fetchDebts()
            }} 
            disabled={loading} 
            size="sm" 
            className="w-full sm:w-auto"
          >
            <RefreshCwIcon className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Period Buttons */}
      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
        {['daily', 'weekly', 'monthly', 'quarterly', 'halfyear', 'yearly'].map((p) => (
          <Button
            key={p}
            variant={p === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod(p as any)}
            className="flex-1 sm:flex-none min-w-[80px]"
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-8 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">Active Staff</p>
            <h2 className="text-lg sm:text-2xl font-bold text-blue-600 flex items-center gap-2">
              <span className="text-2xl">👥</span>
              {activeStaffCount}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">All team members</p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Total Revenue</p><h2 className="text-lg sm:text-2xl font-bold">{formatCurrency(totals.totalRevenue)}</h2></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Total Orders</p><h2 className="text-lg sm:text-2xl font-bold">{totals.totalOrders}</h2></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Full Payments</p><h2 className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(totals.totalFull)}</h2></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Partial Payments</p><h2 className="text-lg sm:text-2xl font-bold text-yellow-600">{formatCurrency(totals.totalPartial)}</h2></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Pending Payments</p><h2 className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(totals.totalPending)}</h2></CardContent></Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Expenses</p>
            <h2 className="text-lg sm:text-2xl font-bold text-purple-600">
              {formatCurrency(Number(totals.totalExpenses) || 0)}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">All expenses</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Debts</p>
            <h2 className="text-lg sm:text-2xl font-bold text-red-600">
              {formatCurrency(Number(totals.totalDebts) || 0)}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Completed orders pending payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-center sm:text-left">
              Revenue & Expenses Breakdown ({period})
            </h3>
            <div className="flex flex-wrap justify-center sm:justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setChartType((p) => (p === 'line' ? 'bar' : 'line'))}>
                {chartType === 'line' ? 'Bar View' : 'Line View'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewMode((v) => (v === 'amount' ? 'percent' : 'amount'))}>
                {viewMode === 'amount' ? 'Show %' : 'Show ₵'}
              </Button>
            </div>
          </div>
          {chartContent || (
            <p className="text-sm text-muted-foreground text-center py-6">
              No data available
            </p>
          )}
          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-2 text-center sm:text-right">
              Last updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
