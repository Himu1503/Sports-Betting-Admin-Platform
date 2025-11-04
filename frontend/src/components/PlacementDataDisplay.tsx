interface PlacementDataDisplayProps {
  placementData: Record<string, any>
  compact?: boolean
}

export function PlacementDataDisplay({ placementData, compact = false }: PlacementDataDisplayProps) {
  // Handle case where placementData might be a string (from database)
  let data = placementData
  if (typeof placementData === 'string') {
    try {
      data = JSON.parse(placementData)
    } catch {
      data = {}
    }
  }

  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    return <span className="text-muted-foreground text-sm">No data</span>
  }

  const formatValue = (value: any): string => {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value)
    }
    return String(value)
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(data).map(([key, value]) => (
          <span
            key={key}
            className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-xs font-medium"
            title={`${key}: ${formatValue(value)}`}
          >
            <span className="text-muted-foreground mr-1 text-xs capitalize">{key.replace(/_/g, ' ')}:</span>
            <span className="font-semibold text-xs">{formatValue(value)}</span>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 py-1">
          <span className="text-xs font-medium text-muted-foreground min-w-[80px] capitalize">
            {key.replace(/_/g, ' ')}:
          </span>
          <span className="text-xs text-foreground flex-1 break-words">
            {formatValue(value)}
          </span>
        </div>
      ))}
    </div>
  )
}

