import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"

const OFFICE_LAT = 7.3396   // replace with your actual office latitude
const OFFICE_LNG = -2.3267  // replace with your actual office longitude
const MAX_DISTANCE_METERS = 150  // within ~150m radius

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lon2-lon1) * Math.PI/180
  const a = Math.sin(Δφ/2)**2 +
            Math.cos(φ1)*Math.cos(φ2) *
            Math.sin(Δλ/2)**2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export async function POST(req: Request) {
  const { user_id, latitude, longitude } = await req.json()
  const distance = getDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG)

  if (distance > MAX_DISTANCE_METERS) {
    return NextResponse.json({ error: "You must be at the office to check in." }, { status: 400 })
  }

  const supabase = createClient()
  const { error } = await supabase
    .from("attendance")
    .insert([{ user_id, check_in: new Date().toISOString(), latitude, longitude, status: "checked_in" }])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
