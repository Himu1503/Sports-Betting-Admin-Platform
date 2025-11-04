import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '../api/client'
import { AuditLog } from '../types'
import './Page.css'

function AuditLogs() {
  const [filters, setFilters] = useState({
    table_name: '',
    operation: '',
    row_id: '',
  })
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  const { data: auditLogs = [], isLoading, error, refetch } = useQuery<AuditLog[]>({
    queryKey: ['auditLogs', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.table_name) params.append('table_name', filters.table_name)
      if (filters.operation) params.append('operation', filters.operation)
      if (filters.row_id) params.append('row_id', filters.row_id)
      
      const response = await apiClient.get(`/api/audit?${params.toString()}`)
      return response.data
    },
  })

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

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setIsDetailModalOpen(true)
  }

  const handleClearFilters = () => {
    setFilters({ table_name: '', operation: '', row_id: '' })
  }

  // Get unique table names for filter dropdown
  const uniqueTables = Array.from(new Set(auditLogs.map(log => log.table_name))).sort()

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h2 className="text-2xl font-bold text-foreground">Audit Logs</h2>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-red-600">Error loading audit logs: {String(error)}</p>
          <button 
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="text-2xl font-bold text-foreground">📋 Audit Logs</h2>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Table Name</label>
            <select
              value={filters.table_name}
              onChange={(e) => setFilters({ ...filters, table_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded bg-background"
            >
              <option value="">All Tables</option>
              {uniqueTables.map(table => (
                <option key={table} value={table}>{table}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Operation</label>
            <select
              value={filters.operation}
              onChange={(e) => setFilters({ ...filters, operation: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded bg-background"
            >
              <option value="">All Operations</option>
              <option value="INSERT">Insert</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Row ID</label>
            <input
              type="number"
              value={filters.row_id}
              onChange={(e) => setFilters({ ...filters, row_id: e.target.value })}
              placeholder="Filter by row ID"
              className="w-full px-3 py-2 border border-border rounded bg-background"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading audit logs...</p>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">📝</div>
          <div className="text-lg font-medium text-foreground mb-2">No audit logs found</div>
          <div className="text-sm text-muted-foreground">
            {Object.values(filters).some(f => f) 
              ? 'Try adjusting your filters'
              : 'No changes have been recorded yet'}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-sm">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Operation</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Table</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Row ID</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">User</th>
                  <th className="text-left py-3 px-4 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-border hover:bg-muted/30">
                    <td className="py-3 px-4 text-sm">
                      <div className="font-medium">{formatDate(log.changed_at)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(log.changed_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getOperationColor(log.operation)}`}>
                        <span>{getOperationIcon(log.operation)}</span>
                        {log.operation}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium capitalize">
                      {log.table_name}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                      {log.row_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {log.username}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleViewDetails(log)}
                        className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${isDetailModalOpen ? 'block' : 'hidden'}`}
          onClick={() => setIsDetailModalOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-xl font-bold">
                Audit Log Details - {selectedLog.table_name} #{selectedLog.row_id}
              </h3>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Operation</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold border ${getOperationColor(selectedLog.operation)}`}>
                      <span>{getOperationIcon(selectedLog.operation)}</span>
                      {selectedLog.operation}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User</label>
                  <div className="mt-1 text-sm font-medium">{selectedLog.username}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Time</label>
                  <div className="mt-1 text-sm">{formatDate(selectedLog.changed_at)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Table</label>
                  <div className="mt-1 text-sm font-medium capitalize">{selectedLog.table_name}</div>
                </div>
              </div>

              {selectedLog.operation === 'UPDATE' && selectedLog.old_data && selectedLog.new_data && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3">Field Changes</h4>
                  <div className="space-y-3">
                    {getFieldDiff(selectedLog.old_data, selectedLog.new_data)
                      .filter(f => f.type !== 'unchanged')
                      .map((field, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm">
                              {field.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            {field.type === 'added' && (
                              <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">Added</span>
                            )}
                            {field.type === 'removed' && (
                              <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-800">Removed</span>
                            )}
                            {field.type === 'changed' && (
                              <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">Changed</span>
                            )}
                          </div>
                          {field.type === 'removed' && (
                            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm font-mono">
                              {formatValue(field.old)}
                            </div>
                          )}
                          {field.type === 'added' && (
                            <div className="p-2 bg-green-50 border border-green-200 rounded text-sm font-mono">
                              {formatValue(field.new)}
                            </div>
                          )}
                          {field.type === 'changed' && (
                            <div className="space-y-2">
                              <div className="p-2 bg-red-50 border border-red-200 rounded text-sm font-mono">
                                <div className="text-xs font-medium text-red-700 mb-1">Old:</div>
                                {formatValue(field.old)}
                              </div>
                              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm font-mono">
                                <div className="text-xs font-medium text-green-700 mb-1">New:</div>
                                {formatValue(field.new)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {(selectedLog.operation === 'INSERT' || selectedLog.operation === 'DELETE') && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-3">
                    {selectedLog.operation === 'INSERT' ? 'Created Data' : 'Deleted Data'}
                  </h4>
                  <div className="bg-muted/30 border border-border rounded p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(
                        selectedLog.operation === 'INSERT' ? selectedLog.new_data : selectedLog.old_data,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AuditLogs

