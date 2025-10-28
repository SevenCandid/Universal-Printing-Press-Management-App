'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    // Check if user came from password reset email
    const checkResetSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setValidSession(true)
      } else {
        toast.error('Invalid or expired reset link. Please request a new one.')
        setTimeout(() => router.push('/reset-password'), 2000)
      }
      setCheckingSession(false)
    }

    checkResetSession()
  }, [router])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      toast.success('Password updated successfully! Redirecting to login...')
      
      // Sign out and redirect to login
      await supabase.auth.signOut()
      setTimeout(() => router.push('/login'), 2000)
    } catch (error: any) {
      console.error('Update password error:', error)
      toast.error(error.message || 'Failed to update password')
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="text-center">
          <p className="text-muted-foreground">Invalid reset link. Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-2xl p-6 md:p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative w-24 h-24 md:w-32 md:h-32">
            <Image
              src="/assets/logo/UPPLOGO.png"
              alt="UPP Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
          Create New Password
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          Choose a strong password for your account
        </p>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              New Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-md border border-border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Must be at least 6 characters
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-md border border-border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {password && confirmPassword && password !== confirmPassword && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-700 dark:text-red-300">
                Passwords do not match
              </p>
            </div>
          )}

          {password && password.length >= 6 && password === confirmPassword && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Passwords match
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || password !== confirmPassword || password.length < 6}
            className="w-full bg-primary text-primary-foreground rounded-md py-2.5 font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Remember your password?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Back to Login
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🔒 Password Tips:
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Use at least 8 characters (6 minimum required)</li>
            <li>• Include uppercase and lowercase letters</li>
            <li>• Add numbers and special characters</li>
            <li>• Avoid common words or patterns</li>
            <li>• Don't reuse old passwords</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

