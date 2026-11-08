"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, HeartPulse, ShieldAlert, Phone, FileText, Share2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";

interface EmergencyMed {
  name: string;
  dosage?: string;
  frequency?: string;
}

interface EmergencyData {
  patient_name: string;
  blood_group?: string;
  emergency_notes?: string;
  allergies: string[];
  critical_meds: EmergencyMed[];
  caregiver_phone?: string;
}

export default function EmergencyPortal() {
  const { id } = useParams();
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchEmergencyData = async () => {
      try {
        const result = await api<EmergencyData>(`/emergency/${id}`);
        setData(result);
      } catch (err: any) {
        console.warn("Could not reach emergency API:", err);
        setError(err.message || "Failed to load emergency data");
      } finally {
        setLoading(false);
      }
    };
    fetchEmergencyData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#DC2626", color: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <HeartPulse size={64} className="animate-pulse" />
          <p style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Loading Emergency Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", background: "#0F172A", color: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ background: "#1E293B", padding: "2rem", borderRadius: "1.5rem", maxWidth: "420px", width: "100%", textAlign: "center", border: "1px solid rgba(239, 68, 68, 0.4)" }}>
          <ShieldAlert size={48} color="#EF4444" style={{ margin: "0 auto 1rem" }} />
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Emergency Profile</h1>
          <p style={{ color: "#94A3B8", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            {error || "Could not retrieve live ICE profile. Please verify connection."}
          </p>
          <Link href="/" className="btn-primary" style={{ textDecoration: "none" }}>
            Return to MedVerity
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #991B1B 0%, #7F1D1D 100%)", color: "white", padding: "1.25rem 1rem 3rem" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Top Emergency Responder Banner */}
        <div style={{ background: "rgba(0, 0, 0, 0.35)", borderRadius: "var(--radius-xl)", padding: "0.875rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid rgba(255, 255, 255, 0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 12px rgba(239, 68, 68, 0.8)" }}>
              <HeartPulse size={20} color="white" />
            </div>
            <div>
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#FCA5A5" }}>
                OFFICIAL PARAMEDIC VIEW
              </span>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 900, margin: 0, letterSpacing: "0.02em" }}>
                I.C.E. MEDICAL PASS
              </h2>
            </div>
          </div>
          <span style={{ fontSize: "0.75rem", background: "white", color: "#991B1B", padding: "0.25rem 0.625rem", borderRadius: "var(--radius-full)", fontWeight: 800 }}>
            LIVE
          </span>
        </div>

        {/* Patient Identity & Blood Group Card */}
        <div style={{ background: "white", color: "#0F172A", borderRadius: "var(--radius-2xl)", padding: "1.5rem", boxShadow: "0 15px 35px rgba(0, 0, 0, 0.3)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748B" }}>
              Patient Name
            </span>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 900, margin: "0.2rem 0 0", color: "#0F172A", lineHeight: 1.2 }}>
              {data.patient_name}
            </h1>
          </div>

          <div style={{ background: "#FEE2E2", border: "2px solid #EF4444", borderRadius: "var(--radius-xl)", padding: "0.625rem 1.25rem", textAlign: "center" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#B91C1C", display: "block" }}>
              BLOOD GROUP
            </span>
            <span style={{ fontSize: "1.625rem", fontWeight: 900, color: "#991B1B" }}>
              {data.blood_group || "O+"}
            </span>
          </div>
        </div>

        {/* Severe Allergies Banner */}
        <div style={{ background: "#450A0A", borderRadius: "var(--radius-2xl)", padding: "1.25rem", border: "1.5px solid #DC2626" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <ShieldAlert size={20} color="#F87171" />
            <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "#FEE2E2", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Severe Drug Allergies
            </h3>
          </div>
          {data.allergies && data.allergies.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {data.allergies.map((allergy, i) => (
                <span
                  key={i}
                  style={{
                    background: "#DC2626",
                    color: "white",
                    padding: "0.4rem 0.875rem",
                    borderRadius: "var(--radius-lg)",
                    fontWeight: 800,
                    fontSize: "0.875rem",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  ⚠️ {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ color: "#FCA5A5", fontSize: "0.875rem", margin: 0, fontStyle: "italic" }}>
              No documented severe drug allergies.
            </p>
          )}
        </div>

        {/* Tap to Call Emergency Contact */}
        {data.caregiver_phone && (
          <div style={{ background: "white", borderRadius: "var(--radius-2xl)", padding: "1.25rem", boxShadow: "0 10px 25px rgba(0,0,0,0.25)" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#64748B", display: "block", marginBottom: "0.35rem" }}>
              Primary Emergency Contact
            </span>
            <a
              href={`tel:${data.caregiver_phone}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                background: "#16A34A",
                color: "white",
                textDecoration: "none",
                padding: "0.875rem 1.25rem",
                borderRadius: "var(--radius-xl)",
                fontSize: "1.25rem",
                fontWeight: 900,
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.4)",
              }}
            >
              <Phone size={22} fill="white" />
              <span>Call {data.caregiver_phone}</span>
            </a>
          </div>
        )}

        {/* Active Prescriptions */}
        <div style={{ background: "#0F172A", borderRadius: "var(--radius-2xl)", padding: "1.25rem", border: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
            <FileText size={20} color="#38BDF8" />
            <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "white" }}>
              Active Medications & Dosages
            </h3>
          </div>
          {data.critical_meds && data.critical_meds.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {data.critical_meds.map((med, i) => (
                <div
                  key={i}
                  style={{
                    background: "#1E293B",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-lg)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    border: "1px solid #334155",
                  }}
                >
                  <strong style={{ fontSize: "0.9375rem", color: "#F8FAFC" }}>{med.name}</strong>
                  <span style={{ fontSize: "0.75rem", background: "#0F172A", color: "#38BDF8", padding: "0.25rem 0.625rem", borderRadius: "var(--radius-full)", fontWeight: 600 }}>
                    {med.frequency || "Daily"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#94A3B8", fontSize: "0.875rem", margin: 0, fontStyle: "italic" }}>
              No critical active medications reported.
            </p>
          )}
        </div>

        {/* Resuscitation / Physician Notes */}
        {data.emergency_notes && (
          <div style={{ background: "#FEF08A", color: "#713F12", borderRadius: "var(--radius-2xl)", padding: "1.25rem", border: "2px solid #FACC15" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <AlertCircle size={20} color="#854D0E" />
              <h4 style={{ fontSize: "0.875rem", fontWeight: 900, textTransform: "uppercase", margin: 0 }}>
                Resuscitation & Clinical Notes
              </h4>
            </div>
            <p style={{ fontSize: "0.9375rem", fontWeight: 700, margin: 0, lineHeight: 1.5 }}>
              {data.emergency_notes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", opacity: 0.6, fontSize: "0.75rem", marginTop: "1rem" }}>
          Protected by MedVerity Clinical Engine • Immediate ER First Responder Access
        </div>
      </div>
    </div>
  );
}
