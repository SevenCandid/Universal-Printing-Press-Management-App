import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function ExportConfirmModal({ open, onClose, onConfirm, type }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirm Export</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 mb-3">
          Export materials as <strong>{type}</strong> for the selected period?
        </p>
        <DialogFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm & Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
