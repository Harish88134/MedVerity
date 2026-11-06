# MedVerity API — Reminders Router (Supabase + Local fallback + SMS Dispatch)

from fastapi import APIRouter
from pydantic import BaseModel
import json
import os
from typing import Dict, List, Optional
import uuid

from app.db.supabase_client import supabase
from app.services.sms_service import send_reminder_sms, load_sms_logs
from app.routers.auth import load_users

router = APIRouter()

REMINDERS_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "reminders.json")


class ReminderCreate(BaseModel):
    medicine_name: str
    time: str
    instructions: str = ""
    timeOfDay: str = "morning"
    user_id: Optional[str] = None
    scan_id: Optional[str] = None
    channel: str = "app"
    phone: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


class TestSmsRequest(BaseModel):
    to_phone: str
    medicine_name: str = "Paracetamol 500mg"


# ── File-based helpers ──────────────────────────────────────────────────

def load_reminders() -> Dict[str, List[dict]]:
    if os.path.exists(REMINDERS_PATH):
        try:
            with open(REMINDERS_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return {"morning": [], "afternoon": [], "night": []}
    return {"morning": [], "afternoon": [], "night": []}


def save_reminders(data: dict):
    os.makedirs(os.path.dirname(REMINDERS_PATH), exist_ok=True)
    with open(REMINDERS_PATH, "w") as f:
        json.dump(data, f, indent=2)


# ── Supabase helpers ─────────────────────────────────────────────────────

def _supabase_to_schedule(rows: list) -> dict:
    """Convert Supabase rows to schedule format."""
    schedule: dict = {"morning": [], "afternoon": [], "night": []}
    for row in rows:
        tod = row.get("time_of_day", "morning")
        if tod not in schedule:
            schedule[tod] = []
        schedule[tod].append({
            "id": row["id"],
            "medicine_name": row["medicine_name"],
            "time": row.get("reminder_time", "08:00"),
            "instructions": row.get("instructions", ""),
            "status": row.get("status", "pending"),
            "timeOfDay": tod,
            "channel": row.get("channel", "app"),
        })
    return schedule


# ── Routes ───────────────────────────────────────────────────────────────

@router.get("")
async def get_reminders(user_id: str = ""):
    """Get user's daily reminders schedule."""
    if supabase and user_id:
        try:
            result = supabase.table("reminders") \
                .select("*") \
                .eq("user_id", user_id) \
                .execute()
            if result.data:
                return _supabase_to_schedule(result.data)
        except Exception as e:
            print(f"[Reminders] Supabase read note: {e}. Using local store.")

    return load_reminders()


@router.post("")
async def add_reminder(reminder: ReminderCreate):
    """Add a new reminder and dispatch SMS alert if channel is sms."""
    time_of_day = reminder.timeOfDay.lower()
    reminder_id = f"rem-{str(uuid.uuid4())[:8]}"

    # Determine recipient phone number
    target_phone = reminder.phone
    if not target_phone and reminder.user_id:
        users = load_users()
        for u in users.values():
            if u.get("id") == reminder.user_id and u.get("phone"):
                target_phone = u.get("phone")
                break

    # Dispatch SMS if requested
    sms_result = None
    if reminder.channel == "sms" and target_phone:
        print(f"[Reminders] Dispatching reminder SMS to {target_phone} for {reminder.medicine_name}")
        sms_result = send_reminder_sms(
            to_phone=target_phone,
            medicine_name=reminder.medicine_name,
            time_str=reminder.time,
            instructions=reminder.instructions,
        )

    # Try Supabase persistence
    if supabase and reminder.user_id:
        try:
            result = supabase.table("reminders").insert({
                "user_id": reminder.user_id,
                "scan_id": reminder.scan_id,
                "medicine_name": reminder.medicine_name,
                "time_of_day": time_of_day,
                "reminder_time": reminder.time,
                "instructions": reminder.instructions,
                "status": "pending",
                "channel": reminder.channel,
            }).execute()
            if result.data:
                row = result.data[0]
                return {
                    "id": row["id"],
                    "medicine_name": row["medicine_name"],
                    "time": row["reminder_time"],
                    "instructions": row.get("instructions", ""),
                    "status": row["status"],
                    "timeOfDay": row["time_of_day"],
                    "channel": row.get("channel", reminder.channel),
                    "sms_dispatched": sms_result is not None,
                    "sms_info": sms_result,
                }
        except Exception as e:
            print(f"[Reminders] Supabase insert note: {e}. Saving to local file.")

    # Local file fallback
    data = load_reminders()
    new_rem = {
        "id": reminder_id,
        "medicine_name": reminder.medicine_name,
        "time": reminder.time,
        "instructions": reminder.instructions,
        "status": "pending",
        "timeOfDay": time_of_day,
        "channel": reminder.channel,
        "phone": target_phone or "",
    }
    if time_of_day not in data:
        data[time_of_day] = []
    data[time_of_day].append(new_rem)
    save_reminders(data)

    return {
        **new_rem,
        "sms_dispatched": sms_result is not None,
        "sms_info": sms_result,
    }


@router.get("/sms-logs")
async def get_sms_logs():
    """Retrieve history of sent and simulated SMS notifications."""
    logs = load_sms_logs()
    return {"logs": logs}


@router.post("/send-test-sms")
async def send_test_sms(req: TestSmsRequest):
    """Send an immediate test SMS to verify phone number and Twilio delivery."""
    result = send_reminder_sms(
        to_phone=req.to_phone,
        medicine_name=req.medicine_name,
        time_str="Now (Test)",
        instructions="Take 1 tablet with water. This is a test reminder from MedVerity.",
    )
    return result


class TwilioConfigRequest(BaseModel):
    account_sid: str
    auth_token: str
    phone_number: str


@router.post("/twilio-config")
async def update_twilio_config(req: TwilioConfigRequest):
    """Update Twilio credentials dynamically in .env and verify connection."""
    from app.services.sms_service import update_env_twilio, get_twilio_client
    update_env_twilio(req.account_sid, req.auth_token, req.phone_number)
    client = get_twilio_client()
    if not client:
        return {"success": False, "error": "Could not initialize Twilio client with provided credentials."}

    try:
        acc = client.api.accounts(client.account_sid).fetch()
        return {
            "success": True,
            "message": f"Twilio connected successfully! Account: {acc.friendly_name} (Status: {acc.status})",
            "account_name": acc.friendly_name,
            "account_status": acc.status,
        }
    except Exception as e:
        error_msg = getattr(e, "msg", str(e))
        return {
            "success": False,
            "error": f"Twilio connection failed: {error_msg}",
        }


@router.put("/{time_of_day}/{reminder_id}/status")
async def update_reminder_status(time_of_day: str, reminder_id: str, payload: StatusUpdate):
    """Update reminder status (taken / pending / missed)."""
    new_status = payload.status

    if supabase:
        try:
            result = supabase.table("reminders") \
                .update({"status": new_status}) \
                .eq("id", reminder_id) \
                .execute()
            if result.data:
                return {"success": True, "reminder": result.data[0]}
        except Exception:
            pass

    # File fallback
    data = load_reminders()
    if time_of_day in data:
        for r in data[time_of_day]:
            if r["id"] == reminder_id:
                r["status"] = new_status
                save_reminders(data)
                return {"success": True, "reminder": r}
    return {"success": False, "error": "Reminder not found"}


@router.delete("/{reminder_id}")
async def delete_reminder(reminder_id: str):
    """Delete a reminder."""
    if supabase:
        try:
            supabase.table("reminders").delete().eq("id", reminder_id).execute()
            return {"success": True}
        except Exception:
            pass

    # File fallback
    data = load_reminders()
    for period in ("morning", "afternoon", "night"):
        original = data.get(period, [])
        data[period] = [r for r in original if r["id"] != reminder_id]
    save_reminders(data)
    return {"success": True}
