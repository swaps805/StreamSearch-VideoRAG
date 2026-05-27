import { useEffect, useRef, useState } from 'react'
import { Shell } from './components/Shell'
import { UploadPage } from './components/UploadPage'
import { WorkspacePage } from './components/WorkspacePage'
import { getApiBaseUrl, getVideoFileUrl, getVideoStatus, sendChatMessage, uploadVideo, processVideo } from './lib/api'

function formatStage(stage) {
  const labels = {
    queued: 'Queued',
    storing: 'Storing video',
    audio: 'Audio extraction',
    video: 'Frame analysis',
    ready: 'Ready to chat',
    error: 'Processing failed',
    processing: 'Processing',
  }

  return labels[stage] || 'Processing'
}

function App() {
  const fileInputRef = useRef(null)
  const pollingRef = useRef(null)
  const answerTimerRef = useRef(null)
  const answerAbortRef = useRef(null)
  const pendingQuestionRef = useRef('')

  const [screen, setScreen] = useState('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [jobId, setJobId] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState({
    status: 'idle',
    stage: 'queued',
    message: 'Upload a video to start.',
    upload_progress: 0,
    audio_progress: 0,
    video_progress: 0,
  })
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [observability, setObservability] = useState({
    retrieved_docs: [],
    evaluator_output: '',
  })
  const [audioChunkDuration, setAudioChunkDuration] = useState(30)
  const [videoChunkDuration, setVideoChunkDuration] = useState(30)

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
      }
      if (answerTimerRef.current) {
        window.clearInterval(answerTimerRef.current)
      }
      if (answerAbortRef.current) {
        answerAbortRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    if (!jobId || screen !== 'processing') {
      return undefined
    }

    const syncStatus = async () => {
      try {
        const data = await getVideoStatus(jobId)
        setStatus(data)

        if (data.status === 'ready') {
          setVideoUrl(getVideoFileUrl(data))
          setScreen('chat')
          if (pollingRef.current) {
            window.clearInterval(pollingRef.current)
            pollingRef.current = null
          }
        }

        if (data.status === 'error' && pollingRef.current) {
          window.clearInterval(pollingRef.current)
          pollingRef.current = null
        }
      } catch {
        // keep polling; backend may still be starting up
      }
    }

    syncStatus()
    pollingRef.current = window.setInterval(syncStatus, 1000)

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [jobId, screen])

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const startUpload = async (file) => {
    if (!file) {
      return
    }

    setSelectedFileName(file.name)
    setJobId('')
    setVideoUrl('')
    setUploadProgress(0)
    setMessages([])
    setObservability({ retrieved_docs: [], evaluator_output: '' })
    setStatus({
      status: 'processing',
      stage: 'queued',
      message: 'Uploading video... 0%',
      upload_progress: 0,
      audio_progress: 0,
      video_progress: 0,
    })
    // Keep the UI on the upload screen until the user explicitly starts processing

    try {
      // upload file but do not start processing yet; user will press 'Process'
      const data = await uploadVideo(
        file,
        (progress) => {
        setUploadProgress(progress)
        setStatus((current) => ({
          ...current,
          message: `Uploading video... ${progress}%`,
          upload_progress: progress,
        }))
        },
        { audio_chunk_duration: audioChunkDuration, video_chunk_duration: videoChunkDuration, start_processing: false }
      )
      setJobId(data.job_id)
      setUploadProgress(100)
      setStatus((current) => ({
        ...current,
        ...data,
        upload_progress: 100,
      }))

      // do not switch to processing screen yet; wait for explicit Process action
    } catch (error) {
      setStatus((current) => ({
        ...current,
        status: 'error',
        stage: 'error',
        message: error.message,
      }))
      setUploadProgress(0)
    }
  }

  const startProcessing = async () => {
    if (!jobId) return
    // immediately switch to processing UI and trigger backend processing
    setScreen('processing')
    try {
      const data = await processVideo(jobId, { audio_chunk_duration: audioChunkDuration, video_chunk_duration: videoChunkDuration })
      setStatus((current) => ({
        ...current,
        ...data,
      }))
    } catch (error) {
      setStatus((current) => ({
        ...current,
        status: 'error',
        stage: 'error',
        message: error.message,
      }))
    }
  }

  const onFileChange = (event) => {
    const file = event.target.files?.[0]
    startUpload(file)
  }

  const onDrop = (event) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    startUpload(file)
  }

  const sendQuestion = async (event) => {
    event.preventDefault()
    const trimmedQuestion = question.trim()

    if (!trimmedQuestion || !jobId || isSending || status.status !== 'ready') {
      return
    }

    setIsSending(true)
    setElapsedSec(0)
    pendingQuestionRef.current = trimmedQuestion
    const abortController = new AbortController()
    answerAbortRef.current = abortController
    const startedAt = Date.now()
    if (answerTimerRef.current) {
      window.clearInterval(answerTimerRef.current)
    }
    answerTimerRef.current = window.setInterval(() => {
      setElapsedSec((Date.now() - startedAt) / 1000)
    }, 100)

    setMessages((current) => [...current, { role: 'user', content: trimmedQuestion }])
    setQuestion('')

    try {
      const data = await sendChatMessage(jobId, trimmedQuestion, abortController.signal)
      if (abortController.signal.aborted) {
        return
      }

      setMessages((current) => [...current, { role: 'assistant', content: data.answer }])
      setObservability({
        retrieved_docs: data.retrieved_docs || [],
        evaluator_output: data.evaluator_output || '',
      })
    } catch (error) {
      if (error?.name === 'AbortError') {
        setQuestion(pendingQuestionRef.current)
        setMessages((current) => [...current, { role: 'assistant', content: 'Request cancelled.' }])
        return
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: `I could not answer that yet: ${error.message}` },
      ])
    } finally {
      setIsSending(false)
      if (answerTimerRef.current) {
        window.clearInterval(answerTimerRef.current)
        answerTimerRef.current = null
      }
      if (answerAbortRef.current === abortController) {
        answerAbortRef.current = null
      }
    }
  }

  const cancelQuestion = () => {
    if (answerAbortRef.current) {
      answerAbortRef.current.abort()
    }
  }

  const applySuggestion = (text) => {
    setQuestion(text)
  }

  const resetFlow = () => {
    setScreen('upload')
    setSelectedFileName('')
    setJobId('')
    setVideoUrl('')
    setUploadProgress(0)
    setElapsedSec(0)
    setMessages([])
    setQuestion('')
    setObservability({ retrieved_docs: [], evaluator_output: '' })
    setStatus({
      status: 'idle',
      stage: 'queued',
      message: 'Upload a video to start.',
      upload_progress: 0,
      audio_progress: 0,
      video_progress: 0,
    })
  }

  const uploadReady = screen === 'upload'
  const processing = screen === 'processing'
  const ready = screen === 'chat'

  return (
    <Shell statusLabel={formatStage(status.stage)}>
      {uploadReady || processing ? (
        <UploadPage
          fileName={selectedFileName}
          message={status.message}
          uploadProgress={uploadProgress}
          audioProgress={status.audio_progress ?? 0}
          videoProgress={status.video_progress ?? 0}
          isProcessing={processing}
          isDragging={isDragging}
          fileInputRef={fileInputRef}
          onPickFile={openFilePicker}
          onFileChange={onFileChange}
          onDrop={onDrop}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          audioChunkDuration={audioChunkDuration}
          setAudioChunkDuration={setAudioChunkDuration}
          videoChunkDuration={videoChunkDuration}
          setVideoChunkDuration={setVideoChunkDuration}
          jobId={jobId}
          onStartProcessing={startProcessing}
        />
      ) : null}

      {ready ? (
        <WorkspacePage
          title={selectedFileName || 'Player'}
          videoUrl={videoUrl}
          statusMessage={status.message}
          messages={messages}
          question={question}
          setQuestion={setQuestion}
          isSending={isSending}
          elapsedSec={elapsedSec}
          onSend={sendQuestion}
          onCancel={cancelQuestion}
          onQuickPrompt={applySuggestion}
          onReset={resetFlow}
          docs={observability.retrieved_docs}
          evaluatorOutput={observability.evaluator_output}
        />
      ) : null}

      {/* API badge removed per UI cleanup */}
    </Shell>
  )
}

export default App