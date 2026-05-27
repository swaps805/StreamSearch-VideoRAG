import { ProgressSection } from './ProgressSection'
import { UploadHero } from './UploadHero'

export function UploadPage({
  fileName,
  message,
  uploadProgress,
  audioProgress,
  videoProgress,
  isProcessing,
  isDragging,
  fileInputRef,
  onPickFile,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  audioChunkDuration,
  setAudioChunkDuration,
  videoChunkDuration,
  setVideoChunkDuration,
  jobId,
  onStartProcessing,
}) {
  return (
    <main className="relative z-10 grid min-h-[calc(100vh-88px)] place-items-center content-center gap-7 py-6 text-center">
      <UploadHero
        audioChunkDuration={audioChunkDuration}
        setAudioChunkDuration={setAudioChunkDuration}
        videoChunkDuration={videoChunkDuration}
        setVideoChunkDuration={setVideoChunkDuration}
      />
      <ProgressSection
        fileName={fileName}
        message={message}
        uploadProgress={uploadProgress}
        audioProgress={audioProgress}
        videoProgress={videoProgress}
        isProcessing={isProcessing}
        isDragging={isDragging}
        fileInputRef={fileInputRef}
        onPickFile={onPickFile}
        onFileChange={onFileChange}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        jobId={jobId}
        onStartProcessing={onStartProcessing}
      />
      <footer className="flex gap-6 font-['Space_Grotesk'] text-[0.82rem] lowercase tracking-[0.28em] text-slate-500">
        <span>audio</span>
        <span>vision</span>
        <span>retrieval</span>
        <span>generation</span>
      </footer>
    </main>
  )
}