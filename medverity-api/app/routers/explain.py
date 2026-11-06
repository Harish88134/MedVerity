# MedVerity API — Explain Router (Gemini NLP + Fast Translation + Voice Pharmacist QA)

from fastapi import APIRouter
from app.models.scan import (
    ExplainRequest,
    ExplainResponse,
    VoiceQARequest,
    VoiceQAResponse,
)
from app.services.nlp_service import extract_medicine_data
from app.services.translation_service import translate_text, translate_structured_data
from app.services.voice_pharmacist_service import answer_voice_question

router = APIRouter()


@router.post("", response_model=ExplainResponse)
async def explain_text(request: ExplainRequest):
    """Takes OCR text → Gemini NLP extraction + translation + structured explanation."""

    # 1. Structured extraction with unified vernacular translation
    extracted_data = await extract_medicine_data(request.ocr_text, request.target_language)

    # 2. Get translated medicine name
    translated_name = extracted_data.get("translated_name")
    if not translated_name or translated_name == extracted_data.get("medicine_name"):
        translated_name = await translate_text(
            extracted_data.get("medicine_name", "Medicine"), request.target_language
        )

    # 3. Ensure patient-facing fields are translated
    extracted_data = await translate_structured_data(extracted_data, request.target_language)

    # 4. Generate alternatives when text is ambiguous (low confidence clues)
    alternatives = None
    ocr_lower = request.ocr_text.lower()
    if "metfor" in ocr_lower:
        alternatives = [
            {"name": "Metformin 500mg Tablet", "description": "Anti-diabetic medication (Metformin HCl)"},
            {"name": "Metforal 500mg Tablet", "description": "Metformin Hydrochloride 500mg"},
            {"name": "Glycomet 500mg Tablet", "description": "Metformin Hydrochloride IP 500mg"},
        ]
    elif "augment" in ocr_lower or "clavul" in ocr_lower:
        alternatives = [
            {"name": "Augmentin 625mg Tablet", "description": "Amoxicillin + Clavulanate Potassium"},
            {"name": "Amoxiclav 625mg Tablet", "description": "Amoxicillin + Clavulanic Acid"},
        ]

    return ExplainResponse(
        scan_id=request.scan_id,
        extraction=extracted_data,
        translated_text=translated_name,
        confidence=0.0,
        alternatives=alternatives,
    )


@router.post("/voice-qa", response_model=VoiceQAResponse)
async def voice_qa(request: VoiceQARequest):
    """
    Phase 1: 'Ask My Medicine' Multilingual Voice Pharmacist.
    Answers patient questions about their medication via voice or text in vernacular languages.
    """
    result = await answer_voice_question(
        medicine_name=request.medicine_name,
        question=request.question,
        target_language=request.language or "en",
        context=request.context,
    )
    return VoiceQAResponse(**result)


# In-memory LRU-style cache for generated audio chunks/phrases
_AUDIO_CACHE: dict[tuple[str, str], bytes] = {}
MAX_AUDIO_CACHE_SIZE = 300


def _chunk_text_for_tts(text: str, max_chars: int = 120) -> list[str]:
    import re
    cleaned = re.sub(r"[*_#`~[\]()]", " ", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if not cleaned:
        return []

    raw_parts = re.split(r"([.!?;:\n।]+)", cleaned)
    sentences: list[str] = []
    current = ""
    for p in raw_parts:
        if re.match(r"^[.!?;:\n।]+$", p):
            current += p
            if current.strip():
                sentences.append(current.strip())
            current = ""
        else:
            current += p
    if current.strip():
        sentences.append(current.strip())

    chunks: list[str] = []
    for s in sentences:
        if len(s) <= max_chars:
            chunks.append(s)
        else:
            words = s.split(" ")
            cur = ""
            for w in words:
                if len(cur) + len(w) + 1 <= max_chars:
                    cur = f"{cur} {w}".strip()
                else:
                    if cur:
                        chunks.append(cur)
                    cur = w
            if cur:
                chunks.append(cur)
    return [c for c in chunks if c]


@router.get("/tts")
async def text_to_speech(text: str, lang: str = "en"):
    """
    Streams neural, natural native speaker audio for Telugu, Hindi, Tamil, English, etc.
    Provides crystal-clear, authentic pronunciation for vernacular languages.
    Automatically handles long multi-sentence texts via chunking & streaming concatenation.
    """
    import urllib.request
    import urllib.parse
    import re
    from fastapi import HTTPException, Response

    clean_text = (text or "").strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    tts_lang_map = {
        "te": "te",
        "hi": "hi",
        "ta": "ta",
        "bn": "bn",
        "mr": "mr",
        "gu": "gu",
        "kn": "kn",
        "ml": "ml",
        "pa": "pa",
        "en": "en-IN",
    }
    target_lang = tts_lang_map.get(lang, "en")

    cache_key = (clean_text, target_lang)
    if cache_key in _AUDIO_CACHE:
        return Response(
            content=_AUDIO_CACHE[cache_key],
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=86400",
                "X-Audio-Cache": "HIT",
            },
        )

    chunks = _chunk_text_for_tts(clean_text, max_chars=110)
    if not chunks:
        chunks = [clean_text[:100]]

    combined_mp3 = bytearray()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        for chunk in chunks:
            url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl={target_lang}&client=tw-ob&q={urllib.parse.quote(chunk)}"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=8) as response:
                chunk_bytes = response.read()
                combined_mp3.extend(chunk_bytes)

        if not combined_mp3:
            raise HTTPException(status_code=500, detail="Empty audio generated")

        audio_bytes = bytes(combined_mp3)

        # Store in cache
        if len(_AUDIO_CACHE) >= MAX_AUDIO_CACHE_SIZE:
            # Drop oldest key
            first_key = next(iter(_AUDIO_CACHE))
            del _AUDIO_CACHE[first_key]
        _AUDIO_CACHE[cache_key] = audio_bytes

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=86400",
                "X-Audio-Cache": "MISS",
            },
        )
    except Exception as e:
        print(f"[TTS Error] Failed to stream TTS for lang '{lang}': {e}")
        raise HTTPException(status_code=500, detail="Failed to generate audio")
