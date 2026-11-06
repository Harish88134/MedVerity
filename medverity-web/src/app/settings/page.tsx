'use client';

import React, { useState } from 'react';
import { User, Globe, Bell, Shield, Moon, HelpCircle, LogOut, ChevronRight, Phone, CheckCircle, Loader2, X, Volume2, VolumeX, Play, BellRing } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/types';
import { useAlarm } from '@/context/AlarmContext';

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      { icon: User, label: 'Edit Profile', desc: 'Name, phone number, language, role' },
      { icon: Globe, label: 'Language', desc: 'Change your preferred language' },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { icon: Bell, label: 'Reminder Settings', desc: 'Notification preferences, SMS alerts' },
      { icon: Volume2, label: 'Alarm Sound & Ringing', desc: 'Audio tones, preview chime, test alarm ring' },
    ],
  },
  {
    title: 'Privacy & Security',
    items: [
      { icon: Shield, label: 'Privacy', desc: 'Data security & storage' },
    ],
  },
  {
    title: 'Appearance',
    items: [
      { icon: Moon, label: 'Theme', desc: 'Light or Dark mode preview' },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: HelpCircle, label: 'Help & FAQ', desc: 'Common questions and guides' },
    ],
  },
];

export default function SettingsPage() {
  const { user, signOut, updateProfile } = useAuth();
  const router = useRouter();
  const { soundEnabled, setSoundEnabled, selectedTone, setSelectedTone, previewTone, testAlarm } = useAlarm();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    preferred_language: 'en',
    role: 'patient' as 'patient' | 'caregiver',
  });
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const openEditModal = () => {
    setEditForm({
      name: user?.name || '',
      phone: user?.phone || '',
      preferred_language: user?.preferred_language || 'en',
      role: (user?.role as 'patient' | 'caregiver') || 'patient',
    });
    setSuccessMsg('');
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await updateProfile({
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        preferred_language: editForm.preferred_language,
        role: editForm.role,
      });
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setShowEditModal(false);
        setSuccessMsg('');
      }, 1200);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = (label: string) => {
    if (label === 'Language') {
      router.push('/onboarding');
    } else if (label === 'Edit Profile') {
      openEditModal();
    } else if (label === 'Reminder Settings') {
      router.push('/reminders');
    } else if (label === 'Alarm Sound & Ringing') {
      setShowAlarmModal(true);
    } else if (label === 'Theme') {
      const isDark = document.documentElement.classList.contains('dark-mode');
      if (isDark) {
        document.documentElement.classList.remove('dark-mode');
      } else {
        document.documentElement.classList.add('dark-mode');
      }
      alert(isDark ? 'Switched to Light Theme' : 'Switched to Dark Theme (Preview)');
    } else {
      alert(`${label} settings are configured and up to date.`);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <div className="page-container" style={{ maxWidth: '600px', paddingBottom: '5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Settings</h1>

      {/* User profile card */}
      <div
        className="card"
        onClick={openEditModal}
        style={{
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
          cursor: 'pointer',
          border: '1.5px solid var(--color-teal-100)',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{
          width: '54px', height: '54px', borderRadius: '50%',
          background: 'var(--color-teal-100)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '1.375rem', color: 'var(--color-teal-700)', flexShrink: 0,
        }}>
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <p style={{ fontWeight: 600, fontSize: '1.0625rem', margin: 0 }}>{user?.name || 'Add Your Name'}</p>
            <span className="badge badge-teal" style={{ fontSize: '0.6875rem', textTransform: 'capitalize' }}>
              {user?.role || 'Patient'}
            </span>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', marginTop: '0.125rem' }}>
            {user?.email || 'user@example.com'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem' }}>
            <Phone size={13} color={user?.phone ? 'var(--color-teal-600)' : 'var(--color-text-muted)'} />
            <span style={{ fontSize: '0.75rem', color: user?.phone ? 'var(--color-teal-700)' : 'var(--color-warning-600)', fontWeight: 500 }}>
              {user?.phone ? user.phone : 'No phone set (Tap to add for SMS reminders)'}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); openEditModal(); }}
          className="btn-outline"
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' }}
        >
          Edit
        </button>
      </div>

      {/* Settings sections */}
      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: '1.25rem' }}>
          <h3 style={{
            fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            marginBottom: '0.5rem', paddingLeft: '0.25rem',
          }}>
            {section.title}
          </h3>
          <div className="card" style={{ overflow: 'hidden' }}>
            {section.items.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => handleAction(item.label)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.875rem 1rem', width: '100%',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', textAlign: 'left',
                    borderTop: i > 0 ? '1px solid var(--color-border-light)' : 'none',
                  }}
                >
                  <Icon size={20} color="var(--color-text-secondary)" />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{item.label}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.desc}</p>
                  </div>
                  <ChevronRight size={16} color="var(--color-text-muted)" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.5rem', width: '100%', padding: '0.875rem',
          background: 'var(--color-danger-50)', border: '1px solid var(--color-danger-100)',
          borderRadius: 'var(--radius-xl)', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontWeight: 600,
          color: 'var(--color-danger-600)', fontSize: '0.9375rem',
          transition: 'all 0.2s ease',
        }}
      >
        <LogOut size={18} />
        Log Out
      </button>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          backdropFilter: 'blur(3px)',
        }} onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            padding: '1.5rem', width: '100%', maxWidth: '600px',
            maxHeight: '90vh', overflowY: 'auto',
            animation: 'var(--animate-slide-up)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Edit Profile</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--color-text-muted)" />
              </button>
            </div>

            {successMsg && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'var(--color-teal-50)', border: '1px solid var(--color-teal-200)',
                color: 'var(--color-teal-700)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-lg)',
                marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500,
              }}>
                <CheckCircle size={18} color="var(--color-teal-600)" />
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                  Full Name *
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. Harish Kumar"
                  value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                  Email Address
                </label>
                <input
                  className="input-field"
                  value={user?.email || ''}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed', background: 'var(--color-surface-secondary)' }}
                />
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Email is linked to your login account.</span>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                  Mobile Phone Number (for SMS dosage reminders) *
                </label>
                <input
                  className="input-field"
                  type="tel"
                  placeholder="e.g. +91 9876543210 or +1 7372508034"
                  value={editForm.phone}
                  onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-teal-600)', marginTop: '0.25rem' }}>
                  💡 Include country code (e.g. +91 for India, +1 for US). SMS reminders will be sent to this number.
                </p>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                  Preferred Language
                </label>
                <select
                  className="input-field"
                  value={editForm.preferred_language}
                  onChange={e => setEditForm(p => ({ ...p, preferred_language: e.target.value }))}
                  style={{ cursor: 'pointer' }}
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>
                  Profile Role
                </label>
                <select
                  className="input-field"
                  value={editForm.role}
                  onChange={e => setEditForm(p => ({ ...p, role: e.target.value as 'patient' | 'caregiver' }))}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="patient">Patient (Manage my own medications)</option>
                  <option value="caregiver">Caregiver (Manage reminders for family member)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    flex: 1, padding: '0.875rem', background: 'var(--color-surface-secondary)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                    cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alarm Sound Settings Modal */}
      {showAlarmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          backdropFilter: 'blur(3px)',
        }} onClick={(e) => e.target === e.currentTarget && setShowAlarmModal(false)}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            padding: '1.5rem', width: '100%', maxWidth: '540px',
            maxHeight: '85vh', overflowY: 'auto',
            animation: 'var(--animate-slide-up)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-teal-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BellRing size={20} color="var(--color-teal-700)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Alarm Sound Preferences</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Audible alerts for medicine reminders</p>
                </div>
              </div>
              <button onClick={() => setShowAlarmModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--color-text-muted)" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Toggle Ring Sound */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem', background: 'var(--color-surface-secondary)',
                borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {soundEnabled ? <Volume2 size={22} color="var(--color-teal-600)" /> : <VolumeX size={22} color="var(--color-text-muted)" />}
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Alarm Sound</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                      {soundEnabled ? 'Alarm sounds will ring when scheduled' : 'Silent — modal only, no audio'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{
                    padding: '0.375rem 0.875rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    cursor: 'pointer',
                    background: soundEnabled ? 'var(--color-teal-600)' : 'var(--color-text-muted)',
                    color: 'white',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {soundEnabled ? 'ENABLED' : 'MUTED'}
                </button>
              </div>

              {/* Tone Selection */}
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                  Chime Tone
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    className="input-field"
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value as any)}
                    style={{ flex: 1 }}
                  >
                    <option value="chime">Digital Hospital Chime (Clear high-low tone)</option>
                    <option value="bell">Soft Zen Bell (Gentle resonant chime)</option>
                    <option value="marimba">Bright Marimba (Melodic alert)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => previewTone(selectedTone)}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--color-teal-50)',
                      border: '1.5px solid var(--color-teal-300)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--color-teal-800)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      whiteSpace: 'nowrap',
                    }}
                    title="Play Tone Preview"
                  >
                    <Play size={14} fill="var(--color-teal-700)" color="var(--color-teal-700)" />
                    Preview
                  </button>
                </div>
              </div>

              {/* Test Full Alarm Ringing */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(20, 184, 166, 0.04) 100%)',
                border: '1.5px solid var(--color-teal-200)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
              }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-teal-900)', marginBottom: '0.25rem' }}>
                  Test Full Screen Ringing Alarm
                </p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-teal-700)', marginBottom: '0.875rem', lineHeight: 1.4 }}>
                  Test the complete alarm workflow with audio ringing, visual pulse, and "Mark as Taken" action buttons.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlarmModal(false);
                    testAlarm('Amoxicillin 500mg');
                  }}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.625rem',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <BellRing size={16} />
                  Trigger Test Alarm Now
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAlarmModal(false)}
                className="btn-outline"
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={{
        textAlign: 'center', color: 'var(--color-text-muted)',
        fontSize: '0.75rem', marginTop: '1.5rem',
      }}>
        MedVerity v1.0.0
      </p>
    </div>
  );
}
