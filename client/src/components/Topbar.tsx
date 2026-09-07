export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-border bg-background px-6 py-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Exam Preparation Dashboard
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Upload a document and let three AI agents build your study plan.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700"
          title="Active model routed through OpenRouter"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-white" />
          </span>
          openrouter/free
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
          <span className="flex size-5 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
            EP
          </span>
          User
        </span>
      </div>
    </header>
  )
}