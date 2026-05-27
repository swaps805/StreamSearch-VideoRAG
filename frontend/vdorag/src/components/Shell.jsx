export function Shell({ children, statusLabel }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 pt-3 pb-[15px] text-slate-100 md:px-5 lg:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(123,147,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(123,147,255,0.07)_1px,transparent_1px)] bg-[size:72px_72px] opacity-35 [mask-image:radial-gradient(circle_at_center,black_35%,transparent_85%)]" />
      <div className="relative z-10 mx-auto flex min-h-[calc(150vh-16px)] max-w-[1500px] flex-col gap-3.5">
        <header className="flex items-center justify-between gap-4 px-1 pb-1">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_0_8px_rgba(107,227,192,0.14)]" />
            <div>
              <div className="text-[1.05rem] font-extrabold tracking-[-0.03em]">StreamSearch Video RAG</div>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 font-['IBM_Plex_Mono'] text-[0.66rem] uppercase tracking-[0.08em] text-slate-300">
            {statusLabel}
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}