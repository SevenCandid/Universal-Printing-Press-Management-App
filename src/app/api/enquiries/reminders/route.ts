import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = createClient()

  // ✅ Fetch enquiries that need follow-up within the next 3 days
  const { data, error } = await supabase
    .from('enquiries')
    .select('*')
    .gte('follow_up_date', new Date().toISOString().split('T')[0])
    .lte(
      'follow_up_date',
      new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    )
    .order('follow_up_date', { ascending: true })

  if (error) {
    console.error('Follow-up fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
