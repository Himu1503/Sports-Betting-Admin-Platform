import React, { useState, useEffect } from 'react'
import './DataTable.css'

interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onViewAudit?: (item: T) => void
  isLoading?: boolean
  emptyMessage?: string
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onEdit,
  onDelete,
  onViewAudit,
  isLoading = false,
  emptyMessage = 'No data available'
}: DataTableProps<T>) {
  const [isLoadingState, setIsLoadingState] = useState(isLoading)

  useEffect(() => {
    setIsLoadingState(isLoading)
  }, [isLoading])

  if (isLoadingState) {
    return <div className="loading">Loading...</div>
  }

  if (data.length === 0) {
    return <div className="empty-message">{emptyMessage}</div>
  }

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.header}</th>
            ))}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => {
            // Generate unique key from id, name, event_id, or index
            const uniqueKey = (item as any).id ?? (item as any).name ?? (item as any).event_id ?? index
            return (
            <tr key={uniqueKey}>
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {column.render
                    ? column.render(item)
                    : String(item[column.key as keyof T] ?? '')}
                </td>
              ))}
              <td className="actions-cell">
                {onViewAudit && (
                  <button
                    className="btn-audit"
                    onClick={() => onViewAudit(item)}
                    title="View Audit Log"
                  >
                    📋
                  </button>
                )}
                {onEdit && (
                  <button
                    className="btn-edit"
                    onClick={() => onEdit(item)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                )}
                {onDelete && (
                  <button
                    className="btn-delete"
                    onClick={() => onDelete(item)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable

