'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { PlusIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

interface FilterToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  paymentFilter: string
  onPaymentChange: (value: string) => void
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateTo: string
  onDateToChange: (value: string) => void
  period: string
  onPeriodChange: (value: string) => void
  canAddNew?: boolean
  onAddNew?: () => void
  onExport?: () => void
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  paymentFilter,
  onPaymentChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  period,
  onPeriodChange,
  canAddNew,
  onAddNew,
  onExport,
}) => {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {/* Spacer to prevent content overlap */}
      <div className="h-[60px]" />

      <div
        className={cn(
          'fixed top-0 left-0 right-0 z-30 flex flex-wrap items-center gap-2 px-2 py-1 sm:px-3 sm:py-2 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300',
          isScrolled && 'shadow-sm'
        )}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 min-w-[120px] px-2 py-1.5 rounded-md border border-border bg-background text-sm focus:ring-1 focus:ring-primary"
        />

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-2 py-1.5 rounded-md border border-border bg-background text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Payment Filter */}
        <select
          value={paymentFilter}
          onChange={(e) => onPaymentChange(e.target.value)}
          className="px-2 py-1.5 rounded-md border border-border bg-background text-sm"
        >
          <option value="all">All Payments</option>
          <option value="full payment">Full</option>
          <option value="partial payment">Partial</option>
          <option value="pending">Pending</option>
        </select>

        {/* Dates (with visible labels for clarity on mobile) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1">
          <label className="text-[10px] text-muted-foreground sm:hidden">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="px-2 py-1.5 rounded-md border border-border bg-background text-sm w-[110px]"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1">
          <label className="text-[10px] text-muted-foreground sm:hidden">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="px-2 py-1.5 rounded-md border border-border bg-background text-sm w-[110px]"
          />
        </div>

        {/* Period Filter */}
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="px-2 py-1.5 rounded-md border border-border bg-background text-sm"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>

        {/* Buttons */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {canAddNew && (
            <button
              onClick={onAddNew}
              className="flex items-center space-x-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition text-sm"
            >
              <PlusIcon className="h-4 w-4" />
              <span>New</span>
            </button>
          )}
          <button
            onClick={onExport}
            className="flex items-center space-x-1 px-3 py-1.5 border border-border rounded-md hover:bg-accent transition text-sm"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-muted-foreground" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </>
  )
}
