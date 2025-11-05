'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircleIcon, XCircleIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline'

interface AttendanceConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: 'checkin' | 'checkout'
  loading?: boolean
}

export function AttendanceConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  loading = false,
}: AttendanceConfirmDialogProps) {
  const isCheckIn = type === 'checkin'
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] mx-4 p-4 sm:p-6">
        <DialogHeader className="text-center sm:text-left space-y-3">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className={`p-2.5 sm:p-3 rounded-full flex-shrink-0 ${isCheckIn ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
              {isCheckIn ? (
                <CheckCircleIcon className={`h-6 w-6 sm:h-7 sm:w-7 ${isCheckIn ? 'text-green-600' : 'text-blue-600'}`} />
              ) : (
                <XCircleIcon className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
              )}
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {isCheckIn ? 'Check In?' : 'Check Out?'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base text-center sm:text-left">
            {isCheckIn 
              ? 'Confirm that you want to check in. Your location will be verified using GPS.'
              : 'Confirm that you want to check out. Your location will be verified using GPS.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-start gap-3 p-3 sm:p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
            <MapPinIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Location Verification</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Your GPS location will be checked to ensure you're at the workplace.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground px-1">
            <ClockIcon className="h-4 w-4 flex-shrink-0" />
            <span>Time: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
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
            className={`w-full sm:w-auto order-1 sm:order-2 min-w-[140px] ${
              isCheckIn 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                <span>{isCheckIn ? 'Checking In...' : 'Checking Out...'}</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {isCheckIn ? (
                  <CheckCircleIcon className="h-4 w-4" />
                ) : (
                  <XCircleIcon className="h-4 w-4" />
                )}
                <span>{isCheckIn ? 'Confirm Check In' : 'Confirm Check Out'}</span>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

