import { useCallback, useEffect, useRef, useState } from 'react'
import { ListTree, TerminalSquare, UploadCloud } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { Topbar } from '@/components/Topbar'
import { UploadSection } from '@/components/UploadSection'
import { Terminal } from '@/components/Terminal'
import { SectionHeader } from '@/components/SectionHeader'
import { SyllabusSection } from '@/components/SyllabusSection'
import { uploadDocument, type UploadOptions } from '@/lib/api'
import { loadSessions, removeSession, saveSession } from '@/lib/storage'
import type { LogEntry, LogType, Session } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'

const STAGED_LOGS: Array<{ type: LogType; message: string; delayMs: number }> = [
  { type: 'info', message: 'Inspecting upload environment...', delayMs: 0 },
  { type: 'info', message: '[1/3] Parsing document (text extraction, page selection, OCR)...', delayMs: 300 },
  { type: 'info', message: '[2/3] Planner Agent analyzing context and estimating prep hours...', delayMs: 1400 },
  { type: 'info', message: '[3/3] Finalizing calendar payload and response...', delayMs: 2800 },
  { type: 'success', message: 'Pipeline complete. Session saved locally.', delayMs: 4200 },
]

const MAX_LOGS = 250

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions())
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [streamConnected, setStreamConnected] = useState(false)

  const logIdRef = useRef(1)
  const sseConnectedRef = useRef(false)
  const fallbackTimersRef = useRef<number[]>([])

  const pushLog = useCallback((type: LogType, message: string): void => {
    setLogs((prev) => {
      const next = [
        ...prev,
        { id: logIdRef.current++, type, message, timestamp: new Date() },
      ]
      return next.slice(-MAX_LOGS)
    })
  }, [])

  useEffect(() => {
    const source = new EventSource('/api/events')
    source.onopen = () => {
      sseConnectedRef.current = true
      setStreamConnected(true)
      pushLog('info', 'Connected to agent pipeline stream (/api/events).')
    }
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type?: LogType; message?: string }
        if (data && data.type && data.message) {
          pushLog(data.type, data.message)
        }
      } catch {
        // ignore malformed keep-alive or event frames
      }
    }
    source.onerror = () => {
      sseConnectedRef.current = false
      setStreamConnected(false)
    }
    return () => {
      source.close()
      fallbackTimersRef.current.forEach(clearTimeout)
      fallbackTimersRef.current = []
    }
  }, [pushLog])

  const runFallbackLogs = useCallback(() => {
    for (const stage of STAGED_LOGS) {
      const timer = window.setTimeout(() => pushLog(stage.type, stage.message), stage.delayMs)
      fallbackTimersRef.current.push(timer)
    }
  }, [pushLog])

  const handleRun = useCallback(
    async (options: UploadOptions) => {
      if (!file || isRunning) return
      setIsRunning(true)
      if (!sseConnectedRef.current) runFallbackLogs()

      try {
        const result = await uploadDocument(file, options)
        const next = saveSession(result)
        setSessions(next)
        setCurrentSession(next[0])
        setFile(null)
        pushLog('success', `Session saved to history: ${result.fileName}`)
      } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      if (!sseConnectedRef.current) {
        pushLog('error', `Pipeline failed: ${message}`)
      }
    } finally {
      setIsRunning(false)
    }
  },
    [file, isRunning, pushLog, runFallbackLogs],
  )

  const handleNewSession = useCallback(() => {
    setCurrentSession(null)
    setFile(null)
    setIsRunning(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleSelectSession = useCallback((session: Session) => {
    setCurrentSession(session)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleRemoveSession = useCallback(
    (id: string) => {
      setSessions(removeSession(id))
      setCurrentSession((current) => (current && current.id === id ? null : current))
    },
    [],
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        sessions={sessions}
        activeSessionId={currentSession?.id ?? null}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onRemoveSession={handleRemoveSession}
      />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <Topbar />
        <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
          <Card data-section="upload" className="shadow-sm">
            <CardContent className="pt-6">
              <SectionHeader
                step="01"
                icon={UploadCloud}
                title="Upload Document"
                description="PDF, DOCX, PPTX, XLSX, EPUB, or plain text — up to 50 MB."
              />
              <div className="mt-6">
                <UploadSection
                  file={file}
                  isRunning={isRunning}
                  onFileSelect={setFile}
                  onRun={handleRun}
                />
              </div>
            </CardContent>
          </Card>

          <Card data-section="terminal" className="shadow-sm">
            <CardContent className="pt-6">
              <SectionHeader
                step="02"
                icon={TerminalSquare}
                title="Agent Terminal"
                description="Live status stream from the Planner → Tutor → Critic agent pipeline."
                right={
                  <span className="hidden items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground sm:inline-flex">
                    <span
                      className={`size-1.5 rounded-full ${streamConnected ? 'bg-success' : 'bg-muted-foreground'}`}
                      aria-hidden="true"
                    />
                    {streamConnected ? 'live' : 'fallback'}
                  </span>
                }
              />
              <div className="mt-6">
                <Terminal logs={logs} />
              </div>
            </CardContent>
          </Card>

          {currentSession ? (
            <Card data-section="syllabus" className="shadow-sm">
              <CardContent className="pt-6">
                <SectionHeader
                  step="03"
                  icon={ListTree}
                  title="Syllabus & Action Plan"
                  description="Estimated preparation time and study modules, with calendar events ready to add."
                />
                <div className="mt-6">
                  <SyllabusSection
                    syllabus={currentSession.syllabus}
                    calendar={currentSession.calendar}
                    markdown={currentSession.markdown}
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          <footer className="border-t border-border pt-4 pb-4 text-center text-xs text-muted-foreground">
            Powered by OpenRouter · Node.js + Python (MarkItDown · OCR · page selection) · Planning agent pipeline · per-module study prompts
          </footer>
        </div>
      </main>
    </div>
  )
}