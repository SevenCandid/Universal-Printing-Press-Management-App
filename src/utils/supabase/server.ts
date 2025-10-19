import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client configured for the server (no session persistence)
 */
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

// ✅ Default Supabase client (optional shortcut)
export const supabase = createSupabaseServerClient()

// ✅ Alias export to match how your API routes import it
export const createClient = createSupabaseServerClient
