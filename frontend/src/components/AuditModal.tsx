import { useState, useEffect } from 'react'
import Modal from './Modal'
import { AuditLog } from '../types'
import apiClient from '../api/client'

interface AuditModalProps {
  isOpen: boolean
  onClose: () => void
  tableName: string
  rowId: number
}

function AuditModal({ isOpen, onClose, tableName, rowId }: AuditModalProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && tableName && rowId) {
      fetchAuditLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tableName, rowId])

  const fetchAuditLogs = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiClient.get(
        `/api/audit/table/${tableName}/row/${rowId}`
      )
      setAuditLogs(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch audit logs')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getOperationIcon = (operation: string) => {
    switch (operation.toUpperCase()) {
      case 'INSERT':
        return '➕'
      case 'UPDATE':
        return '✏️'
      case 'DELETE':
        return '🗑️'
      default:
        return '📝'
    }
  }

  const getOperationColor = (operation: string) => {
    switch (operation.toUpperCase()) {
      case 'INSERT':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getFieldDiff = (oldData: Record<string, any> | null, newData: Record<string, any> | null) => {
    if (!oldData && !newData) return []
    if (!oldData) return Object.keys(newData || {}).map(key => ({ key, old: null, new: newData![key], type: 'added' }))
    if (!newData) return Object.keys(oldData || {}).map(key => ({ key, old: oldData![key], new: null, type: 'removed' }))

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
    const changes: Array<{ key: string; old: any; new: any; type: 'added' | 'removed' | 'changed' | 'unchanged' }> = []

    allKeys.forEach(key => {
      const oldVal = oldData[key]
      const newVal = newData[key]
      
      if (!(key in oldData)) {
        changes.push({ key, old: null, new: newVal, type: 'added' })
      } else if (!(key in newData)) {
        changes.push({ key, old: oldVal, new: null, type: 'removed' })
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({ key, old: oldVal, new: newVal, type: 'changed' })
      } else {
        changes.push({ key, old: oldVal, new: newVal, type: 'unchanged' })
      }
    })

    return changes
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false'
    }
    return String(value)
  }

  const renderFieldChange = (field: { key: string; old: any; new: any; type: string }) => {
    const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    if (field.type === 'unchanged') return null

    return (
      <div key={field.key} className="mb-3 p-3 rounded-lg border bg-card">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-sm text-foreground">{formatKey(field.key)}</span>
          {field.type === 'added' && (
            <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 border border-green-300">
              Added
            </span>
          )}
          {field.type === 'removed' && (
            <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800 border border-red-300">
              Removed
            </span>
          )}
          {field.type === 'changed' && (
            <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800 border border-blue-300">
              Changed
            </span>
          )}
        </div>
        {field.type === 'removed' && (
          <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded">
            <div className="text-xs font-medium text-red-700 mb-1">Old Value:</div>
            <div className="text-sm text-red-900 font-mono break-words">{formatValue(field.old)}</div>
          </div>
        )}
        {field.type === 'added' && (
          <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded">
            <div className="text-xs font-medium text-green-700 mb-1">New Value:</div>
            <div className="text-sm text-green-900 font-mono break-words">{formatValue(field.new)}</div>
          </div>
        )}
        {field.type === 'changed' && (
          <div className="space-y-2">
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <div className="text-xs font-medium text-red-700 mb-1">Old Value:</div>
              <div className="text-sm text-red-900 font-mono break-words">{formatValue(field.old)}</div>
            </div>
            <div className="flex items-center justify-center text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <div className="p-2 bg-green-50 border border-green-200 rounded">
              <div className="text-xs font-medium text-green-700 mb-1">New Value:</div>
              <div className="text-sm text-green-900 font-mono break-words">{formatValue(field.new)}</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📋 Audit History - ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} #${rowId}`}
    >
      <div className="audit-modal-content">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading audit logs...</span>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-red-600">⚠️</span>
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}
        
        {!isLoading && !error && auditLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-4">📝</div>
            <div className="text-lg font-medium text-foreground mb-2">No audit history</div>
            <div className="text-sm text-muted-foreground">
              No changes have been recorded for this record yet.
            </div>
          </div>
        )}
        
        {!isLoading && !error && auditLogs.length > 0 && (
          <div className="space-y-4">
            {auditLogs.map((log, index) => {
              const fieldChanges = getFieldDiff(log.old_data, log.new_data)
              const hasChanges = fieldChanges.some(f => f.type !== 'unchanged')

              return (
                <div 
                  key={log.id} 
                  className={`relative border rounded-lg overflow-hidden ${
                    index !== auditLogs.length - 1 ? 'border-border bg-card' : 'border-border bg-card shadow-sm'
                  }`}
                >
                  {/* Timeline connector */}
                  {index !== auditLogs.length - 1 && (
                    <div className="absolute left-8 top-12 bottom-0 w-0.5 bg-border"></div>
                  )}

                  {/* Header */}
                  <div className="p-4 bg-muted/30 border-b border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${getOperationColor(log.operation)}`}>
                          <span className="text-sm">{getOperationIcon(log.operation)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getOperationColor(log.operation)}`}>
                              {log.operation}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              by <span className="font-medium text-foreground">{log.username}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatDate(log.changed_at)}</span>
                            <span className="mx-1">•</span>
                            <span className="font-mono">{new Date(log.changed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Changes */}
                  {hasChanges && (
                    <div className="p-4">
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-foreground mb-3">
                          Field Changes ({fieldChanges.filter(f => f.type !== 'unchanged').length})
                        </h4>
                        <div className="space-y-2">
                          {fieldChanges.map(renderFieldChange).filter(Boolean)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Full data view for INSERT/DELETE */}
                  {(log.operation === 'INSERT' || log.operation === 'DELETE') && (
                    <div className="p-4 border-t border-border bg-muted/20">
                      {log.operation === 'INSERT' && log.new_data && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <span>✅</span> Created Data
                          </h4>
                          <div className="bg-background border border-border rounded p-3">
                            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                              {JSON.stringify(log.new_data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                      {log.operation === 'DELETE' && log.old_data && (
                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                            <span>🗑️</span> Deleted Data
                          </h4>
                          <div className="bg-background border border-border rounded p-3">
                            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                              {JSON.stringify(log.old_data, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!hasChanges && log.operation === 'UPDATE' && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No field changes detected
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default AuditModal
