import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('get_enquiries')

  if (error) {
    console.error('Fetch enquiries error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
