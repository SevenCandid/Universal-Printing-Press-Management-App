'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import toast from 'react-hot-toast'
import { ArrowLeftIcon, ArchiveBoxIcon, UserGroupIcon, Cog6ToothIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline'

export default function CEOSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalTasks: 0,
    totalCustomers: 0,
  })

  useEffect(() => {
    const loadData = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }
      setUser(user)

      const storedRole = localStorage.getItem('role')
      setRole(storedRole || 'staff')

      // Verify CEO access
      if (storedRole !== 'ceo') {
        toast.error('Access denied. CEO only.')
        router.push('/settings')
        return
      }

      // Load system statistics
      await loadStats()
    }

    loadData()
  }, [router])

  const loadStats = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      // Get total orders
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })

      // Get total tasks
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })

      // Get total customers - count unique customers from orders
      // This counts distinct customer_name + customer_phone + customer_email combinations
      const { data: ordersData } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, customer_email')

      // Count unique customers from orders
      const uniqueCustomersFromOrders = new Set<string>()
      if (ordersData) {
        ordersData.forEach((order) => {
          // Create a unique key from customer info (normalize to lowercase for comparison)
          const name = (order.customer_name || '').trim().toLowerCase()
          const phone = (order.customer_phone || '').trim()
          const email = (order.customer_email || '').trim().toLowerCase()
          
          // Use email if available, otherwise phone, otherwise name
          const key = email || phone || name
          if (key && name) {
            uniqueCustomersFromOrders.add(key)
          }
        })
      }

      // Get manually added customers from customers table
      const { data: manualCustomers } = await supabase
        .from('customers')
        .select('full_name, phone, email')

      // Count unique manually added customers
      const uniqueManualCustomers = new Set<string>()
      if (manualCustomers) {
        manualCustomers.forEach((customer) => {
          const name = (customer.full_name || '').trim().toLowerCase()
          const phone = (customer.phone || '').trim()
          const email = (customer.email || '').trim().toLowerCase()
          
          const key = email || phone || name
          if (key && name) {
            uniqueManualCustomers.add(key)
          }
        })
      }

      // Combine both sets to get total unique customers (avoiding duplicates)
      const allUniqueCustomers = new Set([...uniqueCustomersFromOrders, ...uniqueManualCustomers])
      const totalCustomerCount = allUniqueCustomers.size

      setStats({
        totalUsers: userCount || 0,
        totalOrders: orderCount || 0,
        totalTasks: taskCount || 0,
        totalCustomers: totalCustomerCount,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleExportData = async (table: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')

      if (error) throw error

      // Convert to CSV
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]).join(',')
        const rows = data.map(row => Object.values(row).join(','))
        const csv = [headers, ...rows].join('\n')

        // Download
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${table}_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        toast.success(`${table} exported successfully`)
      } else {
        toast.error('No data to export')
      }
    } catch (error: any) {
      toast.error(`Failed to export ${table}: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = () => {
    localStorage.clear()
    toast.success('Cache cleared successfully')
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  const handleSystemRefresh = async () => {
    setLoading(true)
    try {
      await loadStats()
      toast.success('System statistics refreshed')
    } catch (error) {
      toast.error('Failed to refresh statistics')
    } finally {
      setLoading(false)
    }
  }

  if (role !== 'ceo') {
    return (
      <div className="container max-w-lg mx-auto py-10">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Access denied. CEO only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Administrative controls and system management
          </p>
        </div>

        {/* System Statistics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                System Statistics
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSystemRefresh}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{stats.totalTasks}</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Export */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArchiveBoxIcon className="h-5 w-5" />
              Data Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export system data to CSV format for backup or analysis
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={() => handleExportData('orders')}
                disabled={loading}
                className="w-full"
              >
                Export Orders
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportData('tasks')}
                disabled={loading}
                className="w-full"
              >
                Export Tasks
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportData('customers')}
                disabled={loading}
                className="w-full"
              >
                Export Customers
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExportData('profiles')}
                disabled={loading}
                className="w-full"
              >
                Export Users
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cog6ToothIcon className="h-5 w-5" />
              System Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-semibold">Clear Cache</h3>
                <p className="text-sm text-muted-foreground">
                  Clear all local storage and reload the application
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleClearCache}
                disabled={loading}
              >
                Clear Cache
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">System Health</h3>
                <p className="text-sm text-muted-foreground">
                  Check database connectivity and system status
                </p>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.from('profiles').select('count').limit(1)
                    if (error) throw error
                    toast.success('System is healthy')
                  } catch (error) {
                    toast.error('System health check failed')
                  }
                }}
                disabled={loading}
              >
                Check Health
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              Security & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">
                <strong>Current User:</strong> {user?.email || 'Loading...'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Role:</strong> {role?.toUpperCase() || 'N/A'}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Session Management</h3>
                <p className="text-sm text-muted-foreground">
                  Manage active user sessions
                </p>
              </div>
              <Button
                variant="outline"
                onClick={async () => {
                  const { error } = await supabase.auth.signOut()
                  if (error) {
                    toast.error('Failed to sign out')
                  } else {
                    localStorage.clear()
                    router.push('/login')
                  }
                }}
                disabled={loading}
              >
                Sign Out All Sessions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserGroupIcon className="h-5 w-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage user accounts and permissions. Navigate to Staff page for detailed user management.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/ceo/staff')}
              className="w-full"
            >
              Go to Staff Management
            </Button>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Application Version:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Database:</span>
                <span className="font-medium">Supabase</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Framework:</span>
                <span className="font-medium">Next.js</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

