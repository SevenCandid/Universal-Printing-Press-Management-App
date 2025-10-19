import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const createSupabaseServerClient = () => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  )
}

// ✅ Shortcut export for simple usage
export const supabase = createSupabaseServerClient()

// ✅ Add this alias so routes that call createClient() don’t break
export const createClient = createSupabaseServerClient
