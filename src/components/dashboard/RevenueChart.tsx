'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import toast from 'react-hot-toast'

export function RevenueChart() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChartData()
  }, [])

  const fetchChartData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('monthly_revenue_summary')
      .select('*')
      .order('month', { ascending: true })

    if (error) {
      console.error('Chart fetch error:', error.message)
      toast.error('Failed to load revenue chart')
    } else {
      setData(data || [])
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading chart data...
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 mt-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Monthly Revenue Overview
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
          <XAxis dataKey="month" />
          <YAxis
            tickFormatter={(v) => `₵${v.toLocaleString()}`}
          />
          <Tooltip formatter={(value: number) => `₵${value.toLocaleString()}`} />
          <Legend />
          <Line
            type="monotone"
            dataKey="total_revenue"
            stroke="#1A237E"
            strokeWidth={2}
            name="Total Revenue (₵)"
          />
          <Line
            type="monotone"
            dataKey="paid_amount"
            stroke="#FFB300"
            strokeWidth={2}
            name="Paid Amount (₵)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
