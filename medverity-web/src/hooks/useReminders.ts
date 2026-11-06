'use client';

import { useState, useEffect } from 'react';

export interface Reminder {
  id: string;
  medicine_name: string;
  time: string;
  instructions: string;
  status: 'taken' | 'missed' | 'pending';
  timeOfDay?: string;
  channel?: string;
  phone?: string;
}

export interface Schedule {
  morning: Reminder[];
  afternoon: Reminder[];
  night: Reminder[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function useReminders(userId?: string) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    try {
      const url = userId
        ? `${API_BASE}/reminders?user_id=${encodeURIComponent(userId)}`
        : `${API_BASE}/reminders`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setSchedule(json);
      }
    } catch (e) {
      console.error('[useReminders] fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const addReminder = async (
    timeOfDay: string,
    data: {
      medicine_name: string;
      time: string;
      instructions: string;
      channel?: string;
      phone?: string;
      scan_id?: string;
    }
  ) => {
    try {
      const res = await fetch(`${API_BASE}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, timeOfDay, user_id: userId }),
      });
      const result = await res.json();
      await fetchReminders();
      return result;
    } catch (e) {
      console.error('[useReminders] add error:', e);
      return null;
    }
  };

  const updateReminderStatus = async (
    timeOfDay: string,
    reminderId: string,
    status: 'taken' | 'missed' | 'pending'
  ) => {
    // Optimistic update
    if (schedule) {
      const newSchedule = { ...schedule };
      const list = newSchedule[timeOfDay as keyof Schedule];
      const reminder = list?.find(r => r.id === reminderId);
      if (reminder) {
        reminder.status = status;
        setSchedule({ ...newSchedule });
      }
    }

    try {
      await fetch(`${API_BASE}/reminders/${timeOfDay}/${reminderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.error('[useReminders] status update error:', e);
      await fetchReminders(); // revert if failed
    }
  };

  const deleteReminder = async (reminderId: string) => {
    try {
      await fetch(`${API_BASE}/reminders/${reminderId}`, { method: 'DELETE' });
      await fetchReminders();
    } catch (e) {
      console.error('[useReminders] delete error:', e);
    }
  };

  return {
    schedule,
    loading,
    addReminder,
    updateReminderStatus,
    deleteReminder,
  };
}
