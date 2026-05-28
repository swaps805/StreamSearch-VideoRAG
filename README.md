# 📽️ StreamSearch: Agentic Video RAG

StreamSearch is an Agentic Retrieval-Augmented Generation (RAG) system built to answer questions about a video while pointing users to the exact timestamp where the relevant content is located.

## Setup

- Requires GPU support (16 GB VRAM recommended).
- Install ReAct and Python 3.11.
- Create a virtual environment and install dependencies:

```bash
pip install -r requirements.txt
```

- Add a `.env` [check here for info](./backend/README.md) file in the backend directory with your API keys.

## To run

- Frontend:

```bash
cd frontend/vdorag
npm install
npm run dev
```

- Backend:

```bash
cd backend
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

## Architecture: Video Processing

- Video is transcribed in 30s chunks and stored with timestamps using OpenAI Whisper for time-aligned retrieval.
- Frames are sampled every 30s, then captioned using BLIP and OCR to extract visual context and on-screen text.
- Audio text and visual text are normalized into a shared schema so downstream search can treat them consistently.
- All text is embedded with Cohere and indexed in a FAISS vector store for fast semantic retrieval.
- Transcript artifacts are cached for reuse to avoid reprocessing on subsequent runs.



![video-process](./assets/video_processing.png)

## Agentic Workflow

Tools available to the LLM:

1. Retrieve audio transcript chunks by semantic search.
2. Retrieve image caption and OCR results by semantic search.
3. Caption a specific frame window for detailed visual grounding.

The orchestrator selects tools based on the question, collates tool outputs, and drafts an answer with timestamp references.
An evaluator checks grounding and relevance before returning a final response, while observability captures tool usage, retrieved evidence, and evaluation signals.


![agentic](./assets/agentic-rag.png)

## Features

- Chat interface for Q&A over videos.
- Integrated video player for timestamped references and quick jumps.
- Observability through tool usage, retrieved evidence, and evaluator outputs.
- Cached transcripts for faster repeat queries.

\
![upload](./assets/upload.png)
\
\
![chat](./assets/chat.png)