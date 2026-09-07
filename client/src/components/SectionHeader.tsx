import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface SectionHeaderProps {
  step: string
  title: string
  description: string
  icon: LucideIcon
  right?: ReactNode
}

export function SectionHeader({ step, title, description, icon: Icon, right }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground shadow-sm"
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {step}
          </p>
          <h3 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}