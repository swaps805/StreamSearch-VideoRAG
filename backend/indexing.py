import re
from collections import Counter
from typing import Tuple

import faiss
import numpy as np
import cohere

from config import COHERE_API_KEY, AUDIO_RICH_THRESHOLD

co = cohere.Client(COHERE_API_KEY)



def cohere_embed(texts: list[str], input_type: str = "search_document") -> np.ndarray:
    response = co.embed(
        texts=texts,
        model="embed-english-v3.0",
        input_type=input_type,
    )
    return np.array(response.embeddings, dtype="float32")


def build_faiss_index(texts: list[str], metadatas: list[dict]):
    if not texts:
        return None, [], []
    vecs = cohere_embed(texts)
    faiss.normalize_L2(vecs)
    idx = faiss.IndexFlatIP(vecs.shape[1])
    idx.add(vecs)
    return idx, texts, metadatas


def faiss_search(query: str, index, texts, metadatas, k: int = 3) -> list[dict]:
    if index is None:
        return []
    k = max(0, min(int(k), 10))
    if k == 0:
        return []
    q = cohere_embed([query], input_type="search_query")
    faiss.normalize_L2(q)
    scores, ids = index.search(q, k)
    return [
        {"score": float(scores[0][i]), "text": texts[ids[0][i]], "meta": metadatas[ids[0][i]]}
        for i in range(k) if ids[0][i] >= 0
    ]


COMMON_ENGLISH_WORDS = {
    "a", "an", "and", "are", "as", "at", "be", "because", "but", "by",
    "for", "from", "had", "has", "have", "he", "her", "his", "i", "if",
    "in", "is", "it", "its", "like", "my", "not", "of", "on", "or",
    "our", "she", "that", "the", "their", "there", "they", "this", "to",
    "was", "we", "were", "what", "when", "where", "which", "who", "will",
    "with", "you", "your",
}


def is_valid_english_transcript(text: str) -> bool:
    if not text or not text.strip():
        return False

    words = re.findall(r"[a-z]+", text.lower())
    if len(words) < 4:
        return False

    alpha_chars = sum(ch.isalpha() for ch in text)
    alpha_ratio = alpha_chars / max(len(text.replace(" ", "")), 1)
    if alpha_ratio < 0.7:
        return False

    counts = Counter(words)
    if counts.most_common(1)[0][1] / len(words) > 0.75:
        return False

    if not any(word in COMMON_ENGLISH_WORDS for word in words):
        return False

    return True


def english_transcript_ratio(records: list[dict]) -> float:
    if not records:
        return 0.0
    return sum(1 for row in records if is_valid_english_transcript(row.get("text", ""))) / len(records)


def build_indexes(
    transcript: list[dict],
    results: list[dict],
) -> Tuple[object, list[str], list[dict], object, list[str], list[dict], bool]:
    valid_transcript_rows = [row for row in transcript if is_valid_english_transcript(row.get("text", ""))]
    audio_texts = [
        f"[t={row['start_time']}s] {row['text']}"
        for row in valid_transcript_rows
    ]
    audio_metas = [
        {"start_time": row["start_time"]}
        for row in valid_transcript_rows
    ]
    audio_index, audio_texts_store, audio_meta_store = build_faiss_index(audio_texts, audio_metas)

    img_texts = [
        f"[t={r['timestamp']}s] caption: {r['caption']}. ocr: {' '.join(r['ocr'])}"
        for r in results
    ]
    img_metas = [{"timestamp": r["timestamp"]} for r in results]
    img_index, img_texts_store, img_meta_store = build_faiss_index(img_texts, img_metas)

    audio_rich = english_transcript_ratio(transcript) >= AUDIO_RICH_THRESHOLD

    return (
        audio_index,
        audio_texts_store,
        audio_meta_store,
        img_index,
        img_texts_store,
        img_meta_store,
        audio_rich,
    )
