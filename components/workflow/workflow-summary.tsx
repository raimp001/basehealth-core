"use client"

interface WorkflowSummaryProps {
  steps?: Array<{ label: string; status: "pending" | "active" | "completed" }>
  className?: string
  patientData?: any
}

export function WorkflowSummary({ steps = [], className = "" }: WorkflowSummaryProps) {
  if (!steps.length) return null
  return (
    <ol className={`flex flex-col gap-2 ${className}`}>
      {steps.map((step, idx) => (
        <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
          <span
            className={
              step.status === "completed"
                ? "h-2 w-2 rounded-full bg-emerald-500"
                : step.status === "active"
                  ? "h-2 w-2 rounded-full bg-cyan-500"
                  : "h-2 w-2 rounded-full bg-stone-400"
            }
          />
          {step.label}
        </li>
      ))}
    </ol>
  )
}

export default WorkflowSummary
