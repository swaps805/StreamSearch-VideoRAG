import { ChatPanel } from './ChatPanel'
import { ObservabilityPanel } from './ObservabilityPanel'
import { VideoPanel } from './VideoPanel'

export function WorkspacePage({
  title,
  videoUrl,
  statusMessage,
  messages,
  question,
  setQuestion,
  isSending,
  elapsedSec,
  onSend,
  onCancel,
  onQuickPrompt,
  onReset,
  docs,
  evaluatorOutput,
}) {
  return (
    <main className="grid h-[calc(150vh-56px)] min-h-0 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <ChatPanel
        messages={messages}
        question={question}
        setQuestion={setQuestion}
        isSending={isSending}
        elapsedSec={elapsedSec}
        onSubmit={onSend}
        onCancel={onCancel}
        onQuickPrompt={onQuickPrompt}
        onReset={onReset}
      />

      <div className="grid h-full min-h-0 gap-4 grid-rows-[minmax(0,5.6fr)_minmax(0,4.4fr)]">
        <VideoPanel title={title} message={statusMessage} videoUrl={videoUrl} />
        <ObservabilityPanel docs={docs} evaluatorOutput={evaluatorOutput} />
      </div>
    </main>
  )
}