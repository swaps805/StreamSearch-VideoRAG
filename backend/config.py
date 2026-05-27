import os
import torch

try:
	from dotenv import load_dotenv
except Exception:
	load_dotenv = None

if load_dotenv is not None:
	load_dotenv()

DATA_DIR = os.path.join(".", "Data")
CLIPS_DIR = "audio_chunk"

AUDIO_CHUNK_DURATION = 30
VIDEO_CHUNK_DURATION = 30
BATCH_SIZE = 4

AUDIO_RICH_THRESHOLD = 0.30
FRAME_WINDOW_SEC = 10
MAX_EVAL_RETRIES = 0

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "YOUR_GOOGLE_API_KEY")
COHERE_API_KEY = os.environ.get("COHERE_API_KEY", "YOUR_COHERE_API_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "YOUR_GROQ_API_KEY")

DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
