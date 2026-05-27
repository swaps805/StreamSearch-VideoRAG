function TraceCard({ doc }) {
  return (
    <details className="group rounded-[14px] border border-white/10 bg-white/[0.03]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3 py-2.5 text-slate-100 outline-none">
        <div className="min-w-0">
          <strong className="block truncate">{doc.tool}</strong>
          <div className="mt-0.5 font-['IBM_Plex_Mono'] text-[0.58rem] uppercase tracking-[0.1em] text-slate-400">{doc.status}</div>
        </div>
        <span className="mt-0.5 font-['IBM_Plex_Mono'] text-[0.58rem] uppercase tracking-[0.1em] text-slate-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-white/10 px-3 pb-3 pt-2">
        <div className="mb-2 whitespace-pre-wrap font-['IBM_Plex_Mono'] text-[0.64rem] leading-5 text-slate-400">{JSON.stringify(doc.args, null, 2)}</div>
        <pre className="m-0 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950/60 p-2.5 font-['Space_Grotesk'] text-[0.75rem] leading-5 text-slate-100 [overflow-wrap:anywhere] [scrollbar-color:rgba(148,163,184,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2">{String(doc.result)}</pre>
      </div>
    </details>
  )
}

export function ObservabilityPanel({ docs, evaluatorOutput }) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-[0_18px_52px_rgba(0,0,0,0.45)]">
      <div className="flex shrink-0 items-start justify-between gap-3 px-4.5 pt-3.5 pb-3 xl:px-5">
        <div>
          <div className="font-['IBM_Plex_Mono'] text-[0.6rem] uppercase tracking-[0.22em] text-indigo-300">Observability</div>
          <h2 className="mt-1 font-['Space_Grotesk'] text-[0.88rem] font-semibold tracking-[-0.03em]">Retrieved documents and evaluator output</h2>
        </div>
        <div className="font-['IBM_Plex_Mono'] text-[0.58rem] text-slate-400">{docs.length} docs</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4.5 pb-4.5 xl:px-5 xl:pb-5 [scrollbar-color:rgba(148,163,184,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
        {docs.length === 0 ? (
          <div className="grid min-h-full place-items-center py-5 text-center text-[0.7rem] text-slate-400">Ask a question to see pipeline events.</div>
        ) : (
          <div className="grid gap-2">
            <details className="group rounded-[16px] border border-white/10 bg-white/[0.03]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3.5 py-3 text-slate-100 outline-none">
                <div>
                  <div className="font-['IBM_Plex_Mono'] text-[0.58rem] uppercase tracking-[0.22em] text-indigo-300">Tools called</div>
                  <div className="mt-1 text-[0.78rem] text-slate-300">{docs.length} tool call{docs.length === 1 ? '' : 's'}</div>
                </div>
                <span className="mt-0.5 font-['IBM_Plex_Mono'] text-[0.58rem] uppercase tracking-[0.1em] text-slate-400 transition group-open:rotate-180">▾</span>
              </summary>
              <div className="max-h-72 overflow-y-auto border-t border-white/10 px-3.5 py-3 [scrollbar-color:rgba(148,163,184,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                <div className="grid gap-2">
                  {docs.map((doc, index) => (
                    <TraceCard key={`${doc.tool}-${index}`} doc={doc} />
                  ))}
                </div>
              </div>
            </details>

            <details className="group rounded-[16px] border border-sky-400/20 bg-white/[0.03]">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-3.5 py-3 text-slate-100 outline-none">
                <div>
                  <div className="font-['IBM_Plex_Mono'] text-[0.58rem] uppercase tracking-[0.22em] text-sky-300">Evaluator</div>
                  <div className="mt-1 text-[0.78rem] text-slate-300">Grounding and quality output</div>
                </div>
                <span className="mt-0.5 font-['IBM_Plex_Mono'] text-[0.58rem] uppercase tracking-[0.1em] text-slate-400 transition group-open:rotate-180">▾</span>
              </summary>
              <div className="max-h-56 overflow-y-auto border-t border-sky-400/20 px-3.5 py-3 [scrollbar-color:rgba(148,163,184,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                <pre className="m-0 whitespace-pre-wrap break-words rounded-xl bg-slate-950/60 p-2.5 font-['Space_Grotesk'] text-[0.72rem] leading-5 text-slate-100 [overflow-wrap:anywhere]">{evaluatorOutput || 'No evaluator output yet.'}</pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </section>
  )
}