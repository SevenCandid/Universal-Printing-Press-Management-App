'use client'

import { useState, useEffect } from 'react'
import { 
  BookOpenIcon, 
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  FolderIcon,
  CheckCircleIcon,
  UsersIcon,
  CubeIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  BellIcon,
  ClockIcon,
  PaintBrushIcon,
  WrenchScrewdriverIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline'

interface Section {
  id: string
  title: string
  icon: any
  subsections?: { id: string; title: string }[]
}

const sections: Section[] = [
  { id: 'intro', title: 'Introduction', icon: BookOpenIcon },
  { id: 'getting-started', title: 'Getting Started', icon: HomeIcon },
  { id: 'roles', title: 'User Roles & Permissions', icon: UserGroupIcon },
  { id: 'dashboard', title: 'Dashboard', icon: ChartBarIcon },
  { 
    id: 'orders', 
    title: 'Orders Management', 
    icon: ClipboardDocumentListIcon,
    subsections: [
      { id: 'orders-view', title: 'Viewing Orders' },
      { id: 'orders-create', title: 'Creating Orders' },
      { id: 'orders-edit', title: 'Editing Orders' },
      { id: 'orders-delete', title: 'Deleting Orders' },
      { id: 'orders-files', title: 'Order Files' },
      { id: 'orders-export', title: 'Exporting Orders' },
    ]
  },
  { 
    id: 'customers', 
    title: 'Customer Management', 
    icon: UsersIcon,
    subsections: [
      { id: 'customers-top', title: 'Top Customers' },
      { id: 'customers-other', title: 'Other Customers' },
    ]
  },
  { id: 'files', title: 'File Storage System', icon: FolderIcon },
  { id: 'tasks', title: 'Tasks & Assignments', icon: CheckCircleIcon },
  { id: 'staff', title: 'Staff Management', icon: UserGroupIcon },
  { id: 'inventory', title: 'Inventory Management', icon: CubeIcon },
  { id: 'enquiries', title: 'Enquiries', icon: ChatBubbleLeftRightIcon },
  { 
    id: 'expenses', 
    title: 'Expenses Management', 
    icon: BookmarkIcon,
    subsections: [
      { id: 'expenses-add', title: 'Adding Expenses' },
      { id: 'expenses-alerts', title: 'Large Expense Alerts' },
      { id: 'expenses-export', title: 'Exporting Expenses' },
    ]
  },
  { id: 'reports', title: 'Reports & Analytics', icon: ChartBarIcon },
  { 
    id: 'notifications', 
    title: 'Notifications', 
    icon: BellIcon,
    subsections: [
      { id: 'notifications-view', title: 'Viewing Notifications' },
      { id: 'notifications-modal', title: 'Notification Details' },
      { id: 'notifications-manage', title: 'Managing Notifications' },
    ]
  },
  { 
    id: 'offline', 
    title: 'Offline Mode', 
    icon: WrenchScrewdriverIcon,
    subsections: [
      { id: 'offline-how', title: 'How Offline Mode Works' },
      { id: 'offline-operations', title: 'Offline Operations' },
      { id: 'offline-sync', title: 'Syncing Your Data' },
    ]
  },
  { id: 'attendance', title: 'Attendance Tracking', icon: ClockIcon },
  { id: 'theme', title: 'Theme & Preferences', icon: PaintBrushIcon },
  { id: 'troubleshooting', title: 'Troubleshooting', icon: WrenchScrewdriverIcon },
]

export default function HandbookBase({ role }: { role: string }) {
  const [search, setSearch] = useState('')
  const [expandedSections, setExpandedSections] = useState<string[]>([])
  const [activeSection, setActiveSection] = useState('intro')
  const [showMobileTOC, setShowMobileTOC] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [showPhoneMenu, setShowPhoneMenu] = useState(false)

  // Handle scroll to show/hide header (desktop only)
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Check if we're on mobile (< 1024px is lg breakpoint)
      const isMobile = window.innerWidth < 1024
      
      if (isMobile) {
        // Always show header on mobile so menu button is accessible
        setHeaderVisible(true)
        return
      }
      
      if (currentScrollY < 10) {
        // Always show header at top
        setHeaderVisible(true)
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show header
        setHeaderVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide header (desktop only)
        setHeaderVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [lastScrollY])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const scrollToSection = (sectionId: string) => {
    console.log('Scrolling to section:', sectionId) // Debug log
    setActiveSection(sectionId)
    setShowMobileTOC(false) // Close mobile TOC after selection
    
    // Small delay to ensure DOM is ready and mobile menu closes
    setTimeout(() => {
      const element = document.getElementById(sectionId)
      if (element) {
        console.log('Element found:', element) // Debug log
        // Use scrollIntoView with the scroll-margin-top from CSS (scroll-mt-20 = 5rem = 80px)
        element.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        })
      } else {
        console.warn(`Section with ID "${sectionId}" not found`)
      }
    }, 200) // Slightly longer delay for mobile menu animation
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div 
        className={`border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-20 shadow-sm transition-transform duration-300 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="container-responsive py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <BookOpenIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">
                  UPP App Handbook
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block truncate">
                  {role.toUpperCase()} Guide
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => setShowMobileTOC(!showMobileTOC)}
                className="lg:hidden px-2 sm:px-3 py-1.5 sm:py-2 bg-primary text-primary-foreground text-[10px] sm:text-xs font-medium rounded-md hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                {showMobileTOC ? 'Hide' : 'Menu'}
              </button>
              <span className="hidden sm:block px-2 py-1 bg-primary/10 text-primary text-[10px] font-medium rounded-full">
                v1.0
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container-responsive py-4 md:py-6">
        {/* Mobile TOC Overlay */}
        {showMobileTOC && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300"
            onClick={() => setShowMobileTOC(false)}
          />
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table of Contents - Sidebar */}
          <div className={`lg:col-span-1 ${
            showMobileTOC 
              ? 'fixed inset-y-0 left-0 w-80 max-w-[85vw] z-40 transition-transform duration-300 ease-out translate-x-0' 
              : 'hidden'
          } lg:block lg:relative lg:w-auto lg:translate-x-0`}>
            <div className={`h-full lg:sticky lg:top-16 bg-card border border-border ${
              showMobileTOC ? 'lg:rounded-lg' : 'rounded-lg'
            } p-3 md:p-4 max-h-screen lg:max-h-[calc(100vh-80px)] overflow-y-auto shadow-2xl lg:shadow-none`}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border sticky top-0 bg-card z-10">
                <h2 className="text-sm font-semibold text-foreground flex items-center">
                  <BookmarkIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>Table of Contents</span>
                </h2>
                <button
                  onClick={() => setShowMobileTOC(false)}
                  className="lg:hidden p-1 hover:bg-accent rounded transition-colors"
                  aria-label="Close menu"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
              <nav className="space-y-1 pt-2">
                {sections.map((section) => (
                  <div key={section.id}>
                    <button
                      onClick={() => {
                        // Always scroll to the section
                        scrollToSection(section.id)
                        // Toggle subsections if they exist
                        if (section.subsections) {
                          toggleSection(section.id)
                        }
                      }}
                      className={`w-full flex items-center justify-between px-2 md:px-3 py-2 text-xs md:text-sm rounded-md transition-colors ${
                        activeSection === section.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <section.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{section.title}</span>
                      </div>
                      {section.subsections && (
                        <div className="flex-shrink-0 ml-2">
                          {expandedSections.includes(section.id) ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </div>
                      )}
                    </button>
                    
                    {section.subsections && expandedSections.includes(section.id) && (
                      <div className="ml-4 md:ml-6 mt-1 space-y-1">
                        {section.subsections.map((subsection) => (
                          <button
                            key={subsection.id}
                            onClick={() => scrollToSection(subsection.id)}
                            className="w-full text-left px-2 md:px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors truncate"
                          >
                            {subsection.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border rounded-lg p-4 md:p-6 lg:p-8 prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20">
              
              {/* Introduction */}
              <section id="intro" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">📖 Introduction</h2>
                <h3 className="text-lg md:text-xl font-semibold mt-6 mb-3">What is Universal Printing Press App?</h3>
                <p className="text-muted-foreground">
                  The <strong>Universal Printing Press (UPP) Smart Dashboard System</strong> is a comprehensive business management platform designed specifically for printing businesses. It streamlines operations, tracks orders, manages staff, monitors inventory, and provides real-time analytics.
                </p>
                
                <h3 className="text-xl font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 list-none pl-0">
                  <li>📊 Real-time Dashboard</li>
                  <li>📋 Order Management</li>
                  <li>👥 Customer Database</li>
                  <li>📁 File Storage</li>
                  <li>✅ Task Management</li>
                  <li>🏭 Inventory Control</li>
                  <li>📈 Analytics & Reports</li>
                  <li>🔔 Real-time Notifications</li>
                  <li>🎨 Dark/Light Theme</li>
                  <li>📱 Responsive Design</li>
                </ul>
              </section>

              {/* Getting Started */}
              <section id="getting-started" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">🚀 Getting Started</h2>
                
                {/* For New Users */}
                <h3 className="text-lg md:text-xl font-semibold mt-6 mb-3">👋 New to UPP? Create Your Account</h3>
                <p className="text-muted-foreground mb-4">
                  Follow these simple steps to create your account and get started:
                </p>
                
                <div className="space-y-4 mb-6">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <h4 className="text-base font-semibold mb-3">Step 1: Access the Sign Up Page</h4>
                    <ol className="text-sm text-muted-foreground space-y-2">
                      <li>1. Navigate to the UPP application URL</li>
                      <li>2. Click on <strong>"Sign Up"</strong> or <strong>"Create Account"</strong> button</li>
                      <li>3. You'll be directed to the registration form</li>
                    </ol>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <h4 className="text-base font-semibold mb-3">Step 2: Fill in Your Information</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li>• <strong>Full Name:</strong> Enter your complete name</li>
                      <li>• <strong>Email Address:</strong> Use a valid email (you'll receive confirmations here)</li>
                      <li>• <strong>Password:</strong> Create a strong password (at least 6 characters)</li>
                      <li>• <strong>Confirm Password:</strong> Re-type your password to confirm</li>
                      <li>• <strong>Role:</strong> Select your role (CEO, Manager, Staff, etc.)</li>
                    </ul>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <h4 className="text-base font-semibold mb-3">Step 3: Complete Registration</h4>
                    <ol className="text-sm text-muted-foreground space-y-2">
                      <li>1. Review your information for accuracy</li>
                      <li>2. Click the <strong>"Sign Up"</strong> or <strong>"Create Account"</strong> button</li>
                      <li>3. Wait for account creation confirmation</li>
                      <li>4. You'll be automatically logged in to your dashboard</li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">📧 Email Verification</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      After signing up, you may receive a verification email. Click the link in the email to verify your account and ensure full access to all features.
                    </p>
                  </div>
                </div>

                {/* For Existing Users */}
                <h3 className="text-lg md:text-xl font-semibold mt-8 mb-3">🔐 Already Have an Account? Log In</h3>
                <div className="space-y-4 mb-6">
                  <div className="bg-muted/30 p-4 rounded-lg border border-border">
                    <h4 className="text-base font-semibold mb-3">Login Steps</h4>
                    <ol className="text-sm text-muted-foreground space-y-2">
                      <li>1. Go to the UPP application URL</li>
                      <li>2. Click <strong>"Log In"</strong> or <strong>"Sign In"</strong></li>
                      <li>3. Enter your registered <strong>email address</strong></li>
                      <li>4. Enter your <strong>password</strong></li>
                      <li>5. Click <strong>"Log In"</strong> button</li>
                      <li>6. You'll be directed to your role-specific dashboard</li>
                    </ol>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="text-sm font-semibold mb-2 text-yellow-900 dark:text-yellow-100">🔑 Forgot Your Password?</h4>
                    <ol className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>1. Click <strong>"Forgot Password"</strong> on the login page</li>
                      <li>2. Enter your registered email address</li>
                      <li>3. Check your email for a password reset link</li>
                      <li>4. Click the link and create a new password</li>
                      <li>5. Log in with your new password</li>
                    </ol>
                  </div>
                </div>

                {/* First Time Setup */}
                <h3 className="text-lg md:text-xl font-semibold mt-8 mb-3">⚙️ First Time Setup</h3>
                <p className="text-muted-foreground mb-4">
                  After your first login, here's what you should do:
                </p>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">1</div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Complete Your Profile</h4>
                      <p className="text-sm text-muted-foreground">Go to Profile → Update your name, phone number, and upload a profile picture</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">2</div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Enable Browser Notifications</h4>
                      <p className="text-sm text-muted-foreground">Allow notifications when prompted so you don't miss important updates</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">3</div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Explore Your Dashboard</h4>
                      <p className="text-sm text-muted-foreground">Familiarize yourself with the layout, charts, and quick stats</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">4</div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Set Your Theme Preference</h4>
                      <p className="text-sm text-muted-foreground">Click the sun/moon icon (top-right) to toggle between light and dark mode</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-semibold">5</div>
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Read This Handbook</h4>
                      <p className="text-sm text-muted-foreground">Review the sections relevant to your role to understand all features</p>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-6">
                  <p className="text-sm font-medium mb-2">💡 Pro Tip for Navigation</p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Desktop:</strong> Use the sidebar on the left for main navigation. <br/>
                    <strong>Mobile:</strong> Tap the hamburger menu (☰) in the top-left corner to access the sidebar.
                  </p>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mt-4">
                  <h4 className="text-sm font-semibold mb-2 text-green-900 dark:text-green-100">✨ Welcome Features</h4>
                  <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                    <li>• <strong>Offline Mode:</strong> Work without internet, data syncs automatically</li>
                    <li>• <strong>Real-time Updates:</strong> See changes instantly across all your devices</li>
                    <li>• <strong>Persistent Notifications:</strong> Never miss important alerts</li>
                    <li>• <strong>Mobile Optimized:</strong> Works perfectly on phones and tablets</li>
                    <li>• <strong>Dark Mode:</strong> Easy on the eyes during night work</li>
                  </ul>
                </div>
              </section>

              {/* User Roles */}
              <section id="roles" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">👤 User Roles & Permissions</h2>
                
                <div className="space-y-6">
                  <div className="border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-2">CEO (Chief Executive Officer)</h3>
                    <p className="text-sm text-muted-foreground mb-3">Access Level: Full Control</p>
                    <ul className="space-y-1 text-sm">
                      <li>✅ View all data and reports</li>
                      <li>✅ Create, edit, and delete orders</li>
                      <li>✅ Manage all customers</li>
                      <li>✅ Full file management</li>
                      <li>✅ Create and manage expenses</li>
                      <li>✅ Assign and manage tasks</li>
                      <li>✅ Full inventory control</li>
                      <li>✅ Receive expense alerts (email + push)</li>
                    </ul>
                  </div>

                  <div className="border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-2">Manager</h3>
                    <p className="text-sm text-muted-foreground mb-3">Access Level: High Control</p>
                    <ul className="space-y-1 text-sm">
                      <li>✅ View all data and reports</li>
                      <li>✅ Create, edit, and delete orders</li>
                      <li>✅ Manage all customers</li>
                      <li>✅ Full file management</li>
                      <li>✅ Create and manage expenses</li>
                      <li>✅ Assign tasks</li>
                    </ul>
                  </div>

                  <div className="border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-2">Executive Assistant</h3>
                    <p className="text-sm text-muted-foreground mb-3">Access Level: High Control (Manager-equivalent)</p>
                    <ul className="space-y-1 text-sm">
                      <li>✅ View all data and reports</li>
                      <li>✅ Create, edit, and delete orders</li>
                      <li>✅ Manage all customers</li>
                      <li>✅ Full file management</li>
                      <li>✅ Create and manage expenses</li>
                      <li>✅ Assign tasks and manage staff</li>
                      <li>✅ Receive expense alerts (email + push)</li>
                    </ul>
                  </div>

                  <div className="border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-2">Board Member</h3>
                    <p className="text-sm text-muted-foreground mb-3">Access Level: View + Limited Edit</p>
                    <ul className="space-y-1 text-sm">
                      <li>✅ View orders (cannot edit/delete)</li>
                      <li>✅ View top customers only</li>
                      <li>✅ Download files</li>
                      <li>✅ View reports</li>
                      <li>❌ Cannot edit/delete orders</li>
                    </ul>
                  </div>

                  <div className="border border-border rounded-lg p-6">
                    <h3 className="text-xl font-semibold mb-2">Staff</h3>
                    <p className="text-sm text-muted-foreground mb-3">Access Level: Basic Operations</p>
                    <ul className="space-y-1 text-sm">
                      <li>✅ View and create orders</li>
                      <li>✅ View top customers</li>
                      <li>✅ Upload files</li>
                      <li>✅ View assigned tasks</li>
                      <li>❌ Cannot delete orders</li>
                      <li>❌ Cannot manage customers</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Dashboard */}
              <section id="dashboard" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">📊 Dashboard</h2>
                <p className="text-muted-foreground mb-4">
                  The Dashboard is your command center, showing key metrics and recent activity.
                </p>
                
                <h3 className="text-xl font-semibold mt-6 mb-3">Key Metrics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-sm font-medium">Total Orders</p>
                    <p className="text-xs text-muted-foreground">Count of all orders</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-sm font-medium">Total Revenue</p>
                    <p className="text-xs text-muted-foreground">Sum of all amounts (₵)</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-sm font-medium">Pending Payments</p>
                    <p className="text-xs text-muted-foreground">Orders awaiting payment</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-sm font-medium">Active Tasks</p>
                    <p className="text-xs text-muted-foreground">Ongoing assignments</p>
                  </div>
                </div>
              </section>

              {/* Orders Management */}
              <section id="orders" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">📋 Orders Management</h2>
                <p className="text-muted-foreground mb-4">
                  Comprehensive order management system for tracking printing jobs from creation to completion.
                </p>
              </section>

              {/* Orders Subsection: Viewing Orders */}
              <section id="orders-view" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">👁️ Viewing Orders</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Navigate to <strong>Orders</strong> in the sidebar to view all orders in a searchable, filterable table.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>Search:</strong> Type customer name, phone, or order number</li>
                  <li><strong>Filter by Status:</strong> Pending, In Progress, Completed, Cancelled</li>
                  <li><strong>Filter by Payment:</strong> Pending, Partial, Full Payment</li>
                  <li><strong>Date Range:</strong> Select custom date range</li>
                  <li><strong>Sort:</strong> Click column headers to sort</li>
                  <li><strong>Pagination:</strong> Navigate through pages (20 orders per page)</li>
                </ul>
              </section>

              {/* Orders Subsection: Creating Orders */}
              <section id="orders-create" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">➕ Creating Orders</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Click the <strong>"+ New Order"</strong> button to create a new printing order.
                </p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. <strong>Customer Name</strong> (required) - Enter customer's full name</li>
                  <li>2. <strong>Customer Phone</strong> (required) - Contact number</li>
                  <li>3. <strong>Customer Email</strong> (optional) - Email address</li>
                  <li>4. <strong>Item Description</strong> - Describe the printing job</li>
                  <li>5. <strong>Quantity</strong> - Number of items</li>
                  <li>6. <strong>Total Amount</strong> - Price in Cedis (₵)</li>
                  <li>7. <strong>Payment Method</strong> - Cash, Mobile Money, Bank Transfer, or Cheque</li>
                  <li>8. Click <strong>"Create Order"</strong></li>
                </ol>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
                  <p className="text-sm"><strong>💡 Tip:</strong> Order numbers are auto-generated (e.g., ORD-123456)</p>
                </div>
              </section>

              {/* Orders Subsection: Editing Orders */}
              <section id="orders-edit" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">✏️ Editing Orders</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>Who Can Edit:</strong> CEO and Manager only
                </p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. Find the order in the table</li>
                  <li>2. Click the <strong>✏️ Edit icon</strong> (pencil)</li>
                  <li>3. Modal opens with prefilled data</li>
                  <li>4. Update any fields (customer info, amounts, status, etc.)</li>
                  <li>5. Click <strong>"Save Changes"</strong></li>
                </ol>
                <p className="text-sm text-muted-foreground mt-4">
                  Changes are saved immediately and notifications are sent to relevant users.
                </p>
              </section>

              {/* Orders Subsection: Deleting Orders */}
              <section id="orders-delete" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">🗑️ Deleting Orders</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>Who Can Delete:</strong> CEO and Manager only
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-destructive"><strong>⚠️ Warning:</strong> Deletion is permanent and cannot be undone!</p>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. Find the order in the table</li>
                  <li>2. Click the <strong>🗑️ Delete icon</strong> (trash)</li>
                  <li>3. Confirmation dialog appears</li>
                  <li>4. Review the order number carefully</li>
                  <li>5. Click <strong>"Delete"</strong> to confirm</li>
                </ol>
              </section>

              {/* Orders Subsection: Order Files */}
              <section id="orders-files" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">📎 Order Files</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Each order can have attached files (designs, proofs, invoices, etc.)
                </p>
                
                <h4 className="text-base font-semibold mt-6 mb-3">Uploading Files:</h4>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. Click the <strong>📎 Files icon</strong> or expand arrow</li>
                  <li>2. File upload section appears</li>
                  <li>3. Click to browse or drag-and-drop files</li>
                  <li>4. Multiple files supported</li>
                  <li>5. Upload progress shown</li>
                </ol>

                <h4 className="text-base font-semibold mt-6 mb-3">Managing Files:</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>👁️ View/Download:</strong> Click eye icon to open or download file</li>
                  <li><strong>🗑️ Delete:</strong> Click trash icon (CEO/Manager only)</li>
                  <li><strong>File Info:</strong> See filename, size, and upload date</li>
                </ul>
              </section>

              {/* Orders Subsection: Exporting Orders */}
              <section id="orders-export" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">📥 Exporting Orders</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Export orders to CSV for analysis in Excel or Google Sheets.
                </p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. Set your filters (status, date range, payment status)</li>
                  <li>2. Click <strong>"Export CSV"</strong> button</li>
                  <li>3. CSV file downloads with filtered orders</li>
                  <li>4. Open in Excel/Google Sheets</li>
                </ol>
                <p className="text-sm text-muted-foreground mt-4">
                  Exported data includes: Order number, customer details, amounts, status, dates, and more.
                </p>
              </section>

              {/* Customer Management */}
              <section id="customers" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">👥 Customer Management</h2>
                <p className="text-muted-foreground mb-4">
                  Manage customer relationships with two sections: Top Customers (auto-generated) and Other Customers (manually added).
                </p>
              </section>

              {/* Customers Subsection: Top Customers */}
              <section id="customers-top" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">🏆 Top Customers</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Auto-generated leaderboard showing top 10 customers by total revenue.
                </p>
                
                <h4 className="text-base font-semibold mt-6 mb-3">What It Shows:</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>Rank:</strong> Position (🥇 Gold, 🥈 Silver, 🥉 Bronze for top 3)</li>
                  <li><strong>Customer Name:</strong> Full name from orders</li>
                  <li><strong>Phone:</strong> Clickable phone number (tel: link)</li>
                  <li><strong>Email:</strong> Clickable email (mailto: link)</li>
                  <li><strong>Total Orders:</strong> Number of orders placed</li>
                  <li><strong>Total Spent:</strong> Revenue from this customer (₵)</li>
                </ul>

                <h4 className="text-base font-semibold mt-6 mb-3">Features:</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>✅ Search/filter by name, phone, or email</li>
                  <li>✅ Auto-updates from orders table</li>
                  <li>✅ Export to CSV</li>
                  <li>✅ Available to all roles</li>
                </ul>
              </section>

              {/* Customers Subsection: Other Customers */}
              <section id="customers-other" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">📝 Other Customers</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>Who Can Access:</strong> CEO and Manager only
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Manually track customers not yet in orders system (prospects, leads, contacts).
                </p>

                <h4 className="text-base font-semibold mt-6 mb-3">Adding a Customer:</h4>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. Click <strong>"+ Add Customer"</strong> button</li>
                  <li>2. Fill in the form:
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• Full Name (required)</li>
                      <li>• Email (required)</li>
                      <li>• Phone (required)</li>
                      <li>• Company (optional)</li>
                      <li>• Notes (optional)</li>
                    </ul>
                  </li>
                  <li>3. Click <strong>"Add Customer"</strong></li>
                </ol>

                <h4 className="text-base font-semibold mt-6 mb-3">Editing & Deleting:</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>✏️ Edit:</strong> Click Edit button, update form, save changes</li>
                  <li><strong>🗑️ Delete:</strong> Click Delete button, confirm deletion</li>
                </ul>
              </section>

              {/* File Storage System */}
              <section id="files" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">📁 File Storage System</h2>
                <p className="text-muted-foreground mb-4">
                  Company-wide file storage for documents, invoices, templates, and more.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>Who Can Upload:</strong> CEO, Manager, Staff</li>
                  <li><strong>Who Can Delete:</strong> CEO, Manager only</li>
                  <li><strong>Features:</strong> Drag-and-drop upload, search, download, delete</li>
                  <li><strong>Storage Stats:</strong> View total files and storage size</li>
                </ul>
              </section>

              {/* Tasks & Assignments */}
              <section id="tasks" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">✅ Tasks & Assignments</h2>
                <p className="text-muted-foreground mb-4">
                  Create, assign, and track tasks across your team.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>Who Can Create:</strong> CEO, Manager</li>
                  <li><strong>Task Info:</strong> Title, description, assignee, priority, due date</li>
                  <li><strong>Status:</strong> Pending, In Progress, Completed</li>
                  <li><strong>Priority Levels:</strong> Low, Medium, High, Urgent</li>
                </ul>
              </section>

              {/* Staff Management */}
              <section id="staff" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">👥 Staff Management</h2>
                <p className="text-muted-foreground mb-4">
                  Manage team members, roles, and contact information.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>Who Can Manage:</strong> CEO, Manager</li>
                  <li><strong>Add Staff:</strong> Name, email, phone, role, department</li>
                  <li><strong>Edit/Deactivate:</strong> Update details or deactivate staff</li>
                  <li><strong>View Stats:</strong> Total staff, by department, recent hires</li>
                </ul>
              </section>

              {/* Inventory Management */}
              <section id="inventory" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">🏭 Inventory Management</h2>
                <p className="text-muted-foreground mb-4">
                  Track equipment, materials, and vendors in three modules.
                </p>
                <div className="space-y-4">
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="text-base font-semibold mb-2">📦 Equipment</h4>
                    <p className="text-sm text-muted-foreground">
                      Track machines, tools, condition, maintenance schedule
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="text-base font-semibold mb-2">🧱 Materials</h4>
                    <p className="text-sm text-muted-foreground">
                      Monitor paper, ink, stock levels, reorder alerts
                    </p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <h4 className="text-base font-semibold mb-2">🏢 Vendors</h4>
                    <p className="text-sm text-muted-foreground">
                      Manage supplier contacts, products, ratings
                    </p>
                  </div>
                </div>
              </section>

              {/* Enquiries */}
              <section id="enquiries" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">💬 Enquiries</h2>
                <p className="text-muted-foreground mb-4">
                  Manage customer inquiries, quote requests, and questions.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>Types:</strong> Quote, Information, Complaint, Other</li>
                  <li><strong>Status:</strong> New, In Progress, Resolved, Closed</li>
                  <li><strong>Actions:</strong> View, Respond, Close enquiry</li>
                  <li><strong>Priority:</strong> Low, Medium, High</li>
                </ul>
              </section>

              {/* Expenses Management */}
              <section id="expenses" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">🧾 Expenses Management</h2>
                <p className="text-muted-foreground mb-4">
                  Track all company expenses, monitor spending, and receive alerts for large expenditures.
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>Who Can Manage:</strong> CEO, Manager, Executive Assistant</li>
                  <li><strong>Who Can View:</strong> All roles</li>
                  <li><strong>Features:</strong> CRUD operations, categories, alerts, CSV/PDF export</li>
                  <li><strong>Categories:</strong> Production, Salaries, Utilities, Materials, Marketing, Transport, Maintenance, Other</li>
                  <li><strong>Real-time Updates:</strong> Expenses sync across all dashboards</li>
                </ul>
              </section>

              {/* Expenses Subsection: Adding Expenses */}
              <section id="expenses-add" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">➕ Adding an Expense</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>Who Can Add:</strong> CEO, Manager, Executive Assistant
                </p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. Navigate to <strong>Expenses</strong> in sidebar</li>
                  <li>2. Click <strong>"+ Add Expense"</strong> button</li>
                  <li>3. Fill in the form:
                    <ul className="ml-4 mt-1 space-y-1">
                      <li>• Title (required) - e.g., "Office Supplies"</li>
                      <li>• Amount (required) - e.g., "1500.00"</li>
                      <li>• Category (required) - Select from dropdown</li>
                      <li>• Description (optional) - Additional details</li>
                    </ul>
                  </li>
                  <li>4. Click <strong>"Add Expense"</strong></li>
                  <li>5. Success toast appears and expense added to list</li>
                </ol>
              </section>

              {/* Expenses Subsection: Large Expense Alerts */}
              <section id="expenses-alerts" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">⚠️ Large Expense Alerts</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  <strong>Threshold:</strong> ₵1000 (configurable by admin)
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  When an expense ≥ ₵1000 is created:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>📧 <strong>Email Alert</strong> sent to CEO, Manager, and Executive Assistant</li>
                  <li>📱 <strong>Mobile Push Notification</strong> sent to authorized devices</li>
                  <li>🔔 <strong>In-app Notification</strong> appears in notification dropdown</li>
                  <li>⚠️ <strong>Dashboard Alert</strong> shows on Reports page</li>
                </ul>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
                  <p className="text-sm"><strong>💡 Tip:</strong> Email includes expense details and a link to view in dashboard</p>
                </div>
              </section>

              {/* Expenses Subsection: Exporting Expenses */}
              <section id="expenses-export" className="mb-8 md:mb-12 scroll-mt-20 ml-0 md:ml-6">
                <h3 className="text-lg md:text-xl font-semibold mb-4">📥 Exporting Expenses</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold mb-2">CSV Export:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1">
                      <li>1. Apply desired filters (optional)</li>
                      <li>2. Click <strong>"Export CSV"</strong> button</li>
                      <li>3. File downloads as <code>expenses.csv</code></li>
                      <li>4. Open in Excel/Google Sheets</li>
                    </ol>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold mb-2">PDF Export:</h4>
                    <ol className="text-sm text-muted-foreground space-y-1">
                      <li>1. Apply desired filters (optional)</li>
                      <li>2. Click <strong>"Export PDF"</strong> button</li>
                      <li>3. PDF generates with company header and table</li>
                      <li>4. Download or print</li>
                    </ol>
                  </div>
                </div>
              </section>

              {/* Reports & Analytics */}
              <section id="reports" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">📈 Reports & Analytics</h2>
                <p className="text-muted-foreground mb-4">
                  Generate insights and export reports.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-sm font-medium">Sales Report</p>
                    <p className="text-xs text-muted-foreground">Revenue, top products, payment breakdown</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-sm font-medium">Customer Report</p>
                    <p className="text-xs text-muted-foreground">New customers, retention, distribution</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-sm font-medium">Order Report</p>
                    <p className="text-xs text-muted-foreground">Status, completion rate, trends</p>
                  </div>
                  <div className="border border-border rounded-lg p-4">
                    <p className="text-sm font-medium">Inventory Report</p>
                    <p className="text-xs text-muted-foreground">Stock levels, low stock, consumption</p>
                  </div>
                </div>
              </section>

              {/* Notifications */}
              <section id="notifications" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">🔔 Notifications</h2>
                <p className="text-muted-foreground mb-4">
                  Stay informed with real-time alerts and persistent notifications that never get lost.
                </p>
                
                {/* Viewing Notifications */}
                <h3 id="notifications-view" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">📬 Viewing Notifications</h3>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. <strong>Bell Icon:</strong> Located in the top-right corner of your screen</li>
                  <li>2. <strong>Unread Badge:</strong> Red badge shows number of unread notifications</li>
                  <li>3. <strong>Click Bell:</strong> Opens dropdown with all your notifications</li>
                  <li>4. <strong>Notification List:</strong> Shows most recent notifications first (last 50)</li>
                </ol>

                <h4 className="text-base font-semibold mt-6 mb-3">Notification Types:</h4>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li>🧾 <strong>Orders:</strong> New orders created, order updates, status changes</li>
                  <li>✅ <strong>Tasks:</strong> New task assignments, task completions</li>
                  <li>🔔 <strong>General:</strong> System updates, announcements, reminders</li>
                </ul>

                {/* Notification Details Modal */}
                <h3 id="notifications-modal" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">📋 Notification Details</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Click any notification to view its complete details in a modal window:
                </p>
                <div className="bg-muted/30 p-4 rounded-lg border border-border mb-4">
                  <h4 className="text-sm font-semibold mb-2">Modal Contains:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li>• <strong>Large Icon:</strong> Color-coded by type (Blue=Orders, Green=Tasks, Gray=General)</li>
                    <li>• <strong>Full Title:</strong> Complete notification heading</li>
                    <li>• <strong>Complete Message:</strong> Full notification content with details</li>
                    <li>• <strong>Type & Status:</strong> Notification category and read/unread status</li>
                    <li>• <strong>Full Timestamp:</strong> Exact date and time when received</li>
                    <li>• <strong>Action Buttons:</strong> Delete or Close options</li>
                  </ul>
                </div>

                {/* Managing Notifications */}
                <h3 id="notifications-manage" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">⚙️ Managing Notifications</h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold mb-2">Mark as Read</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Click any notification → <strong>Automatically marked as read</strong></li>
                      <li>• Badge count decreases immediately</li>
                      <li>• Read notifications lose the blue indicator dot</li>
                      <li>• Click "Mark all" button → Marks all as read at once</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-base font-semibold mb-2">Delete Notifications</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Individual:</strong> Click X button (or Delete in modal)</li>
                      <li>• Removes notification permanently</li>
                      <li>• Cannot be undone</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">✨ Persistent Notifications</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>New Feature:</strong> Notifications persist across page refreshes! They remain in your inbox until you mark them as read or delete them. Even if you close your browser and come back later, your notifications will still be there.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-base font-semibold mb-2">Real-Time Updates</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• New notifications appear instantly</li>
                      <li>• Browser notification pops up (if permitted)</li>
                      <li>• Syncs across all open tabs automatically</li>
                      <li>• Works on all devices where you're logged in</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Offline Mode */}
              <section id="offline" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">📱 Offline Mode</h2>
                <p className="text-muted-foreground mb-4">
                  Work seamlessly even without an internet connection. Your data is automatically saved and synced when you're back online.
                </p>
                
                {/* How Offline Mode Works */}
                <h3 id="offline-how" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">🔄 How Offline Mode Works</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  The app intelligently caches your data and queues your actions when offline:
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <h4 className="text-sm font-semibold mb-2 text-green-900 dark:text-green-100">✅ When Online</h4>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>• Data saved directly to database</li>
                      <li>• Automatic caching for offline use</li>
                      <li>• Real-time sync across devices</li>
                      <li>• Immediate confirmation</li>
                    </ul>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                    <h4 className="text-sm font-semibold mb-2 text-orange-900 dark:text-orange-100">📱 When Offline</h4>
                    <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                      <li>• Operations queued locally</li>
                      <li>• Cached data remains accessible</li>
                      <li>• "Saved offline" confirmation shown</li>
                      <li>• Auto-sync when back online</li>
                    </ul>
                  </div>
                </div>

                {/* Offline Operations */}
                <h3 id="offline-operations" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">⚡ Offline Operations</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold mb-2">Create New Records</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Orders:</strong> Create new orders while offline</li>
                      <li>• <strong>Expenses:</strong> Add expense records</li>
                      <li>• <strong>Tasks:</strong> Create new tasks (coming soon)</li>
                      <li>• All queued for sync when online</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-base font-semibold mb-2">Update Existing Records</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Edit expense details</li>
                      <li>• Modify cached information</li>
                      <li>• Changes queued for database update</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-base font-semibold mb-2">Delete Records</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Delete expenses while offline</li>
                      <li>• Deletion queued for sync</li>
                      <li>• Cannot be undone after sync</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-base font-semibold mb-2">View Cached Data</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Last 100 orders</li>
                      <li>• Last 100 expenses</li>
                      <li>• All staff profiles</li>
                      <li>• Recent invoices (last 50)</li>
                      <li>• Handbook and documentation</li>
                    </ul>
                  </div>
                </div>

                {/* Syncing Your Data */}
                <h3 id="offline-sync" className="text-xl font-semibold mt-6 mb-3 scroll-mt-20">🔄 Syncing Your Data</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-base font-semibold mb-2">Automatic Sync</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>When reconnected:</strong> Syncs queued operations immediately</li>
                      <li>• <strong>Every 5 minutes:</strong> Refreshes cached data when online</li>
                      <li>• <strong>Background sync:</strong> Happens automatically (supported browsers)</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-base font-semibold mb-2">Offline Indicator</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Location:</strong> Bottom-right corner of screen</li>
                      <li>• <strong>Online:</strong> Blue badge (only if pending operations)</li>
                      <li>• <strong>Offline:</strong> Red pulsing badge with "Offline Mode" text</li>
                      <li>• <strong>Pending count:</strong> Shows number of queued operations</li>
                      <li>• <strong>Click badge:</strong> Opens detailed sync status panel</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-base font-semibold mb-2">Manual Sync</h4>
                    <ol className="text-sm text-muted-foreground space-y-1">
                      <li>1. Click the offline indicator badge (bottom-right)</li>
                      <li>2. Review pending operations in the panel</li>
                      <li>3. Click "Sync Now" button</li>
                      <li>4. Wait for confirmation</li>
                    </ol>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">💡 Pro Tips</h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• <strong>Mobile workers:</strong> Create orders on-the-go, sync later</li>
                      <li>• <strong>Unstable connection:</strong> Work confidently, data won't be lost</li>
                      <li>• <strong>Sync status:</strong> Green "Read" in offline indicator = all synced</li>
                      <li>• <strong>Queue limit:</strong> Up to 50 operations can be queued</li>
                      <li>• <strong>Data freshness:</strong> Cached data shows when it was last updated</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <h4 className="text-sm font-semibold mb-2 text-yellow-900 dark:text-yellow-100">⚠️ Limitations</h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                      <li>• <strong>File uploads:</strong> Require internet connection</li>
                      <li>• <strong>Real-time updates:</strong> Won't see changes from other users while offline</li>
                      <li>• <strong>Fresh data:</strong> Only cached data available (not real-time)</li>
                      <li>• <strong>Conflict resolution:</strong> Last-write-wins (no automatic conflict handling)</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Attendance */}
              <section id="attendance" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">⏰ Attendance Tracking</h2>
                <p className="text-muted-foreground mb-4">
                  <strong>Who Can Access:</strong> CEO, Manager
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li><strong>Features:</strong> Clock-in/out times, work hours, absent/present status</li>
                  <li><strong>Manual Entry:</strong> Mark attendance for specific dates</li>
                  <li><strong>Reports:</strong> View attendance summaries and export</li>
                  <li><strong>Stats:</strong> Days present, days absent, total hours</li>
                </ul>
              </section>

              {/* Theme & Preferences */}
              <section id="theme" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">🎨 Theme & Preferences</h2>
                <p className="text-muted-foreground mb-4">
                  Customize your interface with dark/light mode toggle.
                </p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li>1. Look for moon/sun icon in top-right</li>
                  <li>2. Click to toggle between:
                    <ul className="ml-4 mt-1">
                      <li>• ☀️ Light mode (white background)</li>
                      <li>• 🌙 Dark mode (dark background)</li>
                    </ul>
                  </li>
                  <li>3. Preference saved to browser</li>
                  <li>4. Persists across sessions</li>
                </ol>
              </section>

              {/* Support */}
              <section id="troubleshooting" className="mb-8 md:mb-12 scroll-mt-20">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">🛠️ Troubleshooting</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Cannot See Orders</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Check your role permissions</li>
                      <li>• Clear filters and search</li>
                      <li>• Refresh the page (F5)</li>
                      <li>• Check internet connection</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">File Upload Failing</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Check file size (max 10MB)</li>
                      <li>• Verify file type</li>
                      <li>• Try fewer files at once</li>
                      <li>• Clear browser cache</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Notifications Not Showing</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Allow browser notifications</li>
                      <li>• Check browser settings</li>
                      <li>• Refresh the page</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="mt-12 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  <strong>Thank you for using the Universal Printing Press Smart Dashboard System!</strong>
                </p>
                <div className="mt-4 text-center space-y-1">
                  <p className="text-xs text-muted-foreground">
                    <strong>Developer:</strong> Frank Bediako
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Email:</strong>{' '}
                    <a href="mailto:frankbediako38@gmail.com" className="text-primary hover:underline">
                      frankbediako38@gmail.com
                    </a>
                  </p>
                  <div className="text-xs text-muted-foreground relative inline-block">
                    <strong>Phone:</strong>{' '}
                    <button
                      onClick={() => setShowPhoneMenu(!showPhoneMenu)}
                      className="text-primary hover:underline focus:outline-none"
                    >
                      +233 54 943 7374
                    </button>
                    
                    {/* Phone Menu Dropdown */}
                    {showPhoneMenu && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setShowPhoneMenu(false)}
                        />
                        <div className="absolute z-50 mt-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]">
                          <a
                            href="tel:+233549437374"
                            className="block px-4 py-3 text-sm hover:bg-accent transition-colors text-left border-b border-border"
                            onClick={() => setShowPhoneMenu(false)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📞</span>
                              <div>
                                <div className="font-medium text-foreground">Phone Call</div>
                                <div className="text-xs text-muted-foreground">Make a call</div>
                              </div>
                            </div>
                          </a>
                          <a
                            href="https://wa.me/233549437374"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-4 py-3 text-sm hover:bg-accent transition-colors text-left"
                            onClick={() => setShowPhoneMenu(false)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">💬</span>
                              <div>
                                <div className="font-medium text-foreground">WhatsApp</div>
                                <div className="text-xs text-muted-foreground">Send a message</div>
                              </div>
                            </div>
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Last updated: October 27, 2025 • Version 1.0
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

