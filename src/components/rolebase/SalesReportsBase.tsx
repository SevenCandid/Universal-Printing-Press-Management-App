'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from 'date-fns'

type SalesReport = {
  id: string
  submitted_by: string
  report_date: string
  title: string
  report_type: string
  content: string
  remarks?: string
  location?: string
  clients_contacted: number
  leads_generated: number
  follow_ups_required: boolean
  follow_up_notes?: string
  status: string
  created_at: string
  updated_at: string
  profiles?: {
    name?: string
    email?: string
  }
}

type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily Report' },
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'monthly', label: 'Monthly Report' },
  { value: 'outreach', label: 'Outreach Report' },
  { value: 'meeting', label: 'Meeting Report' },
  { value: 'other', label: 'Other' },
]

export default function SalesReportsBase() {
  const { supabase, session } = useSupabase()
  const [reports, setReports] = useState<SalesReport[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingReport, setEditingReport] = useState<SalesReport | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    title: '',
    report_type: 'daily',
    content: '',
    remarks: '',
    location: '',
    clients_contacted: '0',
    leads_generated: '0',
    follow_ups_required: false,
    follow_up_notes: '',
  })

  // Fetch reports
  const fetchReports = async () => {
    if (!supabase || !session) return
    
    setLoading(true)
    try {
      // Fetch reports without foreign key join (more reliable)
      let query = supabase
        .from('sales_reports')
        .select('*')
        .eq('submitted_by', session.user.id)
        .order('report_date', { ascending: false })
        .order('created_at', { ascending: false })

      // Apply period filter
      const now = new Date()
      let startDate: Date | null = null

      if (periodFilter === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0))
      } else if (periodFilter === 'week') {
        startDate = startOfWeek(now)
      } else if (periodFilter === 'month') {
        startDate = startOfMonth(now)
      } else if (periodFilter === 'quarter') {
        startDate = startOfQuarter(now)
      } else if (periodFilter === 'year') {
        startDate = startOfYear(now)
      } else if (periodFilter === 'custom' && customStartDate) {
        startDate = new Date(customStartDate)
      }

      if (startDate) {
        query = query.gte('report_date', startDate.toISOString().split('T')[0])
      }

      if (periodFilter === 'custom' && customEndDate) {
        const endDate = new Date(customEndDate)
        endDate.setHours(23, 59, 59, 999)
        query = query.lte('report_date', endDate.toISOString().split('T')[0])
      }

      // Apply report type filter
      if (reportTypeFilter !== 'all') {
        query = query.eq('report_type', reportTypeFilter)
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Supabase query error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error
        })
        throw error
      }

      // Fetch user profile separately
      const reports = data || []
      let enrichedReports = reports
      
      if (reports.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('id', session.user.id)
          .single()

        if (profileError) {
          console.warn('Profile fetch error (non-fatal):', profileError)
        }

      // Enrich reports with profile data
      enrichedReports = reports.map(report => ({
        ...report,
        profiles: profileData || { name: 'Unknown', email: '' }
      }))
      }

      // Apply search filter client-side
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        enrichedReports = enrichedReports.filter((report) =>
          report.title.toLowerCase().includes(query) ||
          report.content.toLowerCase().includes(query) ||
          report.remarks?.toLowerCase().includes(query) ||
          report.location?.toLowerCase().includes(query)
        )
      }

      setReports(enrichedReports)
    } catch (err: any) {
      console.error('Fetch reports error:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        stack: err?.stack,
        fullError: err
      })
      
      // Provide more specific error messages
      const errorMessage = err?.message || String(err) || 'Unknown error'
      if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        toast.error('Sales reports table not found. Please run the CREATE_SALES_REPORTS_TABLE.sql script in Supabase.')
      } else if (errorMessage.includes('row-level security') || errorMessage.includes('permission denied')) {
        toast.error('Access denied. Please check your permissions.')
      } else if (errorMessage && errorMessage !== 'Unknown error') {
        toast.error(`Failed to load reports: ${errorMessage}`)
      } else {
        toast.error('Failed to load reports. Please check the console and ensure the sales_reports table exists.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [supabase, session, periodFilter, reportTypeFilter, statusFilter, customStartDate, customEndDate])

  // Reset form
  const resetForm = () => {
    setFormData({
      report_date: new Date().toISOString().split('T')[0],
      title: '',
      report_type: 'daily',
      content: '',
      remarks: '',
      location: '',
      clients_contacted: '0',
      leads_generated: '0',
      follow_ups_required: false,
      follow_up_notes: '',
    })
    setEditingReport(null)
  }

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !session) return

    setLoading(true)
    try {
      const reportData = {
        submitted_by: session.user.id,
        report_date: formData.report_date,
        title: formData.title.trim(),
        report_type: formData.report_type,
        content: formData.content.trim(),
        remarks: formData.remarks.trim() || null,
        location: formData.location.trim() || null,
        clients_contacted: parseInt(formData.clients_contacted) || 0,
        leads_generated: parseInt(formData.leads_generated) || 0,
        follow_ups_required: formData.follow_ups_required,
        follow_up_notes: formData.follow_up_notes.trim() || null,
        status: 'submitted',
      }

      if (editingReport) {
        // Update existing report (only if status is submitted)
        if (editingReport.status !== 'submitted') {
          toast.error('Cannot edit reviewed or archived reports')
          setLoading(false)
          return
        }

        const { error } = await supabase
          .from('sales_reports')
          .update(reportData)
          .eq('id', editingReport.id)

        if (error) throw error
        toast.success('✅ Report updated successfully!')
      } else {
        // Create new report
        const { error } = await supabase
          .from('sales_reports')
          .insert([reportData])

        if (error) {
          if (error.code === '23505') {
            toast.error('A report for this date and type already exists. Please update the existing report instead.')
          } else {
            throw error
          }
          return
        }
        toast.success('✅ Report submitted successfully!')
      }

      setShowModal(false)
      resetForm()
      fetchReports()
    } catch (err: any) {
      console.error('Submit report error:', err)
      toast.error(err.message || 'Failed to submit report')
    } finally {
      setLoading(false)
    }
  }

  // Handle edit
  const handleEdit = (report: SalesReport) => {
    if (report.status !== 'submitted') {
      toast.error('Cannot edit reviewed or archived reports')
      return
    }
    setEditingReport(report)
    setFormData({
      report_date: report.report_date,
      title: report.title,
      report_type: report.report_type,
      content: report.content,
      remarks: report.remarks || '',
      location: report.location || '',
      clients_contacted: report.clients_contacted.toString(),
      leads_generated: report.leads_generated.toString(),
      follow_ups_required: report.follow_ups_required,
      follow_up_notes: report.follow_up_notes || '',
    })
    setShowModal(true)
  }

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return
    if (!supabase) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('sales_reports')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success('🗑️ Report deleted')
      fetchReports()
    } catch (err: any) {
      console.error('Delete report error:', err)
      toast.error('Failed to delete report')
    } finally {
      setLoading(false)
    }
  }

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading reports...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Daily Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit your daily reports, outreach remarks, and updates to the CEO
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full sm:w-auto"
          >
            <CalendarIcon className="h-5 w-5 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button
            onClick={() => {
              resetForm()
              setShowModal(true)
            }}
            className="w-full sm:w-auto"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Period</label>
                <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodFilter === 'custom' && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Start Date</label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">End Date</label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium mb-1 block">Report Type</label>
                <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <Input
                type="text"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No reports submitted yet. Click "New Report" to create your first report.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.status === 'submitted' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        report.status === 'reviewed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {format(new Date(report.report_date), 'MMM dd, yyyy')}
                      </span>
                      <span className="capitalize">{REPORT_TYPES.find(t => t.value === report.report_type)?.label}</span>
                      {report.location && (
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="h-4 w-4" />
                          {report.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {report.status === 'submitted' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(report)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(report.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Report Content</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.content}</p>
                </div>

                {report.remarks && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Remarks</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.remarks}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Clients Contacted</p>
                    <p className="text-lg font-semibold flex items-center gap-1">
                      <UsersIcon className="h-4 w-4" />
                      {report.clients_contacted}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Leads Generated</p>
                    <p className="text-lg font-semibold">{report.leads_generated}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Follow Ups</p>
                    <p className="text-lg font-semibold">
                      {report.follow_ups_required ? '✅ Yes' : '❌ No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-sm">{format(new Date(report.created_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>

                {report.follow_up_notes && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-1">Follow Up Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.follow_up_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingReport ? 'Edit Report' : 'Submit New Report'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Report Date *</label>
                <Input
                  type="date"
                  value={formData.report_date}
                  onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Report Type *</label>
                <Select
                  value={formData.report_type}
                  onValueChange={(value) => setFormData({ ...formData, report_type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Daily Outreach - Accra Market"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Report Content *</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Describe your activities, meetings, outreach efforts, etc..."
                rows={6}
                required
                className="resize-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Remarks (Optional)</label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Additional remarks or observations..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Location (Optional)</label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Accra, Kumasi Market"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Clients Contacted</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.clients_contacted}
                  onChange={(e) => setFormData({ ...formData, clients_contacted: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Leads Generated</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.leads_generated}
                  onChange={(e) => setFormData({ ...formData, leads_generated: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.follow_ups_required}
                    onChange={(e) => setFormData({ ...formData, follow_ups_required: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">Follow Ups Required</span>
                </label>
              </div>
            </div>

            {formData.follow_ups_required && (
              <div>
                <label className="text-sm font-medium mb-1 block">Follow Up Notes</label>
                <Textarea
                  value={formData.follow_up_notes}
                  onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value })}
                  placeholder="Notes about required follow-ups..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : editingReport ? 'Update Report' : 'Submit Report'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

