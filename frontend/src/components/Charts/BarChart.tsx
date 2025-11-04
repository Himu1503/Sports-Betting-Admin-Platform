import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { ChartContainer } from './ChartContainer'

interface BarChartData {
  name: string
  value: number
  [key: string]: string | number
}

interface BarChartProps {
  title: string
  description?: string
  data: BarChartData[]
  dataKey: string
  xAxisKey?: string
  color?: string
  colors?: string[]
  height?: number
}

export function BarChart({
  title,
  description,
  data,
  dataKey,
  xAxisKey = 'name',
  color = 'hsl(var(--primary))',
  colors,
  height = 300,
}: BarChartProps) {
  const defaultColors = [
    'hsl(var(--primary))',
    'hsl(var(--destructive))',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
  ]

  const chartColors = colors || defaultColors

  // Convert CSS variables to actual colors for SVG rendering
  const getComputedColor = (cssVar: string) => {
    if (!cssVar.startsWith('hsl(var(')) return cssVar
    // Use fallback colors since SVG doesn't support CSS variables
    return cssVar.includes('primary') ? '#3b82f6' :
           cssVar.includes('destructive') ? '#ef4444' :
           cssVar.includes('border') ? '#e5e7eb' :
           cssVar.includes('muted-foreground') ? '#6b7280' :
           '#3b82f6'
  }

  const resolvedColors = chartColors.map(getComputedColor)

  if (!data || data.length === 0) {
    return (
      <ChartContainer title={title} description={description}>
        <div className="flex items-center justify-center h-full min-h-[300px] text-muted-foreground">
          No data available
        </div>
      </ChartContainer>
    )
  }

  console.log('BarChart rendering with data:', data)

  return (
    <ChartContainer title={title} description={description}>
      <div style={{ width: '100%', height: `${height}px`, minHeight: `${height}px` }}>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={getComputedColor('hsl(var(--border))')} />
          <XAxis 
            dataKey={xAxisKey} 
            stroke={getComputedColor('hsl(var(--muted-foreground))')}
            tick={{ fill: getComputedColor('hsl(var(--muted-foreground))') }}
          />
          <YAxis 
            stroke={getComputedColor('hsl(var(--muted-foreground))')}
            tick={{ fill: getComputedColor('hsl(var(--muted-foreground))') }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#111827' }}
          />
          <Legend />
          <Bar dataKey={dataKey} fill={getComputedColor(color)} radius={[4, 4, 0, 0]}>
            {colors && colors.length > 0 && data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={resolvedColors[index % resolvedColors.length]} />
            ))}
            {(!colors || colors.length === 0) && data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={getComputedColor(defaultColors[index % defaultColors.length])} />
            ))}
          </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  )
}

