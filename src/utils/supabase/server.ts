import { createClient } from '@supabase/supabase-js'

export const createSupabaseServerClient = () => {
  return createClient(
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
