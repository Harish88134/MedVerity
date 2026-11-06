/**
 * MedVerity Web Audio Alarm & Chime Engine
 * Uses standard HTML5 Web Audio API to synthesize rich, pleasant medical alarms
 * and chime notifications without requiring any external mp3 files.
 */

let audioCtx: AudioContext | null = null;
let alarmIntervalId: ReturnType<typeof setInterval> | null = null;
let isCurrentlyRinging = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export type AlarmTone = 'chime' | 'bell' | 'marimba';

/**
 * Synthesizes a pleasant multi-tone chime pattern
 */
export function playChimePattern(tone: AlarmTone = 'chime') {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (tone === 'chime') {
    // Gentle 3-note medical chime: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.8 },
      { freq: 659.25, time: 0.15, dur: 0.8 },
      { freq: 783.99, time: 0.30, dur: 1.0 },
      { freq: 1046.50, time: 0.45, dur: 1.2 },
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      // Bell envelope (instant attack, exponential decay)
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.35, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } else if (tone === 'bell') {
    // Crisp two-tone bell alarm
    const notes = [
      { freq: 880, time: 0.0, dur: 0.6 },
      { freq: 1174.66, time: 0.2, dur: 0.8 },
    ];
    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.4, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  } else {
    // Warm marimba sequence
    const notes = [
      { freq: 440, time: 0.0, dur: 0.4 },
      { freq: 554.37, time: 0.12, dur: 0.4 },
      { freq: 659.25, time: 0.24, dur: 0.6 },
    ];
    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.35, now + time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  }
}

/**
 * Start repeating alarm sound until stopAlarm is called
 */
export function startAlarm(tone: AlarmTone = 'chime') {
  stopAlarm();
  isCurrentlyRinging = true;

  // Play immediately
  playChimePattern(tone);

  // Repeat every 2.0 seconds
  alarmIntervalId = setInterval(() => {
    if (isCurrentlyRinging) {
      playChimePattern(tone);
    }
  }, 2000);
}

/**
 * Stop alarm audio immediately
 */
export function stopAlarm() {
  isCurrentlyRinging = false;
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
}

/**
 * Preview sound once (1 second) for test buttons
 */
export function playSoundPreview(tone: AlarmTone = 'chime') {
  getAudioContext();
  playChimePattern(tone);
}

/**
 * Play a short victory sound when marking a medicine as taken
 */
export function playSuccessSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const notes = [
    { freq: 523.25, time: 0.00, dur: 0.3 },
    { freq: 659.25, time: 0.10, dur: 0.3 },
    { freq: 783.99, time: 0.20, dur: 0.6 },
  ];
  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + time);
    gain.gain.setValueAtTime(0, now + time);
    gain.gain.linearRampToValueAtTime(0.25, now + time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + time);
    osc.stop(now + time + dur);
  });
}

/**
 * Request OS-level notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

/**
 * Trigger browser desktop notification
 */
export function showBrowserNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'medverity-reminder',
      });
    } catch {}
  }
}
