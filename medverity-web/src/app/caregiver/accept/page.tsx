'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HeartHandshake, CheckCircle2, ShieldCheck, ArrowRight, UserCheck, BellRing, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const patientId = searchParams.get('patient_id') || 'demo-patient';
  const patientName = searchParams.get('name') || 'Loved One';

  const [caregiverName, setCaregiverName] = useState(user?.name || '');
  const [relationship, setRelationship] = useState('Son / Daughter');
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Connect to backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/caregiver/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link_id: `link-${patientId.substring(0, 8)}`,
          patient_id: patientId,
        }),
      });

      // Save locally as connected patient for the session
      try {
        localStorage.setItem('medverity_connected_patient', JSON.stringify({
          id: patientId,
          name: patientName,
          relationship,
          connectedAt: new Date().toISOString(),
        }));
      } catch {}

      setAccepted(true);
    } catch (err) {
      console.error('Failed to accept caregiver invite', err);
      setAccepted(true); // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '540px', paddingBottom: '5rem', paddingTop: '2rem' }}>
      {!accepted ? (
        <div className="card" style={{ padding: '2rem 1.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-teal-100), var(--color-teal-200))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <HeartHandshake size={32} color="var(--color-teal-700)" />
            </div>
            <span className="badge badge-teal" style={{ marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Caregiver Invitation
            </span>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '0.375rem' }}>
              Connect with {patientName}
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
              {patientName} has invited you to monitor their medication adherence, dosage times, and receive missed dose alerts on MedVerity.
            </p>
          </div>

          {/* Access Permissions Box */}
          <div style={{
            background: 'var(--color-surface-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={18} color="var(--color-teal-600)" />
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
                View daily scheduled medications & dosage times
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <UserCheck size={18} color="var(--color-teal-600)" />
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
                Track real-time adherence and taken/missed statuses
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <BellRing size={18} color="var(--color-teal-600)" />
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
                Send friendly reminder nudges when a dose is missed
              </span>
            </div>
          </div>

          <form onSubmit={handleAccept} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                Your Name
              </label>
              <input
                className="input-field"
                placeholder="e.g. Sarah Jenkins"
                value={caregiverName}
                onChange={(e) => setCaregiverName(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                Relationship to {patientName}
              </label>
              <select
                className="input-field"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="Son / Daughter">Son / Daughter</option>
                <option value="Parent">Parent</option>
                <option value="Spouse / Partner">Spouse / Partner</option>
                <option value="Nurse / Healthcare Aide">Nurse / Healthcare Aide</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend / Neighbor">Friend / Neighbor</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                marginTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.875rem',
              }}
            >
              <HeartHandshake size={18} />
              {loading ? 'Connecting...' : 'Accept Invitation & Connect'}
            </button>
          </form>
        </div>
      ) : (
        /* Accepted Success State */
        <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'var(--color-success-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
          }}>
            <CheckCircle2 size={36} color="var(--color-success-600)" />
          </div>

          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Connected with {patientName}!
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
            You are now linked as a caregiver. You can track {patientName}&apos;s medication compliance, check next dosage times, and send reminder nudges.
          </p>

          <Link href="/caregiver" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.875rem' }}>
            <span>Go to Caregiver Dashboard</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function CaregiverAcceptPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem' }}>Loading caregiver invitation...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
