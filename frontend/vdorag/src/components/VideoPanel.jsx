export function VideoPanel({ title, message, videoUrl }) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-[0_18px_52px_rgba(0,0,0,0.45)]">
      <div className="flex shrink-0 items-start justify-between gap-3 px-4.5 pt-3.5 pb-3 xl:px-5">
        <div>
          <div className="font-['IBM_Plex_Mono'] text-[0.6rem] uppercase tracking-[0.22em] text-indigo-300">Video</div>
          <h2 className="mt-1 font-['Space_Grotesk'] text-[0.88rem] font-semibold tracking-[-0.03em]">{title}</h2>
        </div>
        <div className="text-right font-['IBM_Plex_Mono'] text-[0.58rem] text-slate-400">{message}</div>
      </div>
      <div className="min-h-0 flex-1 px-4.5 pb-4.5 xl:px-5 xl:pb-5">
        <video className="h-full min-h-[240px] max-h-[calc(100vh-250px)] w-full rounded-[14px] bg-black object-contain" controls playsInline src={videoUrl} />
      </div>
    </section>
  )
}