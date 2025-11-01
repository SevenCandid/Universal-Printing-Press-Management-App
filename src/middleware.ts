import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// list pages that need role-based protection
const PROTECTED_ROUTES = [
  '/dashboard',
  '/tasks',
  '/staff',
  '/orders',
  '/reports',
]

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // 1️⃣ create a Supabase server client (using cookies)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (key) => req.cookies.get(key)?.value } }
  )

  // 2️⃣ get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = req.nextUrl.pathname

  // allow public pages (login, signup, home)
  if (!PROTECTED_ROUTES.some((r) => path.startsWith(r))) return res

  // 3️⃣ redirect unauthenticated users to login
  if (!user) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 4️⃣ fetch the user’s role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // 5️⃣ redirect based on role-access logic
  if (path.startsWith('/dashboard')) {
    if (!['ceo', 'board', 'manager', 'executive_assistant'].includes(role)) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/tasks'
      return NextResponse.redirect(redirectUrl)
    }
  }

  if (path.startsWith('/tasks')) {
    if (!['staff', 'intern', 'sales_representative', 'manager', 'executive_assistant', 'ceo', 'board'].includes(role)) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // ✅ allow through if passes checks
  return res
}

// limit middleware scope
export const config = {
  matcher: ['/dashboard/:path*', '/tasks/:path*', '/staff/:path*', '/orders/:path*', '/reports/:path*'],
}
