import { ReactNode } from 'react'
import './ChartContainer.css'

interface ChartContainerProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function ChartContainer({ title, description, children, className = '' }: ChartContainerProps) {
  return (
    <div className={`chart-container ${className}`}>
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        {description && <p className="chart-description">{description}</p>}
      </div>
      <div className="chart-content">
        {children}
      </div>
    </div>
  )
}

