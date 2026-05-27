import base64
import io
import os
import json
from typing import List

from moviepy import VideoFileClip
from PIL import Image

# import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool

from config import GOOGLE_API_KEY, GROQ_API_KEY
from indexing import build_indexes, faiss_search
from orchestrator import make_orchestrator_system
from utils import normalize_message_content


class VideoRAGEngine:
    def __init__(self, video_path: str, transcript: list[dict], results: list[dict]):
        self.video_path = video_path
        self.transcript = transcript
        self.results = results

        os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
        os.environ["GROQ_API_KEY"] = GROQ_API_KEY
        # genai.configure(api_key=GOOGLE_API_KEY)

        (
            self.audio_index,
            self.audio_texts_store,
            self.audio_meta_store,
            self.img_index,
            self.img_texts_store,
            self.img_meta_store,
            self.audio_rich,
        ) = build_indexes(transcript, results)

        self.retrieved_docs: list[dict] = []

        self.tools = self._build_tools()
        self.tool_map = {t.name: t for t in self.tools}

        self.img_llm = ChatGroq(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.2,
        )
        self.orchestrator_llm = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0.2,
        ).bind_tools(self.tools)
        self.evaluator_llm = ChatGroq(
            model="openai/gpt-oss-120b",
            temperature=0,
        )

        self.orchestrator_system = make_orchestrator_system(self.audio_rich)

    def _build_tools(self) -> List:
        @tool
        def retrieve_audio_transcript(query: str, k: int = 3) -> str:
            """
            Search the Whisper-transcribed audio chunks with Cohere embeddings.
            Returns the top-k most relevant chunks as JSON:
              [{"start_time_sec": int, "text": str, "score": float}]
            Use this tool when audio transcripts are available (audio-rich video).
            """
            hits = faiss_search(query, self.audio_index, self.audio_texts_store, self.audio_meta_store, k=k)
            out = [
                {
                    "start_time_sec": h["meta"]["start_time"],
                    "text": h["text"],
                    "score": round(h["score"], 3),
                }
                for h in hits
            ]
            return json.dumps(out, indent=2)

        @tool
        def retrieve_image_transcript(query: str, k: int = 3) -> str:
            """
                Search the pre-computed BLIP captions + EasyOCR text with Cohere embeddings.
                Returns the top-k most relevant frames as JSON:
                  [{"timestamp_sec": int, "caption_ocr": str, "score": float}]
                Use this tool when audio is sparse or absent.
            """
            hits = faiss_search(query, self.img_index, self.img_texts_store, self.img_meta_store, k=k)
            out = [
                {
                    "timestamp_sec": h["meta"]["timestamp"],
                    "caption_ocr": h["text"],
                    "score": round(h["score"], 3),
                }
                for h in hits
            ]
            return json.dumps(out, indent=2)

        @tool
        def caption_frame(t: int) -> str:
            """
               Extract frames at timestamp t and t+5 seconds from the video, then generate
               a detailed visual caption by passing both frames as images to a multimodal LLM.
               Use this tool ONLY when:
                 - The question explicitly references a visual moment or timestamp
                   (e.g. "what is shown at 23s?", "what does the screen look like at 1:30?"), OR
                 - The audio transcript and image-caption indexes do not contain sufficient
                   information to answer the question and a direct visual inspection is needed.
               Args:
                   t: Timestamp in seconds. Frames at t and t+5 will be captured.
               Returns:
                   A JSON string: {"timestamp_sec": t, "caption": <multimodal LLM description>}
               """
            clip = VideoFileClip(self.video_path)
            video_duration = clip.duration

            timestamps = [t, min(t + 5, video_duration)]
            b64_images = []

            for ts in timestamps:
                frame = clip.get_frame(ts)
                pil_img = Image.fromarray(frame).convert("RGB")
                buf = io.BytesIO()
                pil_img.save(buf, format="JPEG")
                b64_images.append(base64.b64encode(buf.getvalue()).decode("utf-8"))

            clip.close()

            content = [
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64_images[0]}"},
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{b64_images[1]}"},
                },
                {
                    "type": "text",
                    "text": (
                        f"These are two consecutive frames from a video at t={timestamps[0]}s "
                        f"and t={timestamps[1]}s. "
                        "Describe in detail what is visible: any text on screen, diagrams, "
                        "objects, people, actions, and any other notable visual elements."
                    ),
                },
            ]

            response = self.img_llm.invoke([HumanMessage(content=content)])
            caption = normalize_message_content(response.content).strip()

            return json.dumps({"timestamp_sec": t, "caption": caption}, indent=2)

        return [retrieve_audio_transcript, retrieve_image_transcript, caption_frame]
