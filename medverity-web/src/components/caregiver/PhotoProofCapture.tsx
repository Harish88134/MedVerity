"use client";

import React, { useState, useRef } from "react";
import { Camera, CheckCircle2, Loader2, X } from "lucide-react";

interface Props {
  reminderId: string;
  medicineName: string;
  takenAt: string; // e.g. "08:05 AM"
  onPhotoProofSaved?: (previewUrl: string) => void;
}

type ProofState = "prompt" | "capturing" | "captured" | "confirmed";

export default function PhotoProofCapture({ reminderId, medicineName, takenAt, onPhotoProofSaved }: Props) {
  const [state, setState] = useState<ProofState>(() => {
    try {
      const stored = localStorage.getItem(`medverity_photo_proof_${reminderId}`);
      return stored ? "confirmed" : "prompt";
    } catch {
      return "prompt";
    }
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`medverity_photo_proof_${reminderId}`);
    } catch {
      return null;
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setState("capturing");
    const url = URL.createObjectURL(file);
    setTimeout(() => {
      setPreviewUrl(url);
      setState("captured");
    }, 600);
  };

  const handleConfirm = () => {
    if (!previewUrl) return;
    try {
      // Persist for caregiver feed (in production, upload to Supabase storage)
      localStorage.setItem(`medverity_photo_proof_${reminderId}`, previewUrl);
    } catch {}
    setState("confirmed");
    onPhotoProofSaved?.(previewUrl);
  };

  const handleRetake = () => {
    setPreviewUrl(null);
    setState("prompt");
    fileInputRef.current?.click();
  };

  const handleSkip = () => {
    setState("confirmed");
  };

  return (
    <div style={{
      borderRadius: "var(--radius-xl)",
      border: state === "confirmed" ? "1.5px solid #D1FAE5" : "1.5px solid var(--color-border)",
      overflow: "hidden",
      background: "var(--color-surface)",
      transition: "border-color 0.3s ease",
    }}>
      {/* Header */}
      <div style={{
        padding: "0.875rem 1.25rem",
        background: state === "confirmed"
          ? "linear-gradient(135deg, #D1FAE5, #A7F3D0)"
          : "linear-gradient(135deg, #F0FFF4, #DCFCE7)",
        borderBottom: state === "confirmed" ? "1px solid #A7F3D0" : "1px solid #BBF7D0",
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        {state === "confirmed"
          ? <CheckCircle2 size={22} style={{ color: "#059669", flexShrink: 0 }} />
          : <Camera size={22} style={{ color: "#059669", flexShrink: 0 }} />
        }
        <div>
          <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: 0, color: "#065F46" }}>
            {state === "confirmed" ? "✓ Taken & Photo Verified" : "📸 Optional: Snap Pill in Hand"}
          </p>
          <p style={{ fontSize: "0.75rem", color: "#047857", margin: 0 }}>
            {state === "confirmed"
              ? `${medicineName} confirmed at ${takenAt}`
              : `Give your caregiver peace of mind for ${medicineName}`
            }
          </p>
        </div>
      </div>

      <div style={{ padding: "1rem 1.25rem" }}>
        {/* Prompt state */}
        {state === "prompt" && (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
              id="snap-pill-btn"
              style={{
                flex: 2, padding: "0.75rem", fontSize: "0.875rem",
                background: "linear-gradient(135deg, #059669, #10B981)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
            >
              <Camera size={18} /> Snap Pill in Hand
            </button>
            <button
              onClick={handleSkip}
              style={{
                flex: 1, padding: "0.75rem", background: "none",
                border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)",
                cursor: "pointer", fontSize: "0.875rem", color: "var(--color-text-secondary)",
                fontFamily: "var(--font-sans)",
              }}
              id="skip-photo-btn"
            >
              Skip
            </button>
          </div>
        )}

        {/* Capturing */}
        {state === "capturing" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", padding: "1rem" }}>
            <Loader2 size={22} className="animate-spin" style={{ color: "var(--color-teal-600)" }} />
            <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Processing photo...</span>
          </div>
        )}

        {/* Preview */}
        {state === "captured" && previewUrl && (
          <div>
            <div style={{ position: "relative", marginBottom: "0.875rem" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Pill proof"
                style={{
                  width: "100%", aspectRatio: "4/3", objectFit: "cover",
                  borderRadius: "var(--radius-lg)", border: "2px solid #A7F3D0",
                }}
              />
              <button
                onClick={handleRetake}
                style={{
                  position: "absolute", top: "0.5rem", right: "0.5rem",
                  width: "28px", height: "28px", borderRadius: "50%",
                  background: "rgba(0,0,0,0.5)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={16} color="white" />
              </button>
            </div>
            <button
              onClick={handleConfirm}
              className="btn-primary"
              id="confirm-photo-btn"
              style={{
                width: "100%", padding: "0.875rem", fontSize: "0.9375rem",
                background: "linear-gradient(135deg, #059669, #10B981)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
            >
              <CheckCircle2 size={20} /> Confirm & Send to Caregiver
            </button>
          </div>
        )}

        {/* Confirmed with thumbnail */}
        {state === "confirmed" && previewUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Proof thumbnail"
              style={{
                width: "56px", height: "56px", objectFit: "cover",
                borderRadius: "var(--radius-md)", border: "2px solid #A7F3D0", flexShrink: 0,
              }}
            />
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#065F46", margin: "0 0 0.25rem 0" }}>
                ✓ Taken & Photo Verified at {takenAt}
              </p>
              <p style={{ fontSize: "0.75rem", color: "#047857", margin: 0 }}>
                Your caregiver can see this in their dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Confirmed without photo */}
        {state === "confirmed" && !previewUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <CheckCircle2 size={22} style={{ color: "#059669", flexShrink: 0 }} />
            <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "#065F46", margin: 0 }}>
              Marked as taken at {takenAt} (no photo)
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
        id={`photo-proof-input-${reminderId}`}
      />
    </div>
  );
}
