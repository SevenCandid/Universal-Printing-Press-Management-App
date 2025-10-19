'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      switch (profile?.role) {
        case 'ceo':
          router.replace('/ceo/dashboard')
          break
        case 'manager':
          router.replace('/manager/dashboard')
          break
        case 'board':
          router.replace('/board/dashboard')
          break
        case 'staff':
          router.replace('/staff/dashboard')
          break
        default:
          router.replace('/login')
      }
    }

    checkUser()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen text-muted-foreground">
      Loading...
    </div>
  )
}
