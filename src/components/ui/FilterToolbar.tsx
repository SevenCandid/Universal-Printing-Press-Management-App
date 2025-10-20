'use client'

import React from 'react'
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
  return (
    <div className="w-full mt-2">
      {/* 🔍 Search + Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <input
          type="text"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 min-w-[200px] max-w-sm px-2 py-1 text-sm border border-border rounded-md focus:ring-1 focus:ring-primary"
        />

        <div className="flex items-center gap-2 shrink-0">
          {canAddNew && (
            <button
              onClick={onAddNew}
              className="flex items-center space-x-1 px-3 py-1 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90"
            >
              <PlusIcon className="h-4 w-4" />
              <span>New Order</span>
            </button>
          )}
          <button
            onClick={onExport}
            className="flex items-center space-x-1 px-3 py-1 border text-sm border-border rounded-md hover:bg-accent"
          >
            <ArrowDownTrayIcon className="h-4 w-4 text-muted-foreground" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 🎛 Filters Row */}
      <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1 scrollbar-thin scrollbar-thumb-gray-300">
        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-2 py-1 border text-sm rounded-md bg-background shrink-0"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Payment */}
        <select
          value={paymentFilter}
          onChange={(e) => onPaymentChange(e.target.value)}
          className="px-2 py-1 border text-sm rounded-md bg-background shrink-0"
        >
          <option value="all">All Payments</option>
          <option value="full payment">Full</option>
          <option value="partial payment">Partial</option>
          <option value="pending">Pending</option>
        </select>

        {/* From */}
        <div className="relative w-[110px] shrink-0">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            placeholder="From"
            className="px-2 py-1 border text-sm rounded-md bg-background w-full text-gray-500"
          />
          {!dateFrom && (
            <span className="absolute left-3 top-1.5 text-xs text-gray-400 pointer-events-none">
              From
            </span>
          )}
        </div>

        {/* To */}
        <div className="relative w-[110px] shrink-0">
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            placeholder="To"
            className="px-2 py-1 border text-sm rounded-md bg-background w-full text-gray-500"
          />
          {!dateTo && (
            <span className="absolute left-3 top-1.5 text-xs text-gray-400 pointer-events-none">
              To
            </span>
          )}
        </div>

        {/* Period */}
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="px-2 py-1 border text-sm rounded-md bg-background shrink-0"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
    </div>
  )
}
