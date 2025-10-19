import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const { id } = await req.json()
  const supabase = createClient()

  const { error } = await supabase.rpc('mark_enquiry_converted', { p_id: id })

  if (error) {
    console.error('Convert enquiry error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
