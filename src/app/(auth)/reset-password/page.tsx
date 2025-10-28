'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) throw error

      setEmailSent(true)
      toast.success('Password reset email sent! Check your inbox.')
    } catch (error: any) {
      console.error('Reset password error:', error)
      toast.error(error.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-2xl p-6 md:p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
            <img
              src="/UPPLOGO.png"
              alt="UPP Logo"
              className="object-contain w-full h-full"
            />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-center mb-2">
          Reset Password
        </h1>
        <p className="text-center text-sm text-muted-foreground mb-6">
          {emailSent
            ? 'Check your email for the reset link'
            : 'Enter your email address and we\'ll send you a password reset link'}
        </p>

        {!emailSent ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-md py-2.5 font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                    Email Sent Successfully!
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                📧 Next Steps:
              </h4>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1.5 ml-4 list-decimal">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the password reset link in the email</li>
                <li>Enter your new password</li>
                <li>Log in with your new password</li>
              </ol>
            </div>

            <button
              onClick={() => {
                setEmailSent(false)
                setEmail('')
              }}
              className="w-full border border-border rounded-md py-2.5 font-medium hover:bg-muted transition"
            >
              Send to a Different Email
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              Remember your password?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Back to Login
              </Link>
            </p>
            <p>
              Don't have an account?{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        {emailSent && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Didn't receive the email?{' '}
              <button
                onClick={() => {
                  setEmailSent(false)
                  handleResetPassword(new Event('submit') as any)
                }}
                className="text-primary hover:underline"
              >
                Resend
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

