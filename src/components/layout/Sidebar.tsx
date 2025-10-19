'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { XMarkIcon, BoltIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'
import { roleNav } from '@/constants/roleLinks'
import {
  LayoutDashboard,
  ClipboardList,
  Briefcase,
  Users,
  BarChart3,
  MessageSquare,
} from 'lucide-react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // ✅ Load role from localStorage
  useEffect(() => {
    if (!mounted) return
    const storedRole = localStorage.getItem('role')
    setRole(storedRole || 'ceo')
  }, [mounted])

  // ✅ Default nav (same for all roles)
  const defaultNav = (r: string) => [
    { name: 'Dashboard', href: `/${r}/dashboard`, icon: LayoutDashboard },
    { name: 'Orders', href: `/${r}/orders`, icon: ClipboardList },
    { name: 'Enquiries', href: `/${r}/enquiries`, icon: MessageSquare },
    { name: 'Tasks', href: `/${r}/tasks`, icon: Briefcase },
    { name: 'Users', href: `/${r}/staff`, icon: Users },
    { name: 'Reports', href: `/${r}/reports`, icon: BarChart3 },
  ]

  // ✅ Merge roleNav overrides (preserve structure)
  const navigation =
    role && roleNav[role]
      ? defaultNav(role).map((defaultItem) => {
          const customItem = roleNav[role].find((i) => i.name === defaultItem.name)
          return customItem || defaultItem
        })
      : role
      ? defaultNav(role)
      : []

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header with padded logo */}
          <div className="flex h-16 items-center justify-between px-6 py-2 border-b border-border">
            <div className="flex items-center space-x-2">
              <Logo size="md" showText={true} />
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md hover:bg-accent"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Role Label */}
          <div className="px-6 py-3 border-b border-border">
            {role ? (
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {role.toUpperCase()}
                </span>{' '}
                Role
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Loading role...</div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
            {navigation.length > 0 ? (
              <div>
                <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {role?.toUpperCase()} Menu
                </h3>
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      onClick={onClose}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm px-3">Loading menu...</p>
            )}
          </nav>

          {/* Footer with logo + system info */}
          <div className="px-6 py-4 border-t border-border flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center justify-center">
              <Logo size="sm" showText={false} />
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <BoltIcon className="h-4 w-4" />
              <span>UPP Smart Dashboard System</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
