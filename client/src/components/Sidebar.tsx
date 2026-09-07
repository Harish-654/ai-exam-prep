import { useState } from 'react'
import { BookOpen, FileText, History, Plus, Search, Trash2 } from 'lucide-react'
import type { Session } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarProps {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (session: Session) => void
  onNewSession: () => void
  onRemoveSession: (id: string) => void
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onRemoveSession,
}: SidebarProps) {
  const [query, setQuery] = useState('')

  const filtered = sessions.filter((session) =>
    session.fileName.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-black/40">
          <BookOpen className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg leading-tight font-bold tracking-tight">ExamPrep</h1>
          <p className="text-xs text-neutral-400">Agentic Study Planner</p>
        </div>
      </div>

      <div className="px-4">
        <Button
          onClick={onNewSession}
          className="h-10 w-full bg-sidebar-primary text-sidebar-primary-foreground shadow-md transition-all hover:bg-neutral-200 hover:shadow-lg"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Session
        </Button>
      </div>

      <div className="mt-5 px-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sessions..."
            className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-950 pl-9 pr-3 text-sm text-neutral-200 placeholder:text-neutral-500 focus-visible:border-white focus-visible:ring-2 focus-visible:ring-sidebar-ring/30 focus-visible:outline-none"
          />
        </div>
      </div>

      <h2 className="mt-6 px-5 text-xs font-semibold tracking-widest text-neutral-500 uppercase">
        Past Sessions
      </h2>

      <ScrollArea className="mt-2 min-h-0 flex-1 px-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
            {sessions.length === 0 ? (
              <>
                <span className="flex size-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-500">
                  <History className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-300">No sessions yet</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    Upload a document above — completed runs will appear here.
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-sm font-medium text-neutral-300">No matches</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                  Nothing matches “{query}”. Try a different search.
                </p>
              </div>
            )}
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((session) => {
              const active = session.id === activeSessionId
              return (
                <li key={session.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectSession(session)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelectSession(session)
                      }
                    }}
                    className={`group flex cursor-pointer items-center gap-3 rounded-lg border-l-2 py-2 pr-2 pl-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${
                      active
                        ? 'border-l-white bg-sidebar-accent'
                        : 'border-l-transparent hover:bg-sidebar-accent/70'
                    }`}
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                        active ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      <FileText className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-100">{session.fileName}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">{relativeTime(session.timestamp)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete session ${session.fileName}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onRemoveSession(session.id)
                      }}
                      className="hidden size-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-hover:flex"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </ScrollArea>
    </aside>
  )
}