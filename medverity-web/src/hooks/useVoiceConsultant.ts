'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { getStoredLanguage, setStoredLanguage } from '@/lib/supabase';
import { playNeuralAudio, stopSpeaking as haltSpeaking, isSpeaking as checkIsSpeaking } from '@/lib/speech';

export interface VoiceMessage {
  id: string;
  sender: 'user' | 'pharmacist';
  text: string;
  spokenText?: string;
  keyPoints?: string[];
  safetyCaution?: string;
  followUpSuggestions?: string[];
  timestamp: Date;
}

export interface VoiceConsultantState {
  isListening: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  transcript: string;
  interimTranscript: string;
  messages: VoiceMessage[];
  error: string | null;
  language: string;
  isSpeechSupported: boolean;
}

const LANGUAGE_SPEECH_TAGS: Record<string, string> = {
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

export function useVoiceConsultant(initialMedicineName?: string) {
  const [medicineName, setMedicineName] = useState<string>(initialMedicineName || 'Your Medicine');
  const [language, setLanguageState] = useState<string>('en');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const interimTranscriptRef = useRef<string>('');

  // Sync initial stored language
  useEffect(() => {
    try {
      const stored = getStoredLanguage();
      if (stored) {
        setLanguageState(stored);
      }
    } catch {}
  }, []);

  // Sync medicine name if prop changes
  useEffect(() => {
    if (initialMedicineName) {
      setMedicineName(initialMedicineName);
    }
  }, [initialMedicineName]);

  // Audio animation visualizer simulator
  useEffect(() => {
    if (isListening || isSpeaking) {
      const interval = setInterval(() => {
        const base = isSpeaking ? 0.7 : 0.5;
        const variance = Math.sin(Date.now() / 110) * 0.35 + (Math.random() * 0.2);
        setAudioLevel(Math.min(1, Math.max(0.15, base + variance)));
      }, 70);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isListening, isSpeaking]);

  // Sync speech state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(checkIsSpeaking());
    }, 250);

    return () => {
      clearInterval(interval);
      haltSpeaking();
    };
  }, []);

  // Neural Native Text-To-Speech Playback
  const speakText = useCallback((textToSpeak: string, langCode: string = language) => {
    if (!textToSpeak) return;

    playNeuralAudio(
      textToSpeak,
      langCode,
      () => setIsSpeaking(true),
      () => setIsSpeaking(false),
      () => setIsSpeaking(false)
    );
  }, [language]);

  const stopSpeaking = useCallback(() => {
    haltSpeaking();
    setIsSpeaking(false);
  }, []);

  // Core Ask Pharmacist API submission
  const askQuestion = useCallback(async (questionText: string, customMedicineName?: string) => {
    const q = questionText.trim();
    if (!q) return;

    const targetMed = customMedicineName || medicineName || 'Your Medicine';
    setError(null);
    setIsProcessing(true);
    setInterimTranscript('');
    setTranscript('');
    accumulatedTranscriptRef.current = '';
    interimTranscriptRef.current = '';

    // Add user message to conversation list
    const userMsg: VoiceMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await apiClient.post<any>('/explain/voice-qa', {
        medicine_name: targetMed,
        question: q,
        language: language,
      });

      const pharmacistMsg: VoiceMessage = {
        id: `pharmacist-${Date.now()}`,
        sender: 'pharmacist',
        text: response.answer,
        spokenText: response.spoken_text || response.answer,
        keyPoints: response.key_points || [],
        safetyCaution: response.safety_caution || undefined,
        followUpSuggestions: response.follow_up_suggestions || [],
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, pharmacistMsg]);

      // Automatically stream natural native neural voice
      if (pharmacistMsg.spokenText) {
        speakText(pharmacistMsg.spokenText, language);
      }
    } catch (err: any) {
      console.error('[VoiceConsultant] API error:', err);
      let fallbackAnswer = `For ${targetMed}, always take with a full glass of water as prescribed by your doctor. If you experience severe discomfort, consult your doctor.`;
      let fallbackSpoken = `For ${targetMed}, please consult your doctor or pharmacist.`;
      
      if (language === 'te') {
        fallbackAnswer = `${targetMed} ను డాక్టర్ సూచించిన విధంగా సమయానికి నీటితో తీసుకోండి. ఏదైనా సందేహం ఉంటే మీ డాక్టర్‌ను సంప్రదించండి.`;
        fallbackSpoken = `${targetMed} ను డాక్టర్ సూచించిన విధంగా సమయానికి నీటితో తీసుకోండి.`;
      } else if (language === 'hi') {
        fallbackAnswer = `${targetMed} को हमेशा डॉक्टर के बताए अनुसार पानी के साथ लें। किसी भी असुविधा की स्थिति में तुरंत डॉक्टर से संपर्क करें।`;
        fallbackSpoken = `${targetMed} को डॉक्टर के बताए अनुसार पानी के साथ लें।`;
      }

      const fallbackMsg: VoiceMessage = {
        id: `pharmacist-err-${Date.now()}`,
        sender: 'pharmacist',
        text: fallbackAnswer,
        spokenText: fallbackSpoken,
        keyPoints: ['Follow prescribed schedule', 'Take with plenty of water', 'Consult doctor for dosage changes'],
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, fallbackMsg]);
      speakText(fallbackMsg.spokenText || fallbackMsg.text, language);
    } finally {
      setIsProcessing(false);
    }
  }, [medicineName, language, speakText]);

  // Stop listening helper
  const stopListening = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);

    // If accumulated transcript exists, submit it
    const candidate = (accumulatedTranscriptRef.current + ' ' + interimTranscriptRef.current).trim();
    if (candidate && !isProcessing) {
      askQuestion(candidate);
      accumulatedTranscriptRef.current = '';
      interimTranscriptRef.current = '';
    }
  }, [askQuestion, isProcessing]);

  // Initialize Speech Recognition with continuous stream & smart silence debounce
  const initSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = LANGUAGE_SPEECH_TAGS[language] || `${language}-IN`;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      accumulatedTranscriptRef.current = '';
      interimTranscriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let finalString = '';
      let interimString = '';

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalString += item[0].transcript + ' ';
        } else {
          interimString += item[0].transcript;
        }
      }

      accumulatedTranscriptRef.current = finalString;
      interimTranscriptRef.current = interimString;

      const combinedLive = (finalString + ' ' + interimString).trim();
      setTranscript(finalString.trim());
      setInterimTranscript(combinedLive);

      // Reset silence timeout on speech activity
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // Auto-submit after 1.8s of silence
      if (combinedLive.length >= 3) {
        silenceTimeoutRef.current = setTimeout(() => {
          stopListening();
        }, 1800);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[VoiceConsultant] Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        setError('Microphone permission was denied. Please allow microphone access or type your question below.');
      } else if (event.error === 'no-speech') {
        // Continue listening
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  }, [language, stopListening]);

  const startListening = useCallback(() => {
    stopSpeaking();
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    accumulatedTranscriptRef.current = '';
    interimTranscriptRef.current = '';

    try {
      const recognition = initSpeechRecognition();
      if (!recognition) {
        setError('Speech recognition is not supported in this browser. You can type your question below.');
        return;
      }
      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('[VoiceConsultant] Failed to start speech recognition:', err);
      setIsListening(false);
    }
  }, [initSpeechRecognition, stopSpeaking]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const clearConversation = useCallback(() => {
    stopSpeaking();
    stopListening();
    setMessages([]);
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, [stopSpeaking, stopListening]);

  const setLanguage = useCallback((langCode: string) => {
    setLanguageState(langCode);
    try {
      setStoredLanguage(langCode);
    } catch {}
    stopSpeaking();
    stopListening();
  }, [stopSpeaking, stopListening]);

  return {
    medicineName,
    setMedicineName,
    language,
    setLanguage,
    isListening,
    isProcessing,
    isSpeaking,
    audioLevel,
    transcript,
    interimTranscript,
    messages,
    error,
    isSpeechSupported,
    startListening,
    stopListening,
    toggleListening,
    askQuestion,
    speakText,
    stopSpeaking,
    clearConversation,
  };
}
