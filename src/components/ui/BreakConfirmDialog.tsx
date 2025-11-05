'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PauseIcon, PlayIcon, ClockIcon, CubeIcon } from '@heroicons/react/24/outline'

interface BreakConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: 'start' | 'end'
  breakType?: string
  loading?: boolean
}

export function BreakConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  type,
  breakType = 'regular',
  loading = false,
}: BreakConfirmDialogProps) {
  const isStart = type === 'start'
  
  const getBreakTypeIcon = (type: string) => {
    switch (type) {
      case 'lunch':
        return '🍽️'
      case 'personal':
        return '🚻'
      default:
        return '☕'
    }
  }
  
  const getBreakTypeLabel = (type: string) => {
    switch (type) {
      case 'lunch':
        return 'Lunch Break'
      case 'personal':
        return 'Personal Break'
      default:
        return 'Regular Break'
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] mx-4 p-4 sm:p-6">
        <DialogHeader className="text-center sm:text-left space-y-3">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className={`p-2.5 sm:p-3 rounded-full flex-shrink-0 ${isStart ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
              {isStart ? (
                <PauseIcon className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
              ) : (
                <PlayIcon className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
              )}
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {isStart ? 'Start Break?' : 'End Break?'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm sm:text-base text-center sm:text-left">
            {isStart 
              ? `Confirm that you want to start a ${getBreakTypeLabel(breakType).toLowerCase()}.`
              : 'Confirm that you want to end your current break.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {isStart && (
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-muted/50 dark:bg-muted/30 rounded-lg border border-border">
              <span className="text-2xl flex-shrink-0">{getBreakTypeIcon(breakType)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Break Type</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed capitalize">
                  {getBreakTypeLabel(breakType)}
                </p>
              </div>
            </div>
          )}
          
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
              isStart 
                ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                <span>{isStart ? 'Starting Break...' : 'Ending Break...'}</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                {isStart ? (
                  <PauseIcon className="h-4 w-4" />
                ) : (
                  <PlayIcon className="h-4 w-4" />
                )}
                <span>{isStart ? 'Confirm Start Break' : 'Confirm End Break'}</span>
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

