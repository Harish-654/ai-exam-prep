import { useCallback, useState } from 'react'
import { FileText, Layers, MessageSquareText, Play, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UploadOptions } from '@/lib/api'

interface UploadSectionProps {
  file: File | null
  isRunning: boolean
  onFileSelect: (file: File | null) => void
  onRun: (options: UploadOptions) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const ACCEPTED = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.epub,.md,.txt,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff'

export function UploadSection({ file, isRunning, onFileSelect, onRun }: UploadSectionProps) {
  const [dragging, setDragging] = useState(false)
  const [pages, setPages] = useState('')
  const [prompt, setPrompt] = useState('')

  const isPdf = file ? file.name.toLowerCase().endsWith('.pdf') : false

  const acceptFile = useCallback(
    (candidate: File | null | undefined) => {
      if (!candidate) return
      if (!candidate.name || !candidate.name.trim()) return
      onFileSelect(candidate)
    },
    [onFileSelect],
  )

  const pickFile = (): void => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = ACCEPTED
    input.onchange = () => acceptFile(input.files?.[0])
    input.click()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault()
    setDragging(false)
    acceptFile(event.dataTransfer.files?.[0])
  }

  const handleRun = (): void => {
    onRun({
      pages: isPdf && pages.trim() ? pages.trim() : undefined,
      prompt: prompt.trim() ? prompt.trim() : undefined,
    })
  }

  return (
    <section id="upload-section" className="flex flex-col">
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload a document"
          aria-disabled={isRunning}
          onClick={() => !isRunning && pickFile()}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && !isRunning) pickFile()
          }}
          onDragOver={(event) => {
            event.preventDefault()
            if (!isRunning) setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all duration-200 ${
            dragging
              ? 'border-transparent bg-neutral-100'
              : 'border-neutral-300 bg-muted/50 hover:border-neutral-400 hover:bg-neutral-50'
          } focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none ${
            isRunning ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <span
            aria-hidden="true"
            className={`dropzone-shimmer pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300 ${
              dragging ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            className={`mb-5 flex size-16 items-center justify-center rounded-2xl transition-all duration-200 ${
              dragging ? 'bg-black text-white shadow-lg shadow-black/20' : 'bg-neutral-200 text-black group-hover:bg-black group-hover:text-white'
            }`}
          >
            <UploadCloud className="size-7" aria-hidden="true" />
          </div>
          <p className="text-lg font-semibold tracking-tight text-foreground">
            Drop your exam prep document
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            or{' '}
            <span className="font-medium text-foreground underline underline-offset-4">
              browse files
            </span>{' '}
            from your device
          </p>
          <p className="mt-4 text-xs text-muted-foreground/80">
            PDF, DOCX, PPTX, XLSX, EPUB, MD, TXT, images &nbsp;·&nbsp; up to 50 MB
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
              <FileText className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{formatSize(file.size)}</p>
            </div>
            <button
              type="button"
              aria-label="Remove file"
              onClick={() => onFileSelect(null)}
              disabled={isRunning}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-red-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
            <Button
              size="lg"
              disabled={isRunning}
              onClick={handleRun}
              className="h-10 shrink-0 gap-2 px-5 text-sm font-semibold shadow-md transition-all hover:shadow-lg"
            >
              <Play className="size-4" aria-hidden="true" />
              {isRunning ? 'Running...' : 'Run Pipeline'}
            </Button>
          </div>

          <div className="grid items-start gap-3 border-t border-border bg-muted/40 px-4 py-3 sm:grid-cols-[210px_1fr]">
            {isPdf ? (
              <div className="min-w-0">
                <Label htmlFor="page-range" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Layers className="size-3.5" aria-hidden="true" />
                  Pages to include
                </Label>
                <Input
                  id="page-range"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="e.g. 1-5, 8"
                  value={pages}
                  onChange={(event) =>
                    setPages(event.target.value.replace(/[^\d,\s-]/g, '').slice(0, 50))
                  }
                  disabled={isRunning}
                  className="mt-1.5 h-8"
                />
                <p className="mt-1 text-[11px] text-muted-foreground/80">Empty = all pages</p>
              </div>
            ) : null}
            <div className={isPdf ? 'min-w-0' : 'min-w-0 sm:col-span-full'}>
              <Label htmlFor="study-prompt" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MessageSquareText className="size-3.5" aria-hidden="true" />
                Study guidance for the agents (optional)
              </Label>
              <textarea
                id="study-prompt"
                rows={1}
                maxLength={1000}
                placeholder="e.g. Focus on debits & credits — I keep mixing them up."
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                disabled={isRunning}
                className="mt-1.5 h-8 w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {isRunning && (
            <div
              className="h-1 w-full overflow-hidden rounded-none bg-neutral-100"
              role="progressbar"
              aria-label="Pipeline progress"
            >
              <div className="progress-indeterminate h-full w-1/3 rounded-full bg-foreground" />
            </div>
          )}
        </div>
      )}
    </section>
  )
}