// ── Multilingual Neural Speech Audio Wrapper ──
// Streams studio-quality authentic native speaker audio for Telugu, Hindi, Tamil, English, etc.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

let activeAudio: HTMLAudioElement | null = null;

export function playNeuralAudio(
  text: string,
  lang: string = 'en',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  // Stop any currently playing audio or speech synthesis
  stopSpeaking();

  const cleanText = text.replace(/[*_#`~[\]()]/g, '').trim();
  if (!cleanText) return null;

  try {
    const audioUrl = `${API_BASE_URL}/explain/tts?text=${encodeURIComponent(cleanText)}&lang=${encodeURIComponent(lang)}`;
    const audio = new Audio(audioUrl);
    activeAudio = audio;

    audio.onplay = () => {
      if (onStart) onStart();
    };

    audio.onended = () => {
      activeAudio = null;
      if (onEnd) onEnd();
    };

    audio.onerror = () => {
      console.warn('[Speech] Neural TTS stream failed, falling back to Web Speech API...');
      activeAudio = null;
      // Fallback to browser Web Speech API
      speakWebSpeech(cleanText, lang, onStart, onEnd, onError);
    };

    audio.play().catch((err) => {
      console.warn('[Speech] Audio play error:', err);
      speakWebSpeech(cleanText, lang, onStart, onEnd, onError);
    });

    return audio;
  } catch (e) {
    speakWebSpeech(cleanText, lang, onStart, onEnd, onError);
    return null;
  }
}

export function speakWebSpeech(
  text: string,
  lang: string = 'en',
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onError) onError();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const langMap: Record<string, string> = {
    hi: 'hi-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    bn: 'bn-IN',
    mr: 'mr-IN',
    gu: 'gu-IN',
    kn: 'kn-IN',
    ml: 'ml-IN',
    pa: 'pa-IN',
    en: 'en-IN',
  };

  const speechTag = langMap[lang] || `${lang}-IN`;
  utterance.lang = speechTag;
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const matchingVoice = voices.find((v) => v.lang.startsWith(lang) || v.lang === speechTag);
  if (matchingVoice) {
    utterance.voice = matchingVoice;
  }

  utterance.onstart = () => {
    if (onStart) onStart();
  };
  utterance.onend = () => {
    if (onEnd) onEnd();
  };
  utterance.onerror = () => {
    if (onError) onError();
  };

  window.speechSynthesis.speak(utterance);
}

export function speak(
  text: string,
  lang: string = 'en',
  onStart?: () => void,
  onEnd?: () => void
): void {
  playNeuralAudio(text, lang, onStart, onEnd);
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;

  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {}
    activeAudio = null;
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined') return false;
  const audioPlaying = activeAudio ? !activeAudio.paused && !activeAudio.ended : false;
  const synthSpeaking = window.speechSynthesis ? window.speechSynthesis.speaking : false;
  return audioPlaying || synthSpeaking;
}
