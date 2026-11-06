"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic, Square, Play, Trash2, CheckCircle2, Upload,
  Loader2, Volume2, Clock, Camera
} from "lucide-react";

interface Props {
  reminderId: string;
  medicineName: string;
  onVoiceClipSaved?: (clipUrl: string) => void;
}

type RecordingState = "idle" | "recording" | "recorded" | "playing" | "saving" | "saved";

export default function VoiceClipRecorder({ reminderId, medicineName, onVoiceClipSaved }: Props) {
  const [state, setState] = useState<RecordingState>("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);

  // Load previously saved clip
  useEffect(() => {
    const stored = localStorage.getItem(`medverity_voice_clip_${reminderId}`);
    if (stored) {
      setAudioUrl(stored);
      setState("saved");
    }
  }, [reminderId]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl && audioUrl.startsWith("blob:")) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("recorded");
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState("recording");
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 10) {
            stopRecording();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow mic access to record a voice message.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const playPreview = () => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setState("playing");
    audio.play();
    audio.onended = () => setState("recorded");
  };

  const saveClip = () => {
    if (!audioUrl) return;
    // In production: upload blob to Supabase storage and store the public URL.
    // For now: persist as a localStorage key (base64 for small clips, or just the blob URL per session).
    setState("saving");
    setTimeout(() => {
      try {
        localStorage.setItem(`medverity_voice_clip_${reminderId}`, audioUrl);
        setState("saved");
        onVoiceClipSaved?.(audioUrl);
      } catch {
        setError("Could not save voice clip. Storage limit may be full.");
        setState("recorded");
      }
    }, 800);
  };

  const deleteClip = () => {
    localStorage.removeItem(`medverity_voice_clip_${reminderId}`);
    setAudioUrl(null);
    blobRef.current = null;
    setState("idle");
  };

  return (
    <div style={{
      borderRadius: "var(--radius-xl)",
      border: "1.5px solid var(--color-border)",
      overflow: "hidden",
      background: "var(--color-surface)",
    }}>
      {/* Header */}
      <div style={{
        padding: "1rem 1.25rem",
        background: "linear-gradient(135deg, #FDF2F8, #FCE7F3)",
        borderBottom: "1px solid #FBCFE8",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
      }}>
        <div style={{
          width: "38px", height: "38px", borderRadius: "50%",
          background: "linear-gradient(135deg, #BE185D, #EC4899)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Mic size={18} color="white" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: "0.9375rem", margin: 0, color: "#831843" }}>
            ❤️ Personal Voice Alarm
          </p>
          <p style={{ fontSize: "0.75rem", color: "#9D174D", margin: 0 }}>
            Record a message for <strong>{medicineName}</strong> reminder
          </p>
        </div>
      </div>

      <div style={{ padding: "1.25rem" }}>
        {error && (
          <div style={{
            background: "#FEE2E2", color: "#991B1B", padding: "0.75rem",
            borderRadius: "var(--radius-lg)", fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}>
            {error}
          </div>
        )}

        {/* Example script */}
        {state === "idle" && (
          <div style={{
            background: "var(--color-surface-secondary)", borderRadius: "var(--radius-lg)",
            padding: "0.875rem", marginBottom: "1rem", border: "1px solid var(--color-border)",
          }}>
            <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.5rem 0" }}>
              💬 Example script
            </p>
            <p style={{ fontSize: "0.875rem", fontStyle: "italic", color: "var(--color-text-primary)", lineHeight: 1.6, margin: 0 }}>
              "Hi Dad! It&apos;s [your name]. Time to take your {medicineName}. Have a great day, love you! 💊"
            </p>
          </div>
        )}

        {/* Visualiser / main action area */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: "1rem", marginBottom: "1rem",
        }}>
          {/* Big Record/Stop button */}
          {(state === "idle" || state === "recording") && (
            <button
              onClick={state === "idle" ? startRecording : stopRecording}
              id={state === "idle" ? "start-recording-btn" : "stop-recording-btn"}
              style={{
                width: "80px", height: "80px", borderRadius: "50%",
                background: state === "recording"
                  ? "linear-gradient(135deg, #DC2626, #EF4444)"
                  : "linear-gradient(135deg, #BE185D, #EC4899)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: state === "recording"
                  ? "0 0 0 8px rgba(220,38,38,0.2), 0 8px 24px rgba(220,38,38,0.4)"
                  : "0 8px 24px rgba(190,24,93,0.35)",
                transition: "all 0.2s ease",
                animation: state === "recording" ? "ping-soft 1.5s ease-in-out infinite" : "none",
              }}
            >
              {state === "recording"
                ? <Square size={28} color="white" fill="white" />
                : <Mic size={32} color="white" />
              }
            </button>
          )}

          {/* Timer */}
          {state === "recording" && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444", animation: "ping-soft 1s ease-in-out infinite" }} />
              <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>
                0:{String(recordingSeconds).padStart(2, "0")} / 0:10
              </span>
            </div>
          )}

          {/* Recorded controls */}
          {(state === "recorded" || state === "playing" || state === "saving" || state === "saved") && (
            <div style={{
              width: "100%", background: "var(--color-surface-secondary)",
              borderRadius: "var(--radius-xl)", padding: "1rem",
              display: "flex", alignItems: "center", gap: "0.875rem",
              border: state === "saved" ? "1.5px solid #D1FAE5" : "1px solid var(--color-border)",
            }}>
              {state === "saved" && (
                <CheckCircle2 size={22} style={{ color: "#059669", flexShrink: 0 }} />
              )}
              {(state === "recorded" || state === "playing") && (
                <Volume2 size={22} style={{ color: "var(--color-teal-600)", flexShrink: 0 }} />
              )}
              {state === "saving" && (
                <Loader2 size={22} className="animate-spin" style={{ color: "var(--color-teal-600)", flexShrink: 0 }} />
              )}

              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: "0 0 0.125rem 0" }}>
                  {state === "saved" ? "Voice clip saved ✓" : state === "saving" ? "Saving..." : "Voice clip recorded"}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", margin: 0 }}>
                  This will play when the alarm fires for {medicineName}
                </p>
              </div>

              {/* Play preview */}
              {(state === "recorded" || state === "saved") && audioUrl && (
                <button
                  onClick={playPreview}
                  style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: "var(--color-teal-600)", border: "none", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Play size={16} color="white" fill="white" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {state === "recorded" && (
            <>
              <button
                onClick={deleteClip}
                style={{
                  flex: 1, padding: "0.75rem", background: "none",
                  border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)",
                  cursor: "pointer", fontSize: "0.875rem", color: "var(--color-text-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  fontFamily: "var(--font-sans)",
                }}
                id="discard-voice-btn"
              >
                <Trash2 size={16} /> Discard
              </button>
              <button
                onClick={saveClip}
                className="btn-primary"
                style={{
                  flex: 2, padding: "0.75rem", fontSize: "0.875rem",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                }}
                id="save-voice-btn"
              >
                <Upload size={16} /> Save Alarm Voice
              </button>
            </>
          )}
          {state === "saved" && (
            <button
              onClick={deleteClip}
              style={{
                flex: 1, padding: "0.75rem", background: "none",
                border: "1px solid #FECACA", borderRadius: "var(--radius-lg)",
                cursor: "pointer", fontSize: "0.875rem", color: "#DC2626",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                fontFamily: "var(--font-sans)",
              }}
              id="remove-voice-btn"
            >
              <Trash2 size={16} /> Remove Voice Clip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
