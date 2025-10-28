'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { AddCustomerModal } from '@/components/ui/AddCustomerModal'
import { EditCustomerModal } from '@/components/ui/EditCustomerModal'
import { DeleteConfirmDialog } from '@/components/ui/DeleteConfirmDialog'

// 👥 TYPES START
type TopCustomer = {
  customer_name: string
  customer_phone?: string
  customer_email?: string
  total_orders: number
  total_spent: number
}

type Customer = {
  id: string
  full_name: string
  email?: string
  phone?: string
  company?: string
  notes?: string
  category: string
  created_at: string
}
// 👥 TYPES END

export default function CustomersBase({ role }: { role: string }) {
  const { supabase, session } = useSupabase()
  
  // 👥 STATE MANAGEMENT START
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [otherCustomers, setOtherCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  // Search
  const [topSearch, setTopSearch] = useState('')
  const [otherSearch, setOtherSearch] = useState('')
  // 👥 STATE MANAGEMENT END
  
  // 🔐 PERMISSION HELPERS START
  const canManage = () => role === 'ceo' || role === 'manager' || role === 'executive_assistant'
  // 🔐 PERMISSION HELPERS END
  
  // 👥 FETCH OPERATIONS START
  
  // Fetch Top Customers (from view)
  const fetchTopCustomers = async () => {
    if (!supabase) return
    
    try {
      const { data, error } = await supabase
        .from('top_customers')
        .select('*')
      
      if (error) throw error
      
      setTopCustomers(data || [])
    } catch (err: any) {
      console.error('Fetch top customers error:', err)
      // Silent fail - view might not exist yet
    }
  }
  
  // Fetch Other Customers (from table)
  const fetchOtherCustomers = async () => {
    if (!supabase) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('category', 'other')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      setOtherCustomers(data || [])
    } catch (err: any) {
      console.error('Fetch other customers error:', err)
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }
  
  // Delete customer
  const handleDelete = async () => {
    if (!supabase || !selectedCustomer) return
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', selectedCustomer.id)
      
      if (error) throw error
      
      toast.success('✅ Customer deleted successfully!')
      setShowDeleteDialog(false)
      setSelectedCustomer(null)
      fetchOtherCustomers()
    } catch (err: any) {
      console.error('Delete customer error:', err)
      toast.error(err.message || 'Failed to delete customer')
    }
  }
  // 👥 FETCH OPERATIONS END
  
  // 🔄 REALTIME SUBSCRIPTION START
  useEffect(() => {
    if (!supabase) return
    
    fetchTopCustomers()
    fetchOtherCustomers()
    
    // Subscribe to customers changes
    const channel = supabase
      .channel('customers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers'
        },
        (payload) => {
          console.log('Customer change detected:', payload)
          fetchOtherCustomers()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])
  // 🔄 REALTIME SUBSCRIPTION END
  
  // 🔧 HELPER FUNCTIONS START
  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowEditModal(true)
  }
  
  const openDeleteDialog = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowDeleteDialog(true)
  }
  
  const formatCurrency = (amount: number) => {
    return `₵${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  const filteredTopCustomers = topCustomers.filter(c =>
    c.customer_name.toLowerCase().includes(topSearch.toLowerCase()) ||
    c.customer_email?.toLowerCase().includes(topSearch.toLowerCase()) ||
    c.customer_phone?.toLowerCase().includes(topSearch.toLowerCase())
  )
  
  const filteredOtherCustomers = otherCustomers.filter(c =>
    c.full_name.toLowerCase().includes(otherSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(otherSearch.toLowerCase()) ||
    c.phone?.toLowerCase().includes(otherSearch.toLowerCase()) ||
    c.company?.toLowerCase().includes(otherSearch.toLowerCase())
  )
  // 🔧 HELPER FUNCTIONS END
  
  return (
    <div className="space-y-8">
      {/* 📋 TOP CUSTOMERS SECTION START */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Top Customers</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Highest revenue customers • {filteredTopCustomers.length} customer{filteredTopCustomers.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={topSearch}
            onChange={(e) => setTopSearch(e.target.value)}
            placeholder="Search top customers..."
            className="w-full pl-8 pr-4 py-2 text-sm border border-border rounded-md bg-background"
          />
        </div>
        
        {/* Top Customers Table */}
        <div className="bg-card border border-border rounded-lg p-4">
          {filteredTopCustomers.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No top customers found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Phone</th>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-right">Orders</th>
                    <th className="px-3 py-2 text-right">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTopCustomers.map((customer, index) => (
                    <tr key={index} className="hover:bg-muted/40">
                      <td className="px-3 py-2.5">
                        <span className="font-bold text-primary">#{index + 1}</span>
                      </td>
                      <td className="px-3 py-2.5 font-medium">{customer.customer_name}</td>
                      <td className="px-3 py-2.5">
                        {customer.customer_phone ? (
                          <a href={`tel:${customer.customer_phone}`} className="text-blue-600 hover:underline">
                            {customer.customer_phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {customer.customer_email ? (
                          <a href={`mailto:${customer.customer_email}`} className="text-blue-600 hover:underline">
                            {customer.customer_email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">{customer.total_orders}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-green-600">
                        {formatCurrency(customer.total_spent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* 📋 TOP CUSTOMERS SECTION END */}
      
      {/* DIVIDER */}
      <div className="border-t-2 border-border"></div>
      
      {/* 📋 OTHER CUSTOMERS SECTION START */}
      {(role === 'ceo' || role === 'manager' || role === 'executive_assistant') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">Other Customers</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manually added customers • {filteredOtherCustomers.length} customer{filteredOtherCustomers.length !== 1 ? 's' : ''}
              </p>
            </div>
            {canManage() && (
              <Button
                onClick={() => setShowAddModal(true)}
                size="sm"
                className="flex items-center gap-1.5"
              >
                <PlusIcon className="h-4 w-4" />
                <span className="text-xs">Add Customer</span>
              </Button>
            )}
          </div>
          
          {/* Search */}
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={otherSearch}
              onChange={(e) => setOtherSearch(e.target.value)}
              placeholder="Search other customers..."
              className="w-full pl-8 pr-4 py-2 text-sm border border-border rounded-md bg-background"
            />
          </div>
          
          {/* Other Customers Table */}
          <div className="bg-card border border-border rounded-lg p-4">
            {loading ? (
              <p className="text-center py-8 text-sm text-muted-foreground">Loading...</p>
            ) : filteredOtherCustomers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground mb-4">No other customers yet</p>
                {canManage() && (
                  <Button onClick={() => setShowAddModal(true)} size="sm">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add First Customer
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Phone</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Company</th>
                      <th className="px-3 py-2 text-left">Notes</th>
                      {canManage() && <th className="px-3 py-2 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredOtherCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-muted/40">
                        <td className="px-3 py-2.5 font-medium">{customer.full_name}</td>
                        <td className="px-3 py-2.5">
                          {customer.phone ? (
                            <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                              {customer.phone}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {customer.email ? (
                            <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                              {customer.email}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">{customer.company || '-'}</td>
                        <td className="px-3 py-2.5">
                          <span className="line-clamp-2">{customer.notes || '-'}</span>
                        </td>
                        {canManage() && (
                          <td className="px-3 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(customer)}
                                className="p-1.5 text-blue-600 hover:bg-blue-600/10 rounded transition-colors"
                                title="Edit"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openDeleteDialog(customer)}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="Delete"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 📋 OTHER CUSTOMERS SECTION END */}
      
      {/* ➕ ADD MODAL START */}
      {showAddModal && (
        <AddCustomerModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchOtherCustomers()
          }}
        />
      )}
      {/* ➕ ADD MODAL END */}
      
      {/* ✏️ EDIT MODAL START */}
      {showEditModal && selectedCustomer && (
        <EditCustomerModal
          isOpen={showEditModal}
          customer={selectedCustomer}
          onClose={() => {
            setShowEditModal(false)
            setSelectedCustomer(null)
          }}
          onSuccess={() => {
            setShowEditModal(false)
            setSelectedCustomer(null)
            fetchOtherCustomers()
          }}
        />
      )}
      {/* ✏️ EDIT MODAL END */}
      
      {/* 🗑️ DELETE DIALOG START */}
      {showDeleteDialog && selectedCustomer && (
        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          title="Delete Customer"
          message={`Are you sure you want to delete "${selectedCustomer.full_name}"? This action cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => {
            setShowDeleteDialog(false)
            setSelectedCustomer(null)
          }}
        />
      )}
      {/* 🗑️ DELETE DIALOG END */}
    </div>
  )
}
