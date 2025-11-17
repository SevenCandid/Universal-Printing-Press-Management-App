/**
 * Modal for selecting clients before sending greetings
 * Allows users to review and select/deselect clients
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, Search, Check, Mail, Phone, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ClientInfo } from '@/lib/clientUtils'

interface ClientSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  clients: ClientInfo[]
  onConfirm: (selectedClients: ClientInfo[]) => void
  type: 'email' | 'sms' | 'both'
  title?: string
}

export function ClientSelectionModal({
  isOpen,
  onClose,
  clients,
  onConfirm,
  type,
  title,
}: ClientSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())

  // Filter clients based on type
  const filteredClients = useMemo(() => {
    let filtered = clients

    // Filter by type (email, sms, or both)
    if (type === 'email') {
      filtered = filtered.filter(c => c.email && c.email.trim() && c.email.includes('@'))
    } else if (type === 'sms') {
      filtered = filtered.filter(c => c.phone && c.phone.trim() && c.phone.replace(/\D/g, '').length >= 7)
    }
    // type === 'both' shows all clients

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter(
        c =>
          c.name.toLowerCase().includes(query) ||
          (c.email && c.email.toLowerCase().includes(query)) ||
          (c.phone && c.phone.toLowerCase().includes(query))
      )
    }

    return filtered
  }, [clients, type, searchQuery])

  // Create unique ID for each client (prefer email, fallback to phone, then name+date)
  const getClientId = (client: ClientInfo) => {
    if (client.email && client.email.trim()) {
      return client.email.toLowerCase().trim()
    }
    if (client.phone && client.phone.trim()) {
      return client.phone.trim()
    }
    return `${client.name}-${client.lastOrderDate}`
  }

  // Auto-select all valid clients on open
  useEffect(() => {
    if (isOpen) {
      const validIds = new Set(filteredClients.map(c => getClientId(c)))
      setSelectedClientIds(validIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filteredClients])

  const toggleClient = (client: ClientInfo) => {
    const id = getClientId(client)
    setSelectedClientIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    const allIds = new Set(filteredClients.map(c => getClientId(c)))
    setSelectedClientIds(allIds)
  }

  const deselectAll = () => {
    setSelectedClientIds(new Set())
  }

  const handleConfirm = () => {
    const selected = filteredClients.filter(c => selectedClientIds.has(getClientId(c)))
    onConfirm(selected)
    onClose()
    setSearchQuery('')
  }

  const selectedCount = filteredClients.filter(c => selectedClientIds.has(getClientId(c))).length

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" />
              {title || 'Select Clients'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {type === 'email' && 'Select clients with email addresses'}
              {type === 'sms' && 'Select clients with phone numbers'}
              {type === 'both' && 'Select clients to send greetings to'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search and Actions */}
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {selectedCount} of {filteredClients.length} selected
              </span>
              {filteredClients.length > 0 && (
                <>
                  <span>•</span>
                  <button
                    onClick={selectAll}
                    className="text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    onClick={deselectAll}
                    className="text-primary hover:underline"
                  >
                    Deselect All
                  </button>
                </>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {clients.length} clients
            </div>
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No clients found matching your search' : 'No clients available'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map((client) => {
                const id = getClientId(client)
                const isSelected = selectedClientIds.has(id)
                const hasEmail = client.email && client.email.trim() && client.email.includes('@')
                const hasPhone = client.phone && client.phone.trim() && client.phone.replace(/\D/g, '').length >= 7

                return (
                  <div
                    key={id}
                    onClick={() => toggleClient(client)}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-all
                      ${isSelected 
                        ? 'bg-primary/10 border-primary ring-2 ring-primary/20' 
                        : 'bg-card hover:bg-muted/50 border-border'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className={`
                        flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5
                        ${isSelected 
                          ? 'bg-primary border-primary' 
                          : 'border-muted-foreground/30'
                        }
                      `}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>

                      {/* Client Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                          {client.totalOrders > 0 && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {client.totalOrders} order{client.totalOrders !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {hasEmail ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                              <span className="text-muted-foreground truncate">{client.email}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground/50">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span>No email</span>
                            </div>
                          )}
                          {hasPhone ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <span className="text-muted-foreground">{client.phone}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground/50">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              <span>No phone</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <div className="text-sm text-muted-foreground">
            {selectedCount > 0 ? (
              <span className="font-medium text-foreground">{selectedCount}</span>
            ) : (
              <span>No clients selected</span>
            )}
            {' '}client{selectedCount !== 1 ? 's' : ''} will receive greetings
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className="min-w-[120px]"
            >
              Send to {selectedCount} {selectedCount === 1 ? 'Client' : 'Clients'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

