'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Mail, MessageSquare, Clock, CheckCircle2, AlertCircle, Users, Edit2, X, History, Filter, MessageCircle, Sparkles, Plus, Trash2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAllClients } from '@/hooks/useAllClients'
import { Input } from '@/components/ui/input'
import type { ManualClient } from '@/lib/manualClients'
import { useGreetingsLog } from '@/hooks/useGreetingsLog'
import { ClientSelectionModal } from '@/components/ui/ClientSelectionModal'
import type { ClientInfo } from '@/lib/clientUtils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ActivityLogEntry = {
  id: string
  type: 'email' | 'sms'
  timestamp: string // ISO string for consistency
  status: 'success' | 'pending' | 'failed'
  message: string
  recipientCount?: number
  total?: number
  failed?: number
}

type SendProgress = {
  current: number
  total: number
  status: 'sending' | 'completed' | 'error'
}

/**
 * Formats a timestamp (ISO string) to a locale string
 * Only formats on client side to avoid hydration mismatches
 */
function formatTimestamp(timestamp: string): string {
  if (typeof window === 'undefined') {
    return '' // Return empty on server to avoid hydration mismatch
  }
  try {
    return new Date(timestamp).toLocaleString()
  } catch {
    return timestamp
  }
}

/**
 * Formats a timestamp (ISO string) to a locale date string
 * Only formats on client side to avoid hydration mismatches
 */
function formatTimestampDate(timestamp: string): string {
  if (typeof window === 'undefined') {
    return '' // Return empty on server to avoid hydration mismatch
  }
  try {
    return new Date(timestamp).toLocaleDateString()
  } catch {
    return timestamp
  }
}

// Company name - used directly in templates instead of {{companyName}} placeholder
const COMPANY_NAME = 'Universal Printing Press'

// Default email template (text version for editing)
const DEFAULT_EMAIL_TEMPLATE = `Dear {{clientName}},

We hope this message finds you well!

As we welcome {{month}} {{year}}, we wanted to take a moment to express our sincere gratitude for your continued partnership with ${COMPANY_NAME}.

Your trust in our services means the world to us, and we're committed to providing you with the highest quality printing solutions.

Whether you're working on a new project or need assistance with an ongoing one, our team is here to help you achieve your goals.

We look forward to serving you throughout {{month}} and beyond.

Warm regards,
The Team at ${COMPANY_NAME}

${COMPANY_NAME}
Your trusted printing partner

Website: https://universalprintingpress.com/
Phone: +233 59 999 7279`

// Default SMS template
const DEFAULT_SMS_TEMPLATE = `Dear {{clientName}}, we hope this message finds you well! As we welcome {{month}} {{year}}, we wanted to express our sincere gratitude for your continued partnership with ${COMPANY_NAME}. We look forward to serving you throughout {{month}} and beyond. Warm regards, The Team at ${COMPANY_NAME}

Website: https://universalprintingpress.com/
Phone: +233 59 999 7279`

