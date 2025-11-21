'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { PlusCircle, Trash2, Pencil, History, Download, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type Material = {
  id: string
  name: string
  category: string
  vendor_id?: string | null
  total_quantity: number
  used_quantity: number
  unit: string
  price?: number | null
  location?: string | null
  remarks?: string | null
  purchase_date?: string | null
}

type Vendor = {
  id: string
  name: string
  last_price?: number | null
  last_purchase_date?: string | null
}

type Purchase = {
  id?: string
  material_id: string
  vendor_id?: string | null
  quantity: number
  price_per_unit: number
  total_price?: number
  purchase_date: string
  notes?: string | null
}

type MaterialToBuy = {
  id?: string
  material_name: string
  category: string
  quantity_needed: number
  unit: string
  vendor_id?: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes?: string | null
  status: 'pending' | 'approved' | 'rejected' | 'purchased'
  estimated_cost?: number | null
  created_by?: string | null
  updated_by?: string | null
  created_at?: string
  updated_at?: string
}

const categories = [
  { key: 'paper', name: 'Papers' },
  { key: 'ink', name: 'Inks & Toners' },
  { key: 'MAGiCARD', name: 'MAGiCARD Materials' },
  { key: 'chemicals', name: 'Chemicals' },
  { key: 'embroidery', name: 'Embroidery Materials' },
  { key: 'sewing', name: 'Sewing & Neatning' },
  { key: 'dtf', name: 'DTF Printing Materials (Film, Powder, Ink)' },
  { key: 'lf', name: 'Large Format Printing Materials (Banners, Stickers, Ink)' },
  { key: 'other', name: 'Other Materials' },
]

