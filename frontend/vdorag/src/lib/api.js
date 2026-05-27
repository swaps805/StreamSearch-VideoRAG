const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

async function parseResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.detail || 'Request failed.')
  }

  return response.json()
}

export function getApiBaseUrl() {
  return API_BASE
}

export function uploadVideo(file, onProgress, options = {}) {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    if (options.audio_chunk_duration) {
      formData.append('audio_chunk_duration', String(options.audio_chunk_duration))
    }
    if (options.video_chunk_duration) {
      formData.append('video_chunk_duration', String(options.video_chunk_duration))
    }
    // support delayed processing flag
    if (typeof options.start_processing !== 'undefined') {
      formData.append('start_processing', String(options.start_processing))
    }

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/videos/upload`)

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') {
        return
      }

      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100))
      onProgress(percent)
    }

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}')
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data)
          return
        }

        reject(new Error(data?.detail || 'Video upload failed.'))
      } catch {
        reject(new Error('Video upload failed.'))
      }
    }

    xhr.onerror = () => reject(new Error('Video upload failed.'))
    xhr.onabort = () => reject(new Error('Video upload was cancelled.'))

    xhr.send(formData)
  })
}

export async function processVideo(jobId, options = {}) {
  const body = {}
  if (typeof options.audio_chunk_duration !== 'undefined') body.audio_chunk_duration = Number(options.audio_chunk_duration)
  if (typeof options.video_chunk_duration !== 'undefined') body.video_chunk_duration = Number(options.video_chunk_duration)

  const response = await fetch(`${API_BASE}/api/videos/${jobId}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  return parseResponse(response)
}

export async function getVideoStatus(jobId) {
  const response = await fetch(`${API_BASE}/api/videos/${jobId}/status`)
  return parseResponse(response)
}

export async function sendChatMessage(jobId, question, signal) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal,
    body: JSON.stringify({ job_id: jobId, question }),
  })

  return parseResponse(response)
}

export function getVideoFileUrl(job) {
  return job?.video_url ? `${API_BASE}${job.video_url}` : ''
}