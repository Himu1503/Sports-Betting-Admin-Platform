import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { ChartContainer } from './ChartContainer'

interface PieChartData {
  name: string
  value: number
  [key: string]: string | number
}

interface PieChartProps {
  title: string
  description?: string
  data: PieChartData[]
  dataKey: string
  nameKey?: string
  colors?: string[]
  height?: number
}

const defaultColors = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

export function PieChart({
  title,
  description,
  data,
  dataKey,
  nameKey = 'name',
  colors = defaultColors,
  height = 300,
}: PieChartProps) {
  if (!data || data.length === 0) {
    return (
      <ChartContainer title={title} description={description}>
        <div className="flex items-center justify-center h-full min-h-[300px] text-muted-foreground">
          No data available
        </div>
      </ChartContainer>
    )
  }

  console.log('PieChart rendering with data:', data)

  return (
    <ChartContainer title={title} description={description}>
      <div style={{ width: '100%', height: `${height}px`, minHeight: `${height}px` }}>
        <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props: any) => {
              const { name, percent } = props
              return `${name}: ${((percent || 0) * 100).toFixed(0)}%`
            }}
            outerRadius={80}
            fill="#3b82f6"
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
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
        </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  )
}

