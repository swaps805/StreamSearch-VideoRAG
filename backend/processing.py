import gc
import os
from typing import Callable, Optional

import torch
from transformers import (
    BlipProcessor,
    BlipForConditionalGeneration,
    AutoProcessor,
    Qwen3VLForConditionalGeneration,
)
from transformers import pipeline
from moviepy import VideoFileClip
import easyocr
from PIL import Image

from config import CLIPS_DIR


def extract_audio_transcript(
    video_path: str,
    audio_chunk_duration: int,
    batch_size: int,
    device: str,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict]:
    pipe = pipeline(
        "automatic-speech-recognition",
        model="openai/whisper-medium",
        chunk_length_s=audio_chunk_duration,
        dtype=torch.float16,
        device=device,
    )

    os.makedirs(CLIPS_DIR, exist_ok=True)

    video = VideoFileClip(video_path)
    video_duration = int(video.duration)

    clip_paths = []

    for start_time in range(0, video_duration, audio_chunk_duration):
        end_time = min(start_time + audio_chunk_duration, video_duration)
        clip = video.subclipped(start_time, end_time)
        audio_clip_filename = os.path.join(
            CLIPS_DIR,
            f"clip_{start_time}_{end_time}.mp3",
        )
        clip.audio.write_audiofile(audio_clip_filename, logger=None)
        clip_paths.append((start_time, audio_clip_filename))

    video.close()

    transcript = []
    total_batches = max(1, (len(clip_paths) + batch_size - 1) // batch_size)
    batch_index = 0

    for i in range(0, len(clip_paths), batch_size):
        batch = clip_paths[i:i + batch_size]
        batch_start_times = [x[0] for x in batch]
        batch_audio_paths = [x[1] for x in batch]

        results = pipe(
            batch_audio_paths,
            batch_size=batch_size,
            return_timestamps=False,
        )

        for start_time, result in zip(batch_start_times, results):
            transcript.append({
                "start_time": start_time,
                "text": result["text"],
            })

        batch_index += 1
        if progress_cb:
            progress_cb(batch_index, total_batches)

    for _, clip_path in clip_paths:
        os.remove(clip_path)

    os.rmdir(CLIPS_DIR)

    del pipe
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

    return transcript


def extract_image_transcript(
    video_path: str,
    video_chunk_duration: int,
    device: str,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> list[dict]:
    processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-large")
    model = BlipForConditionalGeneration.from_pretrained(
        "Salesforce/blip-image-captioning-large"
    ).to(device)

    reader = easyocr.Reader(["en"])

    clip = VideoFileClip(video_path)
    duration = int(clip.duration)

    results = []
    steps = max(1, (duration + video_chunk_duration - 1) // video_chunk_duration)
    step_index = 0

    for t in range(0, duration, video_chunk_duration):
        frame = clip.get_frame(t)
        pil_image = Image.fromarray(frame).convert("RGB")

        inputs = processor(pil_image, return_tensors="pt").to(device)
        with torch.no_grad():
            output = model.generate(**inputs)

        caption = processor.decode(output[0], skip_special_tokens=True)

        ocr_result = reader.readtext(frame)
        extracted_texts = []
        for item in ocr_result:
            text = item[1]
            confidence = item[2]
            if confidence > 0.3:
                extracted_texts.append(text)

        results.append({
            "timestamp": t,
            "caption": caption,
            "ocr": extracted_texts,
        })

        step_index += 1
        if progress_cb:
            progress_cb(step_index, steps)

    clip.close()

    del model
    del processor
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()

    return results
