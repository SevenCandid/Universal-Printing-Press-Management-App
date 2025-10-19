import { ReactNode } from 'react'

interface SimpleChartProps {
  title: string
  children: ReactNode
  className?: string
}

export function SimpleChart({ title, children, className }: SimpleChartProps) {
  return (
    <div className={`rounded-lg border border-border bg-card p-6 ${className || ''}`}>
      <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>
      <div className="h-64 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}














