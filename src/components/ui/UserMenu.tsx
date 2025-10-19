'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDownIcon, Cog6ToothIcon, UserCircleIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const router = useRouter()
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClientComponentClient()

  // ✅ Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ✅ Load role from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem('role')
    setRole(storedRole)
  }, [])

  // ✅ Logout handler
  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    router.push('/login')
  }

  const handleNavigate = (path: string) => {
    setIsOpen(false)
    router.push(path)
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar / Trigger */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-2 rounded-md border border-border px-2 py-1 hover:bg-accent"
      >
        <UserCircleIcon className="h-5 w-5 text-muted-foreground" />
        <span className="hidden sm:inline text-sm font-medium text-foreground">
          {role ? role.toUpperCase() : 'USER'}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-md z-50 animate-in fade-in slide-in-from-top-1">
          <div className="py-1">
            <button
              onClick={() => handleNavigate('/profile')}
              className="flex w-full items-center space-x-2 px-4 py-2 text-sm hover:bg-accent"
            >
              <UserCircleIcon className="h-4 w-4" />
              <span>Profile</span>
            </button>
            <button
              onClick={() => handleNavigate('/settings')}
              className="flex w-full items-center space-x-2 px-4 py-2 text-sm hover:bg-accent"
            >
              <Cog6ToothIcon className="h-4 w-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center space-x-2 px-4 py-2 text-sm text-destructive hover:bg-accent"
            >
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
