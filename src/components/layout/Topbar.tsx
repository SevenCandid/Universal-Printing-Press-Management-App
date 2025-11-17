'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bars3Icon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Logo } from '@/components/ui/Logo'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'
import NotificationsBase from '@/components/rolebase/NotificationsBase'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const defaultAvatar = '/assets/logo/UPPLOGO.png'

const roleLinks: Record<string, { name: string; href: string }[]> = {
  ceo: [
    { name: 'Dashboard', href: '/ceo/dashboard' },
    { name: 'Orders', href: '/ceo/orders' },
    { name: 'Client Connect', href: '/ceo/clientconnect' },
    { name: 'Tasks', href: '/ceo/tasks' },
    { name: 'Sales Reports', href: '/ceo/sales-reports' },
    { name: 'Staff', href: '/ceo/staff' },
    { name: 'Reports', href: '/ceo/reports' },
  ],
  manager: [
    { name: 'Dashboard', href: '/manager/dashboard' },
    { name: 'Orders', href: '/manager/orders' },
    { name: 'Client Connect', href: '/manager/clientconnect' },
    { name: 'Tasks', href: '/manager/tasks' },
    { name: 'Reports', href: '/manager/reports' },
  ],
  executive_assistant: [
    { name: 'Dashboard', href: '/executive_assistant/dashboard' },
    { name: 'Orders', href: '/executive_assistant/orders' },
    { name: 'Client Connect', href: '/executive_assistant/clientconnect' },
    { name: 'Tasks', href: '/executive_assistant/tasks' },
    { name: 'Staff', href: '/executive_assistant/staff' },
    { name: 'Reports', href: '/executive_assistant/reports' },
  ],
  staff: [
    { name: 'Dashboard', href: '/staff/dashboard' },
    { name: 'Orders', href: '/staff/orders' },
    { name: 'Client Connect', href: '/staff/clientconnect' },
    { name: 'My Tasks', href: '/staff/tasks' },
    { name: 'Reports', href: '/staff/reports' },
  ],
  intern: [
    { name: 'Dashboard', href: '/intern/dashboard' },
    { name: 'Orders', href: '/intern/orders' },
    { name: 'Client Connect', href: '/intern/clientconnect' },
    { name: 'My Tasks', href: '/intern/tasks' },
    { name: 'Reports', href: '/intern/reports' },
  ],
  sales_representative: [
    { name: 'Dashboard', href: '/sales_representative/dashboard' },
    { name: 'Orders', href: '/sales_representative/orders' },
    { name: 'Client Connect', href: '/sales_representative/clientconnect' },
    { name: 'My Tasks', href: '/sales_representative/tasks' },
    { name: 'Daily Reports', href: '/sales_representative/daily-reports' },
    { name: 'Reports', href: '/sales_representative/reports' },
  ],
  board: [
    { name: 'Dashboard', href: '/board/dashboard' },
    { name: 'Orders', href: '/board/orders' },
    { name: 'Client Connect', href: '/board/clientconnect' },
    { name: 'Reports', href: '/board/reports' },
  ],
}

interface TopbarProps {
  onMenuClick: () => void
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>(defaultAvatar)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const loadUser = async () => {
      const storedRole = localStorage.getItem('role')
      setRole(storedRole || 'ceo')

      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) return

      const user = userData.user
      setEmail(user.email || '')

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) {
        console.warn('Profile load error:', error)
        return
      }

      setFullName(profile?.name || 'User')
      setAvatarUrl(profile?.avatar_url || defaultAvatar)
    }

    loadUser()
  }, [mounted])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    toast.success('Logged out successfully')
    router.replace('/login')
  }

  const pages = role && roleLinks[role] ? roleLinks[role] : []
  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedHref = e.target.value
    if (selectedHref) router.push(selectedHref)
  }

  return (
    <header
      className="sticky top-0 z-40 flex h-16 items-center justify-between 
      border-b border-border bg-background px-2 sm:px-4 md:px-6
      shadow-sm backdrop-blur-md"
    >
      {/* Left Section */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md hover:bg-accent focus:ring-2 focus:ring-ring lg:hidden"
          aria-label="Open sidebar"
        >
          <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        <div className="flex-shrink-0 flex items-center">
          <Logo size="xs" showText={false} className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>

        <select
          onChange={handleSelect}
          className="hidden sm:block text-xs sm:text-sm border border-input rounded-md px-2 py-1 sm:px-3 sm:py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          defaultValue=""
        >
          <option value="" disabled>
            Quick Navigate…
          </option>
          {pages.map((page) => (
            <option key={page.name} value={page.href}>
              {page.name}
            </option>
          ))}
        </select>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 sm:gap-3">
        {/* 🔔 Notification System START */}
        <NotificationsBase />
        {/* 🔔 Notification System END */}

        {/* 🔄 Page Refresh Button */}
        <button
          onClick={() => window.location.reload()}
          className="relative p-1.5 md:p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="Refresh Page"
          title="Refresh Page"
        >
          <ArrowPathIcon className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground hover:text-foreground transition-colors" />
        </button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative flex items-center justify-center rounded-full border border-border overflow-hidden 
              focus:outline-none focus:ring-2 focus:ring-ring transition-transform hover:scale-105"
              style={{ width: '36px', height: '36px' }}
            >
              <Image
                src={avatarUrl || defaultAvatar}
                alt="User Avatar"
                fill
                sizes="36px"
                className="object-cover rounded-full"
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56 sm:w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium text-foreground text-sm sm:text-base truncate">
                  {fullName || 'User'}
                </span>
                {role && (
                  <span className="text-xs text-muted-foreground capitalize">
                    {role}
                  </span>
                )}
                {email && (
                  <span className="text-xs text-muted-foreground truncate">
                    {email}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => router.push('/profile')}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
