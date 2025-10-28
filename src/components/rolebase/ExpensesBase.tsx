'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// 🧾 EXPENSES TYPES START
type Expense = {
  id: string
  title: string
  amount: number
  category: string
  description?: string
  created_at: string
  updated_at: string
  added_by?: string
  profiles?: {
    name?: string
    email?: string
  }
}

const CATEGORIES = [
  'Production',
  'Salaries',
  'Utilities',
  'Rent',
  'Marketing',
  'Equipment',
  'Maintenance',
  'Supplies',
  'Transportation',
  'Other'
]
// 🧾 EXPENSES TYPES END

export default function ExpensesBase({ role }: { role: string }) {
  const { supabase, session } = useSupabase()
  
  // 🧾 STATE MANAGEMENT START
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Other',
    description: ''
  })
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  // 🧾 STATE MANAGEMENT END
  
  // 🔐 PERMISSION HELPERS START
  const canManage = () => role === 'ceo' || role === 'manager' || role === 'executive_assistant'
  // 🔐 PERMISSION HELPERS END
  
  // 🧾 CRUD OPERATIONS START
  
  // Fetch expenses
  const fetchExpenses = async () => {
    if (!supabase) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('expenses')
        .select(`
          *,
          profiles:added_by (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })
      
      // Apply filters
      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }
      
      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`)
      }
      
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      // Apply search filter client-side
      let filtered = data || []
      if (searchQuery) {
        filtered = filtered.filter(expense =>
          expense.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }
      
      setExpenses(filtered)
    } catch (err: any) {
      console.error('Fetch expenses error:', err)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }
  
  // Create expense
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !session?.user) return
    
    setLoading(true)
    try {
      const expenseData = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description || null,
        added_by: session.user.id
      }

      if (navigator.onLine) {
        // Online - save directly
        const { error } = await supabase
          .from('expenses')
          .insert(expenseData)
        
        if (error) throw error
        
        toast.success('✅ Expense created successfully!')
        setShowAddModal(false)
        resetForm()
        fetchExpenses()
      } else {
        // Offline - queue for sync
        const { addToSyncQueue } = await import('@/lib/offlineStorage')
        await addToSyncQueue({
          type: 'CREATE',
          table: 'expenses',
          data: expenseData
        })
        
        toast.success('📱 Expense saved offline! Will sync when online.', {
          icon: '🔄',
          duration: 4000,
        })
        setShowAddModal(false)
        resetForm()
      }
    } catch (err: any) {
      console.error('Create expense error:', err)
      toast.error(err.message || 'Failed to create expense')
    } finally {
      setLoading(false)
    }
  }
  
  // Update expense
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !selectedExpense) return
    
    setLoading(true)
    try {
      const expenseData = {
        id: selectedExpense.id,
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description || null
      }

      if (navigator.onLine) {
        // Online - update directly
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', selectedExpense.id)
        
        if (error) throw error
        
        toast.success('✅ Expense updated successfully!')
        setShowEditModal(false)
        setSelectedExpense(null)
        resetForm()
        fetchExpenses()
      } else {
        // Offline - queue for sync
        const { addToSyncQueue } = await import('@/lib/offlineStorage')
        await addToSyncQueue({
          type: 'UPDATE',
          table: 'expenses',
          data: expenseData
        })
        
        toast.success('📱 Update saved offline! Will sync when online.', {
          icon: '🔄',
          duration: 4000,
        })
        setShowEditModal(false)
        setSelectedExpense(null)
        resetForm()
      }
    } catch (err: any) {
      console.error('Update expense error:', err)
      toast.error(err.message || 'Failed to update expense')
    } finally {
      setLoading(false)
    }
  }
  
  // Delete expense
  const handleDelete = async () => {
    if (!supabase || !selectedExpense) return
    
    setLoading(true)
    try {
      if (navigator.onLine) {
        // Online - delete directly
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', selectedExpense.id)
        
        if (error) throw error
        
        toast.success('✅ Expense deleted successfully!')
        setShowDeleteDialog(false)
        setSelectedExpense(null)
        fetchExpenses()
      } else {
        // Offline - queue for sync
        const { addToSyncQueue } = await import('@/lib/offlineStorage')
        await addToSyncQueue({
          type: 'DELETE',
          table: 'expenses',
          data: { id: selectedExpense.id }
        })
        
        toast.success('📱 Delete saved offline! Will sync when online.', {
          icon: '🔄',
          duration: 4000,
        })
        setShowDeleteDialog(false)
        setSelectedExpense(null)
      }
    } catch (err: any) {
      console.error('Delete expense error:', err)
      toast.error(err.message || 'Failed to delete expense')
    } finally {
      setLoading(false)
    }
  }
  // 🧾 CRUD OPERATIONS END
  
  // 🔄 REALTIME SUBSCRIPTION START
  useEffect(() => {
    if (!supabase) return
    
    fetchExpenses()
    
    // Subscribe to expenses changes
    const channel = supabase
      .channel('expenses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses'
        },
        (payload) => {
          console.log('Expense change detected:', payload)
          fetchExpenses()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, searchQuery, categoryFilter, startDate, endDate])
  // 🔄 REALTIME SUBSCRIPTION END
  
  // 📥 EXPORT FUNCTIONS START
  const exportToCSV = () => {
    if (expenses.length === 0) {
      toast.error('No expenses to export')
      return
    }
    
    const headers = ['Title', 'Amount', 'Category', 'Description', 'Date', 'Added By']
    const rows = expenses.map(exp => [
      exp.title,
      exp.amount.toFixed(2),
      exp.category,
      exp.description || '',
      new Date(exp.created_at).toLocaleDateString(),
      exp.profiles?.name || 'Unknown'
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    
    toast.success('✅ Expenses exported to CSV!')
  }
  // 📥 EXPORT FUNCTIONS END
  
  // 🔧 HELPER FUNCTIONS START
  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category: 'Other',
      description: ''
    })
  }
  
  const openEditModal = (expense: Expense) => {
    setSelectedExpense(expense)
    setFormData({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      description: expense.description || ''
    })
    setShowEditModal(true)
  }
  
  const openDeleteDialog = (expense: Expense) => {
    setSelectedExpense(expense)
    setShowDeleteDialog(true)
  }
  
  const formatCurrency = (amount: number) => {
    return `₵${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  const getTotalExpenses = () => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0)
  }
  // 🔧 HELPER FUNCTIONS END
  
  return (
    <div className="space-y-4">
      {/* 📋 HEADER START */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total: {formatCurrency(getTotalExpenses())} • {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <FunnelIcon className="h-3.5 w-3.5" />
            <span className="text-xs">Filters</span>
          </Button>
          {canManage() && (
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
              className="flex items-center gap-1.5"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="text-xs">Add Expense</span>
            </Button>
          )}
        </div>
      </div>
      {/* 📋 HEADER END */}
      
      {/* 🔍 FILTERS SECTION START */}
      {showFilters && (
        <div className="bg-card border border-border rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1.5">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or description..."
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div>
              <label className="block text-xs font-medium mb-1.5">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Date Range */}
            <div className="md:col-span-2 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1.5">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
          
          {/* Export */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">Export:</span>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 h-7 text-xs px-2.5"
              disabled={expenses.length === 0}
            >
              <ArrowDownTrayIcon className="h-3 w-3" />
              CSV
            </Button>
            <Button
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
                setStartDate('')
                setEndDate('')
                toast.success('Filters cleared')
              }}
              variant="ghost"
              size="sm"
              className="ml-auto h-7 text-xs"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      )}
      {/* 🔍 FILTERS SECTION END */}
      
      {/* 📊 EXPENSES TABLE START */}
      <div className="bg-card border border-border rounded-lg p-4">
        {loading ? (
          <p className="text-center py-8 text-sm text-muted-foreground">Loading...</p>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-4">No expenses found</p>
            {canManage() && (
              <Button onClick={() => setShowAddModal(true)} size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add First Expense
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Added By</th>
                  {canManage() && <th className="px-3 py-2 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{expense.title}</p>
                      {expense.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{expense.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-semibold text-destructive">
                        {formatCurrency(expense.amount)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {new Date(expense.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: '2-digit' 
                      })}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {expense.profiles?.name || 'Unknown'}
                    </td>
                    {canManage() && (
                      <td className="px-3 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(expense)}
                            className="p-1.5 text-blue-600 hover:bg-blue-600/10 rounded transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(expense)}
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
      {/* 📊 EXPENSES TABLE END */}
      
      {/* ➕ ADD MODAL START */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Office Rent"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Amount (₵) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Category *</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional details..."
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* ➕ ADD MODAL END */}
      
      {/* ✏️ EDIT MODAL START */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Amount (₵) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1.5">Category *</label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* ✏️ EDIT MODAL END */}
      
      {/* 🗑️ DELETE DIALOG START */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedExpense?.title}"? 
              This action cannot be undone and the expense of {selectedExpense && formatCurrency(selectedExpense.amount)} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* 🗑️ DELETE DIALOG END */}
    </div>
  )
}

