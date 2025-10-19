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
  })

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

  useEffect(() => {
    fetchSummary()
  }, [period, session])

  // ✅ Realtime updates
  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchSummary()
      })
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

  const chartContent = useMemo(() => {
    if (!data.length) return null

    const chartData = data.filter((d) => d.summary_period !== 'TOTAL')
    const valueKey = (key: string) => (viewMode === 'percent' ? `${key}_percent` : key)

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
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
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
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
        </LineChart>
      </ResponsiveContainer>
    )
  }, [data, chartType, viewMode])

  return (
    <div className="space-y-6 px-2 sm:px-4 md:px-6 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center sm:text-left">
          {role.toUpperCase()} Dashboard
        </h1>
        <div className="flex justify-center sm:justify-end">
          <Button onClick={fetchSummary} disabled={loading} size="sm" className="w-full sm:w-auto">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-6">
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Total Revenue</p><h2 className="text-lg sm:text-2xl font-bold">{formatCurrency(totals.totalRevenue)}</h2></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Total Orders</p><h2 className="text-lg sm:text-2xl font-bold">{totals.totalOrders}</h2></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Full Payments</p><h2 className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(totals.totalFull)}</h2></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Partial Payments</p><h2 className="text-lg sm:text-2xl font-bold text-yellow-600">{formatCurrency(totals.totalPartial)}</h2></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4"><p className="text-xs sm:text-sm text-muted-foreground">Pending Payments</p><h2 className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(totals.totalPending)}</h2></CardContent></Card>
      </div>

      {/* Chart */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-center sm:text-left">
              Revenue Breakdown ({period})
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
