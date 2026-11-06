'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Sun, Sunrise, Moon, Loader2, Trash2, Plus, MessageSquare, Phone, Send, X, AlertTriangle, Key, Check, BellRing, Volume2, VolumeX, Play, Mic, Sparkles } from 'lucide-react';
import { useReminders, Reminder, Schedule } from '@/hooks/useReminders';
import { useAuth } from '@/hooks/useAuth';
import { useAlarm } from '@/context/AlarmContext';
import VoicePharmacistModal from '@/components/voice/VoicePharmacistModal';

export default function RemindersPage() {
  const { user, updateProfile } = useAuth();
  const { schedule, loading, updateReminderStatus, deleteReminder, addReminder } = useReminders(user?.id);
  const { testAlarm, triggerAlarm, soundEnabled, setSoundEnabled, selectedTone, setSelectedTone, previewTone } = useAlarm();
  const [showAddModal, setShowAddModal] = useState(false);
  const [voiceModalMed, setVoiceModalMed] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    medicine_name: '',
    time: '08:00',
    instructions: '',
    timeOfDay: 'morning',
    channel: 'app',
    phone: '',
  });
  const [addLoading, setAddLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // SMS logs modal / drawer
  const [showSmsLogs, setShowSmsLogs] = useState(false);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testSending, setTestSending] = useState(false);

  // Twilio credentials update form state
  const [showTwilioConfig, setShowTwilioConfig] = useState(false);
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');
  const [savingTwilio, setSavingTwilio] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);

  const today = new Date();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const todayIndex = today.getDay();

  // Keep phone prefilled from user profile
  useEffect(() => {
    if (user?.phone) {
      setAddForm(p => ({ ...p, phone: p.phone || user.phone || '' }));
      setTestPhone(user.phone);
    }
  }, [user]);

  // Phase 2: Prefill reminder from Chronotherapy recommendation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const prefillMed = params.get('prefill_med');
      const prefillTime = params.get('prefill_time');
      if (prefillMed) {
        let parsedTime = '21:30';
        let slot = 'night';
        if (prefillTime) {
          const lower = prefillTime.toLowerCase();
          if (lower.includes('am') || lower.includes('7:00') || lower.includes('8:00') || lower.includes('9:00') || lower.includes('morning')) {
            slot = 'morning';
            parsedTime = '08:00';
          } else if (lower.includes('pm') || lower.includes('10:00') || lower.includes('9:30') || lower.includes('bed')) {
            slot = 'night';
            parsedTime = '21:30';
          }
        }
        setAddForm(prev => ({
          ...prev,
          medicine_name: prefillMed,
          time: parsedTime,
          timeOfDay: slot,
          instructions: `Optimal Chronotherapy timing: ${prefillTime || 'As prescribed'}`,
        }));
        setShowAddModal(true);
      }
    }
  }, []);

  const toggleStatus = (timeOfDay: keyof Schedule, reminderId: string) => {
    if (!schedule) return;
    const reminder = schedule[timeOfDay].find(r => r.id === reminderId);
    if (reminder) {
      const newStatus: 'taken' | 'pending' = reminder.status === 'taken' ? 'pending' : 'taken';
      updateReminderStatus(timeOfDay as string, reminderId, newStatus);
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (confirm('Delete this reminder?')) {
      await deleteReminder(reminderId);
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.medicine_name.trim()) return;
    setAddLoading(true);

    // If channel is SMS and phone was provided, dynamically save to user profile
    if (addForm.channel === 'sms' && addForm.phone.trim()) {
      if (addForm.phone.trim() !== user?.phone) {
        updateProfile({ phone: addForm.phone.trim() }).catch(console.error);
      }
    }

    const res = await addReminder(addForm.timeOfDay, {
      medicine_name: addForm.medicine_name,
      time: addForm.time,
      instructions: addForm.instructions,
      channel: addForm.channel,
      phone: addForm.phone.trim(),
    });

    setAddLoading(false);
    setShowAddModal(false);

    if (addForm.channel === 'sms') {
      const phoneUsed = addForm.phone.trim() || user?.phone || 'your phone';
      if (res?.sms_info?.live) {
        setToastMessage(`✅ Live SMS dispatched to ${phoneUsed}!`);
      } else if (res?.sms_info?.error_code === 20003) {
        setToastMessage(`⚠️ Reminder saved. Twilio Trial is expired — check SMS Logs to update Twilio.`);
      } else {
        setToastMessage(`📱 Reminder set! SMS alert recorded for ${phoneUsed}.`);
      }
    } else {
      setToastMessage('✅ In-app reminder saved successfully.');
    }

    setTimeout(() => setToastMessage(null), 6000);
    setAddForm({ medicine_name: '', time: '08:00', instructions: '', timeOfDay: 'morning', channel: 'app', phone: user?.phone || '' });
  };

  const fetchSmsLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/reminders/sms-logs`);
      const data = await res.json();
      setSmsLogs(data.logs || []);
    } catch (e) {
      console.error('Failed to load SMS logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSendTestSms = async () => {
    if (!testPhone.trim()) {
      alert('Please enter a phone number to test SMS delivery.');
      return;
    }
    setTestSending(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/reminders/send-test-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_phone: testPhone.trim(),
          medicine_name: 'Paracetamol 650mg',
        }),
      });
      const data = await res.json();
      if (data.live) {
        alert(`✅ Success! Live SMS sent to ${data.to} via Twilio! (SID: ${data.sid})`);
      } else {
        alert(`⚠️ Twilio Status: ${data.note}`);
      }
      fetchSmsLogs();
    } catch (e) {
      console.error(e);
      alert('Test SMS request failed.');
    } finally {
      setTestSending(false);
    }
  };

  const handleSaveTwilio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twilioAccountSid.trim() || !twilioAuthToken.trim() || !twilioPhoneNumber.trim()) {
      alert('Please fill all Twilio fields.');
      return;
    }
    setSavingTwilio(true);
    setTwilioStatus(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/reminders/twilio-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_sid: twilioAccountSid.trim(),
          auth_token: twilioAuthToken.trim(),
          phone_number: twilioPhoneNumber.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTwilioStatus({ success: true, message: data.message });
      } else {
        setTwilioStatus({ success: false, error: data.error });
      }
    } catch (e: any) {
      setTwilioStatus({ success: false, error: e.message || 'Failed to update Twilio settings' });
    } finally {
      setSavingTwilio(false);
    }
  };

  const hasExpiredError = smsLogs.some(
    log => log.status === 'failed_trial_expired' || log.error_code === 20003
  );

  const renderSection = (title: string, icon: React.ReactNode, reminders: Reminder[], timeOfDay: keyof Schedule) => {
    if (!reminders || reminders.length === 0) return null;
    return (
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          {icon}
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
          <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {reminders.filter(r => r.status === 'taken').length}/{reminders.length} taken
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {reminders.map(rem => (
            <div key={rem.id} className="card" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem',
              borderLeft: rem.status === 'taken' ? '4px solid var(--color-success-500)' : rem.status === 'missed' ? '4px solid var(--color-danger-500)' : '4px solid transparent',
              opacity: rem.status === 'taken' ? 0.7 : 1,
              transition: 'all 0.2s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: 1 }}>
                <div style={{ width: '48px', height: '48px', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                  💊
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text-primary)' }}>{rem.medicine_name}</h3>
                    {rem.channel === 'sms' && (
                      <span className="badge badge-teal" style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem' }}>
                        📱 SMS
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{rem.time} • {rem.instructions}</p>
                  {rem.status === 'missed' && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-danger-600)', fontWeight: 600 }}>Missed</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setVoiceModalMed(rem.medicine_name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'linear-gradient(135deg, var(--color-teal-50), #E6FFFA)',
                    border: '1px solid var(--color-teal-300)',
                    color: 'var(--color-teal-800)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.3rem 0.625rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Ask voice pharmacist about this medicine"
                >
                  <Mic size={13} color="var(--color-teal-700)" />
                  <span>Ask</span>
                </button>
                <button
                  type="button"
                  onClick={() => triggerAlarm(rem)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: 'var(--color-teal-50)',
                    border: '1px solid var(--color-teal-200)',
                    color: 'var(--color-teal-700)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.3rem 0.625rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  title="Test ringing alarm for this medication"
                >
                  <BellRing size={13} />
                  <span>Ring</span>
                </button>
                <button
                  onClick={() => handleDelete(rem.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, color: 'var(--color-danger-500)' }}
                  aria-label="Delete reminder"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => toggleStatus(timeOfDay, rem.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  aria-label={rem.status === 'taken' ? 'Mark as pending' : 'Mark as taken'}
                >
                  {rem.status === 'taken' ? (
                    <CheckCircle2 size={28} color="var(--color-success-500)" fill="var(--color-success-100)" />
                  ) : (
                    <Circle size={28} color="var(--color-border)" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ maxWidth: '640px', paddingBottom: '5rem' }}>
      {/* Toast Banner */}
      {toastMessage && (
        <div style={{
          position: 'sticky', top: '1rem', zIndex: 50,
          background: 'var(--color-teal-700)', color: 'white',
          padding: '0.875rem 1rem', borderRadius: 'var(--radius-lg)',
          marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
          animation: 'var(--animate-fade-in)',
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Reminders</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>Manage your daily medications & SMS alerts</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setVoiceModalMed('My Prescribed Medicines')}
            style={{
              padding: '0.5rem 0.875rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              border: '1.5px solid var(--color-teal-400)',
              background: 'linear-gradient(135deg, var(--color-teal-600), var(--color-teal-800))',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)',
            }}
            title="Ask Voice Pharmacist Q&A"
          >
            <Mic size={15} />
            Ask Voice
          </button>
          <button
            type="button"
            onClick={() => testAlarm('Paracetamol 650mg')}
            style={{
              padding: '0.5rem 0.875rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.8125rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              border: '1.5px solid var(--color-teal-300)',
              background: 'var(--color-teal-50)',
              color: 'var(--color-teal-800)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(13, 148, 136, 0.1)',
            }}
            title="Preview audible alarm sound"
          >
            <BellRing size={15} color="var(--color-teal-600)" />
            Test Alarm
          </button>
          <button
            onClick={() => { setShowSmsLogs(true); fetchSmsLogs(); }}
            className="btn-outline"
            style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <MessageSquare size={15} />
            SMS Logs
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ padding: '0.5rem 1rem', width: 'auto', borderRadius: 'var(--radius-full)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Calendar Strip */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ChevronLeft color="var(--color-text-muted)" /></button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {weekDays.map((day, i) => (
            <div key={i} style={{
              width: '40px', height: '56px', borderRadius: 'var(--radius-full)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: i === todayIndex ? 'var(--color-teal-600)' : 'transparent',
              color: i === todayIndex ? 'white' : 'var(--color-text-primary)',
            }}>
              <span style={{ fontSize: '0.75rem', opacity: i === todayIndex ? 0.9 : 0.6 }}>{day}</span>
              <span style={{ fontWeight: 600, marginTop: '0.25rem' }}>{today.getDate() - todayIndex + i}</span>
            </div>
          ))}
        </div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }}><ChevronRight color="var(--color-text-muted)" /></button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={32} color="var(--color-teal-600)" />
        </div>
      ) : schedule ? (
        <>
          {renderSection('Morning', <Sunrise color="var(--color-teal-600)" />, schedule.morning, 'morning')}
          {renderSection('Afternoon', <Sun color="var(--color-teal-600)" />, schedule.afternoon, 'afternoon')}
          {renderSection('Night', <Moon color="var(--color-teal-600)" />, schedule.night, 'night')}
          {!schedule.morning?.length && !schedule.afternoon?.length && !schedule.night?.length && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💊</div>
              <h3 style={{ color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>No reminders yet</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Scan a medicine to set a reminder, or tap + Add.</p>
            </div>
          )}
        </>
      ) : null}

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          backdropFilter: 'blur(3px)',
        }} onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            padding: '1.5rem', width: '100%', maxWidth: '640px',
            maxHeight: '90vh', overflowY: 'auto',
            animation: 'var(--animate-slide-up)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Add Medicine Reminder</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--color-text-muted)" />
              </button>
            </div>

            <form onSubmit={handleAddReminder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Medicine Name *</label>
                <input className="input-field" placeholder="e.g. Paracetamol 500mg" value={addForm.medicine_name} onChange={e => setAddForm(p => ({ ...p, medicine_name: e.target.value }))} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Time</label>
                  <input className="input-field" type="time" value={addForm.time} onChange={e => setAddForm(p => ({ ...p, time: e.target.value }))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>When</label>
                  <select className="input-field" value={addForm.timeOfDay} onChange={e => setAddForm(p => ({ ...p, timeOfDay: e.target.value }))} style={{ cursor: 'pointer' }}>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Instructions</label>
                <input className="input-field" placeholder="e.g. After meals, with water" value={addForm.instructions} onChange={e => setAddForm(p => ({ ...p, instructions: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.375rem' }}>Alert Type</label>
                <select className="input-field" value={addForm.channel} onChange={e => setAddForm(p => ({ ...p, channel: e.target.value }))} style={{ cursor: 'pointer' }}>
                  <option value="app">🔔 Sound Alarm & Screen Alert (Audible Ringing)</option>
                  <option value="sms">📱 SMS Text Message (Cellular)</option>
                </select>
              </div>

              {/* Sound Alarm Controls when In-App Alarm is selected */}
              {addForm.channel === 'app' && (
                <div style={{
                  background: 'var(--color-teal-50)',
                  border: '1.5px solid var(--color-teal-200)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {soundEnabled ? <Volume2 size={18} color="var(--color-teal-700)" /> : <VolumeX size={18} color="var(--color-text-muted)" />}
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-teal-900)' }}>
                        Audible Alarm Sound
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      style={{
                        padding: '0.25rem 0.625rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        cursor: 'pointer',
                        background: soundEnabled ? 'var(--color-teal-600)' : 'var(--color-text-muted)',
                        color: 'white',
                      }}
                    >
                      {soundEnabled ? 'ENABLED' : 'MUTED'}
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      className="input-field"
                      value={selectedTone}
                      onChange={(e) => setSelectedTone(e.target.value as any)}
                      style={{ flex: 1, fontSize: '0.8125rem' }}
                    >
                      <option value="chime">Digital Hospital Chime</option>
                      <option value="bell">Soft Zen Bell</option>
                      <option value="marimba">Bright Marimba</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => previewTone(selectedTone)}
                      style={{
                        padding: '0.625rem 0.875rem',
                        background: 'white',
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
                    >
                      <Play size={13} fill="var(--color-teal-700)" color="var(--color-teal-700)" />
                      Play Chime
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-teal-700)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                    🔔 When the reminder time arrives, an audible alarm will ring continuously until you mark it as taken or snooze.
                  </p>
                </div>
              )}

              {/* Dedicated Phone Input when SMS channel is chosen */}
              {addForm.channel === 'sms' && (
                <div style={{
                  background: 'var(--color-teal-50)',
                  border: '1.5px solid var(--color-teal-200)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-teal-800)', display: 'block', marginBottom: '0.375rem' }}>
                    Mobile Number for SMS Alerts *
                  </label>
                  <input
                    className="input-field"
                    type="tel"
                    placeholder="e.g. +91 9876543210 or +1 737..."
                    value={addForm.phone}
                    onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                    required
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-teal-700)', marginTop: '0.375rem', lineHeight: 1.4 }}>
                    📱 Cellular SMS will be sent via Twilio to this mobile number.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '0.875rem', background: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 500 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={addLoading} style={{ flex: 1 }}>
                  {addLoading ? <Loader2 size={18} className="animate-spin" /> : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMS Logs & Twilio Config Modal */}
      {showSmsLogs && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          backdropFilter: 'blur(3px)',
        }} onClick={(e) => e.target === e.currentTarget && setShowSmsLogs(false)}>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            padding: '1.5rem', width: '100%', maxWidth: '640px',
            maxHeight: '85vh', overflowY: 'auto',
            animation: 'var(--animate-slide-up)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={20} color="var(--color-teal-600)" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>SMS Notification Center</h2>
              </div>
              <button onClick={() => setShowSmsLogs(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--color-text-muted)" />
              </button>
            </div>

            {/* Expired Trial Warning Banner */}
            {hasExpiredError && (
              <div style={{
                background: 'var(--color-danger-50)',
                border: '1.5px solid var(--color-danger-200)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <AlertTriangle color="var(--color-danger-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: 'var(--color-danger-700)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      Twilio Trial Account Expired (Error 20003)
                    </p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-danger-700)', opacity: 0.9, lineHeight: 1.5 }}>
                      Twilio is rejecting SMS delivery because the current trial account in <code>.env</code> has expired.
                      To send real cellular messages to your phone, upgrade or provide a fresh Twilio Account SID.
                    </p>
                    <button
                      onClick={() => setShowTwilioConfig(!showTwilioConfig)}
                      style={{
                        marginTop: '0.5rem', background: 'var(--color-danger-600)', color: 'white',
                        border: 'none', padding: '0.375rem 0.75rem', borderRadius: '4px',
                        fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                      }}
                    >
                      <Key size={13} />
                      {showTwilioConfig ? 'Hide Twilio Settings' : 'Update Twilio Credentials'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Twilio Credentials Form Drawer */}
            {showTwilioConfig && (
              <form onSubmit={handleSaveTwilio} style={{
                background: 'var(--color-surface-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}>
                <h4 style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                  Update Twilio Live Credentials
                </h4>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Account SID (starts with AC...)
                  </label>
                  <input
                    className="input-field"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={twilioAccountSid}
                    onChange={e => setTwilioAccountSid(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Auth Token
                  </label>
                  <input
                    className="input-field"
                    type="password"
                    placeholder="Enter your Twilio Auth Token"
                    value={twilioAuthToken}
                    onChange={e => setTwilioAuthToken(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Twilio Phone Number (with country code)
                  </label>
                  <input
                    className="input-field"
                    placeholder="+1xxxxxxxxxx"
                    value={twilioPhoneNumber}
                    onChange={e => setTwilioPhoneNumber(e.target.value)}
                    required
                  />
                </div>

                {twilioStatus && (
                  <p style={{
                    fontSize: '0.75rem',
                    color: twilioStatus.success ? 'var(--color-success-600)' : 'var(--color-danger-600)',
                    fontWeight: 500,
                  }}>
                    {twilioStatus.success ? `✅ ${twilioStatus.message}` : `❌ ${twilioStatus.error}`}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={savingTwilio}
                  className="btn-primary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
                >
                  {savingTwilio ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save & Verify Connection
                </button>
              </form>
            )}

            {/* Test SMS sender tool */}
            <div style={{
              background: 'var(--color-surface-secondary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              marginBottom: '1.25rem',
            }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Send a Test SMS Reminder
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  className="input-field"
                  type="tel"
                  placeholder="+91..."
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleSendTestSms}
                  disabled={testSending}
                  className="btn-primary"
                  style={{ padding: '0.5rem 1rem', width: 'auto', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  {testSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send Test
                </button>
              </div>
            </div>

            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
              Recent SMS Dispatches
            </h3>

            {loadingLogs ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Loader2 className="animate-spin" size={24} color="var(--color-teal-600)" style={{ margin: '0 auto' }} />
              </div>
            ) : smsLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                No SMS dispatches yet. Set a reminder with channel &quot;SMS&quot; or send a test SMS above!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {smsLogs.map(log => {
                  const isLive = log.status === 'delivered_live';
                  const isExpired = log.status === 'failed_trial_expired' || log.error_code === 20003;
                  return (
                    <div key={log.id} style={{
                      padding: '0.875rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${isLive ? 'var(--color-teal-200)' : isExpired ? 'var(--color-danger-200)' : 'var(--color-border-light)'}`,
                      background: isLive ? 'var(--color-teal-50)' : isExpired ? 'var(--color-danger-50)' : 'var(--color-surface)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)' }}>
                          📞 {log.to}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                          {log.timestamp}
                        </span>
                      </div>
                      <pre style={{
                        margin: 0,
                        fontFamily: 'inherit',
                        fontSize: '0.8125rem',
                        whiteSpace: 'pre-wrap',
                        color: 'var(--color-text-primary)',
                        background: 'rgba(0,0,0,0.03)',
                        padding: '0.5rem',
                        borderRadius: '4px',
                      }}>
                        {log.body}
                      </pre>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {isLive ? (
                          <span className="badge badge-teal" style={{ fontSize: '0.6875rem' }}>
                            ✅ Live Cellular SMS Delivered
                          </span>
                        ) : isExpired ? (
                          <span style={{
                            background: 'var(--color-danger-100)', color: 'var(--color-danger-700)',
                            padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600,
                          }}>
                            🔴 Twilio Trial Expired (Error 20003)
                          </span>
                        ) : (
                          <span className="badge" style={{ fontSize: '0.6875rem' }}>
                            ℹ️ Dispatched
                          </span>
                        )}
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.note}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multilingual Voice Pharmacist Modal */}
      <VoicePharmacistModal
        isOpen={!!voiceModalMed}
        onClose={() => setVoiceModalMed(null)}
        medicineName={voiceModalMed || 'My Prescribed Medicines'}
      />
    </div>
  );
}
