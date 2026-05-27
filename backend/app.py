import os
import shutil
import tempfile
import threading
import uuid
from typing import Any, Dict, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile, Form, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent import run_videorag_with_observability
from config import AUDIO_CHUNK_DURATION, BATCH_SIZE, DATA_DIR, DEVICE, VIDEO_CHUNK_DURATION
from data_io import ensure_data_dir, load_transcripts, safe_video_stem, save_transcripts, store_video_in_data
from engine import VideoRAGEngine
from processing import extract_audio_transcript, extract_image_transcript


app = FastAPI(title="StreamSearch Video RAG API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_data_dir()
app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")


class ChatRequest(BaseModel):
    job_id: str
    question: str


jobs: Dict[str, Dict[str, Any]] = {}
jobs_lock = threading.Lock()


def _default_job(job_id: str, video_name: str) -> Dict[str, Any]:
    return {
        "job_id": job_id,
        "video_name": video_name,
        "status": "queued",
        "stage": "queued",
        "message": "Waiting to start.",
        "audio_progress": 0,
        "video_progress": 0,
        "video_url": None,
        "stored_video_path": None,
        "stem": None,
        "transcript": None,
        "image_results": None,
        "engine": None,
        "answer": None,
        "retrieved_docs": [],
        "evaluator_output": None,
        "error": None,
    }


def _get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with jobs_lock:
        job = jobs.get(job_id)
        if job is None:
            return None
        snapshot = dict(job)
        snapshot.pop("engine", None)
        return snapshot


def _update_job(job_id: str, **updates: Any) -> None:
    with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(updates)


def _progress_callback(job_id: str, progress_key: str, stage: str):
    def _callback(done: int, total: int) -> None:
        percent = 0 if total <= 0 else int(round((done / total) * 100))
        _update_job(
            job_id,
            status="processing",
            stage=stage,
            message=f"{stage} {percent}%",
            **{progress_key: percent},
        )

    return _callback


def _process_video_job(job_id: str, upload_path: str, audio_chunk_duration: int, video_chunk_duration: int) -> None:
    try:
        _update_job(job_id, status="processing", stage="storing", message="Preparing to process video.")
        # File is already in DATA_DIR from the upload endpoint
        stored_path = upload_path
        stem = safe_video_stem(os.path.basename(stored_path))
        
        _update_job(
            job_id,
            stored_video_path=stored_path,
            stem=stem,
            video_url=f"/data/{os.path.basename(stored_path)}",
            message="Loading existing transcripts if available.",
        )

        transcript, image_results = load_transcripts(stem)

        if transcript is None:
            _update_job(job_id, stage="audio", audio_progress=0, message="Extracting audio transcript.")
            transcript = extract_audio_transcript(
                stored_path,
                audio_chunk_duration,
                BATCH_SIZE,
                DEVICE,
                progress_cb=_progress_callback(job_id, "audio_progress", "Audio Extraction"),
            )
        else:
            _update_job(job_id, audio_progress=100, message="Loaded cached audio transcript.")

        if image_results is None:
            _update_job(job_id, stage="video", video_progress=0, message="Extracting visual transcript.")
            image_results = extract_image_transcript(
                stored_path,
                video_chunk_duration,
                DEVICE,
                progress_cb=_progress_callback(job_id, "video_progress", "Frame Analysis"),
            )
        else:
            _update_job(job_id, video_progress=100, message="Loaded cached visual transcript.")

        save_transcripts(stem, transcript, image_results)
        engine = VideoRAGEngine(stored_path, transcript, image_results)

        _update_job(
            job_id,
            status="ready",
            stage="ready",
            message="Video indexed and ready for chat.",
            audio_progress=100,
            video_progress=100,
            transcript=transcript,
            image_results=image_results,
            engine=engine,
        )
    except Exception as exc:
        _update_job(
            job_id,
            status="error",
            stage="error",
            message=str(exc),
            error=str(exc),
        )
    # Removing finally block that deleted the temp_dir because the file is now saved directly to DATA_DIR.


@app.get("/")
def root() -> Dict[str, str]:
    return {"status": "ok", "service": "StreamSearch Video RAG"}


@app.post("/api/videos/upload")
async def upload_video(
    file: UploadFile = File(...),
    audio_chunk_duration: int = Form(AUDIO_CHUNK_DURATION),
    video_chunk_duration: int = Form(VIDEO_CHUNK_DURATION),
    start_processing: bool = Form(True),
) -> Dict[str, Any]:
    if not file.filename:
        raise HTTPException(status_code=400, detail="A video file is required.")

    ensure_data_dir()
    stem = safe_video_stem(file.filename)
    suffix = os.path.splitext(file.filename)[1] or ".mp4"
    upload_path = os.path.join(DATA_DIR, f"{stem}{suffix}")

    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    job_id = uuid.uuid4().hex
    with jobs_lock:
        jobs[job_id] = _default_job(job_id, file.filename)
        # store requested chunk durations in job metadata
        jobs[job_id]["audio_chunk_duration"] = int(audio_chunk_duration)
        jobs[job_id]["video_chunk_duration"] = int(video_chunk_duration)
        # keep the uploaded path for later processing if user wants delayed processing
        jobs[job_id]["upload_path"] = upload_path

        if not start_processing:
            # don't start background processing yet; wait for explicit trigger
            jobs[job_id]["status"] = "uploaded"
            jobs[job_id]["stage"] = "uploaded"
            jobs[job_id]["message"] = "Upload complete. Ready to process."

    if start_processing:
        worker = threading.Thread(
            target=_process_video_job,
            args=(job_id, upload_path, int(audio_chunk_duration), int(video_chunk_duration)),
            daemon=True,
        )
        worker.start()

    return _get_job(job_id) or {"job_id": job_id}


@app.post("/api/videos/{job_id}/process")
def process_uploaded_video(
    job_id: str,
    audio_chunk_duration: Optional[int] = Body(None),
    video_chunk_duration: Optional[int] = Body(None),
) -> Dict[str, Any]:
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    upload_path = job.get("upload_path")
    if not upload_path or not os.path.exists(upload_path):
        raise HTTPException(status_code=400, detail="Uploaded file not available to process.")

    if job.get("status") == "processing":
        return _get_job(job_id) or {"job_id": job_id}

    # if durations provided, update job metadata (enforce minimum 10s)
    if audio_chunk_duration is not None:
        audio_chunk_duration = max(10, int(audio_chunk_duration))
        jobs[job_id]["audio_chunk_duration"] = audio_chunk_duration
    else:
        audio_chunk_duration = int(job.get("audio_chunk_duration", AUDIO_CHUNK_DURATION))

    if video_chunk_duration is not None:
        video_chunk_duration = max(10, int(video_chunk_duration))
        jobs[job_id]["video_chunk_duration"] = video_chunk_duration
    else:
        video_chunk_duration = int(job.get("video_chunk_duration", VIDEO_CHUNK_DURATION))

    worker = threading.Thread(
        target=_process_video_job,
        args=(job_id, upload_path, audio_chunk_duration, video_chunk_duration),
        daemon=True,
    )
    worker.start()

    _update_job(job_id, status="processing", stage="queued", message="Starting processing.")

    return _get_job(job_id) or {"job_id": job_id}


@app.get("/api/videos/{job_id}/status")
def video_status(job_id: str) -> Dict[str, Any]:
    job = _get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


@app.get("/api/videos/{job_id}/file")
def video_file(job_id: str):
    job = _get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    path = job.get("stored_video_path")
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Video file not available yet.")

    return FileResponse(path, filename=os.path.basename(path))


@app.post("/api/chat")
def chat(request: ChatRequest) -> Dict[str, Any]:
    job = _get_job(request.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")

    if job.get("status") != "ready":
        raise HTTPException(status_code=409, detail="Video is not ready yet.")

    engine = job.get("engine")
    if engine is None:
        transcript = job.get("transcript")
        image_results = job.get("image_results")
        stored_video_path = job.get("stored_video_path")
        if not transcript or not image_results or not stored_video_path:
            raise HTTPException(status_code=500, detail="Video session is missing processing state.")
        engine = VideoRAGEngine(stored_video_path, transcript, image_results)

    answer, retrieved_docs, evaluator_output = run_videorag_with_observability(
        engine,
        request.question,
        verbose=False,
    )

    _update_job(
        request.job_id,
        answer=answer,
        retrieved_docs=retrieved_docs,
        evaluator_output=evaluator_output,
    )

    return {
        "job_id": request.job_id,
        "question": request.question,
        "answer": answer,
        "retrieved_docs": retrieved_docs,
        "evaluator_output": evaluator_output,
    }