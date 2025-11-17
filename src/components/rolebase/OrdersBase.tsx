'use client'

import { FilterToolbar } from '@/components/ui/FilterToolbar'

import { useEffect, useState, useRef, Fragment } from 'react'
import {
  PlusIcon,
  UserIcon,
  ArrowDownTrayIcon,
  PaperClipIcon,
  CloudArrowUpIcon,
  TrashIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { StaffAssignmentModal } from '@/components/ui/StaffAssignmentModal'
import { NewOrderModal } from '@/components/ui/NewOrderModal'
import { EditOrderModal } from '@/components/ui/EditOrderModal'
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog'
import { ExportConfirmDialog } from '@/components/ui/ExportConfirmDialog'
import { cn } from '@/lib/utils'
import { PencilIcon } from '@heroicons/react/24/outline'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  item_description?: string
  quantity?: number
  unit_price?: number
  total_amount?: number
  payment_method?: string
  payment_status?: string
  order_status?: string
  created_by?: string
  creator_name?: string
  creator_email?: string
  creator_role?: string
  created_at?: string
}

type OrderFile = {
  name: string
  created_at: string
  metadata?: {
    size?: number
  }
}

type UserProfile = {
  id: string
  role?: string
  email?: string
}

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'

export default function OrdersPage() {
  // Supabase + session (from provider)
  const { supabase, session } = useSupabase()

  // ====== Refs for synchronized scrolling ======
  const topScrollRef = useRef<HTMLDivElement>(null)
  const bottomScrollRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)

  // ====== State ======
  const [orders, setOrders] = useState<Order[]>([])
  const [summary, setSummary] = useState({ totalOrders: 0, totalRevenue: 0, pendingPayments: 0 })

  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<Period>('monthly')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [page, setPage] = useState(0)
  
  // Export confirmation dialog state
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf')
  const [exporting, setExporting] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
    key: 'created_at',
    direction: 'desc',
  })
  const PAGE_SIZE = 20

  // Role + auth
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false)
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false)

  // ✏️ Edit/Delete Modals START
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [deleting, setDeleting] = useState(false)
  // ✏️ Edit/Delete Modals END

  // Inline editing
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<string | null>(null)
  const [editingOrderStatus, setEditingOrderStatus] = useState<string | null>(null)

  // 🔔 File Storage System START
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)
  const [orderFiles, setOrderFiles] = useState<{ [orderId: string]: OrderFile[] }>({})
  const [uploadingFiles, setUploadingFiles] = useState<{ [orderId: string]: boolean }>({})
  // 🔔 File Storage System END

  // ====== Role Permissions ======
  const canEdit = () => ['ceo', 'manager', 'executive_assistant'].includes(profile?.role?.toLowerCase() || '')
  const canAssign = () => ['ceo', 'manager', 'executive_assistant'].includes(profile?.role?.toLowerCase() || '')
  const canAddNew = () =>
    ['ceo', 'manager', 'executive_assistant', 'staff', 'intern', 'sales_representative', 'board'].includes(profile?.role?.toLowerCase() || '')
  const isReadOnly = () => profile?.role?.toLowerCase() === 'board'
  
  // Check if user can edit a specific order (admin or owner)
  const canEditOrder = (order: Order) => {
    if (isReadOnly()) return false
    if (canEdit()) return true // Admin can edit any order
    // Check if user is the owner of the order
    if (session?.user?.id && order.created_by === session.user.id) return true
    return false
  }
  
  // Check if user can delete a specific order (admin or owner)
  const canDeleteOrder = (order: Order) => {
    if (isReadOnly()) return false
    if (canEdit()) return true // Admin can delete any order
    // Check if user is the owner of the order
    if (session?.user?.id && order.created_by === session.user.id) return true
    return false
  }

  // ====== Fetch profile ======
  const fetchProfile = async () => {
    if (!supabase) {
      console.warn('Supabase client not available yet.')
      return
    }
    if (!session) {
      // no authenticated user
      setProfile(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        // log unexpected errors (PGRST116 used here as example - handle accordingly)
        console.error('Profile fetch error:', error)
      }
      if (data) setProfile(data as UserProfile)
    } catch (err) {
      console.error('Profile fetch error:', err)
    }
  }

  // ====== Build query ======
  const buildQuery = (pageIndex = page) => {
    const from = pageIndex * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    // Use the orders_with_creator view to get creator info
    let query: any = supabase.from('orders_with_creator').select('*', { count: 'exact' })

    if (search.trim()) {
      const escaped = search.replace(/'/g, "''")
      // ILIKE search across several fields
      query = query.or(
        `order_number.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,customer_phone.ilike.%${escaped}%`
      )
    }

    if (statusFilter !== 'all') query = query.eq('order_status', statusFilter)

    if (paymentFilter !== 'all') query = query.eq('payment_status', paymentFilter)

    // Filter by period
    const now = new Date()
    const startDate = {
      daily: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
      weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      monthly: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), // THIS month, not last month
      yearly: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), // THIS year, not last year
    }[period]

    // For monthly and yearly, also set end date to current date/time
    if (period === 'monthly') {
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999) // Last day of current month
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
      }
    } else if (period === 'yearly') {
      const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) // Last day of current year
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
      }
    } else if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }

    // Date range override (if provided)
    if (dateFrom) {
      const fromDate = new Date(dateFrom)
      fromDate.setHours(0, 0, 0, 0)
      query = query.gte('created_at', fromDate.toISOString())
    }
    if (dateTo) {
      const toDate = new Date(dateTo)
      toDate.setHours(23, 59, 59, 999)
      query = query.lte('created_at', toDate.toISOString())
    }

    // Role-based visibility: as requested, staff/board see read-only/all; CEO/manager see everything
    // (If you later want staff to only see their own orders, add .eq('created_by', session.user.id) here)

    if (sortConfig) {
      query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })
    }

    return query.range(from, to)
  }

  // ====== Fetch orders ======
  const fetchOrders = async (pageIndex = page) => {
    if (!supabase) {
      console.warn('Supabase not ready')
      return
    }
    // require profile or session depending on your auth needs
    if (!session) {
      toast.error('Please sign in to view orders')
      return
    }

    setLoading(true)
    try {
      const { data, error, count } = await buildQuery(pageIndex)
      if (error) throw error
      const items = (data || []) as Order[]
      
      // Debug: Log first order to verify unit_price is included
      if (items.length > 0) {
        console.log('📊 Sample order data:', {
          order_number: items[0].order_number,
          unit_price: items[0].unit_price,
          quantity: items[0].quantity,
          total_amount: items[0].total_amount,
          has_unit_price: 'unit_price' in items[0]
        })
      }
      
      setOrders(items)

      const totalRevenue = items.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
      const pendingPayments = items.filter((o) => (o.payment_status || '').toLowerCase().includes('pending')).length
      setSummary({ totalOrders: count || items.length, totalRevenue, pendingPayments })
    } catch (err) {
      console.error('Orders fetch error:', err)
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  // ====== Handlers ======
  const setPageAndFetch = (p: number) => {
    setPage(p)
  }

  const handleSearchChange = (v: string) => {
    setSearch(v)
    setPage(0)
  }

  const handleSort = (key: string) => {
    setPage(0)
    setSortConfig((prev) =>
      prev?.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }
    )
  }

  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order || !canEditOrder(order)) return toast.error('You cannot modify payments')
    if (!supabase) return toast.error('Client not ready')
    try {
      const { error } = await supabase.from('orders').update({ payment_status: newStatus }).eq('id', orderId)
      if (error) throw error
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, payment_status: newStatus } : o)))
      toast.success('Payment updated')
    } catch (err) {
      console.error('Update payment error:', err)
      toast.error('Failed to update payment')
    } finally {
      setEditingPaymentStatus(null)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order || !canEditOrder(order)) return toast.error('You cannot modify order status')
    if (!supabase) return toast.error('Client not ready')
    try {
      const updateData: any = { order_status: newStatus }
      
      // Auto-calculate total_amount from unit_price × quantity when order is marked as completed
      if (newStatus === 'completed' && order.unit_price && order.quantity) {
        const calculatedTotal = Number(order.unit_price) * Number(order.quantity)
        updateData.total_amount = calculatedTotal
        console.log('📊 Auto-calculating total_amount for completed order:', {
          orderId,
          unit_price: order.unit_price,
          quantity: order.quantity,
          total_amount: calculatedTotal
        })
      }
      
      const { error } = await supabase.from('orders').update(updateData).eq('id', orderId)
      if (error) throw error
      
      // Update local state with new status and calculated total
      setOrders((prev) => prev.map((o) => {
        if (o.id === orderId) {
          const updated = { ...o, order_status: newStatus }
          if (newStatus === 'completed' && updateData.total_amount) {
            updated.total_amount = updateData.total_amount
          }
          return updated
        }
        return o
      }))
      
      if (newStatus === 'completed' && updateData.total_amount) {
        toast.success(`Order marked as completed. Total amount calculated: ₵${updateData.total_amount.toFixed(2)}`)
      } else {
        toast.success('Order updated')
      }
    } catch (err) {
      console.error('Update order error:', err)
      toast.error('Failed to update order')
    } finally {
      setEditingOrderStatus(null)
    }
  }

  // Handle export request - show confirmation dialog
  // Note: We'll fetch all orders for the period when user confirms, so we just check if there might be orders
  const handleExport = (format: 'pdf' | 'csv') => {
    // Check if there are orders in current view (will fetch all matching period on confirm)
    if (orders.length === 0 && !loading) {
      toast.error('No orders to export for the selected period')
      return
    }
    setExportFormat(format)
    setShowExportConfirm(true)
  }

  // Export to CSV with full creator name - fetch ALL filtered orders (not just current page)
  const handleExportCSV = async () => {
    setExporting(true)
    try {
      if (!supabase || !session) {
        toast.error('Please sign in to export')
        return
      }

      // Fetch ALL orders matching current filters (not just current page)
      let exportQuery: any = supabase.from('orders_with_creator').select('*')
      
      if (search.trim()) {
        const escaped = search.replace(/'/g, "''")
        exportQuery = exportQuery.or(
          `order_number.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,customer_phone.ilike.%${escaped}%`
        )
      }

      if (statusFilter !== 'all') exportQuery = exportQuery.eq('order_status', statusFilter)
      if (paymentFilter !== 'all') exportQuery = exportQuery.eq('payment_status', paymentFilter)

      // Filter by period (same logic as buildQuery)
      const now = new Date()
      const startDate = {
        daily: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
        weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        monthly: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        yearly: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      }[period]

      if (period === 'monthly') {
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        if (startDate) {
          exportQuery = exportQuery.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
        }
      } else if (period === 'yearly') {
        const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        if (startDate) {
          exportQuery = exportQuery.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
        }
      } else if (startDate) {
        exportQuery = exportQuery.gte('created_at', startDate.toISOString())
      }

      // Date range override (if provided)
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        exportQuery = exportQuery.gte('created_at', fromDate.toISOString())
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        exportQuery = exportQuery.lte('created_at', toDate.toISOString())
      }

      if (sortConfig) {
        exportQuery = exportQuery.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })
      }

      const { data: allOrders, error } = await exportQuery
      if (error) throw error

      if (!allOrders || allOrders.length === 0) {
        toast.error('No orders found for the selected period')
        return
      }

      const ordersToExport = allOrders as Order[]
      
      // Debug: Log sample order to verify creator_name is present
      if (ordersToExport.length > 0) {
        console.log('📊 Exporting orders for CSV:', {
          count: ordersToExport.length,
          period,
          sampleOrder: {
            order_number: ordersToExport[0].order_number,
            creator_name: ordersToExport[0].creator_name,
            creator_name_first: ordersToExport[0].creator_name ? ordersToExport[0].creator_name.split(' ')[0] : null,
            creator_email: ordersToExport[0].creator_email,
            created_by: ordersToExport[0].created_by,
            allFields: Object.keys(ordersToExport[0])
          }
        })
      }

      const headers = [
        'Order #',
        'Customer Name',
        'Customer Phone',
        'Description',
        'Quantity',
        'Unit Price (GHS)',
        'Total Amount (GHS)',
        'Payment Method',
        'Payment Status',
        'Order Status',
        'Created By',
        'Created At',
      ]
      
      const rows = ordersToExport.map((o) => [
        o.order_number,
        o.customer_name,
        o.customer_phone ?? '',
        o.item_description ?? '',
        o.quantity ?? '',
        o.unit_price ? o.unit_price.toFixed(2) : '',
        o.total_amount ? o.total_amount.toFixed(2) : '',
        o.payment_method 
          ? o.payment_method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : '',
        o.payment_status ?? '',
        o.order_status ?? '',
        (o.creator_name && o.creator_name.trim()) ? o.creator_name.split(' ')[0] : (o.creator_email ? o.creator_email.split('@')[0] : '-'), // Use creator first name only
        o.created_at ? new Date(o.created_at).toLocaleString() : '',
      ])
      
      const csv = [headers, ...rows]
        .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','))
        .join('\n')
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)

      const fromPart = dateFrom ? `${dateFrom}` : ''
      const toPart = dateTo ? `_${dateTo}` : ''
      const periodLabel = period.charAt(0).toUpperCase() + period.slice(1)
      link.download = `orders_${periodLabel}_${fromPart}${toPart}_${new Date().toISOString().split('T')[0]}.csv`
      
      link.click()
      URL.revokeObjectURL(link.href)
      toast.success('CSV exported successfully!')
    } catch (err) {
      console.error('CSV export error:', err)
      toast.error('Failed to export CSV')
    } finally {
      setExporting(false)
      setShowExportConfirm(false)
    }
  }

  // Export to PDF with company logo and matching UI styling - fetch ALL filtered orders
  const handleExportPDF = async () => {
    setExporting(true)
    try {
      if (!supabase || !session) {
        toast.error('Please sign in to export')
        return
      }

      // Fetch ALL orders matching current filters (not just current page)
      let exportQuery: any = supabase.from('orders_with_creator').select('*')
      
      if (search.trim()) {
        const escaped = search.replace(/'/g, "''")
        exportQuery = exportQuery.or(
          `order_number.ilike.%${escaped}%,customer_name.ilike.%${escaped}%,customer_phone.ilike.%${escaped}%`
        )
      }

      if (statusFilter !== 'all') exportQuery = exportQuery.eq('order_status', statusFilter)
      if (paymentFilter !== 'all') exportQuery = exportQuery.eq('payment_status', paymentFilter)

      // Filter by period (same logic as buildQuery)
      const now = new Date()
      const startDate = {
        daily: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
        weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        monthly: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        yearly: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0),
      }[period]

      if (period === 'monthly') {
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        if (startDate) {
          exportQuery = exportQuery.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
        }
      } else if (period === 'yearly') {
        const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        if (startDate) {
          exportQuery = exportQuery.gte('created_at', startDate.toISOString()).lte('created_at', endDate.toISOString())
        }
      } else if (startDate) {
        exportQuery = exportQuery.gte('created_at', startDate.toISOString())
      }

      // Date range override (if provided)
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        exportQuery = exportQuery.gte('created_at', fromDate.toISOString())
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        exportQuery = exportQuery.lte('created_at', toDate.toISOString())
      }

      if (sortConfig) {
        exportQuery = exportQuery.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' })
      }

      const { data: allOrders, error } = await exportQuery
      if (error) throw error

      if (!allOrders || allOrders.length === 0) {
        toast.error('No orders found for the selected period')
        return
      }

      const ordersToExport = allOrders as Order[]
      
      // Debug: Log sample order to verify creator_name is present
      if (ordersToExport.length > 0) {
        console.log('📊 Exporting orders for PDF:', {
          count: ordersToExport.length,
          period,
          sampleOrder: {
            order_number: ordersToExport[0].order_number,
            creator_name: ordersToExport[0].creator_name,
            creator_name_first: ordersToExport[0].creator_name ? ordersToExport[0].creator_name.split(' ')[0] : null,
            creator_email: ordersToExport[0].creator_email,
            created_by: ordersToExport[0].created_by,
            allFields: Object.keys(ordersToExport[0])
          }
        })
      }

      const doc = new jsPDF('landscape', 'mm', 'a4')
      
      // Add company logo and letterhead
      try {
        const logoImg = new Image()
        logoImg.crossOrigin = 'anonymous'
        
        await new Promise<void>((resolve) => {
          logoImg.onload = () => {
            try {
              const logoWidth = 25
              const aspectRatio = logoImg.width / logoImg.height
              const logoHeight = logoWidth / aspectRatio
              
              doc.addImage(logoImg, 'PNG', 14, 10, logoWidth, logoHeight)
              resolve()
            } catch (err) {
              console.log('Error adding logo:', err)
              resolve()
            }
          }
          logoImg.onerror = () => resolve()
          // Try different logo paths
          logoImg.src = '/assets/logo/UPPLOGO.png'
        })
      } catch (error) {
        console.log('Logo could not be loaded:', error)
      }
      
      // Company header
      doc.setFontSize(20)
      doc.setTextColor(0, 0, 0)
      doc.text('Universal Printing Press', 48, 18)
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text('Orders Management System', 48, 25)
      
      // Separator line
      doc.setDrawColor(200, 200, 200)
      doc.line(14, 32, 276, 32)
      
      // Report title and period
      doc.setFontSize(16)
      doc.setTextColor(0, 0, 0)
      doc.text('Orders Report', 14, 42)
      
      doc.setFontSize(11)
      doc.setTextColor(80, 80, 80)
      const periodLabel = period.charAt(0).toUpperCase() + period.slice(1)
      const periodText = dateFrom && dateTo 
        ? `Period: ${dateFrom} to ${dateTo}`
        : `Period: ${periodLabel}`
      doc.text(periodText, 14, 48)
      doc.text(`Total Orders: ${ordersToExport.length}`, 14, 54)
      
      // Calculate summary
      const totalRevenue = ordersToExport.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
      doc.text(`Total Revenue: GHS ${totalRevenue.toFixed(2)}`, 14, 60)
      
      // Prepare table data with color coding matching UI
      const tableData = ordersToExport.map((o) => {
        // Format payment status with color info
        const paymentStatus = (o.payment_status || 'pending').toLowerCase()
        const paymentColor: [number, number, number] = paymentStatus === 'full payment'
          ? [34, 197, 94] // green-500
          : paymentStatus.includes('partial')
          ? [234, 179, 8] // yellow-500
          : paymentStatus.includes('pending')
          ? [249, 115, 22] // orange-500
          : [239, 68, 68] // red-500
        
        // Format order status with color info
        const orderStatus = (o.order_status || 'pending').toLowerCase()
        const orderColor: [number, number, number] = orderStatus === 'completed'
          ? [34, 197, 94] // green-500
          : orderStatus === 'in_progress'
          ? [59, 130, 246] // blue-500
          : orderStatus === 'cancelled'
          ? [239, 68, 68] // red-500
          : [107, 114, 128] // gray-500
        
        return {
          order_number: o.order_number,
          customer: o.customer_name,
          phone: o.customer_phone || '-',
          description: (o.item_description || '-').substring(0, 30), // Truncate for table
          quantity: String(o.quantity ?? '-'),
          unit_price: o.unit_price ? `GHS ${o.unit_price.toFixed(2)}` : '-',
          amount: o.total_amount ? `GHS ${o.total_amount.toFixed(2)}` : 'GHS 0.00',
          payment_method: o.payment_method 
            ? o.payment_method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
            : '-',
          payment_status: (o.payment_status || 'pending').toUpperCase(),
          payment_color: paymentColor,
          order_status: (o.order_status || 'pending').toUpperCase(),
          order_color: orderColor,
          created_by: (o.creator_name && o.creator_name.trim()) ? o.creator_name.split(' ')[0] : (o.creator_email ? o.creator_email.split('@')[0] : '-'), // First name only
          created_at: o.created_at ? new Date(o.created_at).toLocaleDateString() : '-',
        }
      })
      
      // Create table with autoTable
      autoTable(doc, {
        head: [[
          'Order #',
          'Customer',
          'Phone',
          'Description',
          'Qty',
          'Unit Price',
          'Amount',
          'Payment Method',
          'Payment',
          'Status',
          'Created By',
          'Date'
        ]],
        body: tableData.map(row => [
          row.order_number,
          row.customer,
          row.phone,
          row.description,
          row.quantity,
          row.unit_price,
          row.amount,
          row.payment_method,
          row.payment_status,
          row.order_status,
          row.created_by,
          row.created_at,
        ]),
        startY: 66,
        styles: { 
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: { 
          fillColor: [148, 163, 184], // gray-400 background
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Order #
          1: { cellWidth: 35 }, // Customer
          2: { cellWidth: 28 }, // Phone
          3: { cellWidth: 45 }, // Description
          4: { cellWidth: 15 }, // Qty
          5: { cellWidth: 25 }, // Unit Price
          6: { cellWidth: 25 }, // Amount
          7: { cellWidth: 30 }, // Payment Method
          8: { cellWidth: 30 }, // Payment Status
          9: { cellWidth: 25 }, // Order Status
          10: { cellWidth: 30 }, // Created By
          11: { cellWidth: 25 }, // Date
        },
        didParseCell: (data) => {
          // Apply color coding to payment status and order status columns
          if (data.column.index === 8 && tableData[data.row.index]) {
            // Payment status column
            const colors = tableData[data.row.index].payment_color
            data.cell.styles.fillColor = colors
            data.cell.styles.textColor = [255, 255, 255]
          } else if (data.column.index === 9 && tableData[data.row.index]) {
            // Order status column
            const colors = tableData[data.row.index].order_color
            data.cell.styles.fillColor = colors
            data.cell.styles.textColor = [255, 255, 255]
          }
        },
        margin: { left: 14, right: 14 },
      })
      
      // Add footer with page number
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(
          `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleString()}`,
          14,
          doc.internal.pageSize.getHeight() - 10
        )
      }
      
      // Save PDF
      const fromPart = dateFrom ? `${dateFrom}` : ''
      const toPart = dateTo ? `_${dateTo}` : ''
      const periodLabel2 = period.charAt(0).toUpperCase() + period.slice(1)
      const filename = `orders_${periodLabel2}_${fromPart}${toPart}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(filename)
      
      toast.success('PDF exported successfully!')
    } catch (err) {
      console.error('PDF export error:', err)
      toast.error('Failed to export PDF')
    } finally {
      setExporting(false)
      setShowExportConfirm(false)
    }
  }

  // 🔔 File Storage System START
  // Fetch files for a specific order
  const fetchOrderFiles = async (orderId: string) => {
    if (!supabase) return
    try {
      const { data, error } = await supabase.storage
        .from('order-files')
        .list(`orders/${orderId}`)

      if (error) throw error

      setOrderFiles((prev) => ({
        ...prev,
        [orderId]: (data || []) as OrderFile[],
      }))
    } catch (err) {
      console.error('Fetch files error:', err)
      toast.error('Failed to fetch files')
    }
  }

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, orderId: string) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (!supabase) return toast.error('Client not ready')

    setUploadingFiles((prev) => ({ ...prev, [orderId]: true }))

    try {
      for (const file of Array.from(files)) {
        const filePath = `orders/${orderId}/${file.name}`
        const { error } = await supabase.storage.from('order-files').upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        })

        if (error) throw error
      }

      toast.success(`${files.length} file(s) uploaded successfully`)
      await fetchOrderFiles(orderId)

      // Reset input
      e.target.value = ''
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Failed to upload files')
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [orderId]: false }))
    }
  }

  // Handle file download/view
  const handleFileView = async (orderId: string, fileName: string) => {
    if (!supabase) return
    try {
      const { data } = await supabase.storage
        .from('order-files')
        .createSignedUrl(`orders/${orderId}/${fileName}`, 60)

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err) {
      console.error('View file error:', err)
      toast.error('Failed to view file')
    }
  }

  // Handle file delete
  const handleFileDelete = async (orderId: string, fileName: string) => {
    const order = orders.find((o) => o.id === orderId)
    if (!order || !canEditOrder(order)) return toast.error('You cannot delete files')
    if (!supabase) return
    if (!confirm(`Delete ${fileName}?`)) return

    try {
      const { error } = await supabase.storage.from('order-files').remove([`orders/${orderId}/${fileName}`])

      if (error) throw error

      toast.success('File deleted')
      await fetchOrderFiles(orderId)
    } catch (err) {
      console.error('Delete file error:', err)
      toast.error('Failed to delete file')
    }
  }

  // Toggle order expansion
  const toggleOrderExpansion = (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null)
    } else {
      setExpandedOrderId(orderId)
      if (!orderFiles[orderId]) {
        fetchOrderFiles(orderId)
      }
    }
  }
  // 🔔 File Storage System END

  // ✏️ Edit/Delete Handlers START
  const handleEditClick = (order: Order) => {
    setOrderToEdit(order)
    setEditModalOpen(true)
  }

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!orderToDelete || !supabase) return
    
    // Check permissions before deleting
    if (!canDeleteOrder(orderToDelete)) {
      toast.error('You do not have permission to delete this order')
      setDeleteDialogOpen(false)
      setOrderToDelete(null)
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderToDelete.id)

      if (error) throw error

      // Create notification for order deletion
      await supabase.from('notifications').insert({
        title: '🗑️ Order Deleted',
        message: `Order #${orderToDelete.order_number} has been deleted`,
        type: 'order',
        link: '/orders',
        user_role: 'all',
        read: false,
      })

      toast.success('Order deleted successfully')
      setDeleteDialogOpen(false)
      setOrderToDelete(null)
      fetchOrders(page)
    } catch (err) {
      console.error('Delete order error:', err)
      toast.error('Failed to delete order')
    } finally {
      setDeleting(false)
    }
  }
  // ✏️ Edit/Delete Handlers END

  // ====== Effects ======
  // fetch profile when client & session available
  useEffect(() => {
    if (!supabase) return
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, session])

  // fetch orders when filters change
  useEffect(() => {
    if (!supabase) return
    // fetchOrders will check session
    fetchOrders(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, search, statusFilter, paymentFilter, period, sortConfig, dateFrom, dateTo])

  // pagination effect: fetch when page changes
  useEffect(() => {
    if (!supabase) return
    fetchOrders(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  // realtime subscription
  useEffect(() => {
    if (!supabase) return
    let isSubscribed = true
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          if (isSubscribed) fetchOrders(page)
        }
      )
      .subscribe()

    return () => {
      isSubscribed = false
      // remove channel safely (works with Supabase JS v2)
      try {
        supabase.removeChannel(channel)
      } catch (err) {
        // if removeChannel isn't available or fails, try unsubscribe if channel object has it
        // @ts-ignore
        channel?.unsubscribe?.()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, page])

  // ====== Render ======
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage customer orders with role-based access
              {profile?.role && <span className="ml-2 text-xs text-gray-500">(Role: {profile.role})</span>}
            </p>
          </div>
        </div>

        <FilterToolbar
          search={search}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={(v) => { setStatusFilter(v); setPage(0) }}
          paymentFilter={paymentFilter}
          onPaymentChange={(v) => { setPaymentFilter(v); setPage(0) }}
          dateFrom={dateFrom}
          onDateFromChange={(v) => { setDateFrom(v); setPage(0) }}
          dateTo={dateTo}
          onDateToChange={(v) => { setDateTo(v); setPage(0) }}
          period={period}
          onPeriodChange={(v) => { setPeriod(v as Period); setPage(0) }}
          canAddNew={canAddNew()}
          onAddNew={() => setNewOrderModalOpen(true)}
          onExport={handleExport}
        />
      </div>


      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-2xl font-bold">{summary.totalOrders}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-2xl font-bold">₵{summary.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Pending Payments</p>
          <p className="text-2xl font-bold">{summary.pendingPayments}</p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card -mx-4 sm:mx-0">
        {/* Top scrollbar - synchronized with bottom */}
        <div 
          ref={topScrollRef}
          className="overflow-x-auto border-b bg-muted/30 w-full" 
          style={{ 
            scrollBehavior: 'smooth', 
            WebkitOverflowScrolling: 'touch',
            height: '17px',
            maxHeight: '17px',
            overflowY: 'hidden',
            maxWidth: '100%'
          }}
          onScroll={(e) => {
            if (isScrollingRef.current) return
            isScrollingRef.current = true
            if (bottomScrollRef.current) {
              // Temporarily disable smooth scrolling for programmatic update
              const originalScrollBehavior = bottomScrollRef.current.style.scrollBehavior
              bottomScrollRef.current.style.scrollBehavior = 'auto'
              bottomScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
              requestAnimationFrame(() => {
                bottomScrollRef.current!.style.scrollBehavior = originalScrollBehavior
                isScrollingRef.current = false
              })
            } else {
              isScrollingRef.current = false
            }
          }}
        >
          {/* Invisible duplicate table header to match table width exactly */}
          <div className="inline-block min-w-full align-middle" style={{ opacity: 0, pointerEvents: 'none', height: '1px', minWidth: 'max-content' }}>
            <div className="overflow-visible">
              <table className="w-full text-sm text-left divide-y divide-border" style={{ minWidth: '1400px', width: 'max-content' }}>
              <thead>
                <tr>
                  <th className="px-4 py-3 w-8 whitespace-nowrap"></th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '120px' }}>Order #</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '150px' }}>Customer</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '180px' }}>Email</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '130px' }}>Phone</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '200px' }}>Description</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '80px' }}>Qty</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '120px' }}>Unit Price (₵)</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '120px' }}>Amount (₵)</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '150px' }}>Payment Method</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '140px' }}>Payment</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '120px' }}>Status</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '120px' }}>Created By</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '120px' }}>Date</th>
                  <th className="px-4 py-3 whitespace-nowrap" style={{ minWidth: '180px' }}>Actions</th>
                </tr>
              </thead>
            </table>
            </div>
          </div>
        </div>
        {/* Main scrollable table container */}
        <div 
          ref={bottomScrollRef}
          className="overflow-x-auto overflow-y-visible w-full" 
          style={{ 
            scrollBehavior: 'smooth', 
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%',
            // Force horizontal scroll even on large screens for cleaner UI
            maxHeight: 'calc(100vh - 300px)',
          }}
          onScroll={(e) => {
            if (isScrollingRef.current) return
            isScrollingRef.current = true
            if (topScrollRef.current) {
              // Temporarily disable smooth scrolling for programmatic update
              const originalScrollBehavior = topScrollRef.current.style.scrollBehavior
              topScrollRef.current.style.scrollBehavior = 'auto'
              topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
              requestAnimationFrame(() => {
                topScrollRef.current!.style.scrollBehavior = originalScrollBehavior
                isScrollingRef.current = false
              })
            } else {
              isScrollingRef.current = false
            }
          }}
        >
          <div className="inline-block min-w-full align-middle" style={{ minWidth: 'max-content' }}>
            <div className="overflow-visible">
              <table className="w-full text-sm text-left divide-y divide-border" style={{ minWidth: '1400px', width: 'max-content' }}>
            <thead className="bg-muted text-muted-foreground uppercase text-xs sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 w-8 whitespace-nowrap"></th>
              {[
                { label: 'Order #', minWidth: '120px' },
                { label: 'Customer', minWidth: '150px' },
                { label: 'Email', minWidth: '180px' },
                { label: 'Phone', minWidth: '130px' },
                { label: 'Description', minWidth: '200px' },
                { label: 'Qty', minWidth: '80px' },
                { label: 'Unit Price (₵)', minWidth: '120px' },
                { label: 'Amount (₵)', minWidth: '120px' },
                { label: 'Payment Method', minWidth: '150px' },
                { label: 'Payment', minWidth: '140px' },
                { label: 'Status', minWidth: '120px' },
                { label: 'Created By', minWidth: '120px' },
                { label: 'Date', minWidth: '120px' },
                { label: 'Actions', minWidth: '180px' },
              ].map((item) => (
                <th key={item.label} className="px-4 py-3 whitespace-nowrap" style={{ minWidth: item.minWidth }}>{item.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={15} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={15} className="text-center py-8 text-muted-foreground">No orders found</td></tr>
            ) : (
              orders.map((o) => (
                <Fragment key={o.id}>
                  <tr className="hover:bg-muted/40">
                    {/* 🔔 Expand Button START */}
                    <td className="px-2 py-3">
                      <button
                        onClick={() => toggleOrderExpansion(o.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {expandedOrderId === o.id ? (
                          <ChevronUpIcon className="h-5 w-5" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    {/* 🔔 Expand Button END */}

                    <td className="px-4 py-3 font-medium whitespace-nowrap">{o.order_number}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{o.customer_name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {o.customer_email ? (
                        <a 
                          href={`mailto:${o.customer_email}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline truncate block max-w-[180px]"
                          title={o.customer_email}
                        >
                          {o.customer_email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{o.customer_phone || '-'}</td>
                    <td className="px-4 py-3 whitespace-normal min-w-[200px]">{o.item_description || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">{o.quantity ?? '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">₵{o.unit_price ? o.unit_price.toFixed(2) : '-'}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">₵{o.total_amount ?? '0.00'}</td>
                    
                    {/* Payment Method */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full bg-muted text-xs font-medium whitespace-nowrap">
                        {o.payment_method 
                          ? o.payment_method
                              .replace(/_/g, ' ')
                              .replace(/\b\w/g, (c) => c.toUpperCase())
                          : '-'}
                      </span>
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingPaymentStatus === o.id ? (
                        <select
                          value={o.payment_status || 'pending'}
                          onChange={(e) => updatePaymentStatus(o.id, e.target.value)}
                          className="px-2 py-1 rounded border text-xs"
                        >
                          <option value="full payment">Full Payment</option>
                          <option value="partial payment">Partial Payment</option>
                          <option value="pending">Pending</option>
                          <option value="pending on contract">Pending on Contract</option>
                          <option value="partially paid on contract">Partially Paid on Contract</option>
                        </select>
                      ) : (
                        <span
                          onClick={() => canEditOrder(o) && setEditingPaymentStatus(o.id)}
                          className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            canEditOrder(o) ? 'cursor-pointer' : 'cursor-default',
                            (o.payment_status || '').toLowerCase() === 'full payment'
                              ? 'bg-green-50 text-green-600'
                              : (o.payment_status || '').toLowerCase().includes('partial')
                              ? 'bg-yellow-50 text-yellow-600'
                              : (o.payment_status || '').toLowerCase().includes('pending')
                              ? 'bg-orange-50 text-orange-600'
                              : 'bg-red-50 text-red-600'
                          )}
                        >
                          {(o.payment_status || 'pending').toUpperCase()}
                        </span>
                      )}
                    </td>

                    {/* Order Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editingOrderStatus === o.id ? (
                        <select
                          value={o.order_status || 'pending'}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="px-2 py-1 rounded border text-xs"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span
                          onClick={() => canEditOrder(o) && setEditingOrderStatus(o.id)}
                          className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            canEditOrder(o) ? 'cursor-pointer' : 'cursor-default',
                            o.order_status === 'completed'
                              ? 'bg-green-50 text-green-600'
                              : o.order_status === 'in_progress'
                              ? 'bg-blue-50 text-blue-600'
                              : o.order_status === 'cancelled'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-gray-50 text-gray-600'
                          )}
                        >
                          {(o.order_status || 'pending').toUpperCase()}
                        </span>
                      )}
                    </td>

                    {/* Created By - Show creator first name or email */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {o.creator_name ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm whitespace-nowrap">
                            {o.creator_name.split(' ')[0]}
                          </span>
                        </div>
                      ) : o.creator_email ? (
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{o.creator_email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 whitespace-nowrap flex-nowrap shrink-0">
                        <button
                          onClick={() => toggleOrderExpansion(o.id)}
                          className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors shrink-0"
                          title="View files"
                        >
                          <PaperClipIcon className="h-4 w-4" />
                        </button>
                        {/* ✏️ Edit Button START */}
                        {canEditOrder(o) && (
                          <button
                            onClick={() => handleEditClick(o)}
                            className="p-2 text-blue-600 hover:bg-blue-600/10 rounded-lg transition-colors shrink-0"
                            title="Edit order"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                        {/* ✏️ Edit Button END */}
                        {/* 🗑️ Delete Button START */}
                        {canDeleteOrder(o) && (
                          <button
                            onClick={() => handleDeleteClick(o)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                            title="Delete order"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                        {/* 🗑️ Delete Button END */}
                        {canAssign() && (
                          <button
                            onClick={() => {
                              setSelectedOrder(o.id)
                              setAssignmentModalOpen(true)
                            }}
                            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors shrink-0"
                            title="Assign staff"
                          >
                            <UserIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* 🔔 File Storage Expansion Row START */}
                  {expandedOrderId === o.id && (
                    <tr className="bg-muted/20">
                      <td colSpan={13} className="px-8 py-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                              <PaperClipIcon className="h-5 w-5" />
                              Order Files
                            </h3>
                          </div>

                          {/* Upload Section */}
                          <div className="border-2 border-dashed border-border rounded-lg p-6 bg-background">
                            <label
                              htmlFor={`file-upload-${o.id}`}
                              className="flex flex-col items-center justify-center cursor-pointer"
                            >
                              <CloudArrowUpIcon className="h-12 w-12 text-muted-foreground mb-2" />
                              <span className="text-sm font-medium text-foreground">
                                {uploadingFiles[o.id] ? 'Uploading...' : 'Click to upload files'}
                              </span>
                              <span className="text-xs text-muted-foreground mt-1">
                                or drag and drop
                              </span>
                              <input
                                id={`file-upload-${o.id}`}
                                type="file"
                                multiple
                                onChange={(e) => handleFileUpload(e, o.id)}
                                className="hidden"
                                disabled={uploadingFiles[o.id]}
                              />
                            </label>
                          </div>

                          {/* Files List */}
                          <div className="space-y-2">
                            {orderFiles[o.id] && orderFiles[o.id].length > 0 ? (
                              orderFiles[o.id].map((file) => (
                                <div
                                  key={file.name}
                                  className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/40"
                                >
                                  <div className="flex items-center gap-3">
                                    <PaperClipIcon className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <p className="text-sm font-medium">{file.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {file.metadata?.size
                                          ? `${(file.metadata.size / 1024).toFixed(2)} KB`
                                          : 'Unknown size'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleFileView(o.id, file.name)}
                                      className="p-2 hover:bg-muted rounded"
                                      title="View/Download"
                                    >
                                      <EyeIcon className="h-4 w-4 text-primary" />
                                    </button>
                                    {canEditOrder(o) && (
                                      <button
                                        onClick={() => handleFileDelete(o.id, file.name)}
                                        className="p-2 hover:bg-destructive/10 rounded"
                                        title="Delete"
                                      >
                                        <TrashIcon className="h-4 w-4 text-destructive" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No files uploaded yet
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  {/* 🔔 File Storage Expansion Row END */}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>Page {page + 1}</div>
        <div className="space-x-2">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1 border rounded">
            Prev
          </button>
          <button onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded">
            Next
          </button>
        </div>
      </div>

      {/* Modals */}
      {selectedOrder && (
        <StaffAssignmentModal
          isOpen={assignmentModalOpen}
          onClose={() => setAssignmentModalOpen(false)}
          orderId={selectedOrder}
          orderTitle={orders.find((x) => x.id === selectedOrder)?.customer_name || 'Order'}
          onAssignmentComplete={() => {
            toast.success('Assignment updated')
            fetchOrders(page)
            setAssignmentModalOpen(false)
          }}
        />
      )}
      <NewOrderModal isOpen={newOrderModalOpen} onClose={() => setNewOrderModalOpen(false)} />

      {/* ✏️ Edit Order Modal */}
      <EditOrderModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setOrderToEdit(null)
        }}
        order={orderToEdit}
        onSuccess={() => {
          fetchOrders(page)
        }}
      />

      {/* 🗑️ Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false)
          setOrderToDelete(null)
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Order"
        message={`Are you sure you want to delete Order #${orderToDelete?.order_number}? This action cannot be undone.`}
        loading={deleting}
      />
      
      <ExportConfirmDialog
        isOpen={showExportConfirm}
        onClose={() => setShowExportConfirm(false)}
        onConfirm={exportFormat === 'pdf' ? handleExportPDF : handleExportCSV}
        format={exportFormat}
        recordCount={orders.length}
        period={period.charAt(0).toUpperCase() + period.slice(1)}
        loading={exporting}
      />
    </div>
  )
}
