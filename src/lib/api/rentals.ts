'use client'

import { supabase } from '@/lib/supabaseClient'
import { RentalInventoryRow } from '@/types/rentalInventory'
import { z } from 'zod'
import { isOnline } from '@/lib/offlineSync'
import {
  STORAGE_KEYS,
  saveOfflineData,
  getOfflineData,
  addToSyncQueue,
  getSyncQueue,
} from '@/lib/offlineStorage'

const TABLE_NAME = 'rental_inventory'
const RENTAL_STORAGE_KEY = STORAGE_KEYS.RENTAL_INVENTORY ?? 'offline_rental_inventory'

const ALLOWED_CATEGORIES = ['Chairs', 'Canopies', 'Tables', 'Mattresses'] as const
type AllowedCategory = (typeof ALLOWED_CATEGORIES)[number]

type ApiResult<T> = Promise<{ data: T | null; error: string | null }>

const numericField = z.preprocess(
  value => {
    if (value === '' || value === null || value === undefined) return 0
    if (typeof value === 'string') return Number(value)
    return value
  },
  z
    .number()
    .int('Value must be a number')
    .min(0, 'Value must be zero or greater')
)

const categorySchema = z.string().trim().min(1, 'Category is required')
const itemNameSchema = z.string().trim().min(1, 'Item name is required')

const rentalItemCreateSchema = z
  .object({
    category: categorySchema,
    item_name: itemNameSchema,
    total: numericField,
    working: numericField,
    faulty: numericField,
    inactive: numericField,
  })
  .superRefine((data, ctx) => {
    const sum = data.working + data.faulty + data.inactive
    if (sum > data.total) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['total'],
        message: 'Total must be greater than or equal to working + faulty + inactive counts',
      })
    }
  })

const rentalItemUpdateSchema = z
  .object({
    category: categorySchema.optional(),
    item_name: itemNameSchema.optional(),
    total: numericField.optional(),
    working: numericField.optional(),
    faulty: numericField.optional(),
    inactive: numericField.optional(),
  })
  .refine(
    data => Object.values(data).some(value => value !== undefined),
    'Provide at least one field to update'
  )
  .superRefine((data, ctx) => {
    if (
      data.total !== undefined &&
      data.working !== undefined &&
      data.faulty !== undefined &&
      data.inactive !== undefined
    ) {
      const sum = data.working + data.faulty + data.inactive
      if (sum > data.total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['total'],
          message: 'Total must be greater than or equal to working + faulty + inactive counts',
        })
      }
    }
  })

export type RentalItemCreateInput = z.infer<typeof rentalItemCreateSchema>
export type RentalItemUpdateInput = z.infer<typeof rentalItemUpdateSchema>

const DEFAULT_CATEGORY: AllowedCategory = 'Tables'

const sanitizeCategory = (value?: string): AllowedCategory => {
  if (!value) return DEFAULT_CATEGORY
  const normalized = value.trim().toLowerCase()
  const match = ALLOWED_CATEGORIES.find(cat => cat.toLowerCase() === normalized)
  return match ?? DEFAULT_CATEGORY
}

const sanitizeText = (value: string, maxLength = 120): string =>
  value.trim().replace(/\s+/g, ' ').slice(0, maxLength)

const normalizeCounts = (counts: {
  total: number
  working: number
  faulty: number
  inactive: number
}) => {
  const working = Math.max(0, counts.working)
  const faulty = Math.max(0, counts.faulty)
  const inactive = Math.max(0, counts.inactive)
  const sum = working + faulty + inactive
  const total = Math.max(sum, counts.total)
  return { total, working, faulty, inactive }
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

const sortRecords = (records: RentalInventoryRow[]): RentalInventoryRow[] =>
  [...records].sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category)
    if (categoryCompare !== 0) return categoryCompare
    return a.item_name.localeCompare(b.item_name)
  })

