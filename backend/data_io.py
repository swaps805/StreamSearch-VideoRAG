import json
import os
import shutil
from typing import Tuple, Optional

from config import DATA_DIR


def ensure_data_dir() -> str:
    os.makedirs(DATA_DIR, exist_ok=True)
    return DATA_DIR


def safe_video_stem(filename: str) -> str:
    base = os.path.basename(filename)
    stem, _ = os.path.splitext(base)
    cleaned = "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in stem)
    return cleaned or "video"


def store_video_in_data(src_path: str) -> Tuple[str, str]:
    data_dir = ensure_data_dir()
    stem = safe_video_stem(src_path)
    _, ext = os.path.splitext(src_path)
    dst_path = os.path.join(data_dir, f"{stem}{ext}")
    shutil.copy2(src_path, dst_path)
    return dst_path, stem


def _audio_json_path(stem: str) -> str:
    return os.path.join(DATA_DIR, f"audio_{stem}.json")


def _image_json_path(stem: str) -> str:
    return os.path.join(DATA_DIR, f"image_{stem}.json")


def save_transcripts(stem: str, transcript: list[dict], results: list[dict]) -> None:
    ensure_data_dir()
    with open(_audio_json_path(stem), "w", encoding="utf-8") as f:
        json.dump(transcript, f, ensure_ascii=False, indent=2)
    with open(_image_json_path(stem), "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)


def load_transcripts(stem: str) -> Tuple[Optional[list[dict]], Optional[list[dict]]]:
    audio_path = _audio_json_path(stem)
    image_path = _image_json_path(stem)
    audio = None
    image = None
    if os.path.exists(audio_path):
        with open(audio_path, "r", encoding="utf-8") as f:
            audio = json.load(f)
    if os.path.exists(image_path):
        with open(image_path, "r", encoding="utf-8") as f:
            image = json.load(f)
    return audio, image
