'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'

interface ExportConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  format: 'pdf' | 'csv'
  recordCount: number
  period: string
  loading?: boolean
}

export function ExportConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  format,
  recordCount,
  period,
  loading = false,
}: ExportConfirmDialogProps) {
  const formatName = format.toUpperCase()
  const formatIcon = format === 'pdf' ? '📄' : '📊'
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] mx-4 p-4 sm:p-6">
        <DialogHeader className="text-center sm:text-left space-y-3">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className="p-2.5 sm:p-3 rounded-full flex-shrink-0 bg-blue-100 dark:bg-blue-900/30">
              <DocumentArrowDownIcon className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              Export to {formatName}?
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base text-center sm:text-left">
            You are about to export all orders for the <strong>{period}</strong> period that match your current filters.
            {recordCount > 0 && (
              <span className="block mt-1 text-xs text-muted-foreground">
                Currently showing {recordCount} order{recordCount !== 1 ? 's' : ''} on this page. The export will include all matching orders.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-start gap-3 p-3 sm:p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
            <span className="text-2xl flex-shrink-0">{formatIcon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Export Format: {formatName}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {format === 'pdf' 
                  ? 'The PDF will include a professional letterhead with company logo and match the exact table styling from the UI.'
                  : 'The CSV file will contain all order data in a spreadsheet-compatible format matching the table columns.'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground px-1">
            <span className="font-medium">Records:</span>
            <span>{recordCount} order{recordCount !== 1 ? 's' : ''}</span>
            <span className="mx-2">•</span>
            <span className="font-medium">Period:</span>
            <span className="capitalize">{period}</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto order-2 sm:order-1 min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto order-1 sm:order-2 min-w-[140px] bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                <span>Exporting...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <DocumentArrowDownIcon className="h-4 w-4" />
                <span>Export {formatName}</span>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

