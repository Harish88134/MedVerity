'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Reminder } from '@/hooks/useReminders';
import { startAlarm, stopAlarm, playSoundPreview, playSuccessSound, showBrowserNotification, requestNotificationPermission, AlarmTone } from '@/lib/alarm';
import { useAuth } from '@/hooks/useAuth';

interface ActiveAlarmInfo {
  id: string;
  medicine_name: string;
  time: string;
  instructions: string;
  timeOfDay: string;
}

interface AlarmContextType {
  activeAlarm: ActiveAlarmInfo | null;
  isRinging: boolean;
  soundEnabled: boolean;
  selectedTone: AlarmTone;
  setSoundEnabled: (enabled: boolean) => void;
  setSelectedTone: (tone: AlarmTone) => void;
  triggerAlarm: (reminder: Reminder) => void;
  dismissAlarm: () => void;
  snoozeAlarm: (minutes?: number) => void;
  markTakenAndDismiss: () => Promise<void>;
  testAlarm: (sampleName?: string) => void;
  previewTone: (tone?: AlarmTone) => void;
}

const AlarmContext = createContext<AlarmContextType | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function AlarmProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmInfo | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [selectedTone, setSelectedToneState] = useState<AlarmTone>('chime');

  // Track the last minute we fired an alarm to avoid repeated firings in the same minute
  const lastFiredMinuteRef = useRef<string>('');

  // When user switches or logs out, immediately dismiss any active ringing alarm
  useEffect(() => {
    dismissAlarm();
    lastFiredMinuteRef.current = '';
  }, [user?.id, dismissAlarm]);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const storedEnabled = localStorage.getItem('medverity_alarm_sound');
      if (storedEnabled !== null) {
        setSoundEnabledState(storedEnabled === 'true');
      }
      const storedTone = localStorage.getItem('medverity_alarm_tone') as AlarmTone;
      if (storedTone) {
        setSelectedToneState(storedTone);
      }
      requestNotificationPermission().catch(() => {});
    } catch {}
  }, []);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    try {
      localStorage.setItem('medverity_alarm_sound', String(enabled));
    } catch {}
  };

  const setSelectedTone = (tone: AlarmTone) => {
    setSelectedToneState(tone);
    try {
      localStorage.setItem('medverity_alarm_tone', tone);
    } catch {}
  };

  const triggerAlarm = useCallback((reminder: Reminder | ActiveAlarmInfo) => {
    const alarmInfo: ActiveAlarmInfo = {
      id: reminder.id,
      medicine_name: reminder.medicine_name,
      time: reminder.time,
      instructions: reminder.instructions || '',
      timeOfDay: reminder.timeOfDay || 'morning',
    };
    setActiveAlarm(alarmInfo);
    setIsRinging(true);

    if (soundEnabled) {
      // Phase 6: Play family voice clip first if one was recorded for this reminder
      const voiceClipUrl = (() => {
        try { return localStorage.getItem(`medverity_voice_clip_${reminder.id}`); }
        catch { return null; }
      })();

      if (voiceClipUrl) {
        const voiceAudio = new Audio(voiceClipUrl);
        voiceAudio.play().catch(() => startAlarm(selectedTone));
        // After voice clip ends, play the gentle chime alarm tone
        voiceAudio.onended = () => startAlarm(selectedTone);
      } else {
        startAlarm(selectedTone);
      }
    }

    showBrowserNotification(
      `💊 Time to take: ${reminder.medicine_name}`,
      `Scheduled: ${reminder.time}. ${reminder.instructions || 'Stay healthy!'}`
    );
  }, [soundEnabled, selectedTone]);

  const dismissAlarm = useCallback(() => {
    stopAlarm();
    setIsRinging(false);
    setActiveAlarm(null);
  }, []);

  const snoozeAlarm = useCallback((minutes: number = 5) => {
    stopAlarm();
    setIsRinging(false);
    const snoozedItem = activeAlarm;
    setActiveAlarm(null);

    if (snoozedItem) {
      setTimeout(() => {
        triggerAlarm(snoozedItem);
      }, minutes * 60 * 1000);
    }
  }, [activeAlarm, triggerAlarm]);

  const markTakenAndDismiss = useCallback(async () => {
    if (!activeAlarm) return;
    const { timeOfDay, id } = activeAlarm;

    stopAlarm();
    playSuccessSound();
    setIsRinging(false);
    setActiveAlarm(null);

    try {
      await fetch(`${API_BASE}/reminders/${timeOfDay}/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'taken' }),
      });
    } catch (e) {
      console.error('[AlarmContext] Failed to mark taken:', e);
    }
  }, [activeAlarm]);

  const testAlarm = useCallback((sampleName: string = 'Paracetamol 650mg') => {
    triggerAlarm({
      id: 'test-alarm',
      medicine_name: sampleName,
      time: 'Now (Test)',
      instructions: 'Take 1 tablet after meals with water',
      timeOfDay: 'morning',
      status: 'pending',
    });
  }, [triggerAlarm]);

  const previewTone = useCallback((tone?: AlarmTone) => {
    playSoundPreview(tone || selectedTone);
  }, [selectedTone]);

  // Background Clock Monitor: Checks every 10 seconds against upcoming reminders
  useEffect(() => {
    // DO NOT monitor or ring alarms if user is not logged in
    if (!user?.id) {
      return;
    }

    const checkSchedule = async () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${hours}:${minutes}`;

      // Avoid re-firing multiple times in the same minute
      if (lastFiredMinuteRef.current === currentTimeStr) {
        return;
      }

      try {
        const url = `${API_BASE}/reminders?user_id=${encodeURIComponent(user.id)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const schedule = await res.json();

        const allReminders: (Reminder & { timeOfDay: string })[] = [
          ...(schedule.morning || []).map((r: any) => ({ ...r, timeOfDay: 'morning' })),
          ...(schedule.afternoon || []).map((r: any) => ({ ...r, timeOfDay: 'afternoon' })),
          ...(schedule.night || []).map((r: any) => ({ ...r, timeOfDay: 'night' })),
        ];

        // Find reminder scheduled for right now that is still pending AND belongs to this user
        const matchingReminder = allReminders.find(
          r => r.time === currentTimeStr && r.status === 'pending'
        );

        if (matchingReminder) {
          lastFiredMinuteRef.current = currentTimeStr;
          triggerAlarm(matchingReminder);
        }
      } catch (err) {
        // Silently skip if network blip
      }
    };

    const interval = setInterval(checkSchedule, 10000);
    return () => clearInterval(interval);
  }, [user, triggerAlarm]);

  return (
    <AlarmContext.Provider value={{
      activeAlarm,
      isRinging,
      soundEnabled,
      selectedTone,
      setSoundEnabled,
      setSelectedTone,
      triggerAlarm,
      dismissAlarm,
      snoozeAlarm,
      markTakenAndDismiss,
      testAlarm,
      previewTone,
    }}>
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarm(): AlarmContextType {
  const context = useContext(AlarmContext);
  if (!context) {
    throw new Error('useAlarm must be used within an AlarmProvider');
  }
  return context;
}
