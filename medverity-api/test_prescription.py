import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.routers import allergy, interactions
from app.services import nlp_service

# Mock the external services for deterministic testing
async def mock_extract_prescription_medicines(text):
    if "Clean" in text:
        return [{"medicine_name": "Paracetamol 650mg"}, {"medicine_name": "Vitamin C"}]
    elif "Allergy" in text:
        return [{"medicine_name": "Amoxicillin 500mg"}]
    elif "Conflict" in text:
        return [{"medicine_name": "Ibuprofen 400mg"}]
    return []

async def mock_check_allergy(medicine_name="", user_allergies="", user_id=""):
    if "Amoxicillin" in medicine_name:
        return {"has_allergy": True, "matches": ["Penicillin"], "description": "Known allergy to Penicillin class."}
    return {"has_allergy": False}

async def mock_get_interactions(medicine_name="", language="en"):
    if "Ibuprofen" in medicine_name:
        return {"drug_interactions": [{"with_drug": "Aspirin", "risk_level": "high", "description": "Increased risk of bleeding."}]}
    return {"drug_interactions": []}

# Patch the services
nlp_service.extract_prescription_medicines = mock_extract_prescription_medicines
allergy.check_allergy = mock_check_allergy
interactions.get_interactions = mock_get_interactions

client = TestClient(app)

def test_clean_prescription():
    print("\n--- Test A: Clean Prescription ---")
    response = client.post("/prescription/verify", data={"user_id": "test_user", "ocr_text": "Clean Prescription: Paracetamol and Vitamin C"})
    assert response.status_code == 200
    data = response.json()
    print("Summary:", data["summary"])
    for med in data["medicines"]:
        print(f" - {med['medicine_name']}: {med['status']}")

def test_allergy_prescription():
    print("\n--- Test B: Allergy Match Prescription ---")
    response = client.post("/prescription/verify", data={"user_id": "test_user", "ocr_text": "Allergy Prescription: Amoxicillin"})
    assert response.status_code == 200
    data = response.json()
    print("Summary:", data["summary"])
    for med in data["medicines"]:
        print(f" - {med['medicine_name']}: {med['status']}")
        for flag in med["flags"]:
            print(f"    Flag: {flag['type']} - {flag['description']}")

def test_conflict_prescription():
    print("\n--- Test C: Drug-Drug Conflict Prescription ---")
    response = client.post("/prescription/verify", data={"user_id": "test_user", "ocr_text": "Conflict Prescription: Ibuprofen"})
    assert response.status_code == 200
    data = response.json()
    print("Summary:", data["summary"])
    for med in data["medicines"]:
        print(f" - {med['medicine_name']}: {med['status']}")
        for flag in med["flags"]:
            print(f"    Flag: {flag['type']} - {flag['description']}")

if __name__ == "__main__":
    test_clean_prescription()
    test_allergy_prescription()
    test_conflict_prescription()
    print("\nAll tests ran successfully!")
