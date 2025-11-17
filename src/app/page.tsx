'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      // Use getUser() for secure authentication check
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
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
