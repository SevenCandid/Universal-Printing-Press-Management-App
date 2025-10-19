'use client'

import { FilterToolbar } from '@/components/ui/FilterToolbar'

import { useEffect, useState, useRef } from 'react'
import {
  PlusIcon,
  UserIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { StaffAssignmentModal } from '@/components/ui/StaffAssignmentModal'
import { NewOrderModal } from '@/components/ui/NewOrderModal'
import { cn } from '@/lib/utils'

type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_phone?: string
  item_description?: string
  quantity?: number
  total_amount?: number
  payment_method?: string
  payment_status?: string
  order_status?: string
  created_by?: string
  created_at?: string
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

  // Inline editing
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<string | null>(null)
  const [editingOrderStatus, setEditingOrderStatus] = useState<string | null>(null)

  // ====== Role Permissions ======
  const canEdit = () => ['ceo', 'manager'].includes(profile?.role?.toLowerCase() || '')
  const canAssign = () => ['ceo', 'manager'].includes(profile?.role?.toLowerCase() || '')
  const canAddNew = () =>
    ['ceo', 'manager', 'staff', 'board'].includes(profile?.role?.toLowerCase() || '')
  const isReadOnly = () => profile?.role?.toLowerCase() === 'board'

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

    let query: any = supabase.from('orders').select('*', { count: 'exact' })

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
      monthly: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()),
      yearly: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()),
    }[period]

    if (startDate) query = query.gte('created_at', startDate.toISOString())

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
    if (!canEdit() || isReadOnly()) return toast.error('You cannot modify payments')
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
    if (!canEdit() || isReadOnly()) return toast.error('You cannot modify order status')
    if (!supabase) return toast.error('Client not ready')
    try {
      const { error } = await supabase.from('orders').update({ order_status: newStatus }).eq('id', orderId)
      if (error) throw error
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o)))
      toast.success('Order updated')
    } catch (err) {
      console.error('Update order error:', err)
      toast.error('Failed to update order')
    } finally {
      setEditingOrderStatus(null)
    }
  }

  const handleExportCSV = () => {
    if (!orders.length) return toast('No data to export')
    const headers = [
      'Order #',
      'Customer Name',
      'Customer Phone',
      'Description',
      'Quantity',
      'Total Amount',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'Created By',
      'Created At',
    ]
    const rows = orders.map((o) => [
      o.order_number,
      o.customer_name,
      o.customer_phone ?? '',
      o.item_description ?? '',
      o.quantity ?? '',
      o.total_amount ?? '',
      o.payment_method ?? '',
      o.payment_status ?? '',
      o.order_status ?? '',
      o.created_by ?? '',
      o.created_at ?? '',
    ])
    const csv = [headers, ...rows].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)

    const fromPart = dateFrom ? `${dateFrom}` : ''
    const toPart = dateTo ? `_${dateTo}` : ''
    link.download = `orders_${period}_${fromPart}${toPart}_${new Date().toISOString()}.csv`
    link.click()
    toast.success('CSV exported')
  }

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
    onExport={handleExportCSV}
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
      <div className="overflow-x-auto border rounded-lg bg-card">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground uppercase text-xs">
            <tr>
              {[
                'Order #',
                'Customer',
                'Phone',
                'Description',
                'Qty',
                'Amount (₵)',
                'Payment',
                'Status',
                'Created By',
                'Date',
                'Actions',
              ].map((label) => (
                <th key={label} className="px-4 py-3">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-8 text-muted-foreground">No orders found</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{o.order_number}</td>
                  <td className="px-4 py-3">{o.customer_name}</td>
                  <td className="px-4 py-3">{o.customer_phone || '-'}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{o.item_description || '-'}</td>
                  <td className="px-4 py-3">{o.quantity ?? '-'}</td>
                  <td className="px-4 py-3 font-semibold">₵{o.total_amount ?? '0.00'}</td>

                  {/* Payment Status */}
                  <td className="px-4 py-3">
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
                        onClick={() => canEdit() && setEditingPaymentStatus(o.id)}
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium cursor-pointer',
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
                  <td className="px-4 py-3">
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
                        onClick={() => canEdit() && setEditingOrderStatus(o.id)}
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium cursor-pointer',
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

                  <td className="px-4 py-3">{o.created_by || '-'}</td>
                  <td className="px-4 py-3 text-xs">{o.created_at ? new Date(o.created_at).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {canAssign() && (
                      <button
                        onClick={() => {
                          setSelectedOrder(o.id)
                          setAssignmentModalOpen(true)
                        }}
                        className="flex items-center justify-end space-x-1 text-primary hover:underline"
                      >
                        <UserIcon className="h-4 w-4" />
                        <span>Assign</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    </div>
  )
}
