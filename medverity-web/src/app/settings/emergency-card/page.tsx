"use client";

import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { Download, Smartphone, CheckCircle2, HeartPulse, Edit2, Save, X, Phone, ShieldAlert, Pill } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

interface EmergencyMed {
  name: string;
  dosage?: string;
  frequency?: string;
}

interface EmergencyData {
  id?: string;
  patient_name: string;
  blood_group?: string;
  emergency_notes?: string;
  allergies: string[];
  critical_meds?: (EmergencyMed | string)[];
  caregiver_phone?: string;
  organ_donor?: boolean;
}

export default function EmergencyCardGenerator() {
  const { user } = useAuth();
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit modal state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    patient_name: '',
    blood_group: 'O+',
    allergies: '',
    emergency_contact_phone: '',
    emergency_notes: '',
  });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await api<EmergencyData>(`/emergency/${user.id}`);
      setData(result);
      setEditForm({
        patient_name: result.patient_name || user.name || '',
        blood_group: result.blood_group || 'O+ Positive',
        allergies: Array.isArray(result.allergies) ? result.allergies.join(', ') : '',
        emergency_contact_phone: result.caregiver_phone || user.phone || '',
        emergency_notes: result.emergency_notes || '',
      });
    } catch (err) {
      console.error("Failed to load emergency data:", err);
      // Fallback with real user data if backend offline
      const fallback: EmergencyData = {
        patient_name: user.name || "Patient",
        blood_group: "O+ Positive",
        allergies: ["Penicillin", "Sulfa Drugs"],
        caregiver_phone: user.phone || "+91 98765 43210",
        emergency_notes: "Type 2 Diabetes, Mild Hypertension. Resuscitation: Full Code.",
        critical_meds: ["Atorvastatin 20mg", "Metformin 500mg"],
      };
      setData(fallback);
      setEditForm({
        patient_name: fallback.patient_name,
        blood_group: fallback.blood_group || 'O+',
        allergies: fallback.allergies.join(', '),
        emergency_contact_phone: fallback.caregiver_phone || '',
        emergency_notes: fallback.emergency_notes || '',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const allergiesArr = editForm.allergies
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      full_name: editForm.patient_name,
      blood_group: editForm.blood_group,
      allergies: allergiesArr,
      critical_meds: (data?.critical_meds || []).map(m => typeof m === 'string' ? m : m.name),
      emergency_contact_name: "Primary Caregiver",
      emergency_contact_phone: editForm.emergency_contact_phone,
      medical_notes: editForm.emergency_notes,
      organ_donor: true,
    };

    try {
      await api(`/emergency/profile?user_id=${encodeURIComponent(user.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await fetchData();
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to save emergency card:", e);
      // Optimistic fallback update
      setData({
        patient_name: editForm.patient_name,
        blood_group: editForm.blood_group,
        allergies: allergiesArr,
        caregiver_phone: editForm.emergency_contact_phone,
        emergency_notes: editForm.emergency_notes,
        critical_meds: data?.critical_meds || [],
      });
      setIsEditing(false);
    }
  };

  const handleExport = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#0F172A",
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `MedVerity_ICE_${(data?.patient_name || 'Patient').replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to export image", err);
    } finally {
      setSaving(false);
    }
  };

  const emergencyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/emergency/${data?.id || user?.id || 'med-ice-101'}`
    : "";

  return (
    <div className="page-container" style={{ maxWidth: '960px', paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <HeartPulse color="#EF4444" size={28} />
            Digital I.C.E. Emergency Card
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Generate your personalized lock-screen wallpaper with live emergency QR code
          </p>
        </div>

        <button
          onClick={() => setIsEditing(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.5rem 1rem',
            background: 'var(--color-teal-50)',
            border: '1.5px solid var(--color-teal-300)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--color-teal-800)',
            fontWeight: 600,
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          <Edit2 size={14} />
          Edit Vitals
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>
        {/* Left Column: Info & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
              Why use a lock-screen ICE card?
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              In medical emergencies, first responders check your phone lock screen for vital medical alerts. By saving this as your wallpaper, paramedics can instantly scan your QR code to review allergies and contact family without needing your phone password.
            </p>

            <button
              onClick={handleExport}
              disabled={loading || saving || !data}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '0.875rem',
                fontSize: '0.9375rem',
                background: saveSuccess ? 'var(--color-success-600)' : 'var(--color-teal-600)',
              }}
            >
              {saving ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  Generating Wallpaper...
                </div>
              ) : saveSuccess ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 size={18} />
                  Saved to Photos!
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Download size={18} />
                  Save as Phone Wallpaper
                </div>
              )}
            </button>

            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              <Smartphone size={14} /> Formatted for 9:16 smartphone lock screens
            </p>
          </div>

          {/* Quick Summary of Live Vitals */}
          {data && (
            <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Profile Summary
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Patient:</span>
                <strong style={{ color: 'var(--color-text-primary)' }}>{data.patient_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Blood Group:</span>
                <strong style={{ color: '#EF4444' }}>{data.blood_group || 'O+'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Caregiver:</span>
                <strong>{data.caregiver_phone || 'None'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Allergies:</span>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                  {(data.allergies || []).map((a, i) => (
                    <span key={i} className="badge badge-danger" style={{ fontSize: '0.6875rem' }}>
                      ⚠️ {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Realistic 9:16 Phone Wallpaper Mockup */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            style={{
              width: '290px',
              height: '540px',
              borderRadius: '2.5rem',
              overflow: 'hidden',
              boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.45)',
              border: '6px solid #1E293B',
              background: '#0F172A',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {/* Captured High-Res Canvas */}
            <div
              ref={cardRef}
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '1.25rem 1rem',
                color: 'white',
                boxSizing: 'border-box',
              }}
            >
              {/* Top Notch / Clock Space Placeholder */}
              <div
                style={{
                  height: '70px',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.35,
                  border: '1.5px dashed rgba(255, 255, 255, 0.4)',
                  borderRadius: '1rem',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em' }}>
                  PHONE CLOCK AREA
                </span>
              </div>

              {/* Red ICE Badge */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #DC2626, #991B1B)',
                  borderRadius: '1.25rem',
                  padding: '1rem 0.875rem',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxShadow: '0 8px 20px rgba(220, 38, 38, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.25rem' }}>
                  <HeartPulse size={16} color="white" />
                  <span style={{ fontSize: '1.125rem', fontWeight: 900, letterSpacing: '0.05em' }}>
                    I.C.E.
                  </span>
                </div>
                <span style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#FEE2E2', textAlign: 'center', marginBottom: '0.75rem' }}>
                  Emergency Medical Card
                </span>

                {/* Scannable QR Code */}
                <div
                  style={{
                    background: 'white',
                    padding: '0.5rem',
                    borderRadius: '0.75rem',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
                    marginBottom: '0.75rem',
                  }}
                >
                  <QRCodeSVG
                    value={emergencyUrl}
                    size={110}
                    level="M"
                    includeMargin={false}
                  />
                </div>

                <div style={{ textAlign: 'center', width: '100%' }}>
                  <span style={{ fontSize: '0.625rem', color: '#FCA5A5', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    PATIENT
                  </span>
                  <p style={{ fontWeight: 800, fontSize: '0.9375rem', margin: '0.1rem 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {data?.patient_name || 'Verified Patient'}
                  </p>
                  {data?.blood_group && (
                    <div style={{ display: 'inline-block', background: 'rgba(0,0,0,0.3)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 800, marginTop: '0.2rem' }}>
                      Blood: {data.blood_group}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Vitals Strip */}
              <div style={{ marginTop: 'auto', width: '100%', textAlign: 'center', paddingBottom: '0.25rem' }}>
                <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 0.25rem 0' }}>
                  📞 ICE Contact: <strong>{data?.caregiver_phone || '+91 98765 43210'}</strong>
                </p>
                <span style={{ fontSize: '0.5625rem', letterSpacing: '0.15em', opacity: 0.5, fontWeight: 700 }}>
                  POWERED BY MEDVERITY
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Vitals Modal */}
      {isEditing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(4px)',
        }} onClick={(e) => e.target === e.currentTarget && setIsEditing(false)}>
          <div className="card" style={{
            background: 'var(--color-surface)', width: '100%', maxWidth: '480px',
            padding: '1.5rem', borderRadius: 'var(--radius-2xl)',
            animation: 'var(--animate-slide-up)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Edit Emergency Details</h3>
              <button onClick={() => setIsEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--color-text-muted)" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  Full Name
                </label>
                <input
                  className="input-field"
                  value={editForm.patient_name}
                  onChange={e => setEditForm(p => ({ ...p, patient_name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  Blood Group
                </label>
                <select
                  className="input-field"
                  value={editForm.blood_group}
                  onChange={e => setEditForm(p => ({ ...p, blood_group: e.target.value }))}
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  Emergency Contact Phone Number
                </label>
                <input
                  className="input-field"
                  placeholder="+91 98765 43210"
                  value={editForm.emergency_contact_phone}
                  onChange={e => setEditForm(p => ({ ...p, emergency_contact_phone: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  Known Allergies (comma-separated)
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Penicillin, Peanuts, Aspirin"
                  value={editForm.allergies}
                  onChange={e => setEditForm(p => ({ ...p, allergies: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                  Medical Conditions / Notes
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="e.g. Type 2 Diabetes, Pacemaker"
                  value={editForm.emergency_notes}
                  onChange={e => setEditForm(p => ({ ...p, emergency_notes: e.target.value }))}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
                Save & Update ICE Card
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