const upsertRecord = (
  collection: RentalInventoryRow[],
  record: RentalInventoryRow
): RentalInventoryRow[] => {
  const next = [...collection]
  const index = next.findIndex(item => item.id === record.id)
  if (index === -1) {
    next.push(record)
  } else {
    next[index] = { ...next[index], ...record }
  }
  return sortRecords(next)
}

const removeRecord = (collection: RentalInventoryRow[], id: string) =>
  collection.filter(item => item.id !== id)

const persistOffline = async (records: RentalInventoryRow[]) => {
  await saveOfflineData(RENTAL_STORAGE_KEY, sortRecords(records))
}

const getCachedRecords = async (): Promise<RentalInventoryRow[]> => {
  const cached = await getOfflineData<RentalInventoryRow[]>(RENTAL_STORAGE_KEY)
  return cached ? sortRecords(cached) : []
}

const queueOperation = async (
  type: 'CREATE' | 'UPDATE' | 'DELETE',
  data: Partial<RentalInventoryRow> & { id: string }
) => {
  await addToSyncQueue({
    type,
    table: TABLE_NAME,
    data,
  })
}

const mergeWithPendingOperations = async (
  base: RentalInventoryRow[]
): Promise<RentalInventoryRow[]> => {
  const queue = await getSyncQueue()
  const pending = queue.filter(item => item.table === TABLE_NAME && !item.synced)

  if (!pending.length) return base

  let merged = [...base]
  for (const op of pending) {
    const payload = op.data as RentalInventoryRow
    switch (op.type) {
      case 'CREATE':
        merged = upsertRecord(merged, payload)
        break
      case 'UPDATE': {
        const existing = merged.find(item => item.id === payload.id)
        const updated: RentalInventoryRow = {
          ...(existing ?? {
            id: payload.id,
            category: DEFAULT_CATEGORY,
            item_name: 'Pending Item',
            total: 0,
            working: 0,
            faulty: 0,
            inactive: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
          ...payload,
        }
        merged = upsertRecord(merged, updated)
        break
      }
      case 'DELETE':
        merged = removeRecord(merged, payload.id)
        break
    }
  }

  return merged
}

export const getRentalInventory = async (): ApiResult<RentalInventoryRow[]> => {
  let records: RentalInventoryRow[] = []
  let errorMessage: string | null = null

  try {
    if (isOnline()) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('category', { ascending: true })
        .order('item_name', { ascending: true })

      if (error) throw error
      records = sortRecords((data || []) as RentalInventoryRow[])
      await persistOffline(records)
    } else {
      records = await getCachedRecords()
    }
  } catch (error) {
    console.error('[RentalsAPI] getRentalInventory failed:', error)
    records = await getCachedRecords()
    errorMessage = 'Unable to fetch rental inventory from the server.'
  }

  records = await mergeWithPendingOperations(records)
  return { data: records, error: errorMessage }
}

export const createRentalItem = async (
  payload: RentalItemCreateInput
): ApiResult<RentalInventoryRow> => {
  const parsed = rentalItemCreateSchema.safeParse(payload)
  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join(', ')
    return { data: null, error: message }
  }

  const sanitizedCategory = sanitizeCategory(parsed.data.category)
  const sanitizedItemName = sanitizeText(parsed.data.item_name)
  const counts = normalizeCounts({
    total: parsed.data.total ?? 0,
    working: parsed.data.working ?? 0,
    faulty: parsed.data.faulty ?? 0,
    inactive: parsed.data.inactive ?? 0,
  })

  const record: RentalInventoryRow = {
    id: generateId(),
    category: sanitizedCategory,
    item_name: sanitizedItemName,
    total: counts.total,
    working: counts.working,
    faulty: counts.faulty,
    inactive: counts.inactive,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(record)
        .select('*')
        .single()

      if (error) throw error

      const created = data as RentalInventoryRow
      await persistOffline(upsertRecord(await getCachedRecords(), created))
      return { data: created, error: null }
    } catch (error) {
      console.error('[RentalsAPI] createRentalItem failed:', error)
      await queueOperation('CREATE', record)
      await persistOffline(upsertRecord(await getCachedRecords(), record))
      return { data: record, error: 'Request queued for sync due to network error.' }
    }
  }

  await queueOperation('CREATE', record)
  await persistOffline(upsertRecord(await getCachedRecords(), record))
  return { data: record, error: 'Offline: item queued for sync.' }
}

