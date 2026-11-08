# MedVerity API — FastAPI Backend

import sys
# Ensure Windows console doesn't crash on emoji or vernacular UTF-8 characters
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, scan, explain, reminders, allergy, interactions, caregiver, history, analytics, prescription, emergency, generics, reconcile

app = FastAPI(
    title="MedVerity API",
    description="OCR & NLP-driven vernacular medicine explainer and dosage safety reminder API",
    version="1.0.0",
)

# CORS — allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(scan.router, prefix="/scan", tags=["Scan"])
app.include_router(explain.router, prefix="/explain", tags=["Explain"])
app.include_router(reminders.router, prefix="/reminders", tags=["Reminders"])
app.include_router(allergy.router, prefix="/allergy", tags=["Allergy"])
app.include_router(interactions.router, prefix="/interactions", tags=["Interactions"])
app.include_router(caregiver.router, prefix="/caregiver", tags=["Caregiver"])
app.include_router(history.router, prefix="/history", tags=["History"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(prescription.router, prefix="/prescription", tags=["Prescription Verification"])
app.include_router(emergency.router, prefix="/emergency", tags=["Emergency ICE"])
app.include_router(generics.router, prefix="/generics", tags=["Generic Cost Saver"])
app.include_router(reconcile.router, prefix="/reconcile", tags=["Rx vs Dispensed Reconciliation"])

@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": "MedVerity API",
        "version": "1.0.0",
    }
