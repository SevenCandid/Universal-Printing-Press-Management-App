export type RentalInventoryId = string

/**
 * Full shape of a record in the `rental_inventory` table.
 *
 * Date fields are represented as ISO 8601 strings when coming from Supabase.
 */
export interface RentalInventoryRow {
  id: RentalInventoryId
  category: string
  item_name: string
  total: number
  working: number
  faulty: number
  inactive: number
  created_at: string
  updated_at: string
}

/**
 * Shape for inserting a new `rental_inventory` record.
 *
 * Server-side defaults are applied for:
 * - id
 * - created_at
 * - updated_at
 * - total, working, faulty, inactive
 */
export interface RentalInventoryInsert {
  id?: RentalInventoryId
  category: string
  item_name: string
  total?: number
  working?: number
  faulty?: number
  inactive?: number
  created_at?: string
  updated_at?: string
}

/**
 * Shape for updating an existing `rental_inventory` record.
 * All fields are optional to support partial updates.
 */
export type RentalInventoryUpdate = Partial<RentalInventoryInsert>











