'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { cn } from '@/lib/utils'
import { PlusCircle, Trash2, Pencil } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Equipment = {
  id: string
  name: string
  model_number?: string
  category: string
  brand?: string
  status?: string
  location?: string
}

const categories = [
  { key: 'printing', name: 'Printing Machines' },
  { key: 'garment', name: 'Garment Processing' },
  { key: 'finishing', name: 'Finishing Machines' },
  { key: 'computers', name: 'Computers & Accessories' },
  { key: 'others', name: 'Other Machines' },
]

export default function EquipmentInventory() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Equipment | null>(null)
  const [formData, setFormData] = useState<Partial<Equipment>>({})

  useEffect(() => {
    fetchEquipment()
  }, [])

  async function fetchEquipment() {
    const { data, error } = await supabase
      .from('equipment_inventory')
      .select('*')
      .order('category', { ascending: true })

    if (error) console.error(error)
    setEquipment(data || [])
    setLoading(false)
  }

  async function saveEquipment() {
    if (!formData.name || !formData.category)
      return alert('Please fill required fields.')

    const categoryKey = formData.category?.toLowerCase() || ''

    if (editingItem) {
      // ✅ Update existing item
      const { error } = await supabase
        .from('equipment_inventory')
        .update({
          name: formData.name,
          category: categoryKey,
          model_number: formData.model_number,
          brand: formData.brand,
          status: formData.status,
          location: formData.location,
        })
        .eq('id', editingItem.id)

      if (error) {
        console.error(error)
        alert('Error updating equipment.')
        return
      }

      setEquipment((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, ...formData } : item
        )
      )
    } else {
      // ✅ Add new item
      const { data, error } = await supabase
        .from('equipment_inventory')
        .insert([{ ...formData, category: categoryKey }])
        .select()

      if (error) {
        console.error(error)
        alert('Error adding equipment.')
        return
      }

      setEquipment([...equipment, ...(data || [])])
    }

    setFormData({})
    setEditingItem(null)
    setShowModal(false)
  }

  async function deleteEquipment(id: string) {
    const confirmDelete = confirm('Are you sure you want to delete this equipment?')
    if (!confirmDelete) return

    const { error } = await supabase.from('equipment_inventory').delete().eq('id', id)
    if (error) {
      console.error(error)
      alert('Error deleting equipment.')
      return
    }

    setEquipment(equipment.filter((item) => item.id !== id))
  }

  function openEditModal(item: Equipment) {
    setEditingItem(item)
    setFormData(item)
    setShowModal(true)
  }

  const groupedEquipment = categories.map((cat) => ({
    ...cat,
    items: equipment.filter((item) => item.category?.toLowerCase() === cat.key),
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-1 text-foreground">
            Equipment Inventory
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage and track all your equipment by category.
          </p>
        </div>
        <button
          onClick={() => {
            setShowModal(true)
            setEditingItem(null)
            setFormData({})
          }}
          className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Add Equipment</span>
        </button>
      </div>

      {/* Equipment Tables */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <p className="text-muted-foreground">Loading equipment...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groupedEquipment.map((group) => (
            <div key={group.key}>
              <h2 className="text-lg font-semibold mb-3 text-primary">
                {group.name}
              </h2>

              <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr
                      className={cn(
                        'text-left border-b border-border',
                        'bg-muted text-muted-foreground'
                      )}
                    >
                      <th className="p-3 font-medium">Name</th>
                      <th className="p-3 font-medium">Model No.</th>
                      <th className="p-3 font-medium">Brand</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Location</th>
                      <th className="p-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.length > 0 ? (
                      group.items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3">{item.name}</td>
                          <td className="p-3">{item.model_number || '—'}</td>
                          <td className="p-3">{item.brand || '—'}</td>
                          <td
                            className={cn(
                              'p-3 font-medium',
                              item.status === 'Working'
                                ? 'text-green-500'
                                : item.status === 'Maintenance'
                                ? 'text-yellow-500'
                                : item.status === 'Faulty'
                                ? 'text-red-500'
                                : item.status === 'Inactive'
                                ? 'text-gray-500'
                                : 'text-muted-foreground'
                            )}
                          >
                            {item.status || '—'}
                          </td>
                          <td className="p-3">{item.location || '—'}</td>
                          <td className="p-3 text-center space-x-3">
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-blue-500 hover:text-blue-700"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteEquipment(item.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-4 text-center text-muted-foreground"
                        >
                          No items in this category yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
          <div className="bg-card border border-border rounded-lg w-full max-w-md p-6 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              {editingItem ? 'Edit Equipment' : 'Add Equipment'}
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Name *"
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <input
                type="text"
                placeholder="Model Number"
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground"
                value={formData.model_number || ''}
                onChange={(e) =>
                  setFormData({ ...formData, model_number: e.target.value })
                }
              />
              <select
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Select Category *</option>
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Brand"
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground"
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
              <input
                type="text"
                placeholder="Location"
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
              <select
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-foreground"
                value={formData.status || ''}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="">Select Status</option>
                <option value="Working">Working</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Faulty">Faulty</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingItem(null)
                }}
                className="px-4 py-2 rounded-md bg-muted text-muted-foreground hover:opacity-80"
              >
                Cancel
              </button>
              <button
                onClick={saveEquipment}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90"
              >
                {editingItem ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
