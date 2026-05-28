function ProgressBar({ label, value, accentClass }) {
  return (
    <div className="text-left">
      <div className="mb-2 flex items-center justify-between gap-3 text-[0.95rem] text-slate-200">
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5">
        <div className={`h-full rounded-full transition-all duration-300 ${accentClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export function ProgressSection({ fileName, message, uploadProgress, audioProgress, videoProgress, isProcessing, isDragging, onPickFile, onFileChange, onDrop, onDragOver, onDragLeave, fileInputRef, jobId, onStartProcessing }) {
  return (
    <section
      className={`flex w-full max-w-[640px] flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-indigo-300/12 bg-gradient-to-b from-slate-900/95 to-slate-950/75 px-6 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-transform duration-150 ${
        isProcessing ? 'cursor-default' : 'cursor-pointer hover:-translate-y-0.5 hover:border-emerald-300/40 hover:from-slate-900/100 hover:to-slate-950/85'
      } ${isDragging ? 'border-emerald-300/50 bg-slate-900/100' : ''}`}
      onClick={onPickFile}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={onFileChange} />
      <div className="grid h-16 w-16 place-items-center rounded-[18px] border border-slate-700 bg-slate-900 text-[1.6rem] text-slate-300 shadow-inner">
        ⬆
      </div>
      <div className="font-['Space_Grotesk'] text-[1.25rem] font-bold">
        {isProcessing ? fileName || 'Processing video' : 'Drop a video file here'}
      </div>
      <div className="text-[0.95rem] text-slate-400">{isProcessing ? message : 'or click to browse — MP4'}</div>

      <div className="mt-4 grid w-full gap-3">
        <ProgressBar label="Video upload" value={uploadProgress} accentClass="bg-gradient-to-r from-violet-300 to-fuchsia-500" />
        <ProgressBar label="Audio transcription" value={audioProgress} accentClass="bg-gradient-to-r from-emerald-300 to-emerald-500" />
        <ProgressBar label="Frame analysis" value={videoProgress} accentClass="bg-gradient-to-r from-sky-400 to-blue-600" />
      </div>
      {/* Buttons inside the upload box: Choose file (always) and Process (after upload completes) */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef?.current?.click()
            onPickFile && onPickFile()
          }}
          className="rounded-md bg-slate-700/80 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
        >
          Choose file
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            // only trigger if enabled
            if (uploadProgress >= 100 && !isProcessing && jobId) {
              onStartProcessing && onStartProcessing()
            }
          }}
          disabled={!(uploadProgress >= 100 && !isProcessing && jobId)}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${uploadProgress >= 100 && !isProcessing && jobId ? 'bg-emerald-500/90 text-slate-900 hover:bg-emerald-500' : 'bg-slate-700/40 text-slate-500 cursor-not-allowed'}`}
        >
          Process
        </button>
      </div>
    </section>
  )
}