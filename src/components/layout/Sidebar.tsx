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
  Archive, // Equipment icon
  Layers,  // Materials icon
  UserCircle, // Customers icon
  FolderOpen, // Files icon
  BookOpen, // Handbook icon
  FileText, // Company Handbook icon
  Clock, // Attendance icon
  Receipt, // Expenses icon
  MessagesSquare, // Forum icon
  FileText as ReportIcon, // Sales Reports icon
  Mail, // Client Connect icon
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
  const defaultNav = (r: string) => {
    const baseNav = [
      { name: 'Dashboard', href: `/${r}/dashboard`, icon: LayoutDashboard },
      { name: 'Orders', href: `/${r}/orders`, icon: ClipboardList },
      { name: 'Enquiries', href: `/${r}/enquiries`, icon: MessageSquare },
      { name: 'Tasks', href: `/${r}/tasks`, icon: Briefcase },
      { name: 'Reports', href: `/${r}/reports`, icon: BarChart3 },
      { name: 'Expenses', href: `/${r}/expenses`, icon: Receipt },
      { name: 'Customers', href: `/${r}/customers`, icon: UserCircle },
      { name: 'Client Connect', href: `/${r}/clientconnect`, icon: Mail },
      { name: 'Files', href: `/${r}/files`, icon: FolderOpen },
      { name: 'Attendance', href: `/${r}/attendance`, icon: Clock },
      { name: 'Users', href: `/${r}/staff`, icon: Users },
      { name: 'Forum', href: `/${r}/forum`, icon: MessagesSquare },
      { name: 'App Handbook', href: `/${r}/handbook`, icon: BookOpen },
      { name: 'UPP Handbook', href: `/${r}/company-handbook`, icon: FileText },
    ]

    // Add role-specific pages
    if (r === 'sales_representative') {
      // Insert Daily Reports after Tasks (position 4)
      baseNav.splice(4, 0, { name: 'Daily Reports', href: `/${r}/daily-reports`, icon: ReportIcon })
    }
    if (r === 'ceo' || r === 'manager' || r === 'executive_assistant' || r === 'intern') {
      // Insert Sales Reports after Tasks (position 4)
      baseNav.splice(4, 0, { name: 'Sales Reports', href: `/${r}/sales-reports`, icon: ReportIcon })
    }

    return baseNav
  }

  // ✅ Merge roleNav overrides (preserve structure)
  const navigation =
    role && roleNav[role]
      ? (() => {
          const defaultItems = defaultNav(role)
          const roleItems = roleNav[role]
          
          // Start with roleNav items in their order (authoritative for visible items)
          const merged: Array<{ name: string; href: string; icon: any }> = []
          
          // Add items from roleNav first
          roleItems.forEach((roleItem) => {
            merged.push(roleItem)
          })
          
          // Then add any items from defaultNav that aren't in roleNav (for completeness)
          defaultItems.forEach((defaultItem) => {
            if (!roleItems.find((i) => i.name === defaultItem.name)) {
              merged.push(defaultItem)
            }
          })
          
          return merged
        })()
      : role
      ? defaultNav(role)
      : []

  // Inventory links (always shown as a separate group)
  // Inventory links (always shown as a separate group)
const inventoryLinks = role
? [
    {
      name: 'Equipment',
      href: `/${role}/inventory/equipment`,
      icon: Archive,
    },
    {
      name: 'Materials',
      href: `/${role}/inventory/materials`,
      icon: Layers,
    },
    {
      name: 'Vendors',
      href: `/${role}/inventory/vendors`,
      icon: Users,
    },
    {
      name: 'Rental Services',
      href: `/${role}/rentals`,
      icon: Briefcase, // you can change this icon if you prefer (e.g., Package, Warehouse)
    },
  ]
: []



  return (
    <>
      {/* Mobile overlay with animation */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-500 ease-out',
          isOpen 
            ? 'opacity-100 pointer-events-auto' 
            : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar with smooth animation */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-card border-r border-border transition-all duration-500 ease-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen 
            ? 'translate-x-0 shadow-2xl' 
            : '-translate-x-full shadow-none'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header with padded logo */}
          <div className="flex h-18 items-center justify-between px-4 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center space-x-3 pl-2">
              <Logo size="md" showText={true} />
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md hover:bg-accent transition-colors"
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
                {navigation.map((item, index) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                        'hover:scale-105 hover:shadow-md active:scale-95',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      style={{
                        animation: isOpen ? `slideInLeft 0.3s ease-out ${index * 0.05}s both` : 'none'
                      }}
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

            {/* Inventory group (separate) */}
            {inventoryLinks.length > 0 && (
              <div>
                <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Inventory
                </h3>
                {inventoryLinks.map((item, index) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                        'hover:scale-105 hover:shadow-md active:scale-95',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-lg'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      style={{
                        animation: isOpen ? `slideInLeft 0.3s ease-out ${(navigation.length + index) * 0.05}s both` : 'none'
                      }}
                      onClick={onClose}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            )}
          </nav>

          {/* Footer with logo + system info */}
          <div className="px-6 py-4 border-t border-border flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center justify-center">
              
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
