'use client'

import { useEffect, useState } from 'react'
import { createClient, Session } from '@supabase/supabase-js'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RentalBase() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openAdd, setOpenAdd] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [newItem, setNewItem] = useState({
    category: '',
    item_name: '',
    total: 0,
    working: 0,
    faulty: 0,
    inactive: 0,
  })

  // Fetch auth session (using secure method)
  useEffect(() => {
    // Use onAuthStateChange to get session securely
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })
    
    // Also check current user to trigger initial state
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        // Session will be set by onAuthStateChange
      }
    })
    
    return () => listener.subscription.unsubscribe()
  }, [])

  // Fetch items
  async function fetchItems() {
    if (!session) return
    setLoading(true)
    const { data, error } = await supabase
      .from('rental_inventory')
      .select('*')
      .order('category', { ascending: true })

    if (error) console.error('Error fetching items:', error)
    else setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [session])

  // Add new item
  async function handleAdd() {
    if (!session) return
    const { error } = await supabase.from('rental_inventory').insert([newItem])
    if (error) console.error('Error adding item:', error)
    else {
      setOpenAdd(false)
      setNewItem({
        category: '',
        item_name: '',
        total: 0,
        working: 0,
        faulty: 0,
        inactive: 0,
      })
      fetchItems()
    }
  }

  // Inline edit update
  async function handleEdit(id: string, field: string, value: string | number) {
    if (!session) return
    const updatedItems = items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    )
    setItems(updatedItems)

    const { error } = await supabase
      .from('rental_inventory')
      .update({ [field]: value })
      .eq('id', id)

    if (error) console.error('Update failed:', error)
  }

  const getRowColor = (item: any) => {
    if (item.working > item.faulty) return 'bg-green-900/20'
    if (item.faulty > item.working) return 'bg-red-900/20'
    if (item.inactive > 0) return 'bg-gray-900/20'
    return ''
  }

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rental Services Inventory</h1>

        {/* VISIBLE BUTTON */}
        <button
          onClick={() => setOpenAdd(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add New Item
        </button>
      </div>

      <Card className="shadow-sm bg-gray-800 border-gray-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center">Loading...</div>
          ) : (
            <table className="w-full border-collapse border text-sm text-gray-200">
              <thead className="bg-gray-700 text-left">
                <tr>
                  <th className="p-2 border border-gray-600">Category</th>
                  <th className="p-2 border border-gray-600">Item Name</th>
                  <th className="p-2 text-center border border-gray-600">Total</th>
                  <th className="p-2 text-center text-green-400 border border-gray-600">Working</th>
                  <th className="p-2 text-center text-red-400 border border-gray-600">Faulty</th>
                  <th className="p-2 text-center text-gray-400 border border-gray-600">Inactive</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr
                    key={item.id}
                    className={`border-t border-gray-700 hover:bg-gray-700/30 transition ${getRowColor(item)}`}
                  >
                    {['category', 'item_name', 'total', 'working', 'faulty', 'inactive'].map(field => (
                      <td key={field} className="p-2 text-center border border-gray-600">
                        <Input
                          className="w-full text-center bg-gray-800 text-gray-100 border-gray-600"
                          value={item[field] ?? ''}
                          type={['total', 'working', 'faulty', 'inactive'].includes(field) ? 'number' : 'text'}
                          onChange={e =>
                            handleEdit(
                              item.id,
                              field,
                              ['total', 'working', 'faulty', 'inactive'].includes(field)
                                ? Number(e.target.value)
                                : e.target.value
                            )
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="bg-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle>Add New Rental Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="block mb-1">Category</label>
              <Input
                value={newItem.category}
                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                className="bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <div>
              <label className="block mb-1">Item Name</label>
              <Input
                value={newItem.item_name}
                onChange={e => setNewItem({ ...newItem, item_name: e.target.value })}
                className="bg-gray-700 text-gray-100 border-gray-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block mb-1">Total</label>
                <Input
                  type="number"
                  value={newItem.total}
                  onChange={e => setNewItem({ ...newItem, total: Number(e.target.value) })}
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div>
                <label className="block mb-1">Working</label>
                <Input
                  type="number"
                  value={newItem.working}
                  onChange={e => setNewItem({ ...newItem, working: Number(e.target.value) })}
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div>
                <label className="block mb-1">Faulty</label>
                <Input
                  type="number"
                  value={newItem.faulty}
                  onChange={e => setNewItem({ ...newItem, faulty: Number(e.target.value) })}
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div>
                <label className="block mb-1">Inactive</label>
                <Input
                  type="number"
                  value={newItem.inactive}
                  onChange={e => setNewItem({ ...newItem, inactive: Number(e.target.value) })}
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
