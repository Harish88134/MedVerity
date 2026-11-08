"""
MedVerity OCR Service — Gemini Multimodal (Fast & Free)
Uses Gemini Flash Lite REST API with multi-model fallback
and automatic image optimization for ultra-fast processing.
"""
import io
import base64
import requests
from PIL import Image
from app.config import settings

# Multi-tier multimodal models with fallback for high throughput and quota resiliency
OCR_MODELS = [
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
]


def _optimize_image(image_bytes: bytes) -> bytes:
    """Resize high-res camera captures to max 1280px and compress to JPEG for fast transfer."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail((1280, 1280), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        return buf.getvalue()
    except Exception as e:
        print(f"[OCR] Image optimization skipped: {e}")
        return image_bytes


async def perform_ocr(image_bytes: bytes) -> dict:
    """
    Extract raw text from the image using Gemini Multimodal REST API with fallback.
    Returns detected text and confidence score.
    """
    if not settings.GEMINI_API_KEY:
        print("[OCR] No Gemini API key found. Returning empty OCR.")
        return {"text": "", "confidence": 0.0}

    optimized = _optimize_image(image_bytes)
    b64_data = base64.b64encode(optimized).decode("utf-8")

    prompt = (
        "You are an expert OCR engine. Transcribe ALL readable text from this image exactly as written. "
        "Include all words, numbers, and symbols. Return ONLY the transcribed text without extra commentary or markdown."
    )

    last_error = None
    for model_name in OCR_MODELS:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "contents": [{
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": "image/jpeg", "data": b64_data}}
                    ]
                }],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 2048
                }
            }
            resp = requests.post(url, json=payload, timeout=12)
            if resp.status_code == 200:
                result_json = resp.json()
                candidates = result_json.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        text = parts[0]["text"].strip()
                        print(f"[OCR] Successfully extracted text using {model_name} ({len(text)} chars)")
                        return {
                            "text": text,
                            "confidence": 0.95,
                        }
            else:
                last_error = f"HTTP {resp.status_code}: {resp.text[:100]}"
                print(f"[OCR] Model {model_name} returned {last_error}. Trying next...")
        except Exception as e:
            last_error = e
            print(f"[OCR] Model {model_name} failed: {e}. Trying fallback model...")

    print(f"[OCR] All Gemini models failed: {last_error}.")
    return {"text": "", "confidence": 0.0}
