'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import {
  getRentalInventory,
  createRentalItem,
  updateRentalItem,
  deleteRentalItem,
  RentalItemCreateInput,
  RentalItemUpdateInput,
} from '@/lib/api/rentals'
import type { RentalInventoryRow } from '@/types/rentalInventory'
import { isOnline } from '@/lib/offlineSync'

export interface UseRentalInventoryResult {
  data: RentalInventoryRow[]
  loading: boolean
  refreshing: boolean
  error: string | null
  addItem: (payload: RentalItemCreateInput) => Promise<{ error: string | null }>
  updateItem: (
    id: string,
    updates: RentalItemUpdateInput
  ) => Promise<{ error: string | null }>
  deleteItem: (id: string) => Promise<{ error: string | null }>
  refresh: () => Promise<void>
}

const validateCounts = (payload: {
  total: number
  working: number
  faulty: number
  inactive: number
}): string | null => {
  if (payload.total < 0) {
    return 'Total must be zero or greater.'
  }
  if (payload.working < 0 || payload.faulty < 0 || payload.inactive < 0) {
    return 'Counts cannot be negative.'
  }
  const sum = payload.working + payload.faulty + payload.inactive
  if (sum > payload.total) {
    return 'Total must be greater than or equal to working + faulty + inactive counts.'
  }
  return null
}

const hasDuplicateNameInCategory = (
  items: RentalInventoryRow[],
  category: string,
  itemName: string,
  ignoreId?: string
): boolean => {
  const normalizedCategory = category.trim().toLowerCase()
  const normalizedName = itemName.trim().toLowerCase()

  return items.some((item) => {
    if (ignoreId && item.id === ignoreId) return false
    return (
      item.category.trim().toLowerCase() === normalizedCategory &&
      item.item_name.trim().toLowerCase() === normalizedName
    )
  })
}

export function useRentalInventory(): UseRentalInventoryResult {
  const { supabase } = useSupabase()

  const [data, setData] = useState<RentalInventoryRow[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchIdRef = useRef(0)
  const mountedRef = useRef(true)

  const runFetch = useCallback(
    async (isInitial: boolean) => {
      const fetchId = ++fetchIdRef.current
      if (isInitial) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      try {
        const { data: records, error: apiError } = await getRentalInventory()

        if (!mountedRef.current || fetchId !== fetchIdRef.current) return

        if (apiError) {
          setError(apiError)
        }
        if (records) {
          setData(records)
        }
      } catch (e) {
        if (!mountedRef.current || fetchId !== fetchIdRef.current) return
        console.error('[useRentalInventory] Failed to load inventory:', e)
        setError('Unexpected error loading rental inventory.')
      } finally {
        if (!mountedRef.current || fetchId !== fetchIdRef.current) return
        isInitial ? setLoading(false) : setRefreshing(false)
      }
    },
    []
  )

  const refresh = useCallback(async () => {
    await runFetch(false)
  }, [runFetch])

  useEffect(() => {
    mountedRef.current = true
    runFetch(true)

    return () => {
      mountedRef.current = false
    }
  }, [runFetch])

  const addItem: UseRentalInventoryResult['addItem'] = useCallback(
    async (payload) => {
      const countsValidationError = validateCounts({
        total: payload.total,
        working: payload.working,
        faulty: payload.faulty,
        inactive: payload.inactive,
      })
      if (countsValidationError) {
        return { error: countsValidationError }
      }

      if (hasDuplicateNameInCategory(data, payload.category, payload.item_name)) {
        return { error: 'An item with this name already exists in that category.' }
      }

      try {
        const { data: created, error: apiError } = await createRentalItem(payload)

        if (created) {
          setData((prev) => {
            const next = [...prev, created]
            return next.sort((a, b) => {
              const catCompare = a.category.localeCompare(b.category)
              if (catCompare !== 0) return catCompare
              return a.item_name.localeCompare(b.item_name)
            })
          })
        }

        return { error: apiError }
      } catch (e) {
        console.error('[useRentalInventory] addItem failed:', e)
        return {
          error: isOnline()
            ? 'Failed to add item. Please try again.'
            : 'Offline: item queued for sync.',
        }
      }
    },
    [data]
  )

  const updateItem: UseRentalInventoryResult['updateItem'] = useCallback(
    async (id, updates) => {
      const target = data.find((item) => item.id === id)
      if (!target) {
        return { error: 'Item not found.' }
      }

      const category = updates.category ?? target.category
      const itemName = updates.item_name ?? target.item_name

      if (hasDuplicateNameInCategory(data, category, itemName, id)) {
        return { error: 'Another item with this name already exists in that category.' }
      }

      const total = updates.total ?? target.total
      const working = updates.working ?? target.working
      const faulty = updates.faulty ?? target.faulty
      const inactive = updates.inactive ?? target.inactive

      const countsValidationError = validateCounts({
        total,
        working,
        faulty,
        inactive,
      })
      if (countsValidationError) {
        return { error: countsValidationError }
      }

      const optimistic = { ...target, ...updates }
      setData((prev) => prev.map((item) => (item.id === id ? optimistic : item)))

      try {
        const { data: updated, error: apiError } = await updateRentalItem(id, updates)

        if (updated) {
          setData((prev) => prev.map((item) => (item.id === id ? updated : item)))
        }

        if (apiError) {
          setError(apiError)
        }

        return { error: apiError }
      } catch (e) {
        console.error('[useRentalInventory] updateItem failed:', e)
        return {
          error: isOnline()
            ? 'Failed to update item. Please try again.'
            : 'Offline: update queued for sync.',
        }
      }
    },
    [data]
  )

  const deleteItem: UseRentalInventoryResult['deleteItem'] = useCallback(async (id) => {
    const existing = data.find((item) => item.id === id)
    if (!existing) {
      return { error: 'Item not found.' }
    }

    setData((prev) => prev.filter((item) => item.id !== id))

    try {
      const { error: apiError } = await deleteRentalItem(id)

      if (apiError) {
        setError(apiError)
      }
      return { error: apiError }
    } catch (e) {
      console.error('[useRentalInventory] deleteItem failed:', e)
      return {
        error: isOnline()
          ? 'Failed to delete item. Please try again.'
          : 'Offline: delete queued for sync.',
      }
    }
  }, [data])

  useEffect(() => {
    if (!supabase) return

    let isSubscribed = true

    const channel = supabase
      .channel('rental_inventory')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rental_inventory' },
        () => {
          if (!isSubscribed) return
          refresh()
        }
      )
      .subscribe()

    return () => {
      isSubscribed = false
      try {
        supabase.removeChannel(channel)
      } catch {
        // @ts-ignore
        channel?.unsubscribe?.()
      }
    }
  }, [supabase, refresh])

  return {
    data,
    loading,
    refreshing,
    error,
    addItem,
    updateItem,
    deleteItem,
    refresh,
  }
}









