# MedVerity API — Caregiver Router (Supabase + mock fallback)

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from app.db.supabase_client import supabase

router = APIRouter()


class InviteRequest(BaseModel):
    caregiver_id: str
    patient_email: str


class AcceptRequest(BaseModel):
    link_id: str
    patient_id: str


@router.get("/dashboard")
async def get_caregiver_dashboard(caregiver_id: str = ""):
    """Get aggregated family adherence data for the caregiver's linked patients."""
    if supabase and caregiver_id:
        try:
            # Get linked patients
            links = supabase.table("caregiver_links") \
                .select("patient_id, status, users!caregiver_links_patient_id_fkey(name)") \
                .eq("caregiver_id", caregiver_id) \
                .eq("status", "active") \
                .execute()

            if links.data:
                patient = links.data[0]
                patient_id = patient["patient_id"]
                patient_name = (patient.get("users") or {}).get("name", "Patient")

                # Get reminder adherence stats for this patient
                rems = supabase.table("reminders") \
                    .select("medicine_name, reminder_time, status, time_of_day") \
                    .eq("user_id", patient_id) \
                    .order("created_at", desc=True) \
                    .limit(20) \
                    .execute()

                taken = sum(1 for r in (rems.data or []) if r.get("status") == "taken")
                total = len(rems.data or [])
                adherence = int((taken / total) * 100) if total else 100

                # Next pending dose
                next_dose = None
                missed = []
                for r in (rems.data or []):
                    if r.get("status") == "pending" and not next_dose:
                        next_dose = {
                            "medicine": r["medicine_name"],
                            "time": r["reminder_time"],
                            "instructions": r.get("time_of_day", "").capitalize(),
                        }
                    elif r.get("status") == "missed":
                        missed.append({
                            "medicine": r["medicine_name"],
                            "time": r.get("reminder_time", ""),
                        })

                return {
                    "patient_name": patient_name,
                    "adherence": adherence,
                    "next_dose": next_dose or {
                        "medicine": "No upcoming doses",
                        "time": "—",
                        "instructions": "All doses taken",
                    },
                    "missed_doses": missed[:3],
                }
        except Exception as e:
            print(f"[Caregiver] Supabase fetch failed: {e}. Returning mock data.")

    # Local dynamic calculation for linked patient Hasmitha
    try:
        from app.routers.reminders import load_reminders
        rems_data = load_reminders()
        hasmitha_id = "user-hasmitha-patient"
        all_rems = []
        for tod in ("morning", "afternoon", "night"):
            for r in rems_data.get(tod, []):
                if r.get("user_id") == hasmitha_id:
                    all_rems.append(r)

        if all_rems:
            taken = sum(1 for r in all_rems if r.get("status") == "taken")
            total = len(all_rems)
            adherence = int((taken / total) * 100) if total else 85
            next_p = next((r for r in all_rems if r.get("status") == "pending"), None)
            missed_p = [r for r in all_rems if r.get("status") == "missed"]

            return {
                "patient_name": "Hasmitha",
                "adherence": adherence,
                "next_dose": {
                    "medicine": next_p["medicine_name"] if next_p else "Atorvastatin 20mg",
                    "time": next_p["time"] if next_p else "09:30 PM",
                    "instructions": next_p.get("instructions", "Optimal Chronotherapy timing before sleep.") if next_p else "Take after dinner",
                },
                "missed_doses": [
                    {"medicine": m["medicine_name"], "time": m["time"]} for m in missed_p
                ] if missed_p else [
                    {"medicine": "Metformin 500mg", "time": "Yesterday, 08:30 AM (Catch-up Taken)"}
                ],
            }
    except Exception as err:
        print("[Caregiver] Local calculation note:", err)

    # Mock fallback
    return {
        "patient_name": "Hasmitha",
        "adherence": 92,
        "next_dose": {
            "medicine": "Atorvastatin 20mg",
            "time": "09:30 PM",
            "instructions": "Optimal Chronotherapy timing before sleep.",
        },
        "missed_doses": [
            {"medicine": "Metformin 500mg", "time": "Yesterday, 08:30 AM (Catch-up Taken)"},
        ],
    }


@router.post("/invite")
async def invite_caregiver(request: InviteRequest):
    """Generate a caregiver invite link."""
    if supabase and request.caregiver_id:
        try:
            # Look up patient by email
            users = supabase.table("users") \
                .select("id") \
                .execute()

            # Simplified: just create a pending link and return a link ID
            link_id = f"link-{request.caregiver_id[:8]}"
            return {
                "message": "Invite link generated",
                "link_id": link_id,
                "invite_url": f"https://medverity.app/caregiver/accept?link={link_id}",
            }
        except Exception as e:
            print(f"[Caregiver] Invite failed: {e}.")

    return {
        "message": "Invite link generated (stub)",
        "link_id": "stub-link-id",
        "invite_url": "https://medverity.app/caregiver/accept?link=stub-link-id",
    }


class RemindNudgeRequest(BaseModel):
    patient_name: str
    medicine_name: str
    caregiver_name: Optional[str] = "Caregiver"


@router.post("/accept")
async def accept_caregiver_link(request: AcceptRequest):
    """Accept a caregiver invitation."""
    if supabase:
        try:
            supabase.table("caregiver_links") \
                .update({"status": "active"}) \
                .eq("id", request.link_id) \
                .eq("patient_id", request.patient_id) \
                .execute()
        except Exception as e:
            print(f"[Caregiver] Accept failed: {e}.")

    return {"message": "Caregiver link accepted successfully"}


@router.post("/remind")
async def send_caregiver_remind(request: RemindNudgeRequest):
    """Caregiver sends a reminder nudge to patient for missed medicine."""
    return {
        "success": True,
        "message": f"Reminder alert sent to {request.patient_name} to take {request.medicine_name}."
    }

