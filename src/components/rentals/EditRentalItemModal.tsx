'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  RentalInventoryRow,
  RentalInventoryUpdate,
} from '@/types/rentalInventory'
import { RentalCategory, RentalItemFormValues } from './AddRentalItemModal'

interface EditRentalItemModalProps {
  open: boolean
  onClose: () => void
  categories: RentalCategory[]
  /**
   * The existing item to edit. If null, the modal will render nothing.
   */
  item: RentalInventoryRow | null
  /**
   * Called after a successful update so the parent can refresh without a full reload.
   */
  onSaved?: (record: RentalInventoryRow) => void
}

const toInt = (v: string) => (v === '' ? 0 : Number.parseInt(v, 10))

const validateForm = (form: RentalItemFormValues): string | null => {
  if (!form.category) return 'Category is required.'
  if (!form.item_name.trim()) return 'Item name is required.'

  const total = toInt(form.total)
  const working = toInt(form.working)
  const faulty = toInt(form.faulty)
  const inactive = toInt(form.inactive)

  if ([total, working, faulty, inactive].some((n) => Number.isNaN(n) || n < 0)) {
    return 'All numeric fields must be non‑negative integers.'
  }

  if (working + faulty + inactive > total) {
    return 'Sum of Working, Faulty and Inactive cannot exceed Total.'
  }

  return null
}

export function EditRentalItemModal({
  open,
  onClose,
  categories,
  item,
  onSaved,
}: EditRentalItemModalProps) {
  const { supabase } = useSupabase()

  const [form, setForm] = useState<RentalItemFormValues>({
    category: '',
    item_name: '',
    total: '',
    working: '',
    faulty: '',
    inactive: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form from item when modal opens or item changes
  useEffect(() => {
    if (!open || !item) return
    setError(null)
    setSubmitting(false)
    setForm({
      category: item.category,
      item_name: item.item_name,
      total: String(item.total ?? ''),
      working: String(item.working ?? ''),
      faulty: String(item.faulty ?? ''),
      inactive: String(item.inactive ?? ''),
    })
  }, [open, item])

  const handleChange = (field: keyof RentalItemFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const buildPayload = (): RentalInventoryUpdate => ({
    category: form.category,
    item_name: form.item_name.trim(),
    total: toInt(form.total),
    working: toInt(form.working),
    faulty: toInt(form.faulty),
    inactive: toInt(form.inactive),
  })

  const handleSubmit = async () => {
    if (!supabase) {
      setError('Supabase client is not ready. Please try again.')
      return
    }
    if (!item) {
      setError('No item selected for editing.')
      return
    }

    const validationError = validateForm(form)
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload = buildPayload()
      const { data, error: err } = await supabase
        .from('rental_inventory')
        .update(payload)
        .eq('id', item.id)
        .select('*')
        .single()

      if (err) throw err

      if (data && onSaved) {
        onSaved(data as RentalInventoryRow)
      }

      onClose()
    } catch (e: any) {
      console.error('Update rental item failed:', e)
      setError(
        e?.message ||
          'Failed to update rental item. Please check your input and try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (submitting) return
    onClose()
  }

  // If there is no item to edit, keep the dialog closed gracefully
  const isOpen = open && !!item

  return (
    <Dialog open={isOpen} onOpenChange={(isOpenNext) => !isOpenNext && handleCancel()}>
      <DialogContent className="bg-card text-foreground border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Rental Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Category</label>
            <select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              disabled={submitting}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Item Name</label>
            <Input
              value={form.item_name}
              onChange={(e) => handleChange('item_name', e.target.value)}
              className="bg-background text-foreground border-border"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Total</label>
              <Input
                type="number"
                min={0}
                value={form.total}
                onChange={(e) => handleChange('total', e.target.value)}
                className="bg-background text-foreground border-border"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-green-400">Working</label>
              <Input
                type="number"
                min={0}
                value={form.working}
                onChange={(e) => handleChange('working', e.target.value)}
                className="bg-background text-foreground border-border"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-amber-400">Faulty</label>
              <Input
                type="number"
                min={0}
                value={form.faulty}
                onChange={(e) => handleChange('faulty', e.target.value)}
                className="bg-background text-foreground border-border"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-gray-400">Inactive</label>
              <Input
                type="number"
                min={0}
                value={form.inactive}
                onChange={(e) => handleChange('inactive', e.target.value)}
                className="bg-background text-foreground border-border"
                disabled={submitting}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditRentalItemModal










