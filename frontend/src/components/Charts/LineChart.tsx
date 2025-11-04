import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { ChartContainer } from './ChartContainer'

interface LineChartData {
  [key: string]: string | number
}

interface LineChartProps {
  title: string
  description?: string
  data: LineChartData[]
  xAxisKey: string
  lines: Array<{
    dataKey: string
    name: string
    color?: string
  }>
  height?: number
}

const defaultColors = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
]

export function LineChart({
  title,
  description,
  data,
  xAxisKey,
  lines,
  height = 300,
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title={title} description={description}>
        <div className="flex items-center justify-center h-full min-h-[300px] text-muted-foreground">
          No data available
        </div>
      </ChartContainer>
    )
  }

  const getComputedColor = (cssVar: string) => {
    if (!cssVar || !cssVar.startsWith('hsl(var(')) return cssVar
    return cssVar.includes('primary') ? '#3b82f6' : '#3b82f6'
  }

  console.log('LineChart rendering with data:', data)

  return (
    <ChartContainer title={title} description={description}>
      <div style={{ width: '100%', height: `${height}px`, minHeight: `${height}px` }}>
        <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey={xAxisKey}
            stroke="#6b7280"
            tick={{ fill: '#6b7280' }}
          />
          <YAxis 
            stroke="#6b7280"
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#111827' }}
          />
          <Legend
            wrapperStyle={{ color: '#111827' }}
          />
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color ? getComputedColor(line.color) : defaultColors[index % defaultColors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  )
}

