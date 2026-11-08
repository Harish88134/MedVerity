'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Send,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Play,
  Square,
  Globe,
  Loader2,
} from 'lucide-react';
import { useVoiceConsultant } from '@/hooks/useVoiceConsultant';
import { SUPPORTED_LANGUAGES } from '@/types';

interface VoicePharmacistModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicineName?: string;
  category?: string;
}

const LOCALIZED_QUICK_PROMPTS: Record<string, Array<{ icon: string; text: string }>> = {
  te: [
    { icon: '🥛', text: 'దీనిని పాలతో లేదా టీతో తీసుకోవచ్చా?' },
    { icon: '🍽️', text: 'ఆహారానికి ముందు లేదా తర్వాత తీసుకోవాలా?' },
    { icon: '⏰', text: 'షెడ్యూల్ చేసిన డోస్ మరిచిపోతే ఏమి చేయాలి?' },
    { icon: '🌙', text: 'ఈ మందు వల్ల నిద్రమత్తు వస్తుందా?' },
    { icon: '🍷', text: 'ఆల్కహాల్‌తో తీసుకోవడం సురక్షితమేనా?' },
    { icon: '⚠️', text: 'ముఖ్యమైన సైడ్ ఎఫెక్ట్స్ ఏమిటి?' },
  ],
  hi: [
    { icon: '🥛', text: 'क्या इसे दूध या चाय के साथ ले सकते हैं?' },
    { icon: '🍽️', text: 'खाने से पहले लेना चाहिए या बाद में?' },
    { icon: '⏰', text: 'अगर कोई खुराक छूट जाए तो क्या करें?' },
    { icon: '🌙', text: 'क्या इस दवा से नींद या सुस्ती आती है?' },
    { icon: '🍷', text: 'क्या शराब के साथ लेना सुरक्षित है?' },
    { icon: '⚠️', text: 'इसके मुख्य साइड इफेक्ट्स क्या हैं?' },
  ],
  ta: [
    { icon: '🥛', text: 'இதை பால் அல்லது டீயுடன் உட்கொள்ளலாமா?' },
    { icon: '🍽️', text: 'உணவுக்கு முன் அல்லது பின் உட்கொள்ள வேண்டுமா?' },
    { icon: '⏰', text: 'டோஸ் தவறினால் என்ன செய்ய வேண்டும்?' },
    { icon: '🌙', text: 'இந்த மருந்து தூக்கத்தை ஏற்படுத்துமா?' },
    { icon: '🍷', text: 'மது அருந்தும்போது பாதுகாப்பானதா?' },
    { icon: '⚠️', text: 'முக்கிய பக்கவிளைவுகள் என்ன?' },
  ],
  en: [
    { icon: '🥛', text: 'Can I take this with milk or tea?' },
    { icon: '🍽️', text: 'Should I take before or after food?' },
    { icon: '⏰', text: 'What if I miss a scheduled dose?' },
    { icon: '🌙', text: 'Will this medicine make me sleepy?' },
    { icon: '🍷', text: 'Is it safe with alcohol?' },
    { icon: '⚠️', text: 'What are the main side effects?' },
  ],
};

