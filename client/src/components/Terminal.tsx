import { useEffect, useRef } from 'react'
import { AlertTriangle, CheckCircle2, Circle, XCircle } from 'lucide-react'
import type { LogEntry, LogType } from '@/lib/types'

interface TerminalProps {
  logs: LogEntry[]
}

const ICONS: Record<LogType, typeof Circle> = {
  info: Circle,
  success: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
}

const COLORS: Record<LogType, string> = {
  info: 'text-info',
  success: 'text-success',
  warn: 'text-warning',
  error: 'text-danger',
}

function timeLabel(date: Date): string {
  return date.toLocaleTimeString([], { hour12: false })
}

export function Terminal({ logs }: TerminalProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-inner">
      <div className="flex items-center gap-2 border-b border-neutral-800 bg-black/50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400/80" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-xs text-neutral-500">agent-pipeline · /api/events</span>
      </div>
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-neutral-950 to-transparent"
          aria-hidden="true"
        />
        <div
          ref={scrollRef}
          className="h-64 overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed"
          aria-live="polite"
        >
          {logs.length === 0 ? (
            <p className="text-neutral-500">
              &gt; Waiting for a document... Run the agentic pipeline to stream live status here.
            </p>
          ) : (
            logs.map((log) => {
              const Icon = ICONS[log.type] ?? Circle
              return (
                <div key={log.id} className="flex items-start gap-2.5 py-0.5">
                  <span className="shrink-0 text-neutral-600 tabular-nums">
                    [{timeLabel(log.timestamp)}]
                  </span>
                  <Icon
                    className={`mt-0.5 size-3.5 shrink-0 ${COLORS[log.type] ?? 'text-info'}`}
                    aria-hidden="true"
                  />
                  <span className="text-neutral-200">{log.message}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}