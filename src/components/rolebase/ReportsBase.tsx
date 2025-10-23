// src/components/rolebase/ReportsBase.tsx
'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { RefreshCw, BarChart2, LineChart as LineChartIcon } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'

type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'halfyear' | 'yearly'

type RevenueRow = {
  summary_period?: string
  total_revenue?: number
  total_full_payments?: number
  total_partial_payments?: number
  total_pending?: number
  total_orders?: number
  full_payment_percent?: number
  partial_payment_percent?: number
  pending_payment_percent?: number
}

type StaffPerfRow = {
  staff_id?: string
  staff_name?: string
  role?: string
  total_tasks?: number
  completed_tasks?: number
  pending_tasks?: number
  overdue_tasks?: number
  completion_rate?: number
}

export default function ReportsBase() {
  const { supabase } = useSupabase()
  const [period, setPeriod] = useState<Period>('monthly')
  const [revenues, setRevenues] = useState<RevenueRow[]>([])
  const [staffPerformance, setStaffPerformance] = useState<StaffPerfRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [viewMode, setViewMode] = useState<'amount' | 'percent'>('amount')
  const [loading, setLoading] = useState(false)
  const chartRef = useRef<HTMLDivElement | null>(null)

  // Load current user ID
  useEffect(() => {
    if (!supabase?.auth) return
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.id) setUserId(data.user.id)
    })()
  }, [supabase])

  // Fetch Revenues
  const fetchRevenues = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      const { data: rpcData, error } = await supabase.rpc('get_revenue_summary', {
        p_period_type: period,
      })
      if (error) throw error
      setRevenues(
        (rpcData || []).map((r: any) => ({
          summary_period: r.summary_period ?? '',
          total_revenue: Number(r.total_revenue ?? 0),
          total_full_payments: Number(r.total_full_payments ?? 0),
          total_partial_payments: Number(r.total_partial_payments ?? 0),
          total_pending: Number(r.total_pending ?? 0),
          total_orders: Number(r.total_orders ?? 0),
          full_payment_percent: Number(r.full_payment_percent ?? 0),
          partial_payment_percent: Number(r.partial_payment_percent ?? 0),
          pending_payment_percent: Number(r.pending_payment_percent ?? 0),
        }))
      )
    } catch (err) {
      console.error('fetchRevenues error:', err)
      toast.error('Failed to load revenue data.')
    } finally {
      setLoading(false)
    }
  }, [supabase, period])

  // Fetch Staff Performance
  const fetchStaffPerformance = useCallback(async () => {
    if (!supabase || !userId) return
    try {
      const { data: rpcData, error } = await supabase.rpc('get_staff_performance', {
        period_type: period,
        viewer_id: userId,
      })
      if (error) throw error
      if (Array.isArray(rpcData)) {
        setStaffPerformance(
          rpcData.map((r: any) => ({
            staff_id: r.staff_id,
            staff_name: r.staff_name ?? 'Unknown',
            role: r.role ?? '',
            total_tasks: Number(r.total_tasks ?? 0),
            completed_tasks: Number(r.completed_tasks ?? 0),
            pending_tasks: Number(r.pending_tasks ?? 0),
            overdue_tasks: Number(r.overdue_tasks ?? 0),
            completion_rate: Number(r.completion_rate ?? 0),
          }))
        )
      }
    } catch (err) {
      console.error('fetchStaffPerformance error:', err)
      toast.error('Could not load staff performance data.')
    }
  }, [supabase, period, userId])

  useEffect(() => {
    fetchRevenues()
    fetchStaffPerformance()
  }, [fetchRevenues, fetchStaffPerformance])

  // Chart
  const chartContent = useMemo(() => {
    if (!revenues.length) return null
    const chartData = revenues.filter((r) => r.summary_period !== 'TOTAL')
    const valueKey = (base: string) => (viewMode === 'percent' ? `${base}_percent` : base)
    const formatValue = (val: any) => (viewMode === 'percent' ? `${val}%` : `₵${Number(val).toLocaleString()}`)

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis dataKey="summary_period" />
            <YAxis />
            <Tooltip formatter={(v: any) => formatValue(v)} />
            <Legend />
            <Bar dataKey={valueKey('total_full_payments')} fill="#22c55e" name="Full Payments" />
            <Bar dataKey={valueKey('total_partial_payments')} fill="#facc15" name="Partial Payments" />
            <Bar dataKey={valueKey('total_pending')} fill="#ef4444" name="Pending Payments" />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="summary_period" />
          <YAxis />
          <Tooltip formatter={(v: any) => formatValue(v)} />
          <Legend />
          <Line type="monotone" dataKey={valueKey('total_full_payments')} stroke="#22c55e" strokeWidth={3} name="Full Payments" />
          <Line type="monotone" dataKey={valueKey('total_partial_payments')} stroke="#facc15" strokeWidth={3} name="Partial Payments" />
          <Line type="monotone" dataKey={valueKey('total_pending')} stroke="#ef4444" strokeWidth={3} name="Pending Payments" />
        </LineChart>
      </ResponsiveContainer>
    )
  }, [revenues, chartType, viewMode])

  // PDF Export
  const downloadPDF = async () => {
    if (!chartRef.current) return
    const doc = new jsPDF('p', 'pt', 'a4')
    const canvas = await html2canvas(chartRef.current)
    const imgData = canvas.toDataURL('image/png')
    const logo = new Image()
    logo.src = '/assets/logo/UPPLOGO.png'
    logo.onload = () => {
      doc.addImage(logo, 'PNG', 40, 20, 80, 40)
      doc.setFontSize(18)
      doc.text('Universal Printing Press - Reports & Analytics', 130, 50)
      doc.addImage(imgData, 'PNG', 40, 100, 515, 350)
      doc.save(`UPP_Report_${period}_${new Date().toISOString()}.pdf`)
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">📊 Reports & Analytics</h1>
        </div>
      </div>

      {/* Filter toolbar - scrollable */}
      <div className="overflow-x-auto pb-2 -mx-2">
        <div className="flex gap-2 px-2 min-w-max">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="border border-border bg-background text-foreground rounded-md p-2 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="halfyear">Half Year</option>
            <option value="yearly">Yearly</option>
          </select>

          <Button variant="outline" size="sm" onClick={() => setViewMode((v) => (v === 'amount' ? 'percent' : 'amount'))}>
            {viewMode === 'amount' ? 'Show %' : 'Show ₵'}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setChartType((c) => (c === 'line' ? 'bar' : 'line'))}>
            {chartType === 'line' ? <BarChart2 className="h-4 w-4" /> : <LineChartIcon className="h-4 w-4" />}
            {chartType === 'line' ? 'Bar View' : 'Line View'}
          </Button>

          <Button size="sm" onClick={fetchRevenues} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button size="sm" onClick={downloadPDF} variant="outline">
            Export PDF
          </Button>
        </div>
      </div>

      {/* Chart */}
      <Card ref={chartRef}>
        <CardContent>
          <h2 className="text-base sm:text-lg font-semibold mb-4 text-foreground">
            📈 Revenue Trend ({period})
          </h2>
          {revenues.length ? chartContent : <p className="text-sm text-muted-foreground">No revenue data.</p>}
        </CardContent>
      </Card>

      {/* Revenue Table */}
      {revenues.length > 0 && (
        <Card>
          <CardContent>
            <h2 className="text-base sm:text-lg font-semibold mb-4 text-foreground">💰 Revenue Summary Table</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-muted text-foreground">
                    <th className="p-2 text-left">Period</th>
                    <th className="p-2 text-left">Total Revenue (₵)</th>
                    <th className="p-2 text-left">Full Payments</th>
                    <th className="p-2 text-left">Partial Payments</th>
                    <th className="p-2 text-left">Pending</th>
                    <th className="p-2 text-left">Orders</th>
                    <th className="p-2 text-left">Full %</th>
                    <th className="p-2 text-left">Partial %</th>
                    <th className="p-2 text-left">Pending %</th>
                  </tr>
                </thead>
                <tbody>
                  {revenues.map((r, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/30">
                      <td className="p-2">{r.summary_period}</td>
                      <td className="p-2">{r.total_revenue?.toFixed(2)}</td>
                      <td className="p-2">{r.total_full_payments?.toFixed(2)}</td>
                      <td className="p-2">{r.total_partial_payments?.toFixed(2)}</td>
                      <td className="p-2">{r.total_pending?.toFixed(2)}</td>
                      <td className="p-2">{r.total_orders}</td>
                      <td className="p-2">{r.full_payment_percent?.toFixed(2)}%</td>
                      <td className="p-2">{r.partial_payment_percent?.toFixed(2)}%</td>
                      <td className="p-2">{r.pending_payment_percent?.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Performance */}
      {staffPerformance.length > 0 && (
        <Card className="bg-background border border-border shadow-sm">
          <CardContent>
            <h2 className="text-base sm:text-lg font-semibold mb-4 text-foreground">👥 Staff Performance</h2>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={staffPerformance}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="staff_name" tick={{ fill: 'currentColor' }} />
                <YAxis tick={{ fill: 'currentColor' }} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(30,30,30,0.9)', color: '#fff' }} />
                <Legend />
                <Bar dataKey="total_tasks" fill="#3b82f6" name="Total Tasks" />
                <Bar dataKey="completed_tasks" fill="#10b981" name="Completed" />
                <Bar dataKey="pending_tasks" fill="#fbbf24" name="Pending" />
                <Bar dataKey="overdue_tasks" fill="#ef4444" name="Overdue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