export default function VoicePharmacistModal({
  isOpen,
  onClose,
  medicineName = 'Your Medicine',
  category,
}: VoicePharmacistModalProps) {
  const {
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
    setMedicineName,
  } = useVoiceConsultant(medicineName);

  const [inputQuery, setInputQuery] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync medicine name whenever prop updates
  useEffect(() => {
    if (medicineName) {
      setMedicineName(medicineName);
    }
  }, [medicineName, setMedicineName]);

  // Auto scroll chat to bottom when messages update
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing, interimTranscript]);

  if (!isOpen) return null;

  const handleSendQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isProcessing) return;
    askQuestion(inputQuery.trim());
    setInputQuery('');
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div
      className="chatbot-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'var(--animate-fade-in)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          stopSpeaking();
          stopListening();
          onClose();
        }
      }}
    >
      <div
        className="chatbot-dialog"
        style={{
          background: 'var(--color-surface)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(13, 148, 136, 0.35)',
          border: '1.5px solid var(--color-teal-500)',
          animation: 'var(--animate-slide-up)',
          position: 'relative',
        }}
      >
        {/* ── Top Header ── */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, var(--color-teal-700), var(--color-teal-900))',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '1.35rem' }}>🎙️</span>
              {isSpeaking && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#10B981',
                    border: '2px solid white',
                  }}
                />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                  Ask My Medicine
                </h2>
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    padding: '0.125rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  AI Pharmacist
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', opacity: 0.9, margin: '0.125rem 0 0 0' }}>
                {medicineName} {category ? `• ${category}` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Language Selector Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 'var(--radius-full)',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} style={{ color: '#0F172A', background: '#FFFFFF' }}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Clear History */}
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                title="Clear Conversation"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={15} />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => {
                stopSpeaking();
                stopListening();
                onClose();
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                cursor: 'pointer',
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Active Speaking/Listening Pulse Visualizer Bar ── */}
        {(isListening || isSpeaking || isProcessing) && (
          <div
            style={{
              background: isListening
                ? 'linear-gradient(90deg, #0D9488, #06B6D4)'
                : isSpeaking
                ? 'linear-gradient(90deg, #10B981, #0D9488)'
                : 'linear-gradient(90deg, #F59E0B, #D97706)',
              color: 'white',
              padding: '0.5rem 1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8125rem',
              fontWeight: 600,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {isListening && <Mic size={16} className="animate-pulse" />}
              {isSpeaking && <Volume2 size={16} className="animate-pulse" />}
              {isProcessing && <Loader2 size={16} className="animate-spin" />}
              <span>
                {isListening
                  ? `Listening in ${currentLangObj.name}... Speak now`
                  : isSpeaking
                  ? 'Voice Pharmacist speaking...'
                  : 'Consulting clinical knowledge base...'}
              </span>
            </div>

            {/* Simulated Animated Wave Bars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '18px' }}>
              {[0.4, 0.8, 0.5, 0.9, 0.7, 0.3, 0.85, 0.6, 1.0, 0.45].map((scale, i) => (
                <div
                  key={i}
                  style={{
                    width: '3px',
                    background: 'white',
                    borderRadius: '2px',
                    height: `${Math.max(4, Math.round(18 * (audioLevel || scale) * ((i % 3 + 1) / 3)))}px`,
                    transition: 'height 0.1s ease',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Messages & Visual Consultation Area ── */}
        <div
          className="chatbot-messages"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            background: 'var(--color-surface-secondary)',
          }}
        >
          {/* Welcome Intro Orb if empty */}
          {messages.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '1.5rem 0.5rem',
                margin: 'auto 0',
              }}
            >
              {/* Interactive Pulsing Audio Orb */}
              <div
                onClick={toggleListening}
                style={{
                  position: 'relative',
                  width: '100px',
                  height: '100px',
                  marginBottom: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: '-12px',
                    borderRadius: '50%',
                    background: 'rgba(13, 148, 136, 0.25)',
                    animation: isListening ? 'ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none',
                    transform: `scale(${1 + audioLevel * 0.3})`,
                    transition: 'transform 0.15s ease',
                  }}
                />
                <div
                  style={{
                    position: 'relative',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: isListening
                      ? 'linear-gradient(135deg, #0D9488, #06B6D4)'
                      : 'linear-gradient(135deg, var(--color-teal-600), var(--color-teal-800))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px rgba(13, 148, 136, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Mic size={42} color="white" strokeWidth={2.2} />
                </div>
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '0.375rem' }}>
                Tap & Ask in Your Language
              </h3>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--color-text-secondary)',
                  maxWidth: '380px',
                  lineHeight: 1.5,
                  marginBottom: '1.25rem',
                }}
              >
                Ask anything about <strong>{medicineName}</strong> in <em>{currentLangObj.nativeName}</em> or English.
              </p>

              {/* Quick Suggestion Pills */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', maxWidth: '420px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'left', margin: 0, textTransform: 'uppercase' }}>
                  Frequently Asked Questions
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
                  {(LOCALIZED_QUICK_PROMPTS[language] || LOCALIZED_QUICK_PROMPTS['en']).map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => askQuestion(prompt.text)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        padding: '0.625rem 0.875rem',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        textAlign: 'left',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        color: 'var(--color-text-primary)',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-teal-500)';
                        e.currentTarget.style.background = 'var(--color-teal-50)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.background = 'var(--color-surface)';
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{prompt.icon}</span>
                      <span>{prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Conversation History Stream */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                {/* Sender badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    marginBottom: '0.25rem',
                    padding: isUser ? '0 0.5rem 0 0' : '0 0 0 0.5rem',
                  }}
                >
                  {isUser ? (
                    <span>You</span>
                  ) : (
                    <>
                      <span style={{ color: 'var(--color-teal-600)' }}>👩‍⚕️ MedVerity Pharmacist</span>
                      <span>• {currentLangObj.nativeName}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  style={{
                    maxWidth: '88%',
                    padding: '0.875rem 1.125rem',
                    borderRadius: isUser
                      ? 'var(--radius-xl) var(--radius-xl) 4px var(--radius-xl)'
                      : 'var(--radius-xl) var(--radius-xl) var(--radius-xl) 4px',
                    background: isUser ? 'var(--color-teal-600)' : 'var(--color-surface)',
                    color: isUser ? 'white' : 'var(--color-text-primary)',
                    border: isUser ? 'none' : '1px solid var(--color-border-light)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    lineHeight: 1.55,
                    fontSize: '0.9375rem',
                  }}
                >
                  <p style={{ margin: 0 }}>{msg.text}</p>

                  {/* Key points takeaways if available */}
                  {!isUser && msg.keyPoints && msg.keyPoints.length > 0 && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.625rem 0.75rem',
                        background: 'var(--color-teal-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-teal-200)',
                      }}
                    >
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-teal-800)', margin: '0 0 0.375rem 0' }}>
                        Key Points:
                      </p>
                      <ul style={{ margin: 0, paddingLeft: '1.125rem', fontSize: '0.8125rem', color: 'var(--color-teal-900)' }}>
                        {msg.keyPoints.map((point, pIdx) => (
                          <li key={pIdx} style={{ marginBottom: '0.25rem' }}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Clinical Safety Caution box if present */}
                  {!isUser && msg.safetyCaution && (
                    <div
                      style={{
                        marginTop: '0.625rem',
                        padding: '0.5rem 0.75rem',
                        background: 'var(--color-danger-50)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-danger-200)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                      }}
                    >
                      <AlertTriangle size={15} color="var(--color-danger-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-danger-700)', fontWeight: 500 }}>
                        {msg.safetyCaution}
                      </p>
                    </div>
                  )}

                  {/* Audio Controls for Pharmacist reply */}
                  {!isUser && msg.spokenText && (
                    <div style={{ marginTop: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => speakText(msg.spokenText!, language)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.3rem 0.6rem',
                          background: 'var(--color-teal-50)',
                          border: '1px solid var(--color-teal-300)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'var(--color-teal-700)',
                          cursor: 'pointer',
                        }}
                      >
                        <Volume2 size={13} />
                        Listen Again
                      </button>

                      {isSpeaking && (
                        <button
                          onClick={stopSpeaking}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.3rem 0.6rem',
                            background: 'var(--color-surface-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                            cursor: 'pointer',
                          }}
                        >
                          <Square size={11} fill="currentColor" />
                          Stop
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Follow up suggestions */}
                {!isUser && msg.followUpSuggestions && msg.followUpSuggestions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.5rem', maxWidth: '90%' }}>
                    {msg.followUpSuggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => askQuestion(sug)}
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-teal-200)',
                          color: 'var(--color-teal-700)',
                          borderRadius: 'var(--radius-full)',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Sparkles size={11} color="var(--color-teal-600)" />
                        {sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Live Interim Speech Bubble while user is speaking */}
          {interimTranscript && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div
                style={{
                  maxWidth: '85%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-xl)',
                  background: 'rgba(13, 148, 136, 0.15)',
                  border: '1.5px dashed var(--color-teal-500)',
                  color: 'var(--color-teal-900)',
                  fontSize: '0.875rem',
                  fontStyle: 'italic',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
                  <Mic size={13} className="animate-pulse" color="var(--color-teal-600)" />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-teal-700)' }}>
                    Listening...
                  </span>
                </div>
                &ldquo;{interimTranscript}&rdquo;
              </div>
            </div>
          )}

          {/* Processing Thinking Indicator */}
          {isProcessing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--color-teal-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Loader2 size={16} className="animate-spin" color="var(--color-teal-600)" />
              </div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                Pharmacist is thinking in {currentLangObj.nativeName}...
              </span>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                background: 'var(--color-danger-50)',
                border: '1px solid var(--color-danger-200)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--color-danger-700)',
                fontSize: '0.8125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangle size={16} color="var(--color-danger-600)" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* ── Bottom Input & Push-to-Talk Dock ── */}
        <div
          className="chatbot-input-dock"
          style={{
            padding: '0.875rem 1.25rem',
            background: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border-light)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <form onSubmit={handleSendQuery} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {/* Big 1-Tap Mic Button */}
            <button
              type="button"
              onClick={toggleListening}
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: isListening ? '#EF4444' : 'var(--color-teal-600)',
                border: isListening ? '3px solid #FCA5A5' : '3px solid var(--color-teal-200)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: isListening
                  ? '0 0 15px rgba(239, 68, 68, 0.6)'
                  : '0 4px 12px rgba(13, 148, 136, 0.35)',
                transition: 'all 0.2s ease',
              }}
              title={isListening ? 'Stop listening' : 'Start speaking'}
            >
              {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {/* Text Input Field */}
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder={isListening ? 'Listening to your voice...' : `Ask a question in ${currentLangObj.name}...`}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isListening}
                style={{
                  paddingRight: '2.5rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputQuery.trim() || isProcessing}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-lg)',
                background: inputQuery.trim() ? 'var(--color-teal-600)' : 'var(--color-surface-secondary)',
                color: inputQuery.trim() ? 'white' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputQuery.trim() ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <Send size={18} />
            </button>
          </form>

          {/* Guidance note for low-literacy users */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            <span>💡 Tap the teal microphone to ask verbally in {currentLangObj.name}</span>
            <span>Grade 6 Safe Language</span>
          </div>
        </div>
      </div>
    </div>
  );
}