export default function ClientConnectBase() {
  const { clients, manualClients, loading: clientsLoading, error: clientsError, refetch: refetchClients } = useAllClients()
  const [emailSending, setEmailSending] = useState(false)
  const [smsSending, setSmsSending] = useState(false)
  const [emailServiceStatus, setEmailServiceStatus] = useState<'checking' | 'connected' | 'disconnected' | null>(null)
  const [smsServiceStatus, setSmsServiceStatus] = useState<'checking' | 'connected' | 'disconnected' | null>(null)
  const [emailActivityLog, setEmailActivityLog] = useState<ActivityLogEntry[]>([])
  const [smsActivityLog, setSmsActivityLog] = useState<ActivityLogEntry[]>([])
  const [mounted, setMounted] = useState(false)
  
  // Template editing states
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_EMAIL_TEMPLATE)
  const [smsTemplate, setSmsTemplate] = useState(DEFAULT_SMS_TEMPLATE)
  const [editingEmailTemplate, setEditingEmailTemplate] = useState(false)
  const [editingSmsTemplate, setEditingSmsTemplate] = useState(false)
  
  // Progress tracking
  const [emailProgress, setEmailProgress] = useState<SendProgress | null>(null)
  const [smsProgress, setSmsProgress] = useState<SendProgress | null>(null)
  
  // Summary states
  const [emailSummary, setEmailSummary] = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [smsSummary, setSmsSummary] = useState<{ sent: number; failed: number; total: number } | null>(null)
  
  // History filtering
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'email' | 'sms' | 'whatsapp'>('all')
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  
  // Manual client management
  const [showAddClient, setShowAddClient] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', notes: '' })
  const [editingClient, setEditingClient] = useState({ name: '', email: '', phone: '', notes: '' })
  const [addingClient, setAddingClient] = useState(false)
  const [updatingClient, setUpdatingClient] = useState<string | null>(null)
  const [deletingClient, setDeletingClient] = useState<string | null>(null)
  
  // Client selection modal
  const [showEmailClientModal, setShowEmailClientModal] = useState(false)
  const [showSMSClientModal, setShowSMSClientModal] = useState(false)
  const [selectedEmailClients, setSelectedEmailClients] = useState<ClientInfo[]>([])
  const [selectedSMSClients, setSelectedSMSClients] = useState<ClientInfo[]>([])
  
  // Fetch greetings history
  const { logs: greetingsLogs, loading: logsLoading, refetch: refetchLogs } = useGreetingsLog({
    limit: 50,
    messageType: historyTypeFilter === 'all' ? undefined : historyTypeFilter,
    deliveryStatus: historyStatusFilter === 'all' ? undefined : historyStatusFilter,
    autoRefresh: false, // Manual refresh after sending
  })

  // Calculate this month's clients
  const thisMonthsClients = useMemo(() => {
    if (!clients || clients.length === 0) return 0
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    
    return clients.filter(client => {
      const orderDate = new Date(client.lastOrderDate)
      return orderDate >= startOfMonth && orderDate <= endOfMonth
    }).length
  }, [clients])

  // Track mounted state to avoid hydration mismatches
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSendEmailGreetings = async (selectedClients?: ClientInfo[]) => {
    // Use selected clients if provided, otherwise filter clients with valid email addresses
    const clientsToSend = selectedClients || clients.filter(client => 
      client.email && client.email.trim() && client.email.includes('@')
    )

    if (clientsToSend.length === 0) {
      toast.error('No clients with email addresses available to send greetings to')
      return
    }

    setEmailSending(true)
    setEmailProgress({ current: 0, total: clientsToSend.length, status: 'sending' })
    setEmailSummary(null)
    
    try {
      const response = await fetch('/api/client-connect/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clients: clientsToSend.map((client) => ({
            email: client.email!,
            name: client.name,
          })),
          customTemplate: emailTemplate, // Send custom template if edited
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send email greetings')
      }

      const { sent, failed, total } = data

      setEmailProgress({ current: total, total, status: failed > 0 ? 'error' : 'completed' })
      setEmailSummary({ sent, failed, total })

      if (failed > 0) {
        toast.error(
          `Sent to ${sent} clients, but ${failed} failed. Check activity log for details.`,
          { duration: 5000 }
        )
      } else {
        toast.success(`Email greetings sent successfully to ${sent} clients!`)
      }

      const newLogEntry: ActivityLogEntry = {
        id: Date.now().toString(),
        type: 'email',
        timestamp: new Date().toISOString(),
        status: failed === 0 ? 'success' : failed === total ? 'failed' : 'pending',
        message:
          failed === 0
            ? 'Monthly greetings sent successfully'
            : failed === total
            ? 'Failed to send email greetings'
            : `Sent to ${sent} clients, ${failed} failed`,
        recipientCount: sent,
        total,
        failed,
      }

      setEmailActivityLog((prev) => [newLogEntry, ...prev.slice(0, 9)])
      
      // Refresh history after sending
      refetchLogs()
    } catch (error: any) {
      console.error('Error sending email greetings:', error)
      setEmailProgress({ current: 0, total: selectedClients?.length || clients.filter(c => c.email && c.email.includes('@')).length, status: 'error' })
      
      const newLogEntry: ActivityLogEntry = {
        id: Date.now().toString(),
        type: 'email',
        timestamp: new Date().toISOString(),
        status: 'failed',
        message: error.message || 'Failed to send email greetings',
      }

      setEmailActivityLog((prev) => [newLogEntry, ...prev.slice(0, 9)])
      toast.error(error.message || 'Failed to send email greetings')
    } finally {
      setEmailSending(false)
      // Clear progress after 3 seconds
      setTimeout(() => setEmailProgress(null), 3000)
    }
  }

  const handleSendSMSGreetings = async (selectedClients?: ClientInfo[]) => {
    // Use selected clients if provided, otherwise filter clients with valid phone numbers
    const clientsToSend = selectedClients || clients.filter(client => 
      client.phone && client.phone.trim() && client.phone.replace(/\D/g, '').length >= 7
    )

    if (clientsToSend.length === 0) {
      toast.error('No clients with phone numbers available to send greetings to')
      return
    }

    setSmsSending(true)
    setSmsProgress({ current: 0, total: clientsToSend.length, status: 'sending' })
    setSmsSummary(null)
    
    try {
      const response = await fetch('/api/client-connect/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clients: clientsToSend.map((client) => ({
            phone: client.phone!,
            name: client.name,
          })),
          customTemplate: smsTemplate, // Send custom template if edited
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send SMS greetings')
      }

      const { sent, failed, total } = data

      setSmsProgress({ current: total, total, status: failed > 0 ? 'error' : 'completed' })
      setSmsSummary({ sent, failed, total })

      if (failed > 0) {
        toast.error(
          `Sent to ${sent} clients, but ${failed} failed. Check activity log for details.`,
          { duration: 5000 }
        )
      } else {
        toast.success(`SMS greetings sent successfully to ${sent} clients!`)
      }
      
      const newLogEntry: ActivityLogEntry = {
        id: Date.now().toString(),
        type: 'sms',
        timestamp: new Date().toISOString(),
        status: failed === 0 ? 'success' : failed === total ? 'failed' : 'pending',
        message:
          failed === 0
            ? 'Monthly greetings sent successfully'
            : failed === total
            ? 'Failed to send SMS greetings'
            : `Sent to ${sent} clients, ${failed} failed`,
        recipientCount: sent,
        total,
        failed,
      }

      setSmsActivityLog((prev) => [newLogEntry, ...prev.slice(0, 9)])
      
      // Refresh history after sending
      refetchLogs()
    } catch (error: any) {
      console.error('Error sending SMS greetings:', error)
      setSmsProgress({ current: 0, total: selectedClients?.length || clients.filter(c => c.phone && c.phone.replace(/\D/g, '').length >= 7).length, status: 'error' })
      
      const newLogEntry: ActivityLogEntry = {
        id: Date.now().toString(),
        type: 'sms',
        timestamp: new Date().toISOString(),
        status: 'failed',
        message: error.message || 'Failed to send SMS greetings',
      }
      
      setSmsActivityLog((prev) => [newLogEntry, ...prev.slice(0, 9)])
      toast.error(error.message || 'Failed to send SMS greetings')
    } finally {
      setSmsSending(false)
      // Clear progress after 3 seconds
      setTimeout(() => setSmsProgress(null), 3000)
    }
  }

  const getStatusIcon = (status: ActivityLogEntry['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
    }
  }

  const getStatusColor = (status: ActivityLogEntry['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
      case 'failed':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
    }
  }

  // Check email service status on mount
  useEffect(() => {
    const checkEmailService = async () => {
      setEmailServiceStatus('checking')
      try {
        const response = await fetch('/api/client-connect/send-email')
        const data = await response.json()
        setEmailServiceStatus(data.success ? 'connected' : 'disconnected')
      } catch (error) {
        setEmailServiceStatus('disconnected')
      }
    }
    checkEmailService()
  }, [])

  // Check SMS service status on mount
  useEffect(() => {
    const checkSMSService = async () => {
      setSmsServiceStatus('checking')
      try {
        const response = await fetch('/api/client-connect/send-sms')
        const data = await response.json()
        setSmsServiceStatus(data.success ? 'connected' : 'disconnected')
      } catch (error) {
        setSmsServiceStatus('disconnected')
      }
    }
    checkSMSService()
  }, [])

  // Manual client handlers
  const handleAddClient = async () => {
    if (!newClient.name || !newClient.email || !newClient.phone) {
      toast.error('Please fill in name, email, and phone number')
      return
    }

    setAddingClient(true)
    try {
      const response = await fetch('/api/manual-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClient),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to add client')
      }

      toast.success('Client added successfully!')
      setNewClient({ name: '', email: '', phone: '', notes: '' })
      setShowAddClient(false)
      refetchClients()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add client')
    } finally {
      setAddingClient(false)
    }
  }

  const handleEditClient = (client: ManualClient) => {
    setEditingClientId(client.id)
    setEditingClient({
      name: client.name,
      email: client.email,
      phone: client.phone,
      notes: client.notes || '',
    })
  }

  const handleUpdateClient = async () => {
    if (!editingClientId || !editingClient.name || !editingClient.email || !editingClient.phone) {
      toast.error('Please fill in all required fields')
      return
    }

    setUpdatingClient(editingClientId)
    try {
      const response = await fetch(`/api/manual-clients/${editingClientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingClient),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update client')
      }

      toast.success('Client updated successfully!')
      setEditingClientId(null)
      setEditingClient({ name: '', email: '', phone: '', notes: '' })
      refetchClients()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update client')
    } finally {
      setUpdatingClient(null)
    }
  }

  const handleDeleteClient = async (id: string) => {
    if (!confirm('Are you sure you want to delete this client?')) {
      return
    }

    setDeletingClient(id)
    try {
      const response = await fetch(`/api/manual-clients/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete client')
      }

      toast.success('Client deleted successfully!')
      refetchClients()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete client')
    } finally {
      setDeletingClient(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Banner */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Client Connect Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Send personalized monthly greetings to clients via email and SMS
            </p>
          </div>
        </div>
        
        {/* This Month's Clients Banner */}
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8" />
                <div>
                  <p className="text-sm opacity-90">This Month's Clients</p>
                  <p className="text-3xl font-bold">
                    {clientsLoading ? '...' : thisMonthsClients}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">Total Available</p>
                <p className="text-2xl font-semibold">
                  {clientsLoading ? '...' : clients.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Greetings Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email Greetings Card */}
        <Card className="border rounded-lg bg-card shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
            <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Greetings
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Send monthly greeting emails to all active clients with personalized messages
            </CardDescription>
              </div>
              {emailServiceStatus && (
                <div className="flex items-center gap-2">
                  {emailServiceStatus === 'checking' && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 animate-spin" />
                      <span>Checking...</span>
                    </div>
                  )}
                  {emailServiceStatus === 'connected' && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Connected</span>
                    </div>
                  )}
                  {emailServiceStatus === 'disconnected' && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="h-3 w-3" />
                      <span>Disconnected</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Email Template</label>
            <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingEmailTemplate(!editingEmailTemplate)}
                  className="h-7"
                >
                  {editingEmailTemplate ? (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Close
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
              {editingEmailTemplate ? (
                <Textarea
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  placeholder="Enter email template. Use {{clientName}}, {{month}}, {{year}} as placeholders. Company name is automatically included."
                  className="min-h-[150px] text-sm font-mono"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground border">
                  <p className="line-clamp-3">{emailTemplate.substring(0, 150)}...</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">Click Edit to customize</p>
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            {emailProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {emailProgress.current} / {emailProgress.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      emailProgress.status === 'completed'
                        ? 'bg-green-500'
                        : emailProgress.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${(emailProgress.current / emailProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success/Failure Summary */}
            {emailSummary && (
              <div className={`p-4 rounded-lg border ${
                emailSummary.failed === 0
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {emailSummary.failed === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <h4 className="font-semibold text-sm">
                    {emailSummary.failed === 0 ? 'All Emails Sent Successfully!' : 'Partial Success'}
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold">{emailSummary.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sent</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">{emailSummary.sent}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Failed</p>
                    <p className="font-semibold text-red-600 dark:text-red-400">{emailSummary.failed}</p>
                  </div>
                </div>
              </div>
            )}

            {/* No Clients Warning */}
            {!clientsLoading && clients.length === 0 && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ No clients found. Make sure you have orders with valid email addresses in the orders table.
                </p>
              </div>
            )}

            {/* Service Disconnected Warning */}
            {emailServiceStatus === 'disconnected' && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ⚠️ Email service is not connected. Please check your GMAIL_USER and GMAIL_PASS environment variables and restart the server.
                </p>
              </div>
            )}

            <Button
              onClick={() => {
                // Filter clients with valid emails first
                const clientsWithEmail = clients.filter(client => 
                  client.email && client.email.trim() && client.email.includes('@')
                )
                if (clientsWithEmail.length === 0) {
                  toast.error('No clients with email addresses available')
                  return
                }
                setShowEmailClientModal(true)
              }}
              disabled={emailSending || clientsLoading || clients.length === 0 || emailServiceStatus === 'disconnected'}
              className="w-full"
              size="lg"
            >
              {emailSending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : clientsLoading ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Loading clients...
                </>
              ) : clients.length === 0 ? (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  No Clients Available
                </>
              ) : emailServiceStatus === 'disconnected' ? (
                <>
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Service Disconnected
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Select & Send Email Greetings
                </>
              )}
            </Button>

            {/* Activity Log */}
            <div className="border rounded-lg bg-muted/30 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {emailActivityLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity
                  </p>
                ) : (
                  emailActivityLog.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-lg border text-sm ${getStatusColor(entry.status)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {getStatusIcon(entry.status)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{entry.message}</p>
                            {entry.recipientCount !== undefined && (
                              <p className="text-xs opacity-80 mt-1">
                                {entry.recipientCount} sent{entry.failed ? `, ${entry.failed} failed` : ''} out of {entry.total || entry.recipientCount}
                              </p>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {mounted ? formatTimestamp(entry.timestamp) : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SMS Greetings Card */}
        <Card className="border rounded-lg bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              SMS Greetings
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Send monthly greeting SMS messages to all active clients with personalized content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">SMS Template</label>
            <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingSmsTemplate(!editingSmsTemplate)}
                  className="h-7"
                >
                  {editingSmsTemplate ? (
                    <>
                      <X className="h-3 w-3 mr-1" />
                      Close
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
              {editingSmsTemplate ? (
                <Textarea
                  value={smsTemplate}
                  onChange={(e) => setSmsTemplate(e.target.value)}
                  placeholder="Enter SMS template. Use {{clientName}}, {{month}}, {{year}} as placeholders. Company name is automatically included."
                  className="min-h-[100px] text-sm font-mono"
                />
              ) : (
                <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground border">
                  <p className="line-clamp-2">{smsTemplate.substring(0, 100)}...</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">Click Edit to customize</p>
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            {smsProgress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {smsProgress.current} / {smsProgress.total}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      smsProgress.status === 'completed'
                        ? 'bg-green-500'
                        : smsProgress.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${(smsProgress.current / smsProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Success/Failure Summary */}
            {smsSummary && (
              <div className={`p-4 rounded-lg border ${
                smsSummary.failed === 0
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {smsSummary.failed === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  )}
                  <h4 className="font-semibold text-sm">
                    {smsSummary.failed === 0 ? 'All SMS Sent Successfully!' : 'Partial Success'}
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-semibold">{smsSummary.total}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sent</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">{smsSummary.sent}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Failed</p>
                    <p className="font-semibold text-red-600 dark:text-red-400">{smsSummary.failed}</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() => {
                // Filter clients with valid phones first
                const clientsWithPhone = clients.filter(client => 
                  client.phone && client.phone.trim() && client.phone.replace(/\D/g, '').length >= 7
                )
                if (clientsWithPhone.length === 0) {
                  toast.error('No clients with phone numbers available')
                  return
                }
                setShowSMSClientModal(true)
              }}
              disabled={smsSending || clientsLoading || clients.length === 0}
              className="w-full"
              size="lg"
              variant="outline"
            >
              {smsSending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Select & Send SMS Greetings
                </>
              )}
            </Button>

            {/* Activity Log */}
            <div className="border rounded-lg bg-muted/30 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent Activity
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {smsActivityLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity
                  </p>
                ) : (
                  smsActivityLog.map((entry) => (
                    <div
                      key={entry.id}
                      className={`p-3 rounded-lg border text-sm ${getStatusColor(entry.status)}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          {getStatusIcon(entry.status)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{entry.message}</p>
                            {entry.recipientCount !== undefined && (
                              <p className="text-xs opacity-80 mt-1">
                                {entry.recipientCount} sent{entry.failed ? `, ${entry.failed} failed` : ''} out of {entry.total || entry.recipientCount}
                              </p>
                            )}
                            <p className="text-xs opacity-70 mt-1">
                              {mounted ? formatTimestamp(entry.timestamp) : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Greetings Card - Coming Soon */}
        <Card className="border rounded-lg bg-card shadow-sm border-dashed opacity-[0.75]">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              WhatsApp Greetings
              <span className="ml-auto">
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </span>
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Send monthly greeting messages via WhatsApp (Coming Soon)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-green-600 dark:text-green-400 opacity-60" />
              <h3 className="font-semibold text-foreground mb-2">Coming Soon</h3>
              <p className="text-sm text-muted-foreground mb-4">
                WhatsApp greetings will be available soon. This feature will allow you to send personalized monthly greetings directly through WhatsApp, following the same structure as Email and SMS.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                <Sparkles className="h-3 w-3" />
                Under Development
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground border border-dashed">
                <p className="text-xs font-medium mb-1">Future Features:</p>
                <ul className="text-xs space-y-1 list-disc list-inside opacity-75">
                  <li>Template-based messaging</li>
                  <li>Bulk sending with progress tracking</li>
                  <li>Delivery status monitoring</li>
                  <li>Integration with WhatsApp Business API</li>
                </ul>
              </div>
            </div>

            <Button
              disabled
              className="w-full opacity-50 cursor-not-allowed"
              size="lg"
              variant="outline"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Manual Clients Management Section */}
      <Card className="border rounded-lg bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Manage Clients
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Add, edit, or remove clients manually. These will be merged with clients from orders.
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setShowAddClient(!showAddClient)
                if (showAddClient) {
                  setNewClient({ name: '', email: '', phone: '', notes: '' })
                }
              }}
              variant="outline"
              size="sm"
            >
              {showAddClient ? (
                <>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Client
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Client Form */}
          {showAddClient && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <h4 className="font-semibold text-sm">Add New Client</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Client Name *"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
                <Input
                  type="email"
                  placeholder="Email Address *"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                />
                <Input
                  type="tel"
                  placeholder="Phone Number *"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                />
                <Input
                  placeholder="Notes (optional)"
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddClient}
                  disabled={addingClient}
                  size="sm"
                >
                  {addingClient ? (
                    <>
                      <Clock className="h-4 w-4 mr-1 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Add Client
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setShowAddClient(false)
                    setNewClient({ name: '', email: '', phone: '', notes: '' })
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Manual Clients List */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-foreground">
              Manually Added Clients ({manualClients.length})
            </h4>
            {manualClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No manually added clients. Click "Add Client" to add one.
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {manualClients.map((client) => (
                  <div
                    key={client.id}
                    className="p-3 border rounded-lg bg-muted/30 flex items-center justify-between gap-3"
                  >
                    {editingClientId === client.id ? (
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          placeholder="Name"
                          value={editingClient.name}
                          onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                          size={1}
                        />
                        <Input
                          type="email"
                          placeholder="Email"
                          value={editingClient.email}
                          onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                          size={1}
                        />
                        <Input
                          type="tel"
                          placeholder="Phone"
                          value={editingClient.phone}
                          onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                          size={1}
                        />
                        <Input
                          placeholder="Notes"
                          value={editingClient.notes}
                          onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                          size={1}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleUpdateClient}
                            disabled={updatingClient === client.id}
                            size="sm"
                            variant="default"
                          >
                            {updatingClient === client.id ? (
                              <>
                                <Clock className="h-3 w-3 mr-1 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-3 w-3 mr-1" />
                                Save
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingClientId(null)
                              setEditingClient({ name: '', email: '', phone: '', notes: '' })
                            }}
                            size="sm"
                            variant="outline"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancel
                          </Button>
              </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                          <p className="text-xs text-muted-foreground truncate">{client.phone}</p>
                          {client.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-1 truncate">{client.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleEditClient(client)}
                            size="sm"
                            variant="outline"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteClient(client.id)}
                            disabled={deletingClient === client.id}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            {deletingClient === client.id ? (
                              <Clock className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
          </CardContent>
        </Card>

      {/* Recent History Section */}
      <Card className="border rounded-lg bg-card shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-semibold text-foreground">Recent History</CardTitle>
      </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchLogs()}
              disabled={logsLoading}
              className="h-8"
            >
              <Clock className={`h-4 w-4 mr-1 ${logsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            View all sent greetings with filtering options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter:</span>
            </div>
            <Select value={historyTypeFilter} onValueChange={(value: 'all' | 'email' | 'sms' | 'whatsapp') => setHistoryTypeFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
            <Select value={historyStatusFilter} onValueChange={(value: 'all' | 'success' | 'failed') => setHistoryStatusFilter(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* History List */}
          <div className="border rounded-lg bg-muted/30 p-4 space-y-2 max-h-96 overflow-y-auto" suppressHydrationWarning>
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Loading history...</span>
              </div>
            ) : greetingsLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No greetings history found
                </p>
              </div>
            ) : (
              greetingsLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border text-sm ${
                    log.delivery_status === 'success'
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {log.message_type === 'email' ? (
                        <Mail className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
                      ) : log.message_type === 'sms' ? (
                        <MessageSquare className="h-4 w-4 mt-0.5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <MessageCircle className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{log.client_name}</p>
                          <span className="text-xs text-muted-foreground">
                            {log.message_type.toUpperCase()}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              log.delivery_status === 'success'
                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {log.delivery_status === 'success' ? '✓ Sent' : '✗ Failed'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 break-all">
                          {log.client_contact}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {log.message_content}
                        </p>
                        {log.error_message && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                            Error: {log.error_message}
                          </p>
                        )}
                        <p className="text-xs opacity-70 mt-2">
                          {mounted ? formatTimestamp(log.created_at) : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Client Selection Modals */}
      <ClientSelectionModal
        isOpen={showEmailClientModal}
        onClose={() => setShowEmailClientModal(false)}
        clients={clients}
        onConfirm={(selected) => {
          setSelectedEmailClients(selected)
          handleSendEmailGreetings(selected)
        }}
        type="email"
        title="Select Clients for Email Greetings"
      />

      <ClientSelectionModal
        isOpen={showSMSClientModal}
        onClose={() => setShowSMSClientModal(false)}
        clients={clients}
        onConfirm={(selected) => {
          setSelectedSMSClients(selected)
          handleSendSMSGreetings(selected)
        }}
        type="sms"
        title="Select Clients for SMS Greetings"
      />
    </div>
  )
}
