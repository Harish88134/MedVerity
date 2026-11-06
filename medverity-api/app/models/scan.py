from pydantic import BaseModel
from typing import List, Optional

class StructuredMedicineData(BaseModel):
    medicine_name: str
    dosage: str
    frequency: str
    duration: str
    category: str
    uses: str
    how_to_take: str
    warnings: List[str]

class ScanResponse(BaseModel):
    scan_id: str
    ocr_text: str
    confidence: float
    image_url: str

class ExplainRequest(BaseModel):
    scan_id: str
    ocr_text: str
    target_language: str

class ExplainResponse(BaseModel):
    scan_id: str
    extraction: StructuredMedicineData
    translated_text: Optional[str] = None
    confidence: float
    alternatives: Optional[List[dict]] = None


class VoiceQARequest(BaseModel):
    medicine_name: str
    question: str
    language: str = "en"
    context: Optional[dict] = None


class VoiceQAResponse(BaseModel):
    medicine_name: str
    question: str
    answer: str
    spoken_text: str
    language: str
    key_points: List[str] = []
    safety_caution: Optional[str] = None
    follow_up_suggestions: Optional[List[str]] = None

