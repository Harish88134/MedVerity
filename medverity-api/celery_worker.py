"""
MedVerity — Celery Worker with Redis Broker
Handles background tasks: scheduled SMS reminders and missed dose checks.

Start with:
    celery -A celery_worker worker --loglevel=info --beat

(Requires Redis running on localhost:6379 or REDIS_URL set in .env)
"""
import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# ── App Creation ─────────────────────────────────────────────────────────
app = Celery(
    "medverity",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["celery_worker"],
)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
)

# ── Beat Schedule (recurring tasks) ──────────────────────────────────────
app.conf.beat_schedule = {
    # Fire morning reminders at 8:00 AM IST
    "morning-reminders": {
        "task": "celery_worker.send_scheduled_reminders",
        "schedule": crontab(hour=8, minute=0),
        "args": ("morning",),
    },
    # Fire afternoon reminders at 2:00 PM IST
    "afternoon-reminders": {
        "task": "celery_worker.send_scheduled_reminders",
        "schedule": crontab(hour=14, minute=0),
        "args": ("afternoon",),
    },
    # Fire night reminders at 8:30 PM IST
    "night-reminders": {
        "task": "celery_worker.send_scheduled_reminders",
        "schedule": crontab(hour=20, minute=30),
        "args": ("night",),
    },
    # Check for missed doses every hour
    "missed-dose-check": {
        "task": "celery_worker.check_missed_doses",
        "schedule": crontab(minute=0),  # every hour
    },
}


# ── Tasks ─────────────────────────────────────────────────────────────────

@app.task(name="celery_worker.send_scheduled_reminders")
def send_scheduled_reminders(time_of_day: str):
    """
    Send SMS reminders to all patients who have 'app+sms' reminders
    scheduled for the given time_of_day (morning / afternoon / night).
    """
    try:
        from app.db.supabase_client import supabase
        from app.services.sms_service import send_reminder_sms

        if not supabase:
            print(f"[Celery] Supabase not available, skipping {time_of_day} reminders.")
            return

        # Fetch SMS reminders that are pending for this time slot
        result = supabase.table("reminders") \
            .select("*, users(phone, name)") \
            .eq("time_of_day", time_of_day) \
            .eq("channel", "sms") \
            .eq("status", "pending") \
            .execute()

        sent = 0
        for row in (result.data or []):
            user = row.get("users") or {}
            phone = user.get("phone", "")
            name = user.get("name", "Patient")
            medicine = row.get("medicine_name", "your medicine")
            time_str = row.get("reminder_time", "")
            instructions = row.get("instructions", "")

            if phone:
                success = send_reminder_sms(phone, medicine, time_str, instructions)
                if success:
                    sent += 1

        print(f"[Celery] {time_of_day} reminders: sent {sent} SMS messages.")
        return {"sent": sent, "period": time_of_day}

    except Exception as e:
        print(f"[Celery] send_scheduled_reminders error: {e}")
        raise


@app.task(name="celery_worker.check_missed_doses")
def check_missed_doses():
    """
    Mark pending reminders from previous time slots as 'missed'
    and notify patients/caregivers via SMS.
    """
    try:
        from datetime import datetime
        from app.db.supabase_client import supabase
        from app.services.sms_service import send_missed_dose_sms

        if not supabase:
            return

        now = datetime.now()
        hour = now.hour

        # Determine which time_of_day window has passed
        if 10 <= hour < 14:
            overdue_period = "morning"
        elif 18 <= hour < 21:
            overdue_period = "afternoon"
        elif 23 <= hour or hour < 2:
            overdue_period = "night"
        else:
            return  # Not time to check

        # Fetch pending reminders for the overdue period
        result = supabase.table("reminders") \
            .select("*, users(phone, name)") \
            .eq("time_of_day", overdue_period) \
            .eq("status", "pending") \
            .execute()

        missed = 0
        for row in (result.data or []):
            # Mark as missed
            supabase.table("reminders") \
                .update({"status": "missed"}) \
                .eq("id", row["id"]) \
                .execute()

            user = row.get("users") or {}
            phone = user.get("phone", "")
            medicine = row.get("medicine_name", "your medicine")

            if phone:
                send_missed_dose_sms(phone, medicine)
                missed += 1

        print(f"[Celery] Marked {missed} {overdue_period} reminders as missed.")
        return {"missed": missed}

    except Exception as e:
        print(f"[Celery] check_missed_doses error: {e}")
        raise


@app.task(name="celery_worker.send_single_reminder")
def send_single_reminder(user_phone: str, medicine_name: str, time_str: str, instructions: str = ""):
    """Send a single on-demand SMS reminder (triggered when a reminder is created)."""
    from app.services.sms_service import send_reminder_sms
    return send_reminder_sms(user_phone, medicine_name, time_str, instructions)


if __name__ == "__main__":
    app.start()
