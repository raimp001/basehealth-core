import type { ReactNode } from "react"

type Props = {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

/**
 * Consistent section header used across medication, journal, and milestones
 * pages. Tuned for Perplexity-grade contrast: bold display title, soft eyebrow,
 * generous lead, and a tight rule underneath.
 */
export function SectionHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6 pb-4 border-b border-border/60">
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm md:text-[15px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
