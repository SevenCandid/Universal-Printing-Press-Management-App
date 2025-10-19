'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bars3Icon,
  BellIcon,
  CameraIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { Logo } from '@/components/ui/Logo'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import toast from 'react-hot-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const roleLinks: Record<string, { name: string; href: string }[]> = {
  ceo: [
    { name: 'Dashboard', href: '/ceo/dashboard' },
    { name: 'Orders', href: '/ceo/orders' },
    { name: 'Tasks', href: '/ceo/tasks' },
    { name: 'Staff', href: '/ceo/staff' },
    { name: 'Reports', href: '/ceo/reports' },
  ],
  manager: [
    { name: 'Dashboard', href: '/manager/dashboard' },
    { name: 'Tasks', href: '/manager/tasks' },
    { name: 'Reports', href: '/manager/reports' },
  ],
  staff: [
    { name: 'Dashboard', href: '/staff/dashboard' },
    { name: 'My Tasks', href: '/staff/tasks' },
    { name: 'Orders', href: '/staff/orders' },
    { name: 'Reports', href: '/staff/reports' },
  ],
  board: [
    { name: 'Dashboard', href: '/board/dashboard' },
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
      setAvatarUrl(profile?.avatar_url || '/assets/avatar-default.png')
    }

    loadUser()
  }, [mounted])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    toast.success('Logged out successfully')
    router.replace('/login')
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) return

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      toast.error('Failed to upload image')
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const publicUrl = data.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) {
      toast.error('Failed to update profile')
      return
    }

    setAvatarUrl(publicUrl)
    toast.success('Profile picture updated!')
  }

  const handleRemoveAvatar = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id)

    if (error) {
      toast.error('Failed to remove image')
      return
    }

    setAvatarUrl('/assets/avatar-default.png')
    toast.success('Profile picture removed')
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
        {/* Hamburger menu */}
        <button
          onClick={onMenuClick}
          className="p-2 rounded-md hover:bg-accent focus:ring-2 focus:ring-ring lg:hidden"
          aria-label="Open sidebar"
        >
          <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Logo (smaller + responsive) */}
        <div className="flex-shrink-0 flex items-center">
          <Logo size="xs" showText={false} className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>

        {/* Quick Navigate */}
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
        {/* Notifications (always visible now) */}
        <button
          className="p-2 rounded-md hover:bg-accent relative focus:outline-none"
          aria-label="Notifications"
        >
          <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-destructive rounded-full border border-background" />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Profile Dropdown with animation */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative flex items-center justify-center rounded-full border border-border overflow-hidden 
              focus:outline-none focus:ring-2 focus:ring-ring w-8 h-8 sm:w-9 sm:h-9 transition-transform hover:scale-105"
            >
              <Image
                src={avatarUrl || '/assets/avatar-default.png'}
                alt="User Avatar"
                fill
                className="object-cover rounded-full"
              />
            </button>
          </DropdownMenuTrigger>

          {/* Animated Dropdown */}
          <DropdownMenuContent
            align="end"
            className="w-56 sm:w-60 max-h-[70vh] overflow-y-auto 
            scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent 
            animate-slideDown origin-top-right"
          >
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
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <CameraIcon className="w-4 h-4" />
              Upload New Photo
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleRemoveAvatar}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <TrashIcon className="w-4 h-4" />
              Remove Photo
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

        {/* Hidden file input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>
    </header>
  )
}
