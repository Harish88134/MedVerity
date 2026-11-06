'use client';

import React, { useState } from 'react';
import { BellRing, Check, Clock, Volume2, X } from 'lucide-react';
import { useAlarm } from '@/context/AlarmContext';
import PhotoProofCapture from '@/components/caregiver/PhotoProofCapture';

export default function AlarmModal() {
  const { activeAlarm, dismissAlarm, snoozeAlarm, markTakenAndDismiss } = useAlarm();
  const [taken, setTaken] = useState(false);
  const [takenAt, setTakenAt] = useState('');

  const handleMarkTaken = async () => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    setTakenAt(time);
    setTaken(true);
    await markTakenAndDismiss();
  };

  if (!activeAlarm) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      animation: 'var(--animate-fade-in)',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-2xl)',
        width: '100%',
        maxWidth: '440px',
        padding: '2rem 1.75rem',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        border: '2px solid var(--color-teal-500)',
        animation: 'var(--animate-slide-up)',
        position: 'relative',
      }}>
        {/* Dismiss X button */}
        <button
          onClick={dismissAlarm}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            padding: '0.25rem',
          }}
          aria-label="Dismiss alarm"
        >
          <X size={20} />
        </button>

        {/* Pulsing Animated Bell Ring Icon */}
        <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 1.5rem' }}>
          <div style={{
            position: 'absolute',
            inset: '-10px',
            borderRadius: '50%',
            background: 'rgba(13, 148, 136, 0.2)',
            animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
          }} />
          <div style={{
            position: 'relative',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-teal-500), var(--color-teal-700))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(13, 148, 136, 0.4)',
          }}>
            <BellRing size={44} color="white" />
          </div>
        </div>

        {/* Audio Ringing Indicator */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          background: 'var(--color-teal-50)',
          color: 'var(--color-teal-700)',
          padding: '0.25rem 0.75rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          marginBottom: '0.75rem',
          border: '1px solid var(--color-teal-200)',
        }}>
          <Volume2 size={14} className="animate-pulse" />
          Alarm Sounding
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
          Time for Your Medicine!
        </h2>
        <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-teal-700)', marginBottom: '0.75rem' }}>
          {activeAlarm.medicine_name}
        </p>

        {/* Time and instructions chip */}
        <div style={{
          background: 'var(--color-surface-secondary)',
          borderRadius: 'var(--radius-lg)',
          padding: '0.875rem 1rem',
          marginBottom: '1.75rem',
          border: '1px solid var(--color-border-light)',
          textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Clock size={16} color="var(--color-teal-600)" />
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
              Scheduled for {activeAlarm.time} ({activeAlarm.timeOfDay})
            </span>
          </div>
          {activeAlarm.instructions && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginLeft: '1.5rem', marginTop: '0.125rem' }}>
              {activeAlarm.instructions}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {!taken ? (
            <>
              <button
                onClick={handleMarkTaken}
                className="btn-primary"
                style={{
                  padding: '1rem',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 16px rgba(13, 148, 136, 0.4)',
                }}
                id="mark-taken-btn"
              >
                <Check size={20} strokeWidth={2.5} />
                Mark as Taken
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  onClick={() => snoozeAlarm(5)}
                  className="btn-outline"
                  style={{ padding: '0.75rem', fontSize: '0.875rem' }}
                >
                  💤 Snooze (5m)
                </button>
                <button
                  onClick={dismissAlarm}
                  style={{
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    background: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Dismiss
                </button>
              </div>
            </>
          ) : (
            /* Phase 6: Photo Proof capture after marking as taken */
            <PhotoProofCapture
              reminderId={activeAlarm.id}
              medicineName={activeAlarm.medicine_name}
              takenAt={takenAt}
              onPhotoProofSaved={() => setTimeout(dismissAlarm, 1800)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
