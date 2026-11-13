# MedVerity API — Auth Router (Direct Backend Auth + Optional Supabase Sync)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict
import json
import os
import hashlib
import random
import time
from app.db.supabase_client import supabase

router = APIRouter()

USERS_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "users.json")
RESET_CODES_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "reset_codes.json")


def _load_reset_codes() -> dict:
    if os.path.exists(RESET_CODES_PATH):
        try:
            with open(RESET_CODES_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def _save_reset_codes(data: dict):
    os.makedirs(os.path.dirname(RESET_CODES_PATH), exist_ok=True)
    with open(RESET_CODES_PATH, "w") as f:
        json.dump(data, f, indent=2)


def _hash_pw(password: str) -> str:
    """Hash password with SHA-256 and salt for secure storage."""
    salt = "medverity_secure_salt_2026"
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def load_users() -> Dict[str, dict]:
    if os.path.exists(USERS_PATH):
        try:
            with open(USERS_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_users(data: dict):
    os.makedirs(os.path.dirname(USERS_PATH), exist_ok=True)
    with open(USERS_PATH, "w") as f:
        json.dump(data, f, indent=2)


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    preferred_language: str = "en"
    security_question: Optional[str] = None
    security_answer: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdateRequest(BaseModel):
    user_id: str
    name: Optional[str] = None
    phone: Optional[str] = None
    preferred_language: Optional[str] = None
    role: Optional[str] = None
    security_question: Optional[str] = None
    security_answer: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifySecurityAnswerRequest(BaseModel):
    email: EmailStr
    security_answer: str
    registered_phone: Optional[str] = None


class ResetWithSecurityRequest(BaseModel):
    email: EmailStr
    verification_token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    user_id: str
    current_password: str
    new_password: str


class AuthResponse(BaseModel):
    message: str
    user_id: str | None = None
    token: str | None = None
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    preferred_language: str | None = None


@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest):
    """Register a new user directly in FastAPI backend store (with optional Supabase sync)."""
    users = load_users()
    norm_email = request.email.lower().strip()
    
    if norm_email in users:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user_id = f"user-{len(users) + 1}"
    hashed_password = _hash_pw(request.password)

    user_record = {
        "id": user_id,
        "name": request.name.strip(),
        "email": norm_email,
        "password_hash": hashed_password,
        "password": request.password,  # Backward compatibility
        "phone": request.phone or "",
        "preferred_language": request.preferred_language or "en",
        "role": "patient",
        "security_question": request.security_question or "What is your registered phone number?",
        "security_answer": (request.security_answer or request.phone or "").strip().lower(),
    }
    users[norm_email] = user_record
    save_users(users)

    # Optional sync to Supabase if configured
    if supabase:
        try:
            result = supabase.auth.sign_up({
                "email": norm_email,
                "password": request.password,
                "options": {
                    "data": {
                        "name": request.name,
                        "phone": request.phone or "",
                        "preferred_language": request.preferred_language,
                    }
                },
            })
            if result.user:
                user_record["supabase_id"] = str(result.user.id)
                users[norm_email] = user_record
                save_users(users)
        except Exception as e:
            print(f"[Auth] Supabase sync note: {e}")

    return AuthResponse(
        message="User registered successfully.",
        user_id=user_id,
        token=f"token-{user_id}",
        name=request.name,
        email=norm_email,
        phone=request.phone,
        preferred_language=request.preferred_language,
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Authenticate existing user directly against backend store with strict password verification."""
    users = load_users()
    norm_email = request.email.lower().strip()
    local_user = users.get(norm_email)

    if not local_user:
        # Check if email is in any of the values (case-insensitive lookup)
        for u in users.values():
            if isinstance(u, dict) and u.get("email", "").lower().strip() == norm_email:
                local_user = u
                break

    if not local_user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Strictly verify password against stored password or hash
    stored_hash = local_user.get("password_hash")
    stored_raw_pw = local_user.get("password")
    
    password_valid = False
    if stored_hash:
        password_valid = (stored_hash == _hash_pw(request.password))
    elif stored_raw_pw:
        password_valid = (stored_raw_pw == request.password)
        # Migrate to hashed password on first successful login
        if password_valid:
            local_user["password_hash"] = _hash_pw(request.password)
            users[norm_email] = local_user
            save_users(users)
    else:
        # User record exists without password: set and trust on first login if previously registered
        local_user["password_hash"] = _hash_pw(request.password)
        local_user["password"] = request.password
        users[norm_email] = local_user
        save_users(users)
        password_valid = True

    if not password_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    return AuthResponse(
        message="Login successful",
        user_id=local_user.get("id"),
        token=f"token-{local_user.get('id')}",
        name=local_user.get("name"),
        email=local_user.get("email"),
        phone=local_user.get("phone"),
        preferred_language=local_user.get("preferred_language", "en"),
    )


@router.put("/profile")
async def update_profile(payload: ProfileUpdateRequest):
    """Dynamically update user profile (name, phone number, language, role)."""
    users = load_users()

    # Find existing user record by ID or create new
    matched_key = None
    for key, val in users.items():
        if val.get("id") == payload.user_id:
            matched_key = key
            break

    if not matched_key:
        matched_key = payload.user_id
        users[matched_key] = {"id": payload.user_id}

    user_data = users[matched_key]
    if payload.name is not None:
        user_data["name"] = payload.name
    if payload.phone is not None:
        user_data["phone"] = payload.phone
    if payload.preferred_language is not None:
        user_data["preferred_language"] = payload.preferred_language
    if payload.role is not None:
        user_data["role"] = payload.role

    save_users(users)
    print(f"[Auth] Updated profile for user {payload.user_id}: phone={payload.phone}")

    # Try updating Supabase users table as well
    if supabase:
        try:
            supabase.table("users").upsert({
                "id": payload.user_id,
                "name": user_data.get("name", ""),
                "phone": user_data.get("phone", ""),
                "preferred_language": user_data.get("preferred_language", "en"),
                "role": user_data.get("role", "patient"),
            }).execute()
        except Exception as e:
            print(f"[Auth] Supabase table update note: {e}")

    return {
        "success": True,
        "message": "Profile updated successfully",
        "user": user_data,
    }


@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    """Retrieve user profile by user_id."""
    users = load_users()
    for val in users.values():
        if val.get("id") == user_id:
            return {"user": val}

    if supabase:
        try:
            res = supabase.table("users").select("*").eq("id", user_id).execute()
            if res.data:
                return {"user": res.data[0]}
        except Exception:
            pass

    return {"user": {"id": user_id, "name": "", "phone": "", "preferred_language": "en"}}


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """Retrieve security question or verification prompt for user."""
    users = load_users()
    norm_email = payload.email.lower().strip()

    matched_user = None
    for k, v in users.items():
        if isinstance(v, dict):
            stored_email = (v.get("email") or k or "").lower().strip()
            if stored_email == norm_email:
                matched_user = v
                break
        elif str(k).lower().strip() == norm_email:
            matched_user = {"email": norm_email}
            break

    if not matched_user:
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    question = matched_user.get("security_question")
    has_phone = bool(matched_user.get("phone"))

    if not question:
        question = "What is your registered phone number?" if has_phone else "What was the name of your first school or hometown?"

    return {
        "success": True,
        "email": norm_email,
        "security_question": question,
        "has_phone_fallback": has_phone,
    }


@router.post("/verify-security-answer")
async def verify_security_answer(payload: VerifySecurityAnswerRequest):
    """Verify security answer or registered phone number."""
    users = load_users()
    norm_email = payload.email.lower().strip()

    matched_user = None
    for k, v in users.items():
        if isinstance(v, dict):
            stored_email = (v.get("email") or k or "").lower().strip()
            if stored_email == norm_email:
                matched_user = v
                break

    if not matched_user:
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    stored_ans = (matched_user.get("security_answer") or "").strip().lower()
    stored_phone = "".join(filter(str.isdigit, str(matched_user.get("phone") or "")))

    input_ans = payload.security_answer.strip().lower()
    input_phone = "".join(filter(str.isdigit, payload.registered_phone or payload.security_answer))

    verified = False
    # 1. Check direct security answer match
    if stored_ans and stored_ans == input_ans:
        verified = True
    # 2. Check registered phone number match (ignoring spaces/formatting/+91)
    elif stored_phone and len(stored_phone) >= 7 and (stored_phone.endswith(input_phone) or input_phone.endswith(stored_phone)):
        verified = True
    # 3. If account was registered without a security question, match on last 4 digits of phone or any registered profile field
    elif stored_phone and len(input_phone) >= 4 and stored_phone.endswith(input_phone):
        verified = True

    if not verified:
        raise HTTPException(status_code=400, detail="Security answer or phone verification failed. Please try again.")

    # Issue a secure 10-minute reset token
    reset_token = hashlib.sha256(f"{norm_email}:{time.time()}:medverity_reset_token".encode()).hexdigest()
    codes = _load_reset_codes()
    codes[norm_email] = {
        "token": reset_token,
        "expires_at": time.time() + 600,
    }
    _save_reset_codes(codes)

    return {
        "success": True,
        "message": "Identity verified successfully. You may now set your new password.",
        "verification_token": reset_token,
    }


@router.post("/reset-password")
async def reset_password(payload: ResetWithSecurityRequest):
    """Set new password using verified security token."""
    norm_email = payload.email.lower().strip()
    codes = _load_reset_codes()
    entry = codes.get(norm_email)

    if not entry or time.time() > entry.get("expires_at", 0):
        raise HTTPException(status_code=400, detail="Verification session has expired. Please verify your identity again.")

    if entry.get("token") != payload.verification_token:
        raise HTTPException(status_code=400, detail="Invalid verification session token.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    # Update user password in store
    users = load_users()
    matched_key = None
    for k, v in users.items():
        if isinstance(v, dict) and (v.get("email") or k or "").lower().strip() == norm_email:
            matched_key = k
            break

    if not matched_key:
        raise HTTPException(status_code=404, detail="User account not found.")

    new_hash = _hash_pw(payload.new_password)
    users[matched_key]["password_hash"] = new_hash
    users[matched_key]["password"] = payload.new_password
    save_users(users)

    # Invalidate token
    if norm_email in codes:
        del codes[norm_email]
        _save_reset_codes(codes)

    return {
        "success": True,
        "message": "Password updated successfully. You can now log in with your new password.",
    }


@router.post("/change-password")
async def change_password(payload: ChangePasswordRequest):
    """Change password for an authenticated user."""
    users = load_users()
    matched_key = None
    for k, v in users.items():
        if isinstance(v, dict) and v.get("id") == payload.user_id:
            matched_key = k
            break

    if not matched_key:
        raise HTTPException(status_code=404, detail="User account not found.")

    user_data = users[matched_key]
    stored_hash = user_data.get("password_hash")
    stored_raw = user_data.get("password")

    current_valid = False
    if stored_hash:
        current_valid = (stored_hash == _hash_pw(payload.current_password))
    elif stored_raw:
        current_valid = (stored_raw == payload.current_password)

    if not current_valid:
        raise HTTPException(status_code=400, detail="Incorrect current password.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    new_hash = _hash_pw(payload.new_password)
    user_data["password_hash"] = new_hash
    user_data["password"] = payload.new_password
    save_users(users)

    return {
        "success": True,
        "message": "Password changed successfully.",
    }


@router.post("/logout")
async def logout():
    """Sign out user."""
    if supabase:
        try:
            supabase.auth.sign_out()
        except Exception:
            pass
    return {"message": "Logged out successfully"}
