import { useRef, useState } from 'react'
import { CalendarPlus, Check, Clock3, Copy, Layers } from 'lucide-react'
import type { CalendarEvent, StudyModule, Syllabus } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SyllabusSectionProps {
  syllabus: Syllabus
  calendar?: CalendarEvent[]
  markdown?: string
}

const MAX_SOURCE_CHARS = 12000

export function buildStudyPrompt(module: StudyModule, markdown?: string): string {
  const topics = Array.isArray(module.topics) && module.topics.length
    ? module.topics.map((topic) => `- ${topic}`).join('\n')
    : '- (no topics listed)'

  const source = markdown && markdown.trim()
    ? markdown.trim().slice(0, MAX_SOURCE_CHARS)
    : 'No source text available for this document.'

  return (
    'You are my personal study tutor for an upcoming exam.\n' +
    '\n' +
    `MODULE TO MASTER: ${module.title}\n` +
    `PLANNED STUDY TIME: ${module.duration || 'varies'}\n` +
    'TOPICS TO COVER:\n' +
    topics +
    '\n\n' +
    'Run a focused study session for me covering exactly this module. For each topic:\n' +
    '1. Explain the concept in plain language with the key definitions, formulas, and rules.\n' +
    '2. Point out what examiners most often test and the most common traps students fall into.\n' +
    '3. Give me one short practice question I can answer to check my understanding.\n' +
    '\n' +
    'End the session by listing the 3-5 things I must memorise from this module. ' +
    'If a required formula or concept is not covered by the source, say so explicitly instead of guessing.\n' +
    '\n' +
    'SOURCE EXCERPTS FROM MY EXAM DOCUMENT (the [[Page N]] markers show which page each part came from):\n' +
    '---\n' +
    source +
    '\n---'
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the textarea fallback below
  }
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(area)
  return ok
}

function parseHours(duration: string): number {
  const match = String(duration ?? '').match(/(\d+(?:\.\d+)?)/)
  return match ? parseFloat(match[1]) : 1
}

export function buildFallbackCalendarUrl(module: StudyModule, index: number): string {
  const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  const start = new Date()
  start.setDate(start.getDate() + 1 + index)
  start.setHours(9, 0, 0, 0)
  const end = new Date(start.getTime() + parseHours(module.duration) * 60 * 60 * 1000)
  const param = (d: Date): string => {
    const p = (n: number): string => String(n).padStart(2, '0')
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`
  }
  const details = encodeURIComponent(`Module ${index + 1}: ${module.title}\nTopics: ${module.topics.join(', ')}`)
  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(`Study: ${module.title}`)}` +
    `&dates=${param(start)}/${param(end)}&details=${details}&ctz=${tz}`
  )
}

function formatRange(startISO: string, endISO: string): string {
  const start = new Date(startISO)
  const end = new Date(endISO)
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
  const sameDay = start.toDateString() === end.toDateString()
  const startLabel = start.toLocaleString(undefined, opts)
  const endLabel = end.toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    ...(sameDay ? {} : { weekday: 'short', month: 'short', day: 'numeric' }),
  })
  return `${startLabel} – ${endLabel}`
}

export function SyllabusSection({ syllabus, calendar, markdown }: SyllabusSectionProps) {
  const modules = syllabus.modules ?? []
  const totalHours = Number(syllabus.totalHours) || 0
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const copiedTimerRef = useRef<number | null>(null)

  const handleCopy = (module: StudyModule, index: number): void => {
    void copyText(buildStudyPrompt(module, markdown)).then((ok) => {
      if (!ok) return
      setCopiedIndex(index)
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = window.setTimeout(() => setCopiedIndex(null), 1800)
    })
  }

  const events = calendar?.length
    ? calendar
    : modules.map((module, index) => ({
        moduleIndex: index + 1,
        title: module.title,
        startISO: '',
        endISO: '',
        timezone: '',
        url: buildFallbackCalendarUrl(module, index),
        topics: module.topics ?? [],
      }))

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-t-4 border-t-black shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock3 className="size-4 text-neutral-500" aria-hidden="true" />
              Estimated Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground tabular-nums">
              {totalHours}
              <span className="ml-1 text-base font-medium text-muted-foreground">hours</span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-black shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Layers className="size-4 text-neutral-500" aria-hidden="true" />
              Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground tabular-nums">{modules.length}</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-black shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarPlus className="size-4 text-neutral-500" aria-hidden="true" />
              Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground tabular-nums">{events.length}</p>
            <p className="text-xs text-muted-foreground">study events ready to add</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((module, index) => {
          const event = events.find((ev) => ev.moduleIndex === index + 1)
          const copied = copiedIndex === index
          return (
            <Card key={`${module.title}-${index}`} className="overflow-hidden shadow-sm transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="border-b border-neutral-200 bg-neutral-50 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-black text-sm font-bold text-white tabular-nums">
                      {index + 1}
                    </span>
                    <div>
                      <CardTitle className="text-sm leading-tight font-semibold">
                        {module.title}
                      </CardTitle>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="size-3" aria-hidden="true" />
                        {module.duration || `${parseHours(module.duration)} hours`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopy(module, index)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                        copied
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-neutral-200 bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                      title="Copy a detailed study prompt for this module"
                    >
                      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                      {copied ? 'Copied' : 'Copy Prompt'}
                    </button>
                    {event && event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-100 px-2.5 py-1.5 text-xs font-semibold text-neutral-700 transition-colors hover:bg-neutral-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        title="Add to Google Calendar"
                      >
                        <CalendarPlus className="size-3.5" aria-hidden="true" />
                        Add to Calendar
                      </a>
                    )}
                  </div>
                </div>
                {event?.startISO ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatRange(event.startISO, event.endISO)}
                    <span className="text-muted-foreground/60"> · {event.timezone}</span>
                  </p>
                ) : null}
              </CardHeader>
              <CardContent className="pt-4">
                {module.topics?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {module.topics.map((topic, topicIndex) => (
                      <Badge
                        key={`${module.title}-${topicIndex}`}
                        variant="secondary"
                        className="rounded-md font-medium"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No topics listed.</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}