'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Image from 'next/image'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    staff_id: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Require staff ID only for manager and staff
      if ((formData.role === 'staff' || formData.role === 'manager') && !formData.staff_id.trim()) {
        toast.error('Staff ID is required for this role.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            name: formData.name.trim(),
            role: formData.role,
            staff_id:
              formData.role === 'manager' || formData.role === 'staff'
                ? formData.staff_id.trim()
                : null,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      })

      if (error) {
        console.error('Signup error:', error)
        toast.error(error.message || 'Signup failed.')
        return
      }

      if (!data?.user) {
        toast.error('No user returned. Please try again.')
        return
      }

      toast.success('✅ Account created! Please verify your email before logging in.')
      router.push('/login')
    } catch (err: any) {
      console.error('Unexpected signup error:', err)
      toast.error(err.message || 'Unexpected issue during signup.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full space-y-6 p-8 bg-card border border-border rounded-xl shadow-lg">
        <div className="flex flex-col items-center space-y-3">
          <Image src="/assets/logo/UPPLOGO.png" alt="Logo" width={80} height={80} />
          <h2 className="text-2xl font-semibold text-foreground">Create Account</h2>
          <p className="text-sm text-muted-foreground">
            Sign up to access your workspace
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-border bg-background p-2"
          />

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-border bg-background p-2"
          >
            <option value="">Select Role</option>
            <option value="ceo">CEO</option>
            <option value="board">Board Member</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>

          {(formData.role === 'manager' || formData.role === 'staff') && (
            <input
              type="text"
              name="staff_id"
              placeholder="Staff ID"
              value={formData.staff_id}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-border bg-background p-2"
            />
          )}

          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-border bg-background p-2"
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-border bg-background p-2"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-md py-2 hover:bg-primary/90 transition"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <a href="/login" className="text-primary hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  )
}