export default function MaterialsInventory() {
  const { supabase } = useSupabase()

  // Data
  const [materials, setMaterials] = useState<Material[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  // User role
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Materials to buy
  const [materialsToBuy, setMaterialsToBuy] = useState<MaterialToBuy[]>([])
  const [loadingMaterialsToBuy, setLoadingMaterialsToBuy] = useState(false)
  const [showMaterialToBuyModal, setShowMaterialToBuyModal] = useState(false)
  const [editingMaterialToBuy, setEditingMaterialToBuy] = useState<MaterialToBuy | null>(null)
  const [materialToBuyForm, setMaterialToBuyForm] = useState<Partial<MaterialToBuy>>({
    material_name: '',
    category: '',
    quantity_needed: 0,
    unit: '',
    vendor_id: null,
    priority: 'medium',
    notes: '',
    status: 'pending',
    estimated_cost: null,
  })

  // UI state
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Material | null>(null)
  const [formData, setFormData] = useState<Partial<Material>>({})

  // filters
  const [period, setPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'range'>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // exports
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | null>(null)

  // purchase history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [purchaseForm, setPurchaseForm] = useState<Partial<Purchase>>({})
  const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([])

  // Load current user ID and role
  useEffect(() => {
    if (!supabase?.auth) return
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.id) {
        setUserId(data.user.id)
        // Fetch user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()
        if (profile?.role) {
          const role = profile.role.toLowerCase()
          setUserRole(role)
          console.log('[InventoryMaterials] User role detected:', role)
        } else {
          console.log('[InventoryMaterials] No role found in profile')
        }
      }
    })()
  }, [supabase])

  // fetch materials & vendors (and purchases when needed)
  async function fetchData() {
    setLoading(true)
    try {
      const [mRes, vRes] = await Promise.all([
        supabase.from('materials_inventory').select('*'),
        supabase.from('vendors').select('*'),
      ])

      if (mRes.error) throw mRes.error
      if (vRes.error) throw vRes.error

      // store raw materials, filtering will be applied for display/export
      setMaterials(mRes.data || [])
      setVendors(vRes.data || [])
    } catch (err) {
      console.error('Fetch error', err)
      alert('Error fetching data. Check console.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch materials to buy
  const fetchMaterialsToBuy = useCallback(async () => {
    if (userRole !== 'ceo' && userRole !== 'executive_assistant') {
      console.log('[InventoryMaterials] fetchMaterialsToBuy: Skipping - role is', userRole)
      return
    }
    console.log('[InventoryMaterials] fetchMaterialsToBuy: Fetching materials to buy for role', userRole)
    setLoadingMaterialsToBuy(true)
    try {
      const { data, error } = await supabase
        .from('materials_to_buy')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist, silently fail and show empty state
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.warn('[InventoryMaterials] materials_to_buy table does not exist. Please run CREATE_MATERIALS_TO_BUY_TABLE.sql')
          setMaterialsToBuy([])
        } else {
          console.error('[InventoryMaterials] Error fetching materials to buy:', error)
          throw error
        }
      } else {
        console.log('[InventoryMaterials] Fetched', data?.length || 0, 'materials to buy')
        setMaterialsToBuy(data || [])
      }
    } catch (err: any) {
      console.error('[InventoryMaterials] Error fetching materials to buy:', err)
      // Don't show alert - just log to console and show empty state
      setMaterialsToBuy([])
    } finally {
      setLoadingMaterialsToBuy(false)
    }
  }, [userRole, supabase])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch materials to buy when user role is available
  useEffect(() => {
    console.log('[InventoryMaterials] useEffect - userRole:', userRole)
    if (userRole === 'ceo' || userRole === 'executive_assistant') {
      console.log('[InventoryMaterials] Calling fetchMaterialsToBuy')
      fetchMaterialsToBuy()
    } else {
      console.log('[InventoryMaterials] Not fetching - userRole is not CEO or Executive Assistant')
    }
  }, [userRole, fetchMaterialsToBuy])

  // Real-time subscription for materials to buy
  useEffect(() => {
    if (userRole !== 'ceo' && userRole !== 'executive_assistant') return

    const channel = supabase
      .channel('materials-to-buy-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'materials_to_buy',
        },
        () => {
          // Refetch materials to buy when changes occur
          fetchMaterialsToBuy()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userRole, fetchMaterialsToBuy])

  // Save material to buy
  async function saveMaterialToBuy() {
    if (!userId || userRole !== 'executive_assistant') {
      alert('Only Executive Assistant can add materials to buy.')
      return
    }

    if (!materialToBuyForm.material_name || !materialToBuyForm.category || !materialToBuyForm.quantity_needed || !materialToBuyForm.unit) {
      alert('Please fill required fields (Material Name, Category, Quantity Needed, Unit).')
      return
    }

    const payload: Partial<MaterialToBuy> = {
      material_name: String(materialToBuyForm.material_name),
      category: String(materialToBuyForm.category).toLowerCase(),
      quantity_needed: Number(materialToBuyForm.quantity_needed) || 0,
      unit: String(materialToBuyForm.unit),
      vendor_id: materialToBuyForm.vendor_id || null,
      priority: materialToBuyForm.priority || 'medium',
      notes: materialToBuyForm.notes || null,
      status: materialToBuyForm.status || 'pending',
      estimated_cost: materialToBuyForm.estimated_cost !== undefined && materialToBuyForm.estimated_cost !== null ? Number(materialToBuyForm.estimated_cost) : null,
      updated_by: userId,
      ...(editingMaterialToBuy ? {} : { created_by: userId }),
    }

    try {
      if (editingMaterialToBuy?.id) {
        const { error } = await supabase
          .from('materials_to_buy')
          .update(payload)
          .eq('id', editingMaterialToBuy.id)
        if (error) throw error
        setMaterialsToBuy((prev) => prev.map((m) => (m.id === editingMaterialToBuy.id ? { ...m, ...payload } as MaterialToBuy : m)))
      } else {
        const { data, error } = await supabase
          .from('materials_to_buy')
          .insert([payload])
          .select()
        if (error) throw error
        setMaterialsToBuy((prev) => [...(data || []), ...prev])
      }

      setMaterialToBuyForm({
        material_name: '',
        category: '',
        quantity_needed: 0,
        unit: '',
        vendor_id: null,
        priority: 'medium',
        notes: '',
        status: 'pending',
        estimated_cost: null,
      })
      setEditingMaterialToBuy(null)
      setShowMaterialToBuyModal(false)
      await fetchMaterialsToBuy()
    } catch (err) {
      console.error('Error saving material to buy:', err)
      alert('Error saving material to buy. Check console.')
    }
  }

  // Delete material to buy
  async function deleteMaterialToBuy(id: string) {
    if (!userId || userRole !== 'executive_assistant') {
      alert('Only Executive Assistant can delete materials to buy.')
      return
    }

    if (!confirm('Are you sure you want to delete this material request?')) return
    try {
      const { error } = await supabase
        .from('materials_to_buy')
        .delete()
        .eq('id', id)
      if (error) throw error
      setMaterialsToBuy((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      console.error('Error deleting material to buy:', err)
      alert('Error deleting material to buy. Check console.')
    }
  }

  // helper: apply period/custom filters to a materials array (returns filtered)
  function applyDateFilter(list: Material[]) {
    if (period === 'all') return list
    const now = new Date()
    return list.filter((m) => {
      if (!m.purchase_date) return false
      const pd = new Date(m.purchase_date)
      if (period === 'daily') {
        return (
          pd.getFullYear() === now.getFullYear() &&
          pd.getMonth() === now.getMonth() &&
          pd.getDate() === now.getDate()
        )
      }
      const diffDays = (now.getTime() - pd.getTime()) / (1000 * 3600 * 24)
      if (period === 'weekly') return diffDays <= 7
      if (period === 'monthly') return diffDays <= 30
      if (period === 'yearly') return diffDays <= 365
      if (period === 'range' && startDate && endDate) {
        const s = new Date(startDate)
        const e = new Date(endDate)
        // include entire end day
        e.setHours(23, 59, 59, 999)
        return pd >= s && pd <= e
      }
      return true
    })
  }

  // UI: grouped by category after applying filters
  const filteredMaterials = applyDateFilter(materials)
  const groupedMaterials = categories.map((cat) => ({
    ...cat,
    items: filteredMaterials.filter((m) => (m.category || '').toLowerCase() === cat.key),
  }))

  // Add / Update material
  async function saveMaterial() {
    if (!formData.name || !formData.category || !formData.total_quantity) {
      alert('Please fill required fields (Name, Category, Quantity).')
      return
    }

    const payload: Partial<Material> = {
      name: String(formData.name),
      category: String(formData.category).toLowerCase(),
      vendor_id: formData.vendor_id ?? null,
      total_quantity: Number(formData.total_quantity) || 0,
      used_quantity: Number(formData.used_quantity) || 0,
      unit: String(formData.unit || ''),
      price: formData.price !== undefined ? Number(formData.price) : null,
      location: formData.location || null,
      remarks: formData.remarks || null,
      purchase_date: formData.purchase_date || new Date().toISOString().slice(0, 10),
    }

    try {
      if (editingItem) {
        const { error } = await supabase.from('materials_inventory').update(payload).eq('id', editingItem.id)
        if (error) throw error
        setMaterials((prev) => prev.map((p) => (p.id === editingItem.id ? ({ ...p, ...payload } as Material) : p)))
      } else {
        const { data, error } = await supabase.from('materials_inventory').insert([payload]).select()
        if (error) throw error
        // append returned row(s)
        setMaterials((prev) => [...prev, ...(data || [])])
      }

      setFormData({})
      setEditingItem(null)
      setShowMaterialModal(false)
    } catch (err) {
      console.error('Save error', err)
      alert('Error saving material. Check console.')
    }
  }

  // Delete material
  async function deleteMaterial(id: string) {
    if (!confirm('Are you sure you want to delete this material?')) return
    try {
      const { error } = await supabase.from('materials_inventory').delete().eq('id', id)
      if (error) throw error
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      console.error('Delete error', err)
      alert('Error deleting material.')
    }
  }

  // Purchase history: open and fetch
  async function openPurchaseHistory(item: Material) {
    setSelectedMaterial(item)
    setPurchaseForm({
      material_id: item.id,
      vendor_id: item.vendor_id ?? undefined,
      quantity: 0,
      price_per_unit: item.price ?? 0,
      purchase_date: new Date().toISOString().slice(0, 10),
      notes: '',
    })
    setShowHistoryModal(true)

    try {
      const { data, error } = await supabase
        .from('vendor_purchases')
        .select('*')
        .eq('material_id', item.id)
        .order('purchase_date', { ascending: false })
      if (error) throw error
      setPurchaseHistory(data || [])
    } catch (err) {
      console.error('Purchase fetch error', err)
      alert('Error fetching purchase history.')
    }
  }

  // Record purchase: insert vendor_purchases and increment material total_quantity
  async function recordPurchase() {
    if (!selectedMaterial) return
    const qty = Number(purchaseForm.quantity || 0)
    const pricePer = Number(purchaseForm.price_per_unit || 0)
    if (!purchaseForm.vendor_id || qty <= 0 || pricePer <= 0) {
      alert('Please select vendor and enter valid quantity and price.')
      return
    }

    const totalPrice = qty * pricePer
    const purchasePayload: Partial<Purchase> = {
      material_id: selectedMaterial.id,
      vendor_id: purchaseForm.vendor_id || null,
      quantity: qty,
      price_per_unit: pricePer,
      total_price: totalPrice,
      purchase_date: purchaseForm.purchase_date || new Date().toISOString().slice(0, 10),
      notes: purchaseForm.notes || null,
    }

    try {
      // insert purchase record
      const { data: purchaseData, error: insertErr } = await supabase.from('vendor_purchases').insert([purchasePayload]).select()
      if (insertErr) throw insertErr

      // update material total_quantity (increment)
      const newTotal = (selectedMaterial.total_quantity || 0) + qty
      const { error: updErr } = await supabase.from('materials_inventory').update({ total_quantity: newTotal, price: pricePer, vendor_id: purchaseForm.vendor_id, purchase_date: purchasePayload.purchase_date }).eq('id', selectedMaterial.id)
      if (updErr) throw updErr

      // update vendor last price/date optionally (if vendors table has fields)
      const { error: vendorErr } = await supabase.from('vendors').update({ last_price: pricePer, last_purchase_date: purchasePayload.purchase_date }).eq('id', purchaseForm.vendor_id)
      if (vendorErr) console.warn('Vendor update warn', vendorErr)

      // refresh local state for material and purchases
      await fetchData()
      await openPurchaseHistory((await supabase.from('materials_inventory').select('*').eq('id', selectedMaterial.id).single()).data)
      alert('Purchase recorded and stock updated.')
    } catch (err) {
      console.error('Record purchase error', err)
      alert('Error recording purchase.')
    }
  }

  // --- EXPORTS (match client's Excel columns & order) ---
  function prepareExportRows(list: Material[]) {
    // Column order: Name, Category, Vendor, Quantity (Total), Used, Remaining, Unit, Price, Location, Remarks, Purchase Date
    return list.map((m) => {
      const vendorName = vendors.find((v) => v.id === m.vendor_id)?.name || ''
      const total = m.total_quantity ?? 0
      const used = m.used_quantity ?? 0
      const remaining = total - used
      return {
        Name: m.name,
        Category: m.category,
        Vendor: vendorName,
        Quantity: total,
        Used: used,
        Remaining: remaining,
        Unit: m.unit ?? '',
        Price: m.price ?? '',
        Location: m.location ?? '',
        Remarks: m.remarks ?? '',
        PurchaseDate: m.purchase_date ?? '',
      }
    })
  }

  function exportCSV(filteredList: Material[]) {
    try {
      const rows = prepareExportRows(filteredList)
      // convert to worksheet and write file
      const ws = XLSX.utils.json_to_sheet(rows, { header: ['Name', 'Category', 'Vendor', 'Quantity', 'Used', 'Remaining', 'Unit', 'Price', 'Location', 'Remarks', 'PurchaseDate'] })
      // Optionally rename header cells
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Materials')
      XLSX.writeFile(wb, 'Materials_Inventory.xlsx')
    } catch (err) {
      console.error('CSV export error', err)
      alert('Error exporting CSV.')
    }
  }

  function exportPDF(filteredList: Material[]) {
    try {
      const rows = prepareExportRows(filteredList).map((r) => [
        r.Name,
        r.Category,
        r.Vendor,
        r.Quantity,
        r.Used,
        r.Remaining,
        r.Unit,
        r.Price,
        r.Location,
        r.Remarks,
        r.PurchaseDate,
      ])

      const doc = new jsPDF('landscape', 'pt', 'a4')
      doc.text('Materials Inventory Report', 40, 40)
      autoTable(doc, {
        head: [['Name', 'Category', 'Vendor', 'Quantity', 'Used', 'Remaining', 'Unit', 'Price', 'Location', 'Remarks', 'Purchase Date']],
        body: rows,
        startY: 60,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [240, 240, 240] },
      })
      doc.save('Materials_Inventory.pdf')
    } catch (err) {
      console.error('PDF export error', err)
      alert('Error exporting PDF.')
    }
  }

  // wrapper for showing confirmation modal then exporting
  function confirmAndExport(format: 'csv' | 'pdf') {
    setExportFormat(format)
    setShowExportConfirm(true)
  }
  function runExportNow() {
    const filtered = applyDateFilter(materials)
    if (exportFormat === 'csv') exportCSV(filtered)
    if (exportFormat === 'pdf') exportPDF(filtered)
    setShowExportConfirm(false)
    setExportFormat(null)
  }

  // small helper styling class for responsive hiding (hide used column on very small screens)
  const hideOnXs = 'hidden sm:table-cell'

  return (
    <div className="p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Materials Inventory</h1>
          <p className="text-sm text-muted-foreground">Track consumables, vendors and purchases</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <select
            className="px-2 py-1 border rounded-md text-sm"
            value={period}
            onChange={(e) => {
              const v = e.target.value as any
              setPeriod(v)
              if (v !== 'range') {
                setStartDate('')
                setEndDate('')
              }
            }}
          >
            <option value="all">All</option>
            <option value="daily">Today</option>
            <option value="weekly">This Week</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
            <option value="range">Custom Range</option>
          </select>

          {period === 'range' && (
            <>
              <input className="px-2 py-1 border rounded-md text-sm" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <input className="px-2 py-1 border rounded-md text-sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </>
          )}

          {/* Export dropdown (icon-like) */}
          <div className="relative">
            <button
              onClick={() => confirmAndExport('csv')}
              title="Export CSV"
              className="flex items-center px-3 py-1 border rounded-md text-sm bg-muted hover:opacity-90"
            >
              <Download className="h-4 w-4 mr-1" /> CSV
            </button>
          </div>

          <div className="relative">
            <button
              onClick={() => confirmAndExport('pdf')}
              title="Export PDF"
              className="flex items-center px-3 py-1 border rounded-md text-sm bg-muted hover:opacity-90"
            >
              <Download className="h-4 w-4 mr-1" /> PDF
            </button>
          </div>

          <button
            onClick={() => {
              setFormData({})
              setEditingItem(null)
              setShowMaterialModal(true)
            }}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm"
          >
            <PlusCircle className="h-4 w-4" /> Add Material
          </button>
        </div>
      </div>

      {/* Materials to Buy Section - Visible to CEO and Executive Assistant */}
      {(userRole === 'ceo' || userRole === 'executive_assistant') && (
        <section className="border rounded-lg p-4 bg-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Materials to Buy
              </h2>
              <p className="text-sm text-muted-foreground">
                {userRole === 'ceo' ? 'View materials that need to be purchased' : 'Enter materials that need to be purchased'}
              </p>
            </div>
            {userRole === 'executive_assistant' && (
              <button
                onClick={() => {
                  setMaterialToBuyForm({
                    material_name: '',
                    category: '',
                    quantity_needed: 0,
                    unit: '',
                    vendor_id: null,
                    priority: 'medium',
                    notes: '',
                    status: 'pending',
                    estimated_cost: null,
                  })
                  setEditingMaterialToBuy(null)
                  setShowMaterialToBuyModal(true)
                }}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm"
              >
                <PlusCircle className="h-4 w-4" /> Add Material to Buy
              </button>
            )}
          </div>

          {userRole === 'ceo' && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm text-blue-800 dark:text-blue-200">
              <strong>CEO View:</strong> You can view all materials that need to be purchased. Only Executive Assistant can add or edit these entries.
            </div>
          )}

          {userRole === 'executive_assistant' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 text-sm text-green-800 dark:text-green-200">
              <strong>Executive Assistant:</strong> You can add, edit, and delete materials that need to be purchased. The CEO can view all entries.
            </div>
          )}

          {loadingMaterialsToBuy ? (
            <div className="py-8 text-center text-sm">Loading materials to buy...</div>
          ) : materialsToBuy.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground space-y-2">
              <div>No materials to buy yet.</div>
              {userRole === 'executive_assistant' && (
                <div>Click "Add Material to Buy" to add one.</div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-2">Material Name</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">Quantity Needed</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2">Vendor</th>
                    <th className="p-2">Priority</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Est. Cost</th>
                    <th className="p-2">Notes</th>
                    {userRole === 'executive_assistant' && (
                      <th className="p-2 text-center">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {materialsToBuy.map((item) => {
                    const vendorName = vendors.find((v) => v.id === item.vendor_id)?.name || '—'
                    const priorityColors = {
                      low: 'text-gray-600 dark:text-gray-400',
                      medium: 'text-yellow-600 dark:text-yellow-400',
                      high: 'text-orange-600 dark:text-orange-400',
                      urgent: 'text-red-600 dark:text-red-400',
                    }
                    const statusColors = {
                      pending: 'text-yellow-600 dark:text-yellow-400',
                      approved: 'text-green-600 dark:text-green-400',
                      rejected: 'text-red-600 dark:text-red-400',
                      purchased: 'text-blue-600 dark:text-blue-400',
                    }
                    return (
                      <tr key={item.id} className="border-b hover:bg-muted/10">
                        <td className="p-2 font-medium">{item.material_name}</td>
                        <td className="p-2">{categories.find((c) => c.key === item.category)?.name || item.category}</td>
                        <td className="p-2">{item.quantity_needed}</td>
                        <td className="p-2">{item.unit}</td>
                        <td className="p-2">{vendorName}</td>
                        <td className={cn('p-2 font-medium capitalize', priorityColors[item.priority] || priorityColors.medium)}>
                          {item.priority}
                        </td>
                        <td className={cn('p-2 font-medium capitalize', statusColors[item.status] || statusColors.pending)}>
                          {item.status}
                        </td>
                        <td className="p-2">
                          {item.estimated_cost !== null && item.estimated_cost !== undefined
                            ? `₵${Number(item.estimated_cost).toFixed(2)}`
                            : '—'}
                        </td>
                        <td className="p-2 max-w-xs truncate" title={item.notes || ''}>
                          {item.notes || '—'}
                        </td>
                        {userRole === 'executive_assistant' && (
                          <td className="p-2 text-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingMaterialToBuy(item)
                                setMaterialToBuyForm({
                                  material_name: item.material_name,
                                  category: item.category,
                                  quantity_needed: item.quantity_needed,
                                  unit: item.unit,
                                  vendor_id: item.vendor_id || null,
                                  priority: item.priority,
                                  notes: item.notes || '',
                                  status: item.status,
                                  estimated_cost: item.estimated_cost || null,
                                })
                                setShowMaterialToBuyModal(true)
                              }}
                              title="Edit"
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4 inline" />
                            </button>
                            <button
                              onClick={() => {
                                if (item.id) deleteMaterialToBuy(item.id)
                              }}
                              title="Delete"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 inline" />
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Table area */}
      {loading ? (
        <div className="py-8 text-center text-sm">Loading...</div>
      ) : (
        groupedMaterials.map((group) => (
          <section key={group.key} className="mb-6">
            <h2 className="text-base font-semibold mb-2">{group.name}</h2>
            <div className="overflow-x-auto border rounded">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">Vendor</th>
                    <th className="p-2">Quantity</th>
                    <th className={`${hideOnXs} p-2`}>Used</th>
                    <th className="p-2">Remaining</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2">Price</th>
                    <th className="p-2">Location</th>
                    <th className="p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-4 text-center text-muted-foreground">
                        No materials in this category for the selected period.
                      </td>
                    </tr>
                  ) : (
                    group.items.map((item) => {
                      const remaining = (item.total_quantity || 0) - (item.used_quantity || 0)
                      const vendorName = vendors.find((v) => v.id === item.vendor_id)?.name || '—'
                      return (
                        <tr key={item.id} className="border-b hover:bg-muted/10">
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">{vendorName}</td>
                          <td className="p-2">{item.total_quantity}</td>
                          <td className={`${hideOnXs} p-2`}>{item.used_quantity}</td>
                          <td className={cn('p-2 font-medium', remaining <= 5 ? 'text-red-500' : remaining <= 10 ? 'text-yellow-500' : 'text-green-500')}>
                            {remaining}
                          </td>
                          <td className="p-2">{item.unit}</td>
                          <td className="p-2">{item.price !== null && item.price !== undefined ? Number(item.price).toFixed(2) : '—'}</td>
                          <td className="p-2">{item.location || '—'}</td>
                          <td className="p-2 text-center space-x-2">
                            <button
                              onClick={() => {
                                setEditingItem(item)
                                setFormData({ ...item }) // populate modal
                                setShowMaterialModal(true)
                              }}
                              title="Edit"
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4 inline" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm('Delete this material?')) deleteMaterial(item.id)
                              }}
                              title="Delete"
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 inline" />
                            </button>

                            <button
                              onClick={() => openPurchaseHistory(item)}
                              title="Purchase history / Add purchase"
                              className="text-green-600 hover:text-green-800"
                            >
                              <History className="h-4 w-4 inline" />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}

      {/* Add/Edit Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-card border border-border rounded-lg w-full max-w-xl p-5 space-y-4 overflow-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{editingItem ? 'Edit Material' : 'Add Material'}</h3>
              <button onClick={() => { setShowMaterialModal(false); setEditingItem(null); setFormData({}) }} className="text-muted-foreground">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className="px-3 py-2 border rounded" placeholder="Name *" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              <select className="px-3 py-2 border rounded" value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                <option value="">Select Category *</option>
                {categories.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
              </select>

              <select className="px-3 py-2 border rounded" value={formData.vendor_id ?? ''} onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value || null })}>
                <option value="">Select Vendor</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>

              <input type="number" className="px-3 py-2 border rounded" placeholder="Quantity *" value={formData.total_quantity ?? ''} onChange={(e) => setFormData({ ...formData, total_quantity: Number(e.target.value) })} />

              {/* used is hidden in table on xs, but editable here */}
              <input type="number" className="px-3 py-2 border rounded" placeholder="Used (editable)" value={formData.used_quantity ?? 0} onChange={(e) => setFormData({ ...formData, used_quantity: Number(e.target.value) })} />

              <input className="px-3 py-2 border rounded" placeholder="Unit (e.g. ream, liter)" value={formData.unit || ''} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} />

              <input type="number" className="px-3 py-2 border rounded" placeholder="Price" value={formData.price ?? ''} onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? null : Number(e.target.value) })} />

              <input type="date" className="px-3 py-2 border rounded" placeholder="Purchase Date" value={formData.purchase_date ?? ''} onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })} />

              <input className="col-span-1 sm:col-span-2 px-3 py-2 border rounded" placeholder="Location" value={formData.location ?? ''} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />

              <textarea className="col-span-1 sm:col-span-2 px-3 py-2 border rounded" placeholder="Remarks" value={formData.remarks ?? ''} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={() => { setShowMaterialModal(false); setEditingItem(null); setFormData({}) }}>Cancel</button>
              <button className="px-3 py-1 rounded bg-primary text-primary-foreground" onClick={saveMaterial}>{editingItem ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History / Add Purchase Modal */}
      {showHistoryModal && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl p-5 space-y-4 overflow-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Purchases — {selectedMaterial.name}</h3>
              <button onClick={() => { setShowHistoryModal(false); setSelectedMaterial(null); setPurchaseHistory([]) }} className="text-muted-foreground">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select className="px-3 py-2 border rounded" value={purchaseForm.vendor_id ?? ''} onChange={(e) => setPurchaseForm({ ...purchaseForm, vendor_id: e.target.value || null })}>
                <option value="">Select Vendor</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <input type="number" className="px-3 py-2 border rounded" placeholder="Quantity" value={purchaseForm.quantity ?? ''} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: Number(e.target.value) })} />
              <input type="number" className="px-3 py-2 border rounded" placeholder="Price per unit" value={purchaseForm.price_per_unit ?? ''} onChange={(e) => setPurchaseForm({ ...purchaseForm, price_per_unit: Number(e.target.value) })} />
              <input type="date" className="px-3 py-2 border rounded" value={purchaseForm.purchase_date ?? new Date().toISOString().slice(0, 10)} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchase_date: e.target.value })} />
              <input className="px-3 py-2 border rounded col-span-1 sm:col-span-2" placeholder="Notes (optional)" value={purchaseForm.notes ?? ''} onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} />
            </div>

            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={() => { setShowHistoryModal(false); setSelectedMaterial(null); setPurchaseHistory([]) }}>Close</button>
              <button className="px-3 py-1 rounded bg-primary text-primary-foreground" onClick={recordPurchase}>Add Purchase</button>
            </div>

            <div className="mt-3">
              <h4 className="font-medium mb-2">Recent Purchases</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="p-2">Date</th>
                      <th className="p-2">Vendor</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Price/Unit</th>
                      <th className="p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseHistory.length === 0 ? (
                      <tr><td colSpan={5} className="p-3 text-center text-muted-foreground">No purchase records yet.</td></tr>
                    ) : (
                      purchaseHistory.map((p: any) => (
                        <tr key={p.id} className="border-b">
                          <td className="p-2">{p.purchase_date}</td>
                          <td className="p-2">{vendors.find((v) => v.id === p.vendor_id)?.name ?? '—'}</td>
                          <td className="p-2">{p.quantity}</td>
                          <td className="p-2">{Number(p.price_per_unit ?? 0).toFixed(2)}</td>
                          <td className="p-2">
                              {Number(
                                p.total_price !== undefined && p.total_price !== null
                                  ? p.total_price
                                  : p.quantity * (p.price_per_unit ?? 0)
                              ).toFixed(2)}
                            </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Confirmation Modal */}
      {showExportConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
          <div className="bg-card border border-border rounded-lg w-full max-w-md p-5">
            <h3 className="text-lg font-semibold">Confirm Export</h3>
            <p className="text-sm text-muted-foreground mt-1">Export <strong>{exportFormat?.toUpperCase()}</strong> for the currently selected period.</p>

            <div className="mt-4 flex gap-2 justify-end">
              <button className="px-3 py-1 rounded border" onClick={() => { setShowExportConfirm(false); setExportFormat(null) }}>Cancel</button>
              <button className="px-3 py-1 rounded bg-primary text-primary-foreground" onClick={runExportNow}>Confirm & Download</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Material to Buy Modal */}
      {showMaterialToBuyModal && userRole === 'executive_assistant' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-card border border-border rounded-lg w-full max-w-xl p-5 space-y-4 overflow-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{editingMaterialToBuy ? 'Edit Material to Buy' : 'Add Material to Buy'}</h3>
              <button
                onClick={() => {
                  setShowMaterialToBuyModal(false)
                  setEditingMaterialToBuy(null)
                  setMaterialToBuyForm({
                    material_name: '',
                    category: '',
                    quantity_needed: 0,
                    unit: '',
                    vendor_id: null,
                    priority: 'medium',
                    notes: '',
                    status: 'pending',
                    estimated_cost: null,
                  })
                }}
                className="text-muted-foreground"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="px-3 py-2 border rounded"
                placeholder="Material Name *"
                value={materialToBuyForm.material_name || ''}
                onChange={(e) => setMaterialToBuyForm({ ...materialToBuyForm, material_name: e.target.value })}
              />
              <select
                className="px-3 py-2 border rounded"
                value={materialToBuyForm.category || ''}
                onChange={(e) => setMaterialToBuyForm({ ...materialToBuyForm, category: e.target.value })}
              >
                <option value="">Select Category *</option>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                className="px-3 py-2 border rounded"
                placeholder="Quantity Needed *"
                value={materialToBuyForm.quantity_needed ?? ''}
                onChange={(e) => setMaterialToBuyForm({ ...materialToBuyForm, quantity_needed: Number(e.target.value) })}
              />
              <input
                className="px-3 py-2 border rounded"
                placeholder="Unit (e.g. ream, liter) *"
                value={materialToBuyForm.unit || ''}
                onChange={(e) => setMaterialToBuyForm({ ...materialToBuyForm, unit: e.target.value })}
              />

              <select
                className="px-3 py-2 border rounded"
                value={materialToBuyForm.vendor_id ?? ''}
                onChange={(e) => setMaterialToBuyForm({ ...materialToBuyForm, vendor_id: e.target.value || null })}
              >
                <option value="">Select Vendor (Optional)</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>

              <select
                className="px-3 py-2 border rounded"
                value={materialToBuyForm.priority || 'medium'}
                onChange={(e) => setMaterialToBuyForm({ ...materialToBuyForm, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>

              <select
                className="px-3 py-2 border rounded"
                value={materialToBuyForm.status || 'pending'}
                onChange={(e) => setMaterialToBuyForm({ ...materialToBuyForm, status: e.target.value as 'pending' | 'approved' | 'rejected' | 'purchased' })}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="purchased">Purchased</option>
              </select>

              <input
                type="number"
                className="px-3 py-2 border rounded"
                placeholder="Estimated Cost (Optional)"
                value={materialToBuyForm.estimated_cost ?? ''}
                onChange={(e) => setMaterialToBuyForm({ ...materialToBuyForm, estimated_cost: e.target.value === '' ? null : Number(e.target.value) })}
              />

              <textarea
                className="col-span-1 sm:col-span-2 px-3 py-2 border rounded"
                placeholder="Notes (Optional)"
                value={materialToBuyForm.notes || ''}
                onChange={(e) => setMaterialToBuyForm({ ...materialToBuyForm, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 rounded border"
                onClick={() => {
                  setShowMaterialToBuyModal(false)
                  setEditingMaterialToBuy(null)
                  setMaterialToBuyForm({
                    material_name: '',
                    category: '',
                    quantity_needed: 0,
                    unit: '',
                    vendor_id: null,
                    priority: 'medium',
                    notes: '',
                    status: 'pending',
                    estimated_cost: null,
                  })
                }}
              >
                Cancel
              </button>
              <button className="px-3 py-1 rounded bg-primary text-primary-foreground" onClick={saveMaterialToBuy}>
                {editingMaterialToBuy ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
