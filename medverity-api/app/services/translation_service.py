"""
MedVerity Translation Service — Google Translate + Gemini Free Translation
Translates extracted medicine text to user's preferred vernacular language.
Uses Gemini Flash Lite when Google Cloud Translate billing is not enabled.
"""
import httpx
import google.generativeai as genai
from app.config import settings

GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"

# Configure Gemini once
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)


async def translate_text(text: str, target_language: str) -> str:
    """
    Translate text to target_language.
    Tries Google Cloud Translate first; falls back to free Gemini Flash Lite.
    """
    if not text or not text.strip():
        return text

    if target_language in ("en", ""):
        return text

    # Try Google Cloud Translation API if key is present
    api_key = settings.GOOGLE_TRANSLATE_KEY
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                response = await client.post(
                    GOOGLE_TRANSLATE_URL,
                    params={"key": api_key},
                    json={
                        "q": text,
                        "target": target_language,
                        "format": "text",
                        "source": "en",
                    },
                )
                if response.status_code == 200:
                    result = response.json()
                    return result["data"]["translations"][0]["translatedText"]
        except Exception as e:
            print(f"[Translation] Google Translate API skipped: {e}")

    # Fallback to Gemini Flash Lite (Completely Free)
    if settings.GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-3.5-flash-lite")
            prompt = f"Translate the following medical phrase or medicine name to {target_language}. Return ONLY the direct translation without quotes, notes, or explanations:\n{text}"
            res = model.generate_content(prompt)
            translated = res.text.strip()
            if translated:
                return translated
        except Exception as e:
            print(f"[Translation] Gemini translation fallback skipped: {e}")

    return _static_fallback_translate(text, target_language)


async def translate_structured_data(data: dict, target_language: str) -> dict:
    """
    Translate the key user-facing fields of structured medicine data.
    Returns original data unchanged if target is English or already translated.
    """
    if target_language in ("en", ""):
        return data

    translated = dict(data)

    # If already translated by the unified NLP prompt, skip re-translation
    if translated.get("translated_name"):
        return translated

    fields_to_translate = ["uses", "how_to_take"]
    for field in fields_to_translate:
        if data.get(field) and data[field] not in ("Not specified", "Unknown"):
            translated[field] = await translate_text(data[field], target_language)

    if data.get("warnings") and isinstance(data["warnings"], list):
        translated_warnings = []
        for warning in data["warnings"]:
            translated_warnings.append(await translate_text(warning, target_language))
        translated["warnings"] = translated_warnings

    return translated


def _static_fallback_translate(text: str, target_language: str) -> str:
    """Hard-coded translations for common phrases when all APIs are unreachable."""
    static_translations: dict[str, dict[str, str]] = {
        "te": {
            "Paracetamol 650 mg": "పారాసిటమాల్ 650 మి.గ్రా",
            "Pantoprazole 40mg": "పాంటోప్రజోల్ 40 మి.గ్రా",
            "Metformin 500mg": "మెట్‌ఫార్మిన్ 500 మి.గ్రా",
        },
        "hi": {
            "Paracetamol 650 mg": "पैरासिटामोल 650 मिलीग्राम",
            "Pantoprazole 40mg": "पैंटोप्राजोल 40 मिलीग्राम",
            "Metformin 500mg": "मेटफार्मिन 500 मिलीग्राम",
        },
        "ta": {
            "Paracetamol 650 mg": "பாராசிட்டமால் 650 மி.கி",
        },
        "bn": {
            "Paracetamol 650 mg": "প্যারাসিটামল 650 মিগ্রা",
        },
        "mr": {
            "Paracetamol 650 mg": "पॅरासिटामॉल 650 मिग्रॅ",
        },
    }
    return static_translations.get(target_language, {}).get(text, text)
