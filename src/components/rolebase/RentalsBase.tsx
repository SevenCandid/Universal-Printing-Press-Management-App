'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { RentalInventoryRow } from '@/types/rentalInventory'
import AddRentalItemModal from '@/components/rentals/AddRentalItemModal'
import EditRentalItemModal from '@/components/rentals/EditRentalItemModal'
import toast from 'react-hot-toast'

type Role = string

type CategoryKey = 'Chairs' | 'Canopies' | 'Tables' | 'Mattresses'

const CATEGORY_ITEMS: Record<CategoryKey, string[]> = {
  Chairs: ['Folder Chairs', 'Plastic Chairs'],
  Canopies: ['Single Canopy', 'Double Canopy'],
  // Use generic "Tables" plus a catch-all "Other Tables" bucket
  Tables: ['Tables', 'Other Tables'],
  Mattresses: ['Mattresses'],
}

const CATEGORY_LIST: CategoryKey[] = ['Chairs', 'Canopies', 'Tables', 'Mattresses']

// ===== Hook: Rental inventory data fetching + realtime sync =====
function useRentalInventory() {
  const { supabase, session } = useSupabase()
  const [items, setItems] = useState<RentalInventoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = async () => {
    if (!supabase) {
      console.warn('Supabase client not ready while fetching rental inventory')
      setLoading(false)
      return
    }
    if (!session) {
      // No authenticated user; clear items but don't block UI
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('rental_inventory')
        .select('*')
        .order('category', { ascending: true })
        .order('item_name', { ascending: true })

      if (err) throw err
      setItems((data || []) as RentalInventoryRow[])
    } catch (e: any) {
      console.error('Failed to fetch rental inventory:', e)
      toast.error('Failed to load rental inventory.')
      setError('Failed to load rental inventory. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch & refetch when session changes
  useEffect(() => {
    if (!session) {
      setItems([])
      setLoading(false)
      return
    }
    fetchItems()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('rental-inventory-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rental_inventory' },
        () => {
          // Refresh data on any insert/update/delete
          fetchItems()
        }
      )
      .subscribe()

    return () => {
      try {
        supabase.removeChannel(channel)
      } catch {
        // @ts-ignore
        channel?.unsubscribe?.()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Optimistic upsert helper for new/updated records
  const upsertItem = (record: RentalInventoryRow) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.id === record.id)
      if (exists) {
        return prev.map((i) => (i.id === record.id ? record : i))
      }
      return [...prev, record]
    })
  }

  return { items, loading, error, refresh: fetchItems, upsertItem, session }
}

interface RentalsBaseProps {
  role: Role
}

export default function RentalsBase({ role }: RentalsBaseProps) {
  const { items, loading, error, refresh, upsertItem, session } = useRentalInventory()

  // Full access roles: CEO, Executive Assistant, and Intern
  const canEdit = useMemo(() => {
    const roleLower = role?.toLowerCase()
    return roleLower === 'ceo' || roleLower === 'executive_assistant' || roleLower === 'intern'
  }, [role])

  const [addOpen, setAddOpen] = useState(false)
  const [addDefaults, setAddDefaults] = useState<{ category?: CategoryKey; itemName?: string } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RentalInventoryRow | null>(null)

  const filteredItemsByCategory = useMemo(() => {
    const map: Record<CategoryKey, RentalInventoryRow[]> = {
      Chairs: [],
      Canopies: [],
      Tables: [],
      Mattresses: [],
    }
    for (const item of items) {
      const key = item.category as CategoryKey
      if (key in map) {
        map[key].push(item)
      }
    }
    return map
  }, [items])

  const getCategoryEntries = useCallback(
    (category: CategoryKey) => {
      const baseNames = CATEGORY_ITEMS[category]
      const dbNames = filteredItemsByCategory[category].map((i) => i.item_name)
      const entries = Array.from(new Set<string>([...baseNames, ...dbNames]))
      return entries.map((itemName) => ({
        name: itemName,
        record:
          filteredItemsByCategory[category].find(
            (i) => i.item_name.toLowerCase() === itemName.toLowerCase()
          ) || null,
      }))
    },
    [filteredItemsByCategory]
  )

  const handleOpenAdd = () => {
    if (!canEdit) return
    setAddDefaults(null)
    setAddOpen(true)
  }

  const handleCloseAdd = () => {
    setAddOpen(false)
    setAddDefaults(null)
  }

  const handleOpenEdit = (item: RentalInventoryRow) => {
    if (!canEdit) return
    setSelectedItem(item)
    setEditOpen(true)
  }

  const handleCloseEdit = () => {
    setEditOpen(false)
    setSelectedItem(null)
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <p className="text-lg text-muted-foreground">You must be signed in to view rentals.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rental Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Track rental items by status. CEO, Executive Assistant, and Intern can edit; other roles are read‑only.
            {role && (
              <span className="ml-2 text-xs text-gray-400">(Role: {role})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canEdit && (
            <Button onClick={handleOpenAdd} className="shadow-sm">
              + Add New Item
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-2">
          {CATEGORY_LIST.map((category) => {
            const entries = getCategoryEntries(category)
            return (
              <Card
                key={category}
                className="bg-card/80 border-border/60 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="border-b border-border/60 px-3 py-3 sm:px-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-foreground">{category}</h2>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">
                      {CATEGORY_ITEMS[category].join(' • ')}
                    </p>
                  </div>
                </div>

                {/* Mobile view */}
                <div className="px-3 py-3 space-y-3 md:hidden">
                  {entries.map(({ name, record }) => (
                    <div
                      key={name}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-foreground flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{name}</span>
                        {canEdit ? (
                          record ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[11px] h-7 px-3"
                              onClick={() => handleOpenEdit(record)}
                            >
                              Edit
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[11px] h-7 px-3"
                              onClick={() => {
                                setAddDefaults({ category, itemName: name })
                                setAddOpen(true)
                              }}
                            >
                              Add
                            </Button>
                          )
                        ) : (
                          <span className="text-[11px] text-muted-foreground">View only</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-md bg-card/60 p-2">
                          <p className="text-[10px] uppercase text-muted-foreground">Total</p>
                          <p className="text-sm font-semibold">{record?.total ?? 0}</p>
                        </div>
                        <div className="rounded-md bg-card/60 p-2">
                          <p className="text-[10px] uppercase text-green-400">Working</p>
                          <p className="text-sm font-semibold text-green-300">{record?.working ?? 0}</p>
                        </div>
                        <div className="rounded-md bg-card/60 p-2">
                          <p className="text-[10px] uppercase text-amber-400">Faulty</p>
                          <p className="text-sm font-semibold text-amber-300">{record?.faulty ?? 0}</p>
                        </div>
                        <div className="rounded-md bg-card/60 p-2">
                          <p className="text-[10px] uppercase text-gray-400">Inactive</p>
                          <p className="text-sm font-semibold text-gray-300">{record?.inactive ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="px-4 py-3 overflow-x-auto hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 bg-muted/40">
                        <TableHead className="text-xs text-muted-foreground">Item Name</TableHead>
                        <TableHead className="text-xs text-center text-muted-foreground">
                          Total
                        </TableHead>
                        <TableHead className="text-xs text-center text-green-400">
                          Working
                        </TableHead>
                        <TableHead className="text-xs text-center text-amber-400">
                          Faulty
                        </TableHead>
                        <TableHead className="text-xs text-center text-gray-400">
                          Inactive
                        </TableHead>
                        <TableHead className="text-xs text-right text-muted-foreground">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map(({ name, record }) => (
                        <TableRow
                          key={name}
                          className="border-border/40 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="text-sm font-medium text-foreground">
                            {name}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {record?.total ?? 0}
                          </TableCell>
                          <TableCell className="text-center text-sm text-green-400">
                            {record?.working ?? 0}
                          </TableCell>
                          <TableCell className="text-center text-sm text-amber-400">
                            {record?.faulty ?? 0}
                          </TableCell>
                          <TableCell className="text-center text-sm text-gray-400">
                            {record?.inactive ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {canEdit ? (
                              record ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => handleOpenEdit(record)}
                                >
                                  Edit
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => {
                                    setAddDefaults({ category, itemName: name })
                                    setAddOpen(true)
                                  }}
                                >
                                  Add
                                </Button>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">View only</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <AddRentalItemModal
        open={addOpen}
        onClose={handleCloseAdd}
        categories={CATEGORY_LIST}
        defaultCategory={addDefaults?.category}
        defaultItemName={addDefaults?.itemName}
        onSaved={(record) => {
          // Optimistic update: reflect changes immediately
          upsertItem(record)
          toast.success('Rental item added.')
          // Also refresh in background to keep in sync with server
          refresh()
        }}
      />

      {/* Edit Modal */}
      <EditRentalItemModal
        open={editOpen}
        onClose={handleCloseEdit}
        categories={CATEGORY_LIST}
        item={selectedItem}
        onSaved={(record) => {
          upsertItem(record)
          toast.success('Rental item updated.')
          refresh()
        }}
      />
    </div>
  )
}


