// src/components/rolebase/VendorsManager.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { PlusCircle, Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Vendor = {
  id: string
  name: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  last_purchase_price?: number
}

export default function VendorsManager() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState<Partial<Vendor>>({})

  useEffect(() => {
    fetchVendors()
  }, [])

  async function fetchVendors() {
    setLoading(true)
    const { data, error } = await supabase.from('vendors').select('*').order('name')
    if (error) console.error(error)
    setVendors(data || [])
    setLoading(false)
  }

  async function saveVendor() {
    if (!form.name) return alert('Please enter vendor name.')
    const payload = {
      name: form.name,
      contact_person: form.contact_person || '',
      phone: form.phone || '',
      email: form.email || '',
      address: form.address || '',
      last_purchase_price: form.last_purchase_price || 0,
    }

    if (editing) {
      const { error } = await supabase.from('vendors').update(payload).eq('id', editing.id)
      if (error) {
        console.error(error)
        alert('Error updating vendor.')
        return
      }
      setVendors((prev) => prev.map((v) => (v.id === editing.id ? { ...v, ...payload } : v)))
    } else {
      const { data, error } = await supabase.from('vendors').insert([payload]).select()
      if (error) {
        console.error(error)
        alert('Error adding vendor.')
        return
      }
      setVendors((prev) => [...prev, ...(data || [])])
    }

    setForm({})
    setEditing(null)
    setShowModal(false)
  }

  async function deleteVendor(id: string) {
    if (!confirm('Delete vendor? This will NOT delete materials that reference this vendor (they will remain).')) return
    const { error } = await supabase.from('vendors').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('Error deleting vendor.')
      return
    }
    setVendors((prev) => prev.filter((v) => v.id !== id))
  }

  function openEdit(v: Vendor) {
    setEditing(v)
    setForm(v)
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Vendors</h1>
          <p className="text-muted-foreground text-sm">Add and manage vendor details and last purchase price.</p>
        </div>
        <button
          onClick={() => {
            setShowModal(true)
            setEditing(null)
            setForm({})
          }}
          className="flex items-center justify-center space-x-2 bg-primary text-primary-foreground px-3 py-2 sm:px-4 rounded-md text-sm sm:text-base"
        >
          <PlusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Add Vendor</span>
        </button>
      </div>

      {/* Table or cards */}
      {loading ? (
        <p className="text-muted-foreground">Loading vendors...</p>
      ) : vendors.length === 0 ? (
        <p className="text-center text-muted-foreground border border-border rounded-md py-6">
          No vendors yet.
        </p>
      ) : (
        <>
          {/* 🧾 Table for medium+ screens */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Last Purchase</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3">{v.name}</td>
                    <td className="p-3">{v.contact_person || '—'}</td>
                    <td className="p-3">{v.phone || '—'}</td>
                    <td className="p-3 truncate max-w-[150px]">{v.email || '—'}</td>
                    <td className="p-3">{v.last_purchase_price != null ? Number(v.last_purchase_price).toFixed(2) : '—'}</td>
                    <td className="p-3 text-center space-x-3">
                      <button onClick={() => openEdit(v)} className="text-blue-500 hover:text-blue-700">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteVendor(v.id)} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 📱 Cards for small screens */}
          <div className="sm:hidden grid grid-cols-1 gap-4">
            {vendors.map((v) => (
              <div key={v.id} className="p-4 border border-border rounded-lg bg-card shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-base">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.contact_person || '—'}</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => openEdit(v)} className="text-blue-500 hover:text-blue-700">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteVendor(v.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <p><span className="font-medium">Phone:</span> {v.phone || '—'}</p>
                  <p><span className="font-medium">Email:</span> {v.email || '—'}</p>
                  <p><span className="font-medium">Last Purchase:</span> {v.last_purchase_price != null ? Number(v.last_purchase_price).toFixed(2) : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-auto">
          <div className="bg-card border border-border rounded-lg p-5 w-full max-w-md sm:max-w-lg">
            <h3 className="text-lg font-semibold mb-3 text-center sm:text-left">
              {editing ? 'Edit Vendor' : 'Add Vendor'}
            </h3>

            <div className="space-y-3">
              <input type="text" placeholder="Vendor Name *" className="w-full px-3 py-2 rounded-md border border-border text-sm" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input type="text" placeholder="Contact Person" className="w-full px-3 py-2 rounded-md border border-border text-sm" value={form.contact_person || ''} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              <input type="text" placeholder="Phone" className="w-full px-3 py-2 rounded-md border border-border text-sm" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input type="email" placeholder="Email" className="w-full px-3 py-2 rounded-md border border-border text-sm" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input type="text" placeholder="Address" className="w-full px-3 py-2 rounded-md border border-border text-sm" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input type="number" placeholder="Last Purchase Price" className="w-full px-3 py-2 rounded-md border border-border text-sm" value={form.last_purchase_price ?? ''} onChange={(e) => setForm({ ...form, last_purchase_price: parseFloat(e.target.value) || 0 })} />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 mt-5">
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditing(null)
                  setForm({})
                }}
                className="px-4 py-2 rounded-md bg-muted text-muted-foreground text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveVendor}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
              >
                {editing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
