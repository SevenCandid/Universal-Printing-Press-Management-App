'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { useUserRole } from '@/context/UserRoleContext'

export default function LoginPage() {
  const router = useRouter()
  const { setRole } = useUserRole()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [redirected, setRedirected] = useState(false)

  // ✅ Check for existing session and auto-redirect (for verified users)
  useEffect(() => {
    const checkSession = async () => {
      if (redirected) return

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        let { data: profile, error } = await supabase
          .from('profiles')
          .select('role, name, email')
          .eq('id', session.user.id)
          .maybeSingle()

        if (error) {
          console.error('Profile fetch error:', error)
          toast.error('Error fetching profile. Contact admin.')
          setCheckingSession(false)
          return
        }

        // ⚡ Auto-create profile if it doesn’t exist
        if (!profile) {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: session.user.id,
                email: session.user.email,
                role: 'staff',
                name: session.user.user_metadata?.full_name || null,
              },
            ])
            .select('role, name, email')

            .maybeSingle()

          if (insertError) {
            console.error('Auto-profile creation failed:', insertError)
            toast.error('Could not auto-create profile. Contact admin.')
            setCheckingSession(false)
            return
          }

          profile = newProfile
          toast.success('✅ Profile created automatically.')
        }

        if (profile?.role) {
          const role = profile.role.toLowerCase()
          localStorage.setItem('role', role)
          localStorage.setItem('full_name', profile.name || '')
          setRole(role)
          toast.success(`Welcome, ${profile.name || role.toUpperCase()}!`)
          redirectToRole(role)
          setRedirected(true)
          return
        }
      }

      setCheckingSession(false)
    }

    checkSession()
  }, [redirected, setRole])

  // ✅ Redirect user based on their role
  const redirectToRole = (role: string) => {
    const validRoles = ['ceo', 'manager', 'staff', 'board']
    const lower = role.toLowerCase()
    router.replace(validRoles.includes(lower) ? `/${lower}/dashboard` : '/')
  }

  // ✅ Handle login form submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      })

      if (error) {
        console.error('Supabase login error:', error)
        toast.error(error.message || 'Invalid credentials.')
        return
      }

      const user = data?.user
      if (!user) {
        toast.error('Login failed. No user returned.')
        return
      }

      // ✅ Fetch or auto-create profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.id,
              email: user.email,
              role: 'staff',
              name: user.user_metadata?.full_name || null,
            },
          ])
          .select('role, name, email')

          .maybeSingle()

        if (insertError) {
          console.error('Profile insert error:', insertError)
          toast.error('⚠️ Could not create profile automatically.')
          return
        }

        profile = newProfile
        toast.success('✅ Profile created automatically.')
      }

      if (profileError && !profile) {
        console.error('Profile fetch error:', profileError)
        toast.error('Unable to fetch profile. Contact admin.')
        return
      }

      if (!profile?.role) {
        toast.error('Profile not found or missing role. Contact admin.')
        return
      }

      const role = profile.role.toLowerCase()
      localStorage.setItem('role', role)
      localStorage.setItem('full_name', profile.name || '')
      setRole(role)
      toast.success(`✅ Welcome, ${profile.name || role.toUpperCase()}!`)
      redirectToRole(role)
    } catch (err: any) {
      console.error('Unexpected login error:', err)
      toast.error(err?.message || 'Unexpected issue during login.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground animate-pulse">
          Checking your session...
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full space-y-6 p-8 bg-card border border-border rounded-xl shadow-lg">
        {/* Logo and Header */}
        <div className="flex flex-col items-center space-y-3">
          <Image src="/assets/logo/UPPLOGO.png" alt="Logo" width={80} height={80} />
          <h2 className="text-2xl font-semibold text-foreground">Welcome Back</h2>
          <p className="text-muted-foreground text-sm">
            Login to access your dashboard
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, [e.target.name]: e.target.value })
            }
            required
            className="w-full rounded-md border border-border bg-background p-2"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, [e.target.name]: e.target.value })
            }
            required
            className="w-full rounded-md border border-border bg-background p-2"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 hover:bg-primary/90 transition"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        {/* Footer Links */}
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>
            Don’t have an account?{' '}
            <a href="/signup" className="text-primary hover:underline">
              Sign Up
            </a>
          </p>
          <p>
            <a href="/reset-password" className="text-primary hover:underline">
              Forgot Password?
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
