"use client";

import React, { useState, useRef } from "react";
import {
  Camera, Upload, ArrowLeft, ArrowRight, CheckCircle2,
  AlertTriangle, XCircle, HelpCircle, Loader2, RotateCcw,
  FileText, Pill, ShieldCheck, ShieldAlert, UserCheck
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Entity {
  medicine_name: string;
  active_ingredients?: string[];
  strength: string;
  frequency?: string;
  route?: string;
  form: string;
  category?: string;
  manufacturer?: string;
}

interface ComparisonRow {
  field: string;
  prescribed: string;
  dispensed: string;
  status: "match" | "mismatch" | "different" | "review_required" | "pending";
}

interface AllergyCheckResult {
  has_allergy: boolean;
  alert_type: "exact_match" | "cross_allergy" | "none" | "unknown_status";
  severity: "critical" | "warning" | "clear" | "unknown";
  matched_allergy: string;
  triggering_ingredient: string;
  title: string;
  reason: string;
  recommendation: string;
}

interface PillRecognitionResult {
  status: "candidate_identified" | "inconclusive";
  recognized: boolean;
  confidence: number;
  medicine_name?: string;
  strength?: string;
  form?: string;
  manufacturer?: string;
  evidence?: string[];
  message: string;
  reason?: string;
}

interface ReconcileResult {
  overall_status: "MATCH" | "MISMATCH" | "REVIEW REQUIRED";
  overall_color: "green" | "red" | "amber";
  overall_title: string;
  overall_reason: string;
  overall_recommendation: string;
  reconciliation: {
    status: string;
    result_category: string;
    color: string;
    title: string;
    reason: string;
    recommendation: string;
    discrepancies: string[];
    comparison_table: ComparisonRow[];
  };
  allergy_check: AllergyCheckResult;
  pill_recognition?: PillRecognitionResult | null;
  rx_ocr_text: string;
  blister_ocr_text: string;
  rx_entity: Entity;
  blister_entity: Entity;
  patient_profile: {
    user_id: string;
    recorded_allergies: string[] | string;
    allergy_status: string;
  };
  disclaimer: string;
}

type Step = "capture-rx" | "capture-blister" | "capture-pill" | "verifying" | "result";

// ─── UI Indicator Configurations ─────────────────────────────────────────────

const STATUS_CONFIG = {
  green: {
    bg: "linear-gradient(135deg, #ECFDF5, #D1FAE5)",
    border: "#059669",
    text: "#065F46",
    badgeBg: "#059669",
    badgeText: "MATCH VERIFIED",
    icon: <CheckCircle2 size={44} />,
  },
  red: {
    bg: "linear-gradient(135deg, #FEF2F2, #FEE2E2)",
    border: "#DC2626",
    text: "#991B1B",
    badgeBg: "#DC2626",
    badgeText: "DISCREPANCY / ALLERGY ALERT",
    icon: <XCircle size={44} />,
  },
  amber: {
    bg: "linear-gradient(135deg, #FFFBEB, #FEF3C7)",
    border: "#D97706",
    text: "#92400E",
    badgeBg: "#D97706",
    badgeText: "PROFESSIONAL REVIEW REQUIRED",
    icon: <AlertTriangle size={44} />,
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReconcilePage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("capture-rx");
  const [rxFile, setRxFile] = useState<File | null>(null);
  const [blistFile, setBlistFile] = useState<File | null>(null);
  const [pillFile, setPillFile] = useState<File | null>(null);

  const [rxPreview, setRxPreview] = useState<string | null>(null);
  const [blistPreview, setBlistPreview] = useState<string | null>(null);
  const [pillPreview, setPillPreview] = useState<string | null>(null);

  const [result, setResult] = useState<ReconcileResult | null>(null);
  const [error, setError] = useState<string>("");

  const rxInputRef = useRef<HTMLInputElement>(null);
  const blistInputRef = useRef<HTMLInputElement>(null);
  const pillInputRef = useRef<HTMLInputElement>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "rx" | "blister" | "pill"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "rx") {
      setRxFile(file);
      setRxPreview(url);
    } else if (type === "blister") {
      setBlistFile(file);
      setBlistPreview(url);
    } else {
      setPillFile(file);
      setPillPreview(url);
    }
  };

  const handleSubmit = async () => {
    if (!rxFile || !blistFile) return;
    setStep("verifying");
    setError("");

    try {
      const formData = new FormData();
      formData.append("rx_image", rxFile, rxFile.name);
      formData.append("blister_image", blistFile, blistFile.name);
      if (pillFile) {
        formData.append("pill_image", pillFile, pillFile.name);
      }
      if (user?.id) {
        formData.append("user_id", user.id);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/reconcile/check`,
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Prescription reconciliation check failed");
      }

      const data: ReconcileResult = await res.json();
      setResult(data);
      setStep("result");
    } catch (err: any) {
      setError(err.message || "Failed to complete reconciliation. Please try again.");
      setStep("capture-blister");
    }
  };

  const handleReset = () => {
    setStep("capture-rx");
    setRxFile(null);
    setBlistFile(null);
    setPillFile(null);
    setRxPreview(null);
    setBlistPreview(null);
    setPillPreview(null);
    setResult(null);
    setError("");
  };

  // ── Progress indicator ────────────────────────────────────────────────────

  const steps = [
    { id: "capture-rx", label: "Prescription" },
    { id: "capture-blister", label: "Packaging" },
    { id: "capture-pill", label: "Pill (Optional)" },
    { id: "result", label: "Verdict" },
  ];
  const currentStepIndex = steps.findIndex((s) =>
    step === "verifying" ? s.id === "result" : s.id === step
  );

  return (
    <div className="page-container" style={{ maxWidth: "680px", margin: "0 auto", paddingBottom: "2.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <Link href="/scan" style={{ color: "var(--color-text-secondary)", display: "flex" }}>
          <ArrowLeft size={22} />
        </Link>
        <div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, margin: 0 }}>
            ⚖️ Prescription & Dispensing Reconciler
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", margin: 0 }}>
            Automated entity cross-check, allergy screening & dispensing verification
          </p>
        </div>
      </div>

      {/* Patient Profile Banner */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.625rem 1rem",
        background: "var(--color-surface-secondary)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        marginBottom: "1.25rem",
        fontSize: "0.8125rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <UserCheck size={16} color="var(--color-teal-600)" />
          <span>Patient Profile: <strong>{user?.name || "Active Patient"}</strong></span>
        </div>
        <span style={{ color: "var(--color-text-secondary)" }}>
          Auth: <strong>{user?.id ? "Authenticated" : "Session Connected"}</strong>
        </span>
      </div>

      {/* Step indicator */}
      {step !== "result" && (
        <div style={{ display: "flex", alignItems: "center", marginBottom: "1.5rem", gap: "0" }}>
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                <div style={{
                  width: "30px", height: "30px", borderRadius: "50%",
                  background: i <= currentStepIndex ? "var(--color-teal-600)" : "var(--color-surface-secondary)",
                  border: i <= currentStepIndex ? "none" : "2px solid var(--color-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: i <= currentStepIndex ? "white" : "var(--color-text-muted)",
                  fontWeight: 700, fontSize: "0.8125rem",
                  transition: "all 0.3s ease",
                }}>
                  {i < currentStepIndex ? <CheckCircle2 size={15} /> : i + 1}
                </div>
                <span style={{
                  fontSize: "0.65rem", marginTop: "0.25rem",
                  color: i <= currentStepIndex ? "var(--color-teal-700)" : "var(--color-text-muted)",
                  fontWeight: i <= currentStepIndex ? 600 : 400,
                  textAlign: "center",
                }}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  height: "2px", flex: 0.5, marginBottom: "1rem",
                  background: i < currentStepIndex ? "var(--color-teal-600)" : "var(--color-border)",
                  transition: "all 0.3s ease",
                }} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          padding: "0.875rem 1rem", background: "var(--color-danger-50)",
          border: "1px solid var(--color-danger-200)", borderRadius: "var(--radius-lg)",
          color: "var(--color-danger-700)", fontSize: "0.875rem", marginBottom: "1rem",
          display: "flex", alignItems: "center", gap: "0.5rem"
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Capture Rx */}
      {step === "capture-rx" && (
        <CaptureCard
          title="Step 1: Scan Doctor's Prescription"
          subtitle="Photograph the written or printed prescription order indicating medicine name, dosage & frequency."
          icon={<FileText size={28} color="var(--color-teal-600)" />}
          preview={rxPreview}
          onSelect={() => rxInputRef.current?.click()}
          inputRef={rxInputRef}
          inputId="rx-input"
          onFileChange={(e) => handleFileSelect(e, "rx")}
          onNext={() => setStep("capture-blister")}
          nextLabel="Next: Scan Medicine Packaging"
          hasFile={!!rxFile}
        />
      )}

      {/* Step 2: Capture Dispensed Blister / Packaging */}
      {step === "capture-blister" && (
        <CaptureCard
          title="Step 2: Scan Dispensed Medicine Packaging"
          subtitle="Photograph the retail blister pack, bottle, or packaging handed over by the pharmacy."
          icon={<Pill size={28} color="var(--color-teal-600)" />}
          preview={blistPreview}
          onSelect={() => blistInputRef.current?.click()}
          inputRef={blistInputRef}
          inputId="blist-input"
          onFileChange={(e) => handleFileSelect(e, "blister")}
          onNext={() => setStep("capture-pill")}
          onBack={() => setStep("capture-rx")}
          nextLabel="Next: Optional Pill Photo"
          hasFile={!!blistFile}
        />
      )}

      {/* Step 3: Capture Physical Pill (Optional) */}
      {step === "capture-pill" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <CaptureCard
            title="Step 3: Physical Pill Inspection (Optional)"
            subtitle="Photograph an unwrapped tablet/capsule to evaluate imprint markings, shape & color against reference pharmacopeia."
            icon={<Camera size={28} color="var(--color-teal-600)" />}
            preview={pillPreview}
            onSelect={() => pillInputRef.current?.click()}
            inputRef={pillInputRef}
            inputId="pill-input"
            onFileChange={(e) => handleFileSelect(e, "pill")}
            onNext={handleSubmit}
            onBack={() => setStep("capture-blister")}
            nextLabel="Run Reconciliation & Allergy Verification"
            hasFile={true} // allow proceeding even without pill photo
          />
          <div style={{ textAlign: "center" }}>
            <button
              onClick={handleSubmit}
              style={{
                background: "none", border: "none", color: "var(--color-teal-700)",
                fontSize: "0.8125rem", fontWeight: 600, textDecoration: "underline", cursor: "pointer",
              }}
            >
              Skip pill image and analyze prescription vs packaging now →
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Loading State */}
      {step === "verifying" && (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "4rem 1rem", textAlign: "center",
        }}>
          <Loader2 size={48} className="animate-spin" color="var(--color-teal-600)" style={{ marginBottom: "1.25rem" }} />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: "0 0 0.5rem 0" }}>
            Reconciling Clinical Entities & Screening Allergies...
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", maxWidth: "420px", lineHeight: 1.5 }}>
            Extracting text from prescription and packaging, mapping active chemical salts, and verifying against registered patient allergies.
          </p>
        </div>
      )}

      {/* Step 5: Full Results View */}
      {step === "result" && result && (
        <VerdictView result={result} onReset={handleReset} />
      )}
    </div>
  );
}

// ─── Capture Step Subcomponent ───────────────────────────────────────────────

interface CaptureCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  preview: string | null;
  onSelect: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputId: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onBack?: () => void;
  nextLabel: string;
  hasFile: boolean;
}

function CaptureCard({
  title, subtitle, icon, preview, onSelect, inputRef, inputId,
  onFileChange, onNext, onBack, nextLabel, hasFile,
}: CaptureCardProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", marginBottom: "1rem" }}>
          <div style={{
            width: "50px", height: "50px", borderRadius: "var(--radius-lg)",
            background: "var(--color-teal-50)", display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            {icon}
          </div>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: "1.0625rem", margin: "0 0 0.25rem 0" }}>{title}</h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
              {subtitle}
            </p>
          </div>
        </div>

        {/* Upload Button / Preview */}
        <button
          onClick={onSelect}
          id={`${inputId}-trigger`}
          style={{
            width: "100%", aspectRatio: "4/3", borderRadius: "var(--radius-xl)",
            border: `2px dashed ${preview ? "var(--color-teal-500)" : "var(--color-border)"}`,
            background: preview ? "var(--color-teal-50)" : "var(--color-surface-secondary)",
            cursor: "pointer", overflow: "hidden", display: "flex",
            alignItems: "center", justifyContent: "center", position: "relative",
          }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Captured" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
              <Camera size={38} strokeWidth={1.5} style={{ margin: "0 auto 0.5rem" }} />
              <p style={{ fontSize: "0.875rem", fontWeight: 600, margin: "0 0 0.25rem 0" }}>Tap to photograph</p>
              <p style={{ fontSize: "0.75rem", margin: 0 }}>or select from device gallery</p>
            </div>
          )}
        </button>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
          style={{ display: "none" }}
        />

        {preview && (
          <button
            onClick={onSelect}
            style={{
              marginTop: "0.75rem", width: "100%", padding: "0.5rem",
              background: "none", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)", cursor: "pointer", fontSize: "0.8125rem",
              color: "var(--color-text-secondary)", display: "flex", alignItems: "center",
              justifyContent: "center", gap: "0.375rem",
            }}
          >
            <Upload size={14} /> Retake / Choose Different Image
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              flex: 1, padding: "0.75rem", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-lg)", background: "none", cursor: "pointer",
              fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!hasFile}
          className="btn-primary"
          style={{
            flex: 2, padding: "0.75rem", borderRadius: "var(--radius-lg)",
            fontSize: "0.875rem", fontWeight: 700, cursor: hasFile ? "pointer" : "not-allowed",
            opacity: hasFile ? 1 : 0.45,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.375rem",
          }}
          id="proceed-step-btn"
        >
          {nextLabel} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Results View Subcomponent ───────────────────────────────────────────────

function VerdictView({ result, onReset }: { result: ReconcileResult; onReset: () => void }) {
  const {
    overall_status, overall_color, overall_title, overall_reason, overall_recommendation,
    reconciliation, allergy_check, pill_recognition, rx_entity, blister_entity, patient_profile, disclaimer
  } = result;

  const cfg = STATUS_CONFIG[overall_color] || STATUS_CONFIG.amber;
  const [showRawOcr, setShowRawOcr] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* 1. Overall Safety Banner */}
      <div style={{
        borderRadius: "var(--radius-xl)",
        background: cfg.bg,
        border: `2px solid ${cfg.border}`,
        padding: "1.5rem",
        textAlign: "center",
      }}>
        <div style={{ color: cfg.border, marginBottom: "0.5rem" }}>
          {cfg.icon}
        </div>
        <span style={{
          display: "inline-block", background: cfg.badgeBg, color: "white",
          fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.06em",
          padding: "0.25rem 0.75rem", borderRadius: "9999px", marginBottom: "0.75rem",
        }}>
          {cfg.badgeText}
        </span>
        <h2 style={{ fontWeight: 800, fontSize: "1.25rem", color: cfg.text, margin: "0 0 0.5rem 0" }}>
          {overall_title}
        </h2>
        <p style={{ fontSize: "0.875rem", color: cfg.text, lineHeight: 1.5, margin: "0 0 1rem 0" }}>
          {overall_reason}
        </p>
        <div style={{
          padding: "0.75rem 1rem",
          background: "rgba(255,255,255,0.7)",
          border: `1px solid ${cfg.border}`,
          borderRadius: "var(--radius-lg)",
          fontSize: "0.875rem",
          fontWeight: 700,
          color: cfg.text,
          textAlign: "left",
        }}>
          📌 Recommended Action: {overall_recommendation}
        </div>
      </div>

      {/* 2. Patient Profile & Allergy Status Box */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 0.75rem 0" }}>
          <ShieldAlert size={18} color="var(--color-teal-600)" />
          Patient Profile & Allergy Screening
        </h3>

        <div style={{
          padding: "0.875rem",
          borderRadius: "var(--radius-lg)",
          background: allergy_check.severity === "critical" ? "var(--color-danger-50)" :
                      allergy_check.severity === "warning" ? "var(--color-warning-50)" : "var(--color-surface-secondary)",
          border: `1px solid ${
            allergy_check.severity === "critical" ? "var(--color-danger-200)" :
            allergy_check.severity === "warning" ? "var(--color-warning-200)" : "var(--color-border)"
          }`,
        }}>
          <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.8125rem", fontWeight: 600 }}>
            Recorded Patient Allergies:{" "}
            <span style={{ color: "var(--color-text-primary)" }}>
              {Array.isArray(patient_profile.recorded_allergies)
                ? (patient_profile.recorded_allergies.length ? patient_profile.recorded_allergies.join(", ") : "None recorded in profile")
                : String(patient_profile.recorded_allergies)}
            </span>
          </p>
          <p style={{ margin: "0 0 0.25rem 0", fontSize: "0.8125rem" }}>
            <strong>Allergy Evaluation:</strong> {allergy_check.reason}
          </p>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
            {allergy_check.recommendation}
          </p>
        </div>
      </div>

      {/* 3. Prescription-to-Packaging Comparison Table */}
      <div className="card" style={{ padding: "1.25rem" }}>
        <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "0.875rem" }}>
          Prescription vs. Dispensed Packaging Comparison
        </h3>
        
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
            <thead>
              <tr style={{ background: "var(--color-surface-secondary)", textAlign: "left" }}>
                <th style={{ padding: "0.625rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Clinical Field</th>
                <th style={{ padding: "0.625rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Prescribed</th>
                <th style={{ padding: "0.625rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Dispensed Packaging</th>
                <th style={{ padding: "0.625rem 0.75rem", borderBottom: "1px solid var(--color-border)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.comparison_table.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                  <td style={{ padding: "0.625rem 0.75rem", fontWeight: 600 }}>{row.field}</td>
                  <td style={{ padding: "0.625rem 0.75rem" }}>{row.prescribed || "—"}</td>
                  <td style={{ padding: "0.625rem 0.75rem" }}>{row.dispensed || "—"}</td>
                  <td style={{ padding: "0.625rem 0.75rem" }}>
                    {row.status === "match" ? (
                      <span style={{ color: "#059669", fontWeight: 700 }}>✓ Match</span>
                    ) : row.status === "mismatch" ? (
                      <span style={{ color: "#DC2626", fontWeight: 700 }}>✗ Mismatch</span>
                    ) : (
                      <span style={{ color: "#D97706", fontWeight: 700 }}>⚠️ Review</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {reconciliation.discrepancies.length > 0 && (
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "var(--color-danger-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-danger-200)" }}>
            <h4 style={{ margin: "0 0 0.25rem 0", color: "var(--color-danger-700)", fontSize: "0.8125rem", fontWeight: 700 }}>
              Specific Discrepancy Findings:
            </h4>
            <ul style={{ margin: 0, paddingLeft: "1.25rem", fontSize: "0.8125rem", color: "var(--color-danger-700)" }}>
              {reconciliation.discrepancies.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 4. Pill Image Recognition Evidence (If submitted or supported) */}
      {pill_recognition && (
        <div className="card" style={{ padding: "1.25rem" }}>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", margin: "0 0 0.75rem 0" }}>
            <Pill size={18} color="var(--color-teal-600)" />
            Physical Pill Morphological Analysis
          </h3>

          <div style={{
            padding: "0.875rem",
            borderRadius: "var(--radius-lg)",
            background: pill_recognition.recognized ? "var(--color-teal-50)" : "var(--color-warning-50)",
            border: `1px solid ${pill_recognition.recognized ? "var(--color-teal-200)" : "var(--color-warning-200)"}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                {pill_recognition.recognized ? `Candidate: ${pill_recognition.medicine_name}` : "Pill Visual Status"}
              </span>
              <span style={{
                fontSize: "0.75rem", fontWeight: 700,
                padding: "0.2rem 0.5rem", borderRadius: "var(--radius-full)",
                background: pill_recognition.recognized ? "#0D9488" : "#D97706",
                color: "white"
              }}>
                Confidence: {Math.round(pill_recognition.confidence * 100)}%
              </span>
            </div>

            <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
              {pill_recognition.message}
            </p>

            {pill_recognition.evidence && pill_recognition.evidence.length > 0 && (
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>Observed Features:</span>
                <ul style={{ margin: "0.25rem 0 0 0", paddingLeft: "1.25rem", fontSize: "0.75rem" }}>
                  {pill_recognition.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Raw OCR Inspection */}
      <button
        onClick={() => setShowRawOcr(!showRawOcr)}
        style={{
          padding: "0.75rem 1rem", background: "none", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)", cursor: "pointer", fontSize: "0.8125rem",
          color: "var(--color-text-secondary)", textAlign: "left",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
        id="toggle-raw-ocr-btn"
      >
        <span>Inspect Raw Extracted OCR Streams</span>
        <span>{showRawOcr ? "▲" : "▼"}</span>
      </button>

      {showRawOcr && (
        <div className="card" style={{ padding: "1rem", fontSize: "0.75rem", fontFamily: "monospace", color: "var(--color-text-secondary)" }}>
          <p style={{ fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 0.25rem 0" }}>Prescription OCR Text:</p>
          <p style={{ margin: "0 0 0.75rem 0", whiteSpace: "pre-wrap", background: "var(--color-surface-secondary)", padding: "0.5rem", borderRadius: "var(--radius-md)" }}>
            {result.rx_ocr_text || "—"}
          </p>
          <p style={{ fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 0.25rem 0" }}>Packaging OCR Text:</p>
          <p style={{ margin: 0, whiteSpace: "pre-wrap", background: "var(--color-surface-secondary)", padding: "0.5rem", borderRadius: "var(--radius-md)" }}>
            {result.blister_ocr_text || "—"}
          </p>
        </div>
      )}

      {/* 6. Medical Disclaimer */}
      <div style={{
        display: "flex", gap: "0.625rem", padding: "0.875rem",
        background: "var(--color-teal-50)", borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-teal-200)",
      }}>
        <ShieldCheck size={18} style={{ color: "var(--color-teal-600)", flexShrink: 0, marginTop: "2px" }} />
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.5 }}>
          {disclaimer}
        </p>
      </div>

      {/* 7. Action Button */}
      <button
        onClick={onReset}
        className="btn-outline"
        id="reconcile-another-btn"
        style={{ width: "100%", padding: "0.875rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
      >
        <RotateCcw size={18} /> Reconcile Another Prescription
      </button>
    </div>
  );
}
