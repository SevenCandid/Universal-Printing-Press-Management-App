'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSupabase } from '@/components/providers/SupabaseProvider'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { format, startOfWeek, startOfMonth, startOfQuarter, startOfYear, subDays, subWeeks, subMonths, subQuarters, subYears } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

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
    role?: string
  }
}

type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

const REPORT_TYPES = [
  { value: 'daily', label: 'Daily Report', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
  { value: 'weekly', label: 'Weekly Report', color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
  { value: 'monthly', label: 'Monthly Report', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' },
  { value: 'outreach', label: 'Outreach', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
  { value: 'meeting', label: 'Meeting', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400' },
  { value: 'other', label: 'Other', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400' },
]

export default function CEOSalesReportsViewBase() {
  const { supabase, session } = useSupabase()
  const [reports, setReports] = useState<SalesReport[]>([])
  const [loading, setLoading] = useState(false)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month')
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [salesRepFilter, setSalesRepFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedReport, setSelectedReport] = useState<SalesReport | null>(null)
  const [salesReps, setSalesReps] = useState<{ id: string; name: string; email: string }[]>([])

  // Fetch sales representatives
  useEffect(() => {
    const fetchSalesReps = async () => {
      if (!supabase) return
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email')
          .eq('role', 'sales_representative')
          .eq('is_active', true)
          .order('name', { ascending: true })

        if (error) throw error
        setSalesReps(data || [])
      } catch (err: any) {
        console.error('Fetch sales reps error:', err)
      }
    }
    fetchSalesReps()
  }, [supabase])

  // Fetch reports
  const fetchReports = async () => {
    if (!supabase || !session) {
      console.warn('Cannot fetch reports: supabase or session not available')
      return
    }
    
    setLoading(true)
    try {
      // Fetch reports without foreign key join (more reliable)
      let query = supabase
        .from('sales_reports')
        .select('*')
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

      // Apply sales rep filter
      if (salesRepFilter !== 'all') {
        query = query.eq('submitted_by', salesRepFilter)
      }

      const { data, error } = await query

      if (error) {
        // Try different ways to capture error details
        const errorDetails = {
          message: error.message || 'No message',
          details: error.details || 'No details',
          hint: error.hint || 'No hint',
          code: error.code || 'No code',
        }
        
        // Log each property individually
        console.error('=== Supabase Query Error ===')
        console.error('Message:', error.message)
        console.error('Details:', error.details)
        console.error('Hint:', error.hint)
        console.error('Code:', error.code)
        console.error('Full error object:', error)
        console.error('Error as string:', String(error))
        console.error('Error JSON:', JSON.stringify(error, null, 2))
        console.error('===========================')
        
        throw error
      }

      // Fetch profiles separately and enrich the data
      const reports = data || []
      
      // Get unique user IDs from reports
      const userIds = [...new Set(reports.map(r => r.submitted_by))].filter(Boolean)
      
      // Fetch profiles for all users (only if there are reports)
      let profilesMap = new Map()
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email, role')
          .in('id', userIds)
        
        if (profilesError) {
          console.warn('Profile fetch error (non-fatal):', profilesError)
        } else if (profilesData) {
          profilesData.forEach(profile => {
            profilesMap.set(profile.id, profile)
          })
        }
      }
      
      // Enrich reports with profile data
      let enrichedReports = reports.map(report => ({
        ...report,
        profiles: profilesMap.get(report.submitted_by) || { name: 'Unknown', email: '', role: '' }
      }))
      
      // Apply search filter client-side
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        enrichedReports = enrichedReports.filter((report) =>
          report.title.toLowerCase().includes(query) ||
          report.content.toLowerCase().includes(query) ||
          report.remarks?.toLowerCase().includes(query) ||
          report.location?.toLowerCase().includes(query) ||
          report.profiles?.name?.toLowerCase().includes(query) ||
          report.profiles?.email?.toLowerCase().includes(query)
        )
      }

      setReports(enrichedReports)
    } catch (err: any) {
      // Log error in multiple ways
      console.error('=== Fetch Reports Error ===')
      console.error('Error message:', err?.message)
      console.error('Error details:', err?.details)
      console.error('Error hint:', err?.hint)
      console.error('Error code:', err?.code)
      console.error('Error stack:', err?.stack)
      console.error('Full error:', err)
      
      // Try to stringify the error
      try {
        console.error('Error JSON:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
      } catch (e) {
        console.error('Could not stringify error:', e)
      }
      
      // Check for common error patterns
      const errorStr = String(err) || ''
      const errorMessage = err?.message || errorStr || 'Unknown error'
      
      // Provide more specific error messages
      if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        toast.error('Sales reports table not found. Please run the CREATE_SALES_REPORTS_TABLE.sql script in Supabase.')
      } else if (errorMessage.includes('row-level security') || errorMessage.includes('permission denied') || errorMessage.includes('PGRST116')) {
        toast.error('Access denied. Please check your role is set to "ceo" in the profiles table.')
      } else if (errorMessage.includes('foreign key') || errorMessage.includes('profiles')) {
        toast.error('Database relationship error. Please check the console for details.')
      } else if (errorMessage && errorMessage !== 'Unknown error') {
        toast.error(`Failed to load reports: ${errorMessage}`)
      } else {
        toast.error('Failed to load reports. Please check the browser console and ensure the sales_reports table exists.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [periodFilter, reportTypeFilter, statusFilter, salesRepFilter, customStartDate, customEndDate])

  // Update report status
  const updateReportStatus = async (id: string, status: 'submitted' | 'reviewed' | 'archived') => {
    if (!supabase) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('sales_reports')
        .update({ status })
        .eq('id', id)

      if (error) throw error
      toast.success(`Report marked as ${status}`)
      fetchReports()
    } catch (err: any) {
      console.error('Update status error:', err)
      toast.error('Failed to update report status')
    } finally {
      setLoading(false)
    }
  }

  // Statistics
  const stats = useMemo(() => {
    const totalReports = reports.length
    const totalClientsContacted = reports.reduce((sum, r) => sum + r.clients_contacted, 0)
    const totalLeadsGenerated = reports.reduce((sum, r) => sum + r.leads_generated, 0)
    const pendingReview = reports.filter(r => r.status === 'submitted').length
    const followUpsRequired = reports.filter(r => r.follow_ups_required).length
    const uniqueSalesReps = new Set(reports.map(r => r.submitted_by)).size

    return {
      totalReports,
      totalClientsContacted,
      totalLeadsGenerated,
      pendingReview,
      followUpsRequired,
      uniqueSalesReps,
    }
  }, [reports])

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
          <h1 className="text-2xl sm:text-3xl font-bold">Sales Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and review reports submitted by sales representatives
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full sm:w-auto"
        >
          <FunnelIcon className="h-5 w-5 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Reports</p>
            <p className="text-2xl font-bold">{stats.totalReports}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Sales Reps</p>
            <p className="text-2xl font-bold">{stats.uniqueSalesReps}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Clients Contacted</p>
            <p className="text-2xl font-bold">{stats.totalClientsContacted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Leads Generated</p>
            <p className="text-2xl font-bold">{stats.totalLeadsGenerated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Follow Ups</p>
            <p className="text-2xl font-bold text-orange-600">{stats.followUpsRequired}</p>
          </CardContent>
        </Card>
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

              <div>
                <label className="text-sm font-medium mb-1 block">Sales Representative</label>
                <Select value={salesRepFilter} onValueChange={setSalesRepFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sales Reps</SelectItem>
                    {salesReps.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.name || rep.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
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
              No reports found. {searchQuery && 'Try adjusting your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <Badge
                        className={
                          report.status === 'submitted' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          report.status === 'reviewed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }
                      >
                        {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                      </Badge>
                      <Badge className={REPORT_TYPES.find(t => t.value === report.report_type)?.color || ''}>
                        {REPORT_TYPES.find(t => t.value === report.report_type)?.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UsersIcon className="h-4 w-4" />
                        {report.profiles?.name || report.profiles?.email || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {format(new Date(report.report_date), 'MMM dd, yyyy')}
                      </span>
                      {report.location && (
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="h-4 w-4" />
                          {report.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReport(report)}
                    >
                      View Details
                    </Button>
                    {report.status === 'submitted' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReportStatus(report.id, 'reviewed')}
                          className="text-green-600 hover:text-green-700"
                        >
                          Mark Reviewed
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReportStatus(report.id, 'archived')}
                          className="text-gray-600 hover:text-gray-700"
                        >
                          Archive
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Report Content</h4>
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {report.content}
                  </p>
                </div>

                {report.remarks && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">Remarks</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
                      {report.remarks}
                    </p>
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
                      {report.follow_ups_required ? (
                        <span className="flex items-center gap-1 text-orange-600">
                          <CheckCircleIcon className="h-4 w-4" />
                          Required
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500">
                          <XCircleIcon className="h-4 w-4" />
                          None
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="text-sm">{format(new Date(report.created_at), 'MMM dd, HH:mm')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Report Detail Modal */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedReport && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-xl">{selectedReport.title}</DialogTitle>
                  <Badge
                    className={
                      selectedReport.status === 'submitted' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      selectedReport.status === 'reviewed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }
                  >
                    {selectedReport.status.charAt(0).toUpperCase() + selectedReport.status.slice(1)}
                  </Badge>
                  <Badge className={REPORT_TYPES.find(t => t.value === selectedReport.report_type)?.color || ''}>
                    {REPORT_TYPES.find(t => t.value === selectedReport.report_type)?.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                  <span>By: {selectedReport.profiles?.name || selectedReport.profiles?.email || 'Unknown'}</span>
                  <span>•</span>
                  <span>Date: {format(new Date(selectedReport.report_date), 'MMMM dd, yyyy')}</span>
                  {selectedReport.location && (
                    <>
                      <span>•</span>
                      <span>Location: {selectedReport.location}</span>
                    </>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Report Content</h3>
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{selectedReport.content}</p>
                  </div>
                </div>

                {selectedReport.remarks && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Remarks</h3>
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{selectedReport.remarks}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Clients Contacted</p>
                    <p className="text-2xl font-bold">{selectedReport.clients_contacted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Leads Generated</p>
                    <p className="text-2xl font-bold">{selectedReport.leads_generated}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Follow Ups Required</p>
                    <p className="text-2xl font-bold">
                      {selectedReport.follow_ups_required ? '✅ Yes' : '❌ No'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Submission Time</p>
                    <p className="text-sm">{format(new Date(selectedReport.created_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                </div>

                {selectedReport.follow_up_notes && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Follow Up Notes</h3>
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                      <p className="text-sm whitespace-pre-wrap">{selectedReport.follow_up_notes}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  {selectedReport.status === 'submitted' && (
                    <>
                      <Button
                        onClick={() => {
                          updateReportStatus(selectedReport.id, 'reviewed')
                          setSelectedReport(null)
                        }}
                        className="flex-1"
                      >
                        Mark as Reviewed
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          updateReportStatus(selectedReport.id, 'archived')
                          setSelectedReport(null)
                        }}
                        className="flex-1"
                      >
                        Archive
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setSelectedReport(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

