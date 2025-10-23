import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function POST(req: Request) {
  const { user_id } = await req.json()
  const supabase = createClient()

  const { data, error } = await supabase
    .from("attendance")
    .update({ check_out: new Date().toISOString(), status: "checked_out" })
    .eq("user_id", user_id)
    .is("check_out", null)
    .order("check_in", { ascending: false })
    .limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
