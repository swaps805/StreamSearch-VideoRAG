# Backend API

This folder contains the core logic for the agentic Video RAG framework. The API handles video upload, background processing, transcript generation, retrieval-augmented chat, and job status tracking.

## Setup

Create a `.env` file in this folder with the required keys:

```env
COHERE_API_KEY=your_cohere_api_key
GROQ_API_KEY=your_groq_api_key
```

The backend loads these values through `config.py`, so the environment file should be present before you start the server.

The current LLM inference provider is GROQ. If you want to switch models or providers, update `VideoRAGEngine` in `engine.py`.

## Run

From this directory, start the FastAPI app with:

```bash
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

## API Endpoints

### `GET /`
Health check for the service.

Response:

```json
{
	"status": "ok",
	"service": "StreamSearch Video RAG"
}
```

### `POST /api/videos/upload`
Upload a video and optionally start background processing immediately.

Form fields:

```text
file: UploadFile required
audio_chunk_duration: int optional, default 30
video_chunk_duration: int optional, default 30
start_processing: bool optional, default true
```

Returns a job object with the generated `job_id`, processing state, and uploaded file metadata.

### `POST /api/videos/{job_id}/process`
Start processing for an already uploaded video.

Body fields:

```text
audio_chunk_duration: int optional
video_chunk_duration: int optional
```

This endpoint is useful when the upload was created with `start_processing=false`.

### `GET /api/videos/{job_id}/status`
Fetch the current job state, progress, and any processing error.

### `GET /api/videos/{job_id}/file`
Return the stored video file for the job.

### `POST /api/chat`
Ask a question against a processed video session.

Request body:

```json
{
	"job_id": "<job_id>",
	"question": "What is happening in the video?"
}
```

Response includes:

```json
{
	"job_id": "...",
	"question": "...",
	"answer": "...",
	"retrieved_docs": [],
	"evaluator_output": null
}
```

## Processing Flow

1. Upload a video with `/api/videos/upload`.
2. The backend stores the file under `Data/` and creates a job record.
3. Background workers extract audio and visual transcripts.
4. The transcripts are cached and indexed with the `VideoRAGEngine`.
5. Once the job is ready, `/api/chat` can be used for question answering.

## Notes

- Cross-origin requests are currently allowed for all origins.
- Processed media is exposed under `/data`.
- Job state is held in memory, so restarting the server clears active jobs.
