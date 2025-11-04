import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface PreferencesEditorProps {
  preferences: Record<string, any>
  onChange: (preferences: Record<string, any>) => void
}

export function PreferencesEditor({ preferences, onChange }: PreferencesEditorProps) {
  const [prefs, setPrefs] = useState<Array<{ key: string; value: any; type: 'string' | 'number' | 'boolean' | 'array' }>>([])
  const [useAdvanced, setUseAdvanced] = useState(false)
  const [jsonText, setJsonText] = useState('')

  useEffect(() => {
    if (preferences && Object.keys(preferences).length > 0) {
      const entries = Object.entries(preferences).map(([key, value]) => ({
        key,
        value,
        type: Array.isArray(value) ? 'array' as const :
              typeof value === 'number' ? 'number' as const :
              typeof value === 'boolean' ? 'boolean' as const :
              'string' as const
      }))
      setPrefs(entries)
      setJsonText(JSON.stringify(preferences, null, 2))
    } else {
      setPrefs([{ key: '', value: '', type: 'string' }])
      setJsonText('{\n  \n}')
    }
  }, [preferences])

  const updatePrefs = (index: number, field: 'key' | 'value' | 'type', newValue: any) => {
    const updated = [...prefs]
    if (field === 'value') {
      // Handle value conversion based on type
      if (updated[index].type === 'number') {
        updated[index].value = parseFloat(newValue) || 0
      } else if (updated[index].type === 'boolean') {
        updated[index].value = newValue === 'true' || newValue === true
      } else if (updated[index].type === 'array') {
        // Parse comma-separated string to array
        updated[index].value = typeof newValue === 'string' 
          ? newValue.split(',').map(s => s.trim()).filter(s => s)
          : Array.isArray(newValue) ? newValue : []
      } else {
        updated[index].value = newValue
      }
    } else {
      updated[index][field] = newValue
    }
    setPrefs(updated)
    syncToParent(updated)
  }

  const addPreference = () => {
    setPrefs([...prefs, { key: '', value: '', type: 'string' }])
  }

  const removePreference = (index: number) => {
    const updated = prefs.filter((_, i) => i !== index)
    if (updated.length === 0) {
      updated.push({ key: '', value: '', type: 'string' })
    }
    setPrefs(updated)
    syncToParent(updated)
  }

  const syncToParent = (updatedPrefs?: typeof prefs) => {
    const current = updatedPrefs || prefs
    const prefsObj: Record<string, any> = {}
    current.forEach(pref => {
      if (pref.key) {
        prefsObj[pref.key] = pref.value
      }
    })
    onChange(prefsObj)
  }

  const handleJsonChange = (json: string) => {
    setJsonText(json)
    try {
      const parsed = JSON.parse(json)
      if (typeof parsed === 'object' && parsed !== null) {
        onChange(parsed)
      }
    } catch (e) {
      // Invalid JSON, but let user continue typing
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Preferences</label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={!useAdvanced ? "default" : "outline"}
            size="sm"
            onClick={() => setUseAdvanced(false)}
          >
            Structured
          </Button>
          <Button
            type="button"
            variant={useAdvanced ? "default" : "outline"}
            size="sm"
            onClick={() => setUseAdvanced(true)}
          >
            JSON Editor
          </Button>
        </div>
      </div>

      {!useAdvanced ? (
        <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
          <div className="space-y-2">
            {prefs.map((pref, index) => (
              <div key={index} className="flex gap-2 items-start p-2 border border-border rounded bg-background/50">
                <div className="flex-1 grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Key (e.g. commission_rate)"
                      value={pref.key}
                      onChange={(e) => updatePrefs(index, 'key', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={pref.type}
                      onChange={(e) => updatePrefs(index, 'type', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-border rounded bg-background"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="array">Array</option>
                    </select>
                  </div>
                  <div className="col-span-5">
                    {pref.type === 'boolean' ? (
                      <select
                        value={String(pref.value)}
                        onChange={(e) => updatePrefs(index, 'value', e.target.value === 'true')}
                        className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : pref.type === 'array' ? (
                      <input
                        type="text"
                        placeholder="Comma-separated (e.g. Football, Basketball)"
                        value={Array.isArray(pref.value) ? pref.value.join(', ') : String(pref.value || '')}
                        onChange={(e) => updatePrefs(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                      />
                    ) : (
                      <input
                        type={pref.type === 'number' ? 'number' : 'text'}
                        step={pref.type === 'number' ? '0.01' : undefined}
                        placeholder={pref.type === 'number' ? '0.05 (for 5%)' : `Enter ${pref.type}`}
                        value={pref.value || ''}
                        onChange={(e) => updatePrefs(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                      />
                    )}
                  </div>
                  <div className="col-span-1 flex items-center">
                    {prefs.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removePreference(index)}
                        className="w-full h-9"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addPreference}
            className="w-full"
          >
            + Add Preference
          </Button>
        </div>
      ) : (
        <div>
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 text-sm font-mono border border-border rounded bg-background"
            placeholder='{"commission_rate": 0.05, "supported_sports": ["Football", "Basketball"]}'
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter valid JSON format. Common fields:
          </p>
          <ul className="text-xs text-muted-foreground mt-1 ml-4 list-disc space-y-0.5">
            <li><code>commission_rate</code>: Decimal (e.g., 0.05 = 5%)</li>
            <li><code>supported_sports</code>: Array of strings (e.g., ["Football", "Basketball"])</li>
            <li><code>min_bet_amount</code>: Minimum bet amount</li>
            <li><code>max_bet_amount</code>: Maximum bet amount</li>
            <li><code>currency</code>: Default currency code</li>
            <li><code>api_endpoint</code>: External API URL (if applicable)</li>
          </ul>
        </div>
      )}
    </div>
  )
}

