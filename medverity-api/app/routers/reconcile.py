# MedVerity API — Prescription vs. Dispensed Pill Reconciliation Router
# Detects pharmacy dispensing errors, strength mismatches, allergy conflicts, and pill recognition.

from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from typing import Optional
from app.services.reconciliation_service import reconcile_prescription_vs_dispensed

router = APIRouter()


@router.post("/check", summary="Cross-check prescription slip vs dispensed medicine packaging & pill")
async def reconcile(
    rx_image: UploadFile = File(..., description="Photo of doctor's prescription slip"),
    blister_image: UploadFile = File(..., description="Photo of dispensed medicine blister/packaging"),
    pill_image: Optional[UploadFile] = File(None, description="Optional photo of physical pill"),
    user_id: Optional[str] = Form(None, description="Patient user ID for allergy profile retrieval"),
):
    """
    Integrates:
    1. Prescription slip OCR & entity extraction
    2. Dispensed medicine packaging OCR & entity extraction
    3. Optional physical pill visual recognition
    4. Patient profile allergy verification against active chemical salts
    5. Discrepancy diagnosis: MATCH, MISMATCH, or REVIEW REQUIRED
    """
    try:
        rx_bytes = await rx_image.read()
        blister_bytes = await blister_image.read()
        pill_bytes = await pill_image.read() if pill_image else None

        if len(rx_bytes) == 0 or len(blister_bytes) == 0:
            raise HTTPException(status_code=400, detail="One or both primary images are empty.")

        print(f"[Reconcile Router] Ingested rx ({len(rx_bytes)} B), blister ({len(blister_bytes)} B), pill ({len(pill_bytes) if pill_bytes else 0} B), user_id={user_id}")
        result = await reconcile_prescription_vs_dispensed(
            rx_image_bytes=rx_bytes,
            blister_image_bytes=blister_bytes,
            pill_image_bytes=pill_bytes,
            user_id=user_id,
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Reconcile Router] Unhandled error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Reconciliation error: {str(e)}")
