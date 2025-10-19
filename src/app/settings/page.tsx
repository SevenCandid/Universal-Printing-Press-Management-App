'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true)
  const [newPassword, setNewPassword] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  // ✅ Load user + role + preferences
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }
      setUser(user)

      const storedRole = localStorage.getItem('role')
      setRole(storedRole || 'staff')

      const storedTheme = localStorage.getItem('theme') === 'dark'
      setDarkMode(storedTheme)

      const storedNotify = localStorage.getItem('notifications') === 'true'
      setNotificationsEnabled(storedNotify)
    }

    loadUser()
  }, [router])

  // ✅ Handle theme toggle
  const handleThemeToggle = (checked: boolean) => {
    setDarkMode(checked)
    localStorage.setItem('theme', checked ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', checked)
    toast.success(`Theme set to ${checked ? 'Dark' : 'Light'} mode`)
  }

  // ✅ Handle notification toggle
  const handleNotificationToggle = (checked: boolean) => {
    setNotificationsEnabled(checked)
    localStorage.setItem('notifications', checked.toString())
    toast.success(`Notifications ${checked ? 'enabled' : 'disabled'}`)
  }

  // ✅ Handle password update
  const handlePasswordUpdate = async () => {
    if (!newPassword) {
      toast.error('Enter a new password')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error('Failed to update password')
    } else {
      toast.success('Password updated successfully')
      setNewPassword('')
    }
    setLoading(false)
  }

  return (
    <div className="container max-w-lg mx-auto py-10">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">

          {/* 🔒 Password Update */}
          <div className="space-y-2">
            <h3 className="text-base font-semibold">Change Password</h3>
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button onClick={handlePasswordUpdate} disabled={loading} className="w-full">
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>

          {/* 🎨 Theme Toggle */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <h3 className="text-base font-semibold">Dark Mode</h3>
              <p className="text-sm text-muted-foreground">Toggle app theme</p>
            </div>
            <Switch checked={darkMode} onCheckedChange={handleThemeToggle} />
          </div>

          {/* 🔔 Notifications */}
          <div className="flex items-center justify-between border-t pt-4">
            <div>
              <h3 className="text-base font-semibold">Email Notifications</h3>
              <p className="text-sm text-muted-foreground">Get updates about new tasks or orders</p>
            </div>
            <Switch checked={notificationsEnabled} onCheckedChange={handleNotificationToggle} />
          </div>

          {/* ⚙️ CEO-Only Section */}
          {role === 'ceo' && (
            <div className="border-t pt-6 space-y-2">
              <h3 className="text-base font-semibold text-primary">Admin Controls</h3>
              <Button
                variant="outline"
                onClick={() => router.push('/ceo/settings')}
                className="w-full"
              >
                Open System Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
