import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
        {/* Replace DialogFooter with a normal div */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm & Download</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
