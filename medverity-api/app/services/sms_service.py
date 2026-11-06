"""
MedVerity — SMS Reminder Service (Twilio + Resilient Dispatch)
Sends dosage reminders, test alerts, and missed dose notifications.
Tracks all dispatches and delivery statuses in sms_logs.json.
"""
from twilio.rest import Client
import os
import json
import uuid
from datetime import datetime
from app.config import settings

_twilio_client: Client | None = None
_twilio_init_attempted: bool = False

SMS_LOGS_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "sms_logs.json")


def load_sms_logs() -> list:
    if os.path.exists(SMS_LOGS_PATH):
        try:
            with open(SMS_LOGS_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_sms_log(entry: dict):
    logs = load_sms_logs()
    logs.insert(0, entry)
    logs = logs[:50]
    os.makedirs(os.path.dirname(SMS_LOGS_PATH), exist_ok=True)
    try:
        with open(SMS_LOGS_PATH, "w") as f:
            json.dump(logs, f, indent=2)
    except Exception as e:
        print(f"[SMS] Failed to save SMS log: {e}")


def get_twilio_client() -> Client | None:
    """Initialize Twilio client supporting Account SID (AC...) and API Key (SK...)."""
    global _twilio_client, _twilio_init_attempted
    if _twilio_client is not None:
        return _twilio_client

    if _twilio_init_attempted:
        return _twilio_client

    _twilio_init_attempted = True
    sid = (settings.TWILIO_ACCOUNT_SID or "").strip()
    token = (settings.TWILIO_AUTH_TOKEN or "").strip()
    main_sid = os.getenv("TWILIO_MAIN_ACCOUNT_SID", "").strip()

    if not sid or not token:
        print("[Twilio] Credentials not configured.")
        return None

    try:
        if sid.startswith("SK") and main_sid.startswith("AC"):
            _twilio_client = Client(sid, token, account_sid=main_sid)
            print("[Twilio] Initialized with API Key + Account SID.")
        elif sid.startswith("AC"):
            _twilio_client = Client(sid, token)
            print("[Twilio] Initialized with Account SID.")
        else:
            _twilio_client = Client(sid, token)
    except Exception as e:
        print(f"[Twilio] Failed to initialize client: {e}")

    return _twilio_client


def update_env_twilio(account_sid: str, auth_token: str, phone_number: str) -> bool:
    """Dynamically update Twilio credentials in .env and reload client."""
    global _twilio_client, _twilio_init_attempted
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r") as f:
                lines = f.readlines()
            new_lines = []
            for line in lines:
                if line.startswith("TWILIO_ACCOUNT_SID="):
                    new_lines.append(f"TWILIO_ACCOUNT_SID={account_sid.strip()}\n")
                elif line.startswith("TWILIO_AUTH_TOKEN="):
                    new_lines.append(f"TWILIO_AUTH_TOKEN={auth_token.strip()}\n")
                elif line.startswith("TWILIO_PHONE_NUMBER="):
                    new_lines.append(f"TWILIO_PHONE_NUMBER={phone_number.strip()}\n")
                else:
                    new_lines.append(line)
            with open(env_path, "w") as f:
                f.writelines(new_lines)
        except Exception as e:
            print(f"[Twilio] Could not write to .env: {e}")

    settings.TWILIO_ACCOUNT_SID = account_sid.strip()
    settings.TWILIO_AUTH_TOKEN = auth_token.strip()
    settings.TWILIO_PHONE_NUMBER = phone_number.strip()
    _twilio_client = None
    _twilio_init_attempted = False
    return True


def send_reminder_sms(to_phone: str, medicine_name: str, time_str: str, instructions: str = "") -> dict:
    """
    Send a dosage reminder SMS to the patient's phone number.
    Returns status dict with delivery info or detailed Twilio error.
    """
    cleaned_phone = (to_phone or "").strip().replace(" ", "").replace("-", "")
    if not cleaned_phone:
        return {"success": False, "live": False, "error": "No phone number provided"}

    # Add international prefix if missing
    if not cleaned_phone.startswith("+"):
        if len(cleaned_phone) == 10:
            cleaned_phone = "+91" + cleaned_phone
        else:
            cleaned_phone = "+" + cleaned_phone

    instruction_line = f"Instructions: {instructions}\n" if instructions else ""
    body = (
        f"💊 MedVerity Reminder\n"
        f"Time to take: {medicine_name}\n"
        f"Scheduled: {time_str}\n"
        f"{instruction_line}"
        f"Stay healthy! — MedVerity"
    )

    client = get_twilio_client()
    real_sent = False
    message_sid = None
    error_code = None
    clean_error = None

    if client and settings.TWILIO_PHONE_NUMBER:
        try:
            msg = client.messages.create(
                body=body,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=cleaned_phone,
            )
            message_sid = msg.sid
            real_sent = True
            delivery_note = f"Delivered live SMS via Twilio (SID: {msg.sid})"
            print(f"[SMS] Live SMS sent to {cleaned_phone}! SID: {msg.sid}")
        except Exception as e:
            error_code = getattr(e, "code", None)
            raw_msg = getattr(e, "msg", str(e))
            clean_error = raw_msg.strip()
            print(f"[SMS] Twilio failed: code={error_code}, msg={clean_error}")

            if error_code == 20003 or "trial account has expired" in clean_error.lower():
                delivery_note = "Failed: Twilio Trial account has expired (Error 20003). Upgrade or renew account to send physical SMS."
            elif error_code == 21608:
                delivery_note = f"Failed: Number {cleaned_phone} is unverified. In Twilio Trial mode, add this number to Verified Caller IDs."
            else:
                delivery_note = f"Failed (Twilio Error {error_code or 'Unknown'}): {clean_error[:100]}"
    else:
        delivery_note = "Simulated dispatch (Twilio credentials not configured)"

    log_entry = {
        "id": f"sms-{str(uuid.uuid4())[:8]}",
        "to": cleaned_phone,
        "medicine_name": medicine_name,
        "time": time_str,
        "body": body,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "delivered_live" if real_sent else "failed_trial_expired" if (error_code == 20003 or "expired" in (clean_error or "").lower()) else "failed_error",
        "note": delivery_note,
        "sid": message_sid,
        "error_code": error_code,
        "error_message": clean_error,
    }
    save_sms_log(log_entry)

    return {
        "success": real_sent,
        "live": real_sent,
        "to": cleaned_phone,
        "medicine": medicine_name,
        "body": body,
        "note": delivery_note,
        "error": clean_error,
        "error_code": error_code,
        "log_id": log_entry["id"],
    }


def send_missed_dose_sms(to_phone: str, medicine_name: str, caregiver_phone: str | None = None) -> dict:
    """Notify patient (and optionally caregiver) about a missed dose."""
    cleaned_phone = (to_phone or "").strip()
    if not cleaned_phone.startswith("+") and len(cleaned_phone) == 10:
        cleaned_phone = "+91" + cleaned_phone

    body = (
        f"⚠️ MedVerity Alert\n"
        f"You missed your dose of {medicine_name}.\n"
        f"Please consult your doctor if you are unsure what to do.\n"
        f"— MedVerity"
    )

    client = get_twilio_client()
    if client and settings.TWILIO_PHONE_NUMBER:
        try:
            client.messages.create(body=body, from_=settings.TWILIO_PHONE_NUMBER, to=cleaned_phone)
        except Exception as e:
            print(f"[SMS] Missed dose Twilio error: {e}")

    log_entry = {
        "id": f"sms-{str(uuid.uuid4())[:8]}",
        "to": cleaned_phone,
        "medicine_name": medicine_name,
        "time": "Missed",
        "body": body,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "status": "alert_sent",
        "note": "Missed dose alert",
    }
    save_sms_log(log_entry)
    return {"success": True, "to": cleaned_phone}
