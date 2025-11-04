import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface PlacementDataEditorProps {
  placementData: Record<string, any>
  onChange: (data: Record<string, any>) => void
}

export function PlacementDataEditor({ placementData, onChange }: PlacementDataEditorProps) {
  const [fields, setFields] = useState<Array<{ key: string; value: string | number | boolean; type: 'string' | 'number' | 'boolean' }>>([])
  const [useAdvanced, setUseAdvanced] = useState(false)
  const [jsonText, setJsonText] = useState('')

  useEffect(() => {
    if (placementData && Object.keys(placementData).length > 0) {
      const entries = Object.entries(placementData).map(([key, value]) => ({
        key,
        value: value,
        type: (typeof value === 'number' ? 'number' as const :
               typeof value === 'boolean' ? 'boolean' as const :
               'string' as const)
      }))
      setFields(entries)
      setJsonText(JSON.stringify(placementData, null, 2))
    } else {
      setFields([{ key: '', value: '' as string, type: 'string' }])
      setJsonText('{\n  \n}')
    }
  }, [placementData])

  const updateField = (index: number, field: 'key' | 'value' | 'type', newValue: any) => {
    const updated = [...fields]
    if (field === 'value') {
      if (updated[index].type === 'number') {
        updated[index].value = parseFloat(String(newValue)) || 0
      } else if (updated[index].type === 'boolean') {
        updated[index].value = (newValue === 'true' || newValue === true)
      } else {
        updated[index].value = String(newValue)
      }
    } else if (field === 'type') {
      updated[index].type = newValue
      // Reset value when type changes
      if (newValue === 'number') {
        updated[index].value = 0
      } else if (newValue === 'boolean') {
        updated[index].value = false
      } else {
        updated[index].value = ''
      }
    } else {
      updated[index][field] = newValue
    }
    setFields(updated)
    syncToParent(updated)
  }

  const addField = () => {
    setFields([...fields, { key: '', value: '' as string, type: 'string' }])
  }

  const removeField = (index: number) => {
    const updated = fields.filter((_, i) => i !== index)
    if (updated.length === 0) {
      updated.push({ key: '', value: '' as string, type: 'string' })
    }
    setFields(updated)
    syncToParent(updated)
  }

  const syncToParent = (updatedFields?: typeof fields) => {
    const current = updatedFields || fields
    const dataObj: Record<string, any> = {}
    current.forEach(field => {
      if (field.key) {
        dataObj[field.key] = field.value
      }
    })
    onChange(dataObj)
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
        <label className="text-sm font-medium">Placement Data</label>
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
            {fields.map((field, index) => (
              <div key={index} className="flex gap-2 items-start p-2 border border-border rounded bg-background/50">
                <div className="flex-1 grid grid-cols-12 gap-2">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Key (e.g. selection)"
                      value={field.key}
                      onChange={(e) => updateField(index, 'key', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                    />
                  </div>
                  <div className="col-span-2">
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, 'type', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-border rounded bg-background"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                    </select>
                  </div>
                  <div className="col-span-5">
                    {field.type === 'boolean' ? (
                      <select
                        value={String(field.value)}
                        onChange={(e) => updateField(index, 'value', e.target.value === 'true')}
                        className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                      >
                        <option value="true">True</option>
                        <option value="false">False</option>
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        step={field.type === 'number' ? '0.01' : undefined}
                        placeholder={`Enter ${field.type}`}
                        value={String(field.value || '')}
                        onChange={(e) => updateField(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                      />
                    )}
                  </div>
                  <div className="col-span-1 flex items-center">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeField(index)}
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
            onClick={addField}
            className="w-full"
          >
            + Add Field
          </Button>
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            <p className="font-semibold mb-1">Common fields:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><code>selection</code>: Bet selection (e.g., "home_win", "over_210.5")</li>
              <li><code>market</code>: Market type (e.g., "1X2", "total_points")</li>
              <li><code>error</code>: Error message (for failed bets)</li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 text-sm font-mono border border-border rounded bg-background"
            placeholder='{"selection": "home_win", "market": "1X2"}'
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter valid JSON format. Common fields: <code>selection</code>, <code>market</code>, <code>error</code>
          </p>
        </div>
      )}
    </div>
  )
}

