export function UploadHero({ audioChunkDuration, setAudioChunkDuration, videoChunkDuration, setVideoChunkDuration }) {
  return (
    <section className="max-w-[640px] px-4 text-center">
      <h1 className="mt-1 mb-2 font-['Space_Grotesk'] text-[clamp(1.8rem,5vw,3.2rem)] font-bold leading-[1.02] tracking-[-0.03em] text-slate-50">
        Ingest a video, then ask about any moment.
      </h1>
      <p className="mx-auto max-w-[600px] text-[0.95rem] leading-[1.6] text-slate-400">
        Upload a video and the backend extracts audio transcripts and visual keyframes before opening the chat workspace.
      </p>

      <div className="mt-4 flex items-center justify-center gap-3 text-sm text-slate-300">
        <label className="flex items-center gap-2">
          <span className="font-['IBM_Plex_Mono'] text-[0.65rem] text-slate-400 uppercase">Audio chunk (s)</span>
          <input
            type="number"
            min={10}
            step={5}
            value={audioChunkDuration}
            onChange={(e) => setAudioChunkDuration(Math.max(Number(e.target.value) || 10, 10))}
            className="w-28 rounded-md border border-white/10 bg-white/3 px-3 py-2 text-[1rem] font-medium text-slate-100 outline-none"
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="font-['IBM_Plex_Mono'] text-[0.65rem] text-slate-400 uppercase">Video chunk (s)</span>
          <input
            type="number"
            min={10}
            step={5}
            value={videoChunkDuration}
            onChange={(e) => setVideoChunkDuration(Math.max(Number(e.target.value) || 10, 10))}
            className="w-28 rounded-md border border-white/10 bg-white/3 px-3 py-2 text-[1rem] font-medium text-slate-100 outline-none"
          />
        </label>
      </div>
    </section>
  )
}