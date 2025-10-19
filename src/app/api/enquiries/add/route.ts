import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/utils/supabase/server'


 // or adjust import

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase.from('enquiries').insert([
      {
        client_name: body.client_name,
        contact_number: body.contact_number,
        whatsapp_number: body.whatsapp_number,
        message: body.message,
        status: 'new',
        follow_up_date: body.follow_up_date || null,
      },
    ])

    if (error) {
      console.error('DB insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
