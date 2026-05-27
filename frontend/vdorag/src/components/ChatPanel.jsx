import { useEffect, useRef } from 'react'

const promptChips = [
  'Summarize the video in one paragraph.',
  'What happens around the middle of the video?',
  'Point out any on-screen text or visible objects.',
]

export function ChatPanel({ messages, question, setQuestion, isSending, elapsedSec, onSubmit, onCancel, onQuickPrompt, onReset }) {
  const streamRef = useRef(null)

  useEffect(() => {
    if (!streamRef.current) {
      return
    }

    streamRef.current.scrollTop = streamRef.current.scrollHeight
  }, [messages, isSending])

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] border border-white/10 bg-gradient-to-b from-slate-900/95 to-slate-950/95 shadow-[0_18px_52px_rgba(0,0,0,0.45)] pb-6">
      <div className="shrink-0 flex items-center justify-between gap-3 px-4.5 pt-3.5 pb-3 xl:px-5">
        <div>
          <div className="font-['IBM_Plex_Mono'] text-[0.62rem] uppercase tracking-[0.24em] text-indigo-300">Chat</div>
          <h2 className="mt-1 font-['Space_Grotesk'] text-[0.88rem] font-semibold tracking-[-0.03em]">Ask about any moment in the video</h2>
        </div>
        <button type="button" onClick={onReset} className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-1 font-['IBM_Plex_Mono'] text-[0.64rem] text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10">
          New upload
        </button>
      </div>

      <div ref={streamRef} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4.5 pb-6 xl:px-5 [scrollbar-color:rgba(148,163,184,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
        {messages.length === 0 ? (
          <div className="grid min-h-full place-items-center content-center gap-2 py-7 text-center text-slate-400">
            <div className="max-w-[28rem] font-['Space_Grotesk'] text-[0.84rem] font-bold leading-5.5 text-slate-50">Video indexed. I can answer questions about any moment in this video.</div>
            <div className="text-[0.75rem] leading-4.5">Ask about visual content, spoken words, or a timestamp.</div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {promptChips.map((prompt) => (
                <button key={prompt} type="button" onClick={() => onQuickPrompt(prompt)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 font-['IBM_Plex_Mono'] text-[0.64rem] text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`max-w-[84%] rounded-[14px] border px-3 py-2 ${message.role === 'user' ? 'ml-auto border-sky-400/25 bg-sky-400/10' : 'mr-auto border-emerald-300/20 bg-emerald-300/10'}`}>
            <div className="mb-1 font-['IBM_Plex_Mono'] text-[0.58rem] uppercase tracking-[0.1em] text-slate-400">{message.role === 'user' ? 'You' : 'VideoRAG'}</div>
            <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] font-['Space_Grotesk'] text-[0.78rem] leading-5 text-slate-100">{message.content}</div>
          </article>
        ))}

        {isSending ? (
          <article className="mr-auto max-w-[84%] rounded-[14px] border border-emerald-300/20 bg-emerald-300/10 px-3 py-2">
            <div className="mb-1 font-['IBM_Plex_Mono'] text-[0.58rem] uppercase tracking-[0.1em] text-slate-400">VideoRAG</div>
            <div className="flex items-center gap-2 text-slate-100">
              <span className="font-['Space_Grotesk'] text-[0.78rem]">Framing answer</span>
              <span className="flex items-center gap-1.5" aria-label="typing-indicator">
                <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-200" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-200 [animation-delay:120ms]" />
                <span className="h-1 w-1 animate-bounce rounded-full bg-emerald-200 [animation-delay:240ms]" />
              </span>
            </div>
            <div className="mt-1 font-['IBM_Plex_Mono'] text-[0.58rem] uppercase tracking-[0.1em] text-slate-400">
              Elapsed: {elapsedSec.toFixed(1)}s
            </div>
          </article>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="shrink-0 border-t border-white/10 px-4.5 py-3.5 xl:px-5">
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about any moment in the video..."
          rows={3}
          className="min-h-[60px] w-full resize-none rounded-[12px] border border-white/10 bg-white/5 px-3 py-2 font-['Space_Grotesk'] text-[0.74rem] text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-300/40 focus:ring-4 focus:ring-emerald-300/10"
        />
        <div className="mt-2 flex items-end justify-between gap-3 max-md:flex-col max-md:items-stretch">
          <div className="max-w-[320px] text-[0.6rem] leading-4 text-slate-400">Answers include retrieved docs and evaluator output in the observability panel.</div>
          <div className="flex gap-2 max-md:flex-col max-md:items-stretch">
            {isSending ? (
              <button
                type="button"
                onClick={onCancel}
                className="min-w-[84px] rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 font-['IBM_Plex_Mono'] text-[0.6rem] font-bold text-rose-100 transition hover:-translate-y-0.5 hover:bg-rose-400/15"
              >
                Cancel
              </button>
            ) : null}
            <button type="submit" disabled={isSending || !question.trim()} className="min-w-[84px] rounded-xl bg-gradient-to-r from-emerald-300 to-sky-400 px-3 py-1.5 font-['IBM_Plex_Mono'] text-[0.6rem] font-bold text-slate-950 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0">
              {isSending ? 'Thinking...' : 'Send'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}