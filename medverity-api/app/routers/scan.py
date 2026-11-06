# MedVerity API — Scan Router (Google Vision OCR + Supabase persistence)

from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
import uuid
from app.models.scan import ScanResponse
from app.services.ocr_service import perform_ocr
from app.db.supabase_client import supabase

router = APIRouter()


@router.post("", response_model=ScanResponse)
async def scan_image(
    file: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None),
    user_id: Optional[str] = Form(None),
):
    """Upload medicine image → OCR via Google Vision / Gemini → return text + confidence."""
    target_file = file or image
    if not target_file:
        return ScanResponse(
            scan_id=str(uuid.uuid4()),
            ocr_text="",
            confidence=0.0,
            image_url="",
        )
    image_bytes = await target_file.read()

    # Perform real OCR
    ocr_result = await perform_ocr(image_bytes)

    scan_id = str(uuid.uuid4())

    # Persist to Supabase if user_id provided
    if supabase and user_id:
        try:
            supabase.table("scans").insert({
                "id": scan_id,
                "user_id": user_id,
                "extracted_text": ocr_result["text"],
                "ocr_confidence": ocr_result["confidence"],
                "image_url": None,   # Storage upload can be added in next iteration
            }).execute()
        except Exception as e:
            print(f"[Scan] Supabase insert failed: {e}. Continuing without DB save.")

    return ScanResponse(
        scan_id=scan_id,
        ocr_text=ocr_result["text"],
        confidence=ocr_result["confidence"],
        image_url="",
    )
