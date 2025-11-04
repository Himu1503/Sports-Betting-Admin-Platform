interface PreferencesDisplayProps {
  preferences: Record<string, any>
  compact?: boolean
}

export function PreferencesDisplay({ preferences, compact = false }: PreferencesDisplayProps) {
  // Handle case where preferences might be a string (from database)
  let prefs = preferences
  if (typeof preferences === 'string') {
    try {
      prefs = JSON.parse(preferences)
    } catch {
      prefs = {}
    }
  }

  if (!prefs || typeof prefs !== 'object' || Object.keys(prefs).length === 0) {
    return <span className="text-muted-foreground text-sm">No preferences set</span>
  }

  const formatValue = (value: any, key?: string): string => {
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2)
    }
    if (typeof value === 'number') {
      // Format commission_rate as percentage
      if (key === 'commission_rate' || (value < 1 && value > 0 && key?.includes('rate'))) {
        return `${(value * 100).toFixed(2)}%`
      }
      // Format amounts with proper formatting
      if (key?.includes('amount') || key?.includes('bet')) {
        return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
      return value.toString()
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    return String(value)
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(prefs).map(([key, value]) => (
          <span
            key={key}
            className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium"
            title={`${key}: ${formatValue(value, key)}`}
          >
            <span className="text-muted-foreground mr-1 capitalize">{key.replace(/_/g, ' ')}:</span>
            <span className="font-semibold">{formatValue(value, key)}</span>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {Object.entries(prefs).map(([key, value]) => (
        <div key={key} className="flex items-start gap-2 py-1">
          <span className="text-sm font-medium text-muted-foreground min-w-[120px] capitalize">
            {key.replace(/_/g, ' ')}:
          </span>
          <span className="text-sm text-foreground flex-1">
            {Array.isArray(value) ? (
              <div className="flex flex-wrap gap-1">
                {value.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-xs"
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : (
              formatValue(value, key)
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

