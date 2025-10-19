'use client'

import { createBrowserClient } from '@supabase/ssr'

// ✅ Export a function that returns a new client instance
export const createSupabaseBrowserClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ✅ (Optional) Export a ready-to-use client for simple usage elsewhere
export const supabase = createSupabaseBrowserClient()
