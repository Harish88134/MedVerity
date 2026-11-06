'use client';

import React, { useEffect, useState } from 'react';
import { User, Activity, Clock, AlertTriangle, UserPlus, Loader2, ArrowRight, BellRing, Check, QrCode, Mic, Camera, CheckCircle2, Eye, X } from 'lucide-react';
import Link from 'next/link';
import VoiceClipRecorder from '@/components/caregiver/VoiceClipRecorder';

interface CaregiverData {
  patient_name: string;
  adherence: number;
  next_dose: {
    medicine: string;
    time: string;
    instructions: string;
  };
  missed_doses: {
    medicine: string;
    time: string;
  }[];
}

export default function CaregiverDashboardPage() {
  const [data, setData] = useState<CaregiverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [remindedMap, setRemindedMap] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedProofImg, setSelectedProofImg] = useState<{ name: string; time: string; url: string } | null>(null);
  const [photoDoses, setPhotoDoses] = useState<Array<{ id: string; medicine: string; time: string; photoUrl: string }>>([]);

  useEffect(() => {
    // Collect photo proofs from localStorage
    try {
      const proofs: Array<{ id: string; medicine: string; time: string; photoUrl: string }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('medverity_photo_proof_')) {
          const val = localStorage.getItem(key);
          const reminderId = key.replace('medverity_photo_proof_', '');
          if (val) {
            proofs.push({
              id: reminderId,
              medicine: 'Thyroxine 50mcg',
              time: 'Today, 08:05 AM',
              photoUrl: val,
            });
          }
        }
      }
      setPhotoDoses(proofs);
    } catch {}
  }, []);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/caregiver/dashboard`);
        if (res.ok) {
          const json = await res.json();
          
          // Check if user linked a real patient via invite accept
          try {
            const stored = localStorage.getItem('medverity_connected_patient');
            if (stored) {
              const connected = JSON.parse(stored);
              if (connected.name) {
                json.patient_name = connected.name;
              }
            }
          } catch {}

          setData(json);
        }
      } catch (err) {
        console.error("Failed to load caregiver dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const handleSendRemind = async (medicine: string, time: string) => {
    setRemindedMap(prev => ({ ...prev, [medicine]: true }));
    const pName = data?.patient_name || 'Loved One';
    setToastMessage(`🔔 Reminder alert sent to ${pName} for ${medicine}!`);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/caregiver/remind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: pName,
          medicine_name: medicine,
          caregiver_name: 'Caregiver',
        }),
      });
    } catch (e) {
      console.error('Failed to notify backend', e);
    }

    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="page-container" style={{ maxWidth: '640px', paddingBottom: '5rem' }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'sticky', top: '1rem', zIndex: 50,
          background: 'var(--color-teal-700)', color: 'white',
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
          animation: 'var(--animate-fade-in)',
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Caregiver Dashboard</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Monitor patient adherence and send alerts</p>
        </div>
        <Link href="/caregiver/link">
          <button style={{
            background: 'var(--color-teal-50)',
            border: '1.5px solid var(--color-teal-300)',
            borderRadius: 'var(--radius-full)',
            padding: '0.5rem 0.875rem',
            color: 'var(--color-teal-800)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            <QrCode size={15} color="var(--color-teal-700)" />
            Invite QR
          </button>
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--color-teal-600)" />
        </div>
      ) : !data ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <UserPlus size={48} color="var(--color-text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Loved Ones Linked</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>Link your account with a loved one to monitor their medication adherence and schedule.</p>
          <Link href="/caregiver/link" className="btn-primary" style={{ display: 'inline-flex', width: 'auto' }}>
            Link Now
          </Link>
        </div>
      ) : (
        <>
          {/* Patient Selector */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--color-teal-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={22} color="var(--color-teal-700)" />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Active Patient</p>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{data.patient_name}</h2>
              </div>
            </div>
            <Link href="/caregiver/link" style={{ fontSize: '0.75rem', color: 'var(--color-teal-700)', fontWeight: 600, textDecoration: 'none' }}>
              + Add Another
            </Link>
          </div>

          {/* Adherence Card */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--color-teal-600), var(--color-teal-800))', color: 'white', border: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', opacity: 0.9 }}>
              <Activity size={18} />
              <h3 style={{ fontWeight: 500, fontSize: '0.9375rem' }}>Overall Adherence</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{data.adherence}</span>
              <span style={{ fontSize: '1.25rem', opacity: 0.8 }}>%</span>
            </div>
            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.9 }}>
              {data.adherence >= 80 ? `Great job! ${data.patient_name} is staying on track.` : `${data.patient_name} needs help with recent scheduled doses.`}
            </p>
          </div>

          {/* Next Dose */}
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Next Dose</h3>
          <div className="card" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} color="var(--color-teal-600)" />
              </div>
              <div>
                <h4 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.125rem' }}>{data.next_dose.medicine}</h4>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{data.next_dose.time} • {data.next_dose.instructions}</p>
              </div>
            </div>
          </div>

          {/* Missed Doses */}
          {data.missed_doses.length > 0 && (
            <>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-danger-600)' }}>Missed Medicines</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.missed_doses.map((missed, idx) => (
                  <div key={idx} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '4px solid var(--color-danger-500)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <AlertTriangle size={24} color="var(--color-danger-500)" />
                      <div>
                        <h4 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.125rem' }}>{missed.medicine}</h4>
                        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Scheduled: {missed.time}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendRemind(missed.medicine, missed.time)}
                      disabled={remindedMap[missed.medicine]}
                      style={{
                        background: remindedMap[missed.medicine] ? 'var(--color-success-50)' : 'var(--color-danger-50)',
                        color: remindedMap[missed.medicine] ? 'var(--color-success-700)' : 'var(--color-danger-700)',
                        border: remindedMap[missed.medicine] ? '1px solid var(--color-success-200)' : '1px solid var(--color-danger-200)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: remindedMap[missed.medicine] ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {remindedMap[missed.medicine] ? (
                        <>
                          <Check size={14} />
                          Nudged
                        </>
                      ) : (
                        <>
                          <BellRing size={14} />
                          Remind
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {/* Phase 6: Caregiver Voice Alarm Recorder */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mic size={18} style={{ color: '#BE185D' }} />
              Personal Voice Alarms
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Record a personal voice message for {data.patient_name}&apos;s next-dose reminder.
              When the alarm fires, they&apos;ll hear your voice first.
            </p>
            <VoiceClipRecorder
              reminderId="caregiver-next-dose"
              medicineName={data.next_dose.medicine}
            />
          </div>

          {/* Phase 6: Photo-Verified Doses Feed */}
          <div style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Camera size={18} style={{ color: 'var(--color-teal-600)' }} />
                Photo-Verified Doses
              </h3>
              <span style={{ fontSize: '0.75rem', background: 'var(--color-success-50)', color: 'var(--color-success-700)', border: '1px solid var(--color-success-200)', borderRadius: 'var(--radius-full)', padding: '0.2rem 0.6rem', fontWeight: 600 }}>
                Adherence Feed
              </span>
            </div>
            
            {photoDoses.length === 0 ? (
              <div className="card" style={{ padding: '1.25rem', textAlign: 'center', background: 'var(--color-surface-secondary)' }}>
                <Camera size={28} style={{ margin: '0 auto 0.5rem', color: 'var(--color-text-muted)' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                  No photo proofs uploaded yet today
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  When {data.patient_name} marks their scheduled doses as taken, their photo proof will appear right here.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {photoDoses.map((dose) => (
                  <div key={dose.id} className="card" style={{ padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                      <div 
                        onClick={() => setSelectedProofImg({ name: dose.medicine, time: dose.time, url: dose.photoUrl })}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          position: 'relative',
                          border: '2px solid var(--color-teal-500)',
                          background: '#000',
                          flexShrink: 0
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dose.photoUrl} alt="Dose photo proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.125rem' }}>
                          <CheckCircle2 size={15} style={{ color: 'var(--color-success-600)' }} />
                          <h4 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{dose.medicine}</h4>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          ✓ Taken & Photo Verified • {dose.time}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedProofImg({ name: dose.medicine, time: dose.time, url: dose.photoUrl })}
                      style={{
                        background: 'var(--color-surface-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.375rem 0.625rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        color: 'var(--color-text-secondary)'
                      }}
                    >
                      <Eye size={13} />
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Photo Proof Lightbox Modal */}
      {selectedProofImg && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '1.25rem', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedProofImg.name}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-success-600)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }}>
                  <CheckCircle2 size={13} /> Verified Taken • {selectedProofImg.time}
                </p>
              </div>
              <button 
                onClick={() => setSelectedProofImg(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ width: '100%', maxHeight: '380px', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selectedProofImg.url} alt="Proof" style={{ width: '100%', maxHeight: '380px', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

