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
import { RefreshCw, BarChart2, LineChart as LineChartIcon, FileDown } from 'lucide-react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import toast from 'react-hot-toast'
import autoTable from 'jspdf-autotable'

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

type ExpenseRow = {
  amount: number
  created_at: string
}

type ExportOptions = {
  includeChart: boolean
  includeTable: boolean
  includeStaffPerformance: boolean
}

export default function ReportsBase() {
  const { supabase } = useSupabase()
  const [period, setPeriod] = useState<Period>('monthly')
  const [revenues, setRevenues] = useState<RevenueRow[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [debts, setDebts] = useState<ExpenseRow[]>([])
  const [staffPerformance, setStaffPerformance] = useState<StaffPerfRow[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [viewMode, setViewMode] = useState<'amount' | 'percent'>('amount')
  const [loading, setLoading] = useState(false)
  const chartRef = useRef<HTMLDivElement | null>(null)
  const tableRef = useRef<HTMLDivElement | null>(null)
  const staffPerfRef = useRef<HTMLDivElement | null>(null)
  
  // Export options dialog
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeChart: true,
    includeTable: true,
    includeStaffPerformance: true,
  })

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
    if (!supabase || !userId) {
      console.log('Cannot fetch staff performance: supabase or userId missing', { supabase: !!supabase, userId })
      return
    }
    
    try {
      console.log('Fetching staff performance...', { period, userId })
      const { data: rpcData, error } = await supabase.rpc('get_staff_performance', {
        period_type: period,
        viewer_id: userId,
      })
      
      if (error) {
        console.error('Staff performance RPC error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        throw error
      }
      
      if (Array.isArray(rpcData)) {
        console.log('Staff performance data received:', rpcData.length, 'staff members')
        const formatted = rpcData.map((r: any) => ({
          staff_id: r.staff_id,
          staff_name: r.staff_name ?? 'Unknown',
          role: r.role ?? '',
          total_tasks: Number(r.total_tasks ?? 0),
          completed_tasks: Number(r.completed_tasks ?? 0),
          pending_tasks: Number(r.pending_tasks ?? 0),
          overdue_tasks: Number(r.overdue_tasks ?? 0),
          completion_rate: Number(r.completion_rate ?? 0),
        }))
        
        console.log('Formatted staff performance:', formatted)
        setStaffPerformance(formatted)
      } else {
        console.warn('Staff performance data is not an array:', rpcData)
        setStaffPerformance([])
      }
    } catch (err: any) {
      console.error('fetchStaffPerformance error:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        fullError: err
      })
      
      const errorMessage = err?.message || String(err) || 'Unknown error'
      if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        toast.error('Staff performance function not found. Please run the database setup.')
      } else if (errorMessage.includes('row-level security') || errorMessage.includes('permission denied')) {
        toast.error('Access denied. Please check your permissions for staff performance.')
      } else {
        toast.error(`Could not load staff performance data: ${errorMessage}`)
      }
      
      // Set empty array on error so UI doesn't break
      setStaffPerformance([])
    }
  }, [supabase, period, userId])

  // 🧾 EXPENSES INTEGRATION START
  // Fetch Expenses
  const fetchExpenses = useCallback(async () => {
    if (!supabase) return
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('amount, created_at')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setExpenses(
        (data || []).map((e: any) => ({
          amount: Number(e.amount ?? 0),
          created_at: e.created_at ?? '',
        }))
      )
    } catch (err) {
      console.error('fetchExpenses error:', err)
      // Silent fail - expenses might not be set up yet
    }
  }, [supabase])
  // 🧾 EXPENSES INTEGRATION END

  // 💳 DEBTS INTEGRATION START
  // Fetch Debts - completed orders with pending payments
  const fetchDebts = useCallback(async () => {
    if (!supabase) return
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount, created_at, order_status, payment_status')
        .eq('order_status', 'completed')
        .ilike('payment_status', '%pending%')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setDebts(
        (data || []).map((d: any) => ({
          amount: Number(d.total_amount ?? 0),
          created_at: d.created_at ?? '',
        }))
      )
    } catch (err) {
      console.error('fetchDebts error:', err)
      // Silent fail - debts might not be available yet
    }
  }, [supabase])
  // 💳 DEBTS INTEGRATION END

  useEffect(() => {
    fetchRevenues()
    fetchStaffPerformance()
    fetchExpenses()
    fetchDebts()
  }, [fetchRevenues, fetchStaffPerformance, fetchExpenses, fetchDebts])

  // ✅ Realtime updates for staff performance - always keep data fresh
  useEffect(() => {
    if (!supabase || !userId) return
    
    // Fetch staff performance initially
    fetchStaffPerformance()
    
    // Subscribe to realtime changes on tasks (affects staff performance)
    const channel = supabase
      .channel('staff-performance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload) => {
          console.log('Task change detected (affects staff performance):', payload.eventType)
          // Refetch staff performance when tasks change
          fetchStaffPerformance()
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
  }, [supabase, userId, period, fetchStaffPerformance])

  // 💳 GROUP DEBTS BY PERIOD START (must be before chartContent)
  const debtsByPeriod = useMemo(() => {
    const grouped: Record<string, number> = {}
    
    debts.forEach((debt) => {
      const date = new Date(debt.created_at)
      let key = ''
      
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
      }
      
      grouped[key] = (grouped[key] || 0) + debt.amount
    })
    
    return grouped
  }, [debts, period])
  // 💳 GROUP DEBTS BY PERIOD END

  // Chart - Mobile Responsive
  const chartContent = useMemo(() => {
    if (!revenues.length && !debts.length) return null
    let chartData = revenues.filter((r) => r.summary_period !== 'TOTAL')
    
    // Merge debts data into chart data by period
    chartData = chartData.map((r) => {
      const revenuePeriod = r.summary_period || ''
      // Map revenue period format to debt period format (same as expenses)
      let debtKey = revenuePeriod
      
      // Convert revenue period format to match debt period format
      const now = new Date()
      if (revenuePeriod.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i)) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === revenuePeriod.toLowerCase())
        if (monthIndex !== -1) {
          debtKey = `${now.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}`
        }
      } else if (revenuePeriod.match(/^Q[1-4]$/i)) {
        debtKey = `${now.getFullYear()}-${revenuePeriod.toUpperCase()}`
      } else if (revenuePeriod.match(/^\d{4}$/)) {
        debtKey = revenuePeriod
      }
      
      const debtAmount = debtsByPeriod[debtKey] || 0
      const periodRevenue = Number(r.total_revenue) || 0
      const debtPercent = periodRevenue > 0 ? ((debtAmount / periodRevenue) * 100).toFixed(2) : 0
      
      return {
        ...r,
        total_debts: debtAmount,
        total_debts_percent: Number(debtPercent),
      }
    })
    
    const valueKey = (base: string) => (viewMode === 'percent' ? `${base}_percent` : base)
    const formatValue = (val: any) => (viewMode === 'percent' ? `${val}%` : `₵${Number(val).toLocaleString()}`)

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300} minWidth={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis 
              dataKey="summary_period" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip 
              formatter={(v: any) => formatValue(v)}
              contentStyle={{ fontSize: '12px' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey={valueKey('total_full_payments')} fill="#22c55e" name="Full" />
            <Bar dataKey={valueKey('total_partial_payments')} fill="#facc15" name="Partial" />
            <Bar dataKey={valueKey('total_pending')} fill="#ef4444" name="Pending" />
            <Bar dataKey={valueKey('total_debts')} fill="#dc2626" name="Debts" />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    return (
      <ResponsiveContainer width="100%" height={300} minWidth={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis 
            dataKey="summary_period"
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip 
            formatter={(v: any) => formatValue(v)}
            contentStyle={{ fontSize: '12px' }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line type="monotone" dataKey={valueKey('total_full_payments')} stroke="#22c55e" strokeWidth={2} name="Full" />
          <Line type="monotone" dataKey={valueKey('total_partial_payments')} stroke="#facc15" strokeWidth={2} name="Partial" />
          <Line type="monotone" dataKey={valueKey('total_pending')} stroke="#ef4444" strokeWidth={2} name="Pending" />
          <Line type="monotone" dataKey={valueKey('total_debts')} stroke="#dc2626" strokeWidth={2} name="Debts" />
        </LineChart>
      </ResponsiveContainer>
    )
  }, [revenues, debts, debtsByPeriod, chartType, viewMode])

  // 🧾 CALCULATE EXPENSES METRICS START
  const financialMetrics = useMemo(() => {
    // Calculate total revenue
    const totalRevenue = revenues
      .filter((r) => r.summary_period !== 'TOTAL')
      .reduce((sum, r) => sum + (r.total_revenue ?? 0), 0)
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
    
    // Calculate net revenue (revenue - expenses)
    const netRevenue = totalRevenue - totalExpenses
    
    // Calculate profit margin ((net revenue / total revenue) * 100)
    const profitMargin = totalRevenue > 0 ? (netRevenue / totalRevenue) * 100 : 0
    
    return {
      totalRevenue,
      totalExpenses,
      netRevenue,
      profitMargin
    }
  }, [revenues, expenses])
  // 🧾 CALCULATE EXPENSES METRICS END

  // 🧾 GROUP EXPENSES BY PERIOD START
  const expensesByPeriod = useMemo(() => {
    const grouped: Record<string, number> = {}
    
    expenses.forEach((expense) => {
      const date = new Date(expense.created_at)
      let key = ''
      
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
      }
      
      grouped[key] = (grouped[key] || 0) + expense.amount
    })
    
    return grouped
  }, [expenses, period])
  // 🧾 GROUP EXPENSES BY PERIOD END

  // 📄 PROFESSIONAL PDF EXPORT START
  const downloadPDF = async () => {
    try {
      const loadingToast = toast.loading('Generating PDF...')
    const doc = new jsPDF('p', 'pt', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPos = 40

      // Load and add logo with proper aspect ratio
      const logo = new Image()
      logo.src = '/assets/logo/UPPLOGO.png'
      
      await new Promise((resolve, reject) => {
        logo.onload = resolve
        logo.onerror = reject
      })
      
      // Calculate proper logo dimensions maintaining aspect ratio
      const logoWidth = 60
      const logoHeight = (logo.height / logo.width) * logoWidth
      doc.addImage(logo, 'PNG', 40, yPos, logoWidth, logoHeight)
      
      // Header - positioned to align with logo
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Universal Printing Press', 110, yPos + 15)
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text('Reports & Analytics', 110, yPos + 35)
      
      // Move yPos down after logo
      yPos = yPos + Math.max(logoHeight, 50) + 15
      
      // Period and Date
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      const dateStr = new Date().toLocaleDateString('en-GH', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      doc.text(`Period: ${period.toUpperCase()} | Generated: ${dateStr}`, 40, yPos)
      yPos += 10
      
      // Horizontal line
      doc.setDrawColor(200, 200, 200)
      doc.line(40, yPos, pageWidth - 40, yPos)
      
      yPos = yPos + 20
      doc.setTextColor(0, 0, 0)

      // Financial Summary
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Financial Summary', 40, yPos)
      yPos += 20

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      const summaryData = [
        ['Total Revenue', `GHS ${financialMetrics.totalRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Expenses', `GHS ${financialMetrics.totalExpenses.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Net Revenue', `GHS ${financialMetrics.netRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Profit Margin', `${financialMetrics.profitMargin.toFixed(2)}%`],
      ]

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 8 },
        columnStyles: {
          0: { cellWidth: 200 },
          1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 40, right: 40 },
      })

      yPos = (doc as any).lastAutoTable.finalY + 30

      // Revenue Chart
      if (exportOptions.includeChart && chartRef.current) {
        if (yPos > pageHeight - 300) {
          doc.addPage()
          yPos = 40
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Revenue Trend', 40, yPos)
        yPos += 15

        const chartCanvas = await html2canvas(chartRef.current, { 
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false,
          useCORS: true
        })
        const chartImg = chartCanvas.toDataURL('image/png')
        
        // Calculate proper chart dimensions maintaining aspect ratio
        const maxChartWidth = pageWidth - 80
        const maxChartHeight = 220
        const chartAspectRatio = chartCanvas.width / chartCanvas.height
        
        let finalChartWidth = maxChartWidth
        let finalChartHeight = maxChartWidth / chartAspectRatio
        
        // If height exceeds max, recalculate based on height
        if (finalChartHeight > maxChartHeight) {
          finalChartHeight = maxChartHeight
          finalChartWidth = maxChartHeight * chartAspectRatio
        }
        
        // Center the chart horizontally
        const chartXPos = 40 + (maxChartWidth - finalChartWidth) / 2
        
        doc.addImage(chartImg, 'PNG', chartXPos, yPos, finalChartWidth, finalChartHeight)
        yPos += finalChartHeight + 30
      }

      // Revenue Table
      if (exportOptions.includeTable && revenues.length > 0) {
        if (yPos > pageHeight - 200) {
          doc.addPage()
          yPos = 40
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Revenue & Expenses Breakdown', 40, yPos)
        yPos += 15

        const tableData = revenues.map((r) => {
          const periodExpense = expensesByPeriod[r.summary_period || ''] || 0
          const periodDebt = debtsByPeriod[r.summary_period || ''] || 0
          const netRev = (r.total_revenue || 0) - periodExpense
          
          return [
            r.summary_period || '',
            `GHS ${(r.total_revenue || 0).toFixed(2)}`,
            `GHS ${periodExpense.toFixed(2)}`,
            `GHS ${periodDebt.toFixed(2)}`,
            `GHS ${netRev.toFixed(2)}`,
            `GHS ${(r.total_full_payments || 0).toFixed(2)}`,
            `GHS ${(r.total_partial_payments || 0).toFixed(2)}`,
            `GHS ${(r.total_pending || 0).toFixed(2)}`,
            String(r.total_orders || 0),
          ]
        })

        autoTable(doc, {
          startY: yPos,
          head: [['Period', 'Revenue (GHS)', 'Expenses (GHS)', 'Debts (GHS)', 'Net (GHS)', 'Full Pay', 'Partial', 'Pending', 'Orders']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
          columnStyles: {
            0: { cellWidth: 60 },
            1: { cellWidth: 60, halign: 'right' },
            2: { cellWidth: 60, halign: 'right' },
            3: { cellWidth: 60, halign: 'right' },
            4: { cellWidth: 60, halign: 'right' },
            5: { cellWidth: 55, halign: 'right' },
            6: { cellWidth: 50, halign: 'right' },
            7: { cellWidth: 50, halign: 'right' },
            8: { cellWidth: 40, halign: 'right' },
          },
          margin: { left: 40, right: 40 },
        })

        yPos = (doc as any).lastAutoTable.finalY + 30
      }

      // Staff Performance
      if (exportOptions.includeStaffPerformance && staffPerformance.length > 0) {
        if (yPos > pageHeight - 200) {
          doc.addPage()
          yPos = 40
        }

        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Staff Performance', 40, yPos)
        yPos += 15

        const staffData = staffPerformance.map((s) => [
          s.staff_name || 'Unknown',
          s.role || '',
          String(s.total_tasks || 0),
          String(s.completed_tasks || 0),
          String(s.pending_tasks || 0),
          String(s.overdue_tasks || 0),
          `${(s.completion_rate || 0).toFixed(1)}%`,
        ])

        autoTable(doc, {
          startY: yPos,
          head: [['Staff Name', 'Role', 'Total', 'Completed', 'Pending', 'Overdue', 'Rate']],
          body: staffData,
          theme: 'striped',
          headStyles: { fillColor: [46, 204, 113], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 6 },
          columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 80 },
            2: { cellWidth: 50, halign: 'center' },
            3: { cellWidth: 70, halign: 'center' },
            4: { cellWidth: 60, halign: 'center' },
            5: { cellWidth: 60, halign: 'center' },
            6: { cellWidth: 55, halign: 'center' },
          },
          margin: { left: 40, right: 40 },
        })
      }

      // Footer on all pages
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Universal Printing Press | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 20,
          { align: 'center' }
        )
      }

      // Save PDF
      const fileName = `UPP_Report_${period}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      
      toast.dismiss(loadingToast)
      toast.success('PDF exported successfully!')
    } catch (error) {
      console.error('PDF Export Error:', error)
      toast.error('Failed to generate PDF. Please try again.')
    }
  }
  // 📄 PROFESSIONAL PDF EXPORT END

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">📊 Reports & Analytics</h1>
      </div>

      {/* Filter toolbar - mobile optimized */}
      <div className="space-y-3">
        {/* Period Selector - Full width on mobile */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="w-full sm:w-auto border border-border bg-background text-foreground rounded-md p-2.5 sm:p-2 text-sm font-medium"
        >
          <option value="daily">📅 Daily</option>
          <option value="weekly">📅 Weekly</option>
          <option value="monthly">📅 Monthly</option>
          <option value="quarterly">📅 Quarterly</option>
          <option value="halfyear">📅 Half Year</option>
          <option value="yearly">📅 Yearly</option>
        </select>

        {/* Action buttons - scrollable on very small screens */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setViewMode((v) => (v === 'amount' ? 'percent' : 'amount'))}
            className="whitespace-nowrap text-xs sm:text-sm flex-shrink-0"
          >
            {viewMode === 'amount' ? '% View' : '₵ View'}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setChartType((c) => (c === 'line' ? 'bar' : 'line'))}
            className="whitespace-nowrap text-xs sm:text-sm flex-shrink-0"
          >
            {chartType === 'line' ? <BarChart2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <LineChartIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
            <span className="ml-1.5">{chartType === 'line' ? 'Bar' : 'Line'}</span>
          </Button>

          <Button 
            size="sm" 
            onClick={() => {
              fetchRevenues()
              fetchStaffPerformance()
              fetchExpenses()
              fetchDebts()
            }} 
            disabled={loading}
            className="whitespace-nowrap text-xs sm:text-sm flex-shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="ml-1.5 hidden xs:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
          </Button>

          <Button 
            size="sm" 
            onClick={() => setShowExportDialog(true)} 
            variant="outline"
            className="whitespace-nowrap text-xs sm:text-sm flex-shrink-0"
          >
            <FileDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="ml-1.5">Export PDF</span>
          </Button>
        </div>
      </div>

      {/* 🧾 FINANCIAL METRICS CARDS START - Mobile Optimized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1.5 sm:mb-2">
              <h3 className="text-[10px] xs:text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Total Revenue</h3>
              <span className="text-lg sm:text-xl md:text-2xl">💰</span>
            </div>
            <div className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-green-600 break-words leading-tight">
              ₵{financialMetrics.totalRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-tight">From all orders</p>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-red-500/20">
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1.5 sm:mb-2">
              <h3 className="text-[10px] xs:text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Total Expenses</h3>
              <span className="text-lg sm:text-xl md:text-2xl">🧾</span>
            </div>
            <div className="text-base xs:text-lg sm:text-xl md:text-2xl font-bold text-red-600 break-words leading-tight">
              ₵{financialMetrics.totalExpenses.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-tight">Operating costs</p>
          </CardContent>
        </Card>

        {/* Net Revenue */}
        <Card className={`bg-gradient-to-br ${financialMetrics.netRevenue >= 0 ? 'from-blue-500/10 to-blue-600/10 border-blue-500/20' : 'from-orange-500/10 to-orange-600/10 border-orange-500/20'}`}>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1.5 sm:mb-2">
              <h3 className="text-[10px] xs:text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Net Revenue</h3>
              <span className="text-lg sm:text-xl md:text-2xl">{financialMetrics.netRevenue >= 0 ? '📈' : '📉'}</span>
            </div>
            <div className={`text-base xs:text-lg sm:text-xl md:text-2xl font-bold ${financialMetrics.netRevenue >= 0 ? 'text-blue-600' : 'text-orange-600'} break-words leading-tight`}>
              ₵{financialMetrics.netRevenue.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-tight">Revenue - Expenses</p>
          </CardContent>
        </Card>

        {/* Profit Margin */}
        <Card className={`bg-gradient-to-br ${financialMetrics.profitMargin >= 0 ? 'from-purple-500/10 to-purple-600/10 border-purple-500/20' : 'from-gray-500/10 to-gray-600/10 border-gray-500/20'}`}>
          <CardContent className="p-3 sm:p-4 md:p-5 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1.5 sm:mb-2">
              <h3 className="text-[10px] xs:text-xs sm:text-sm font-medium text-muted-foreground leading-tight">Profit Margin</h3>
              <span className="text-lg sm:text-xl md:text-2xl">📊</span>
            </div>
            <div className={`text-base xs:text-lg sm:text-xl md:text-2xl font-bold ${financialMetrics.profitMargin >= 0 ? 'text-purple-600' : 'text-gray-600'} leading-tight`}>
              {financialMetrics.profitMargin.toFixed(1)}%
            </div>
            <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-tight">
              {financialMetrics.profitMargin >= 30 ? 'Excellent' : financialMetrics.profitMargin >= 15 ? 'Good' : financialMetrics.profitMargin >= 0 ? 'Fair' : 'Loss'}
            </p>
          </CardContent>
        </Card>
      </div>
      {/* 🧾 FINANCIAL METRICS CARDS END */}

      {/* Chart - Mobile Optimized */}
      <Card ref={chartRef}>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <h2 className="text-sm sm:text-base md:text-lg font-semibold mb-3 sm:mb-4 text-foreground">
            📈 Revenue Trend ({period})
          </h2>
          <div className="w-full overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
            {revenues.length ? chartContent : <p className="text-xs sm:text-sm text-muted-foreground">No revenue data.</p>}
          </div>
        </CardContent>
      </Card>

      {/* Revenue & Expenses Table - Mobile Optimized */}
      {revenues.length > 0 && (
        <Card ref={tableRef}>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <h2 className="text-sm sm:text-base md:text-lg font-semibold mb-3 sm:mb-4 text-foreground">
              💰 Revenue & Expenses Summary
            </h2>
            <div className="overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
                  <table className="min-w-full text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-muted text-foreground">
                        <th className="p-1.5 sm:p-2 text-left sticky left-0 bg-muted z-10 min-w-[80px]">Period</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap">Revenue (₵)</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap">Expenses (₵)</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap">Debts (₵)</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap">Net (₵)</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap hidden sm:table-cell">Full Pay</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap hidden sm:table-cell">Partial</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap hidden sm:table-cell">Pending</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap">Orders</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap hidden md:table-cell">Full %</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap hidden md:table-cell">Partial %</th>
                        <th className="p-1.5 sm:p-2 text-left whitespace-nowrap hidden md:table-cell">Pending %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenues.map((r, i) => {
                        const periodExpense = expensesByPeriod[r.summary_period || ''] || 0
                        const periodDebt = debtsByPeriod[r.summary_period || ''] || 0
                        const netRev = (r.total_revenue || 0) - periodExpense
                        
                        return (
                          <tr key={i} className="border-t border-border hover:bg-muted/30">
                            <td className="p-1.5 sm:p-2 font-medium sticky left-0 bg-background z-10">{r.summary_period}</td>
                            <td className="p-1.5 sm:p-2 text-green-600 font-semibold whitespace-nowrap">{r.total_revenue?.toFixed(2)}</td>
                            <td className="p-1.5 sm:p-2 text-red-600 font-semibold whitespace-nowrap">{periodExpense.toFixed(2)}</td>
                            <td className="p-1.5 sm:p-2 text-red-600 font-semibold whitespace-nowrap">{periodDebt.toFixed(2)}</td>
                            <td className={`p-1.5 sm:p-2 font-semibold whitespace-nowrap ${netRev >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                              {netRev.toFixed(2)}
                            </td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap hidden sm:table-cell">{r.total_full_payments?.toFixed(2)}</td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap hidden sm:table-cell">{r.total_partial_payments?.toFixed(2)}</td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap hidden sm:table-cell">{r.total_pending?.toFixed(2)}</td>
                            <td className="p-1.5 sm:p-2 text-center whitespace-nowrap">{r.total_orders}</td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap hidden md:table-cell">{r.full_payment_percent?.toFixed(2)}%</td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap hidden md:table-cell">{r.partial_payment_percent?.toFixed(2)}%</td>
                            <td className="p-1.5 sm:p-2 whitespace-nowrap hidden md:table-cell">{r.pending_payment_percent?.toFixed(2)}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            {/* Mobile hint */}
            <p className="text-xs text-muted-foreground mt-2 sm:hidden">
              💡 Scroll horizontally to see all columns
            </p>
          </CardContent>
        </Card>
      )}

      {/* Staff Performance - Mobile Optimized */}
      <Card className="bg-background border border-border shadow-sm" ref={staffPerfRef}>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-foreground">👥 Staff Performance ({period})</h2>
            {staffPerformance.length === 0 && !loading && (
              <p className="text-xs text-muted-foreground">No staff performance data available</p>
            )}
          </div>
          {staffPerformance.length > 0 ? (
            <div className="w-full overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
              <ResponsiveContainer width="100%" height={300} minWidth={300}>
                <BarChart data={staffPerformance}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                  <XAxis 
                    dataKey="staff_name" 
                    tick={{ fill: 'currentColor', fontSize: 10 }} 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fill: 'currentColor', fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (name === 'Completion Rate') {
                        return [`${Number(value).toFixed(1)}%`, name]
                      }
                      return [value, name]
                    }}
                    contentStyle={{ 
                      backgroundColor: 'rgba(30,30,30,0.9)', 
                      color: '#fff',
                      fontSize: '12px',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="total_tasks" fill="#3b82f6" name="Total Tasks" />
                  <Bar dataKey="completed_tasks" fill="#10b981" name="Completed" />
                  <Bar dataKey="pending_tasks" fill="#fbbf24" name="Pending" />
                  <Bar dataKey="overdue_tasks" fill="#ef4444" name="Overdue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-sm text-muted-foreground">Loading staff performance data...</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px]">
              <p className="text-sm text-muted-foreground">No staff performance data available for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Options Dialog - Mobile Optimized */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-background border border-border rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border sticky top-0 bg-background z-10">
              <div className="flex items-center gap-2 sm:gap-3">
                <FileDown className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
                <h2 className="text-base sm:text-xl font-bold">Export Options</h2>
              </div>
              <button
                onClick={() => setShowExportDialog(false)}
                className="p-1.5 sm:p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <span className="text-xl sm:text-2xl">×</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Select what to include in your PDF report:
              </p>
              
              <div className="space-y-3">
                <label className="flex items-start gap-2.5 sm:gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeChart}
                    onChange={(e) =>
                      setExportOptions({ ...exportOptions, includeChart: e.target.checked })
                    }
                    className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 rounded border-border text-primary focus:ring-2 focus:ring-primary flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-medium group-hover:text-primary transition-colors">
                      Revenue Chart
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Visual revenue trend chart
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 sm:gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeTable}
                    onChange={(e) =>
                      setExportOptions({ ...exportOptions, includeTable: e.target.checked })
                    }
                    className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 rounded border-border text-primary focus:ring-2 focus:ring-primary flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-medium group-hover:text-primary transition-colors">
                      Revenue & Expenses Table
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Detailed breakdown by period
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 sm:gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeStaffPerformance}
                    onChange={(e) =>
                      setExportOptions({
                        ...exportOptions,
                        includeStaffPerformance: e.target.checked,
                      })
                    }
                    className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 rounded border-border text-primary focus:ring-2 focus:ring-primary flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm sm:text-base font-medium group-hover:text-primary transition-colors">
                      Staff Performance
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Team productivity metrics
                    </div>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 sm:p-3 mt-3 sm:mt-4">
                <div className="flex gap-2">
                  <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">ℹ️</span>
                  <div className="text-xs text-blue-900 dark:text-blue-100">
                    <strong>Period:</strong> {period.toUpperCase()}<br />
                    Report includes only selected period data.
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-border bg-muted/20 sticky bottom-0">
              <Button 
                variant="outline" 
                onClick={() => setShowExportDialog(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowExportDialog(false)
                  downloadPDF()
                }}
                className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Generate PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