export const updateRentalItem = async (
  id: string,
  updates: RentalItemUpdateInput
): ApiResult<RentalInventoryRow> => {
  if (!id) {
    return { data: null, error: 'Record id is required.' }
  }

  const parsed = rentalItemUpdateSchema.safeParse(updates)
  if (!parsed.success) {
    const message = parsed.error.issues.map(issue => issue.message).join(', ')
    return { data: null, error: message }
  }

  const sanitized: Partial<RentalInventoryRow> = {}

  if (parsed.data.category) sanitized.category = sanitizeCategory(parsed.data.category)
  if (parsed.data.item_name) sanitized.item_name = sanitizeText(parsed.data.item_name)

  if (
    parsed.data.total !== undefined ||
    parsed.data.working !== undefined ||
    parsed.data.faulty !== undefined ||
    parsed.data.inactive !== undefined
  ) {
    const current = await getCachedRecords()
    const existing = current.find(item => item.id === id)
    const baseCounts = existing ?? {
      total: 0,
      working: 0,
      faulty: 0,
      inactive: 0,
    }

    const counts = normalizeCounts({
      total: parsed.data.total ?? baseCounts.total,
      working: parsed.data.working ?? baseCounts.working,
      faulty: parsed.data.faulty ?? baseCounts.faulty,
      inactive: parsed.data.inactive ?? baseCounts.inactive,
    })

    sanitized.total = counts.total
    sanitized.working = counts.working
    sanitized.faulty = counts.faulty
    sanitized.inactive = counts.inactive
  }

  sanitized.updated_at = new Date().toISOString()

  if (isOnline()) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update(sanitized)
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error

      const updated = data as RentalInventoryRow
      await persistOffline(upsertRecord(await getCachedRecords(), updated))
      return { data: updated, error: null }
    } catch (error) {
      console.error('[RentalsAPI] updateRentalItem failed:', error)
      await queueOperation('UPDATE', { id, ...sanitized })
      const optimistic = upsertRecord(await getCachedRecords(), {
        ...(await getCachedRecords()).find(item => item.id === id)!,
        ...sanitized,
      } as RentalInventoryRow)
      await persistOffline(optimistic)
      const record = optimistic.find(item => item.id === id) || null
      return {
        data: record,
        error: 'Request queued for sync due to network error.',
      }
    }
  }

  await queueOperation('UPDATE', { id, ...sanitized })
  const optimistic = await persistOptimisticUpdate(id, sanitized)
  return {
    data: optimistic,
    error: 'Offline: update queued for sync.',
  }
}

const persistOptimisticUpdate = async (
  id: string,
  updates: Partial<RentalInventoryRow>
): Promise<RentalInventoryRow | null> => {
  let updatedRecord: RentalInventoryRow | null = null
  const next = await getCachedRecords()
  const merged = next.map(item => {
    if (item.id === id) {
      updatedRecord = { ...item, ...updates }
      return updatedRecord
    }
    return item
  })
  await persistOffline(merged)
  return updatedRecord
}

export const deleteRentalItem = async (id: string): ApiResult<{ id: string }> => {
  if (!id) return { data: null, error: 'Record id is required.' }

  if (isOnline()) {
    try {
      const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id)
      if (error) throw error
      await persistOffline(removeRecord(await getCachedRecords(), id))
      return { data: { id }, error: null }
    } catch (error) {
      console.error('[RentalsAPI] deleteRentalItem failed:', error)
      await queueOperation('DELETE', { id })
      await persistOffline(removeRecord(await getCachedRecords(), id))
      return { data: { id }, error: 'Request queued for sync due to network error.' }
    }
  }

  await queueOperation('DELETE', { id })
  await persistOffline(removeRecord(await getCachedRecords(), id))
  return { data: { id }, error: 'Offline: delete queued for sync.' }
}




