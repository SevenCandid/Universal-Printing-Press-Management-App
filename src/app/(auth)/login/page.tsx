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
  const [currentSubText, setCurrentSubText] = useState(0)
  const [showResendEmail, setShowResendEmail] = useState(false)
  const [resendingEmail, setResendingEmail] = useState(false)
  
  const subTexts = [
    'Login to access your dashboard',
    'Manage your printing business efficiently',
    'Track orders, customers, and revenue',
    'Stay organized with our smart dashboard',
  ]

  // Rotating text effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubText((prev) => (prev + 1) % subTexts.length)
    }, 3000) // Change text every 3 seconds

    return () => clearInterval(interval)
  }, [subTexts.length])

  // ✅ Check for existing session and auto-redirect (for verified users)
  useEffect(() => {
    const checkSession = async () => {
      if (redirected) return

      // Use getUser() for secure authentication check
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser()

      if (authError || !user) {
        setCheckingSession(false)
        return
      }

      if (user) {
        let { data: profile, error } = await supabase
          .from('profiles')
          .select('role, name, email')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          console.error('Profile fetch error:', error)
          toast.error('Error fetching profile. Contact admin.')
          setCheckingSession(false)
          return
        }

        // ⚡ Auto-create profile if it doesn't exist
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
    const validRoles = ['ceo', 'manager', 'executive_assistant', 'staff', 'intern', 'sales_representative', 'board']
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
        
        // Handle email confirmation error specifically
        if (error.message?.includes('Email not confirmed') || error.message?.includes('email not confirmed')) {
          toast.error('Please check your email and confirm your account before logging in. If you didn\'t receive the email, check your spam folder.', {
            duration: 6000,
          })
          setShowResendEmail(true)
          setLoading(false)
          return
        }
        
        // Handle invalid credentials with more helpful message
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid')) {
          toast.error('Invalid email or password. Please check your credentials and try again.', {
            duration: 5000,
          })
          setLoading(false)
          return
        }
        
        // Handle rate limiting
        if (error.message?.includes('rate limit') || error.message?.includes('too many')) {
          toast.error('Too many login attempts. Please wait a few minutes and try again.', {
            duration: 5000,
          })
          setLoading(false)
          return
        }
        
        // Generic error
        toast.error(error.message || 'Login failed. Please check your credentials and try again.', {
          duration: 5000,
        })
        setLoading(false)
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

  // Handle resend confirmation email
  const handleResendConfirmation = async () => {
    if (!formData.email.trim()) {
      toast.error('Please enter your email address first')
      return
    }

    setResendingEmail(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (error) {
        toast.error(error.message || 'Failed to resend confirmation email')
      } else {
        toast.success('✅ Confirmation email sent! Please check your inbox.')
        setShowResendEmail(false)
      }
    } catch (err: any) {
      console.error('Resend confirmation error:', err)
      toast.error('Failed to resend confirmation email')
    } finally {
      setResendingEmail(false)
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
          <Image src="/assets/logo/UPPLOGO.png" alt="Logo" width={80} height={80} priority unoptimized />
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

        {/* Resend Confirmation Email */}
        {showResendEmail && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Didn't receive the confirmation email?
            </p>
            <button
              type="button"
              onClick={handleResendConfirmation}
              disabled={resendingEmail}
              className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 transition text-sm disabled:opacity-50"
            >
              {resendingEmail ? 'Sending...' : 'Resend Confirmation Email'}
            </button>
            <button
              type="button"
              onClick={() => setShowResendEmail(false)}
              className="w-full text-xs text-blue-700 dark:text-blue-300 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

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
