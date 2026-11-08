'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Image as ImageIcon, Zap, ShieldCheck, ChevronDown, ChevronUp, Loader2, Mic, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import VoicePharmacistModal from '@/components/voice/VoicePharmacistModal';
import Link from 'next/link';

export default function ScanPage() {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'single' | 'prescription'>('single');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [hasCamera, setHasCamera] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // Initialize camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isMounted = true;
    
    async function setupCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (isMounted) setHasCamera(false);
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: 'environment' } } 
          });
        } catch {
          // Fallback if environment facing camera fails (e.g., webcam or device in use)
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        if (isMounted && videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setHasCamera(true);

          // Check if torch/flash is supported by device camera track
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const capabilities = (videoTrack.getCapabilities ? videoTrack.getCapabilities() : {}) as any;
            if (capabilities.torch) {
              setHasTorchSupport(true);
            }
          }
        }
      } catch (err) {
        console.warn("Camera access not available or device in use:", err);
        if (isMounted) {
          setHasCamera(false);
        }
      }
    }
    
    setupCamera();
    
    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      streamRef.current = null;
    };
  }, []);

  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextState = !flashOn;
      // Web standards Camera Torch API (supported on Android Chrome, Samsung Internet, and modern mobile WebKit)
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setFlashOn(nextState);
    } catch (err) {
      console.warn("Torch failed or not supported on this device/browser:", err);
    }
  }, [flashOn]);

  const processImage = useCallback(async (fileOrBlob: File | Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append(scanMode === 'single' ? 'file' : 'image', fileOrBlob, 'scan.jpg');
      if (user?.id) {
        formData.append('user_id', user.id);
      }
      
      // Pass allergies for prescription verification even if not signed in
      const localAllergies = localStorage.getItem('medverity_allergies');
      if (localAllergies) {
        try {
          const parsed = JSON.parse(localAllergies);
          if (Array.isArray(parsed) && parsed.length > 0) {
            formData.append('user_allergies', parsed.join(','));
          }
        } catch {}
      }
      
      const endpoint = scanMode === 'single' 
          ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/scan`
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/prescription/verify`;
          
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Scan failed');
      
      const data = await response.json();
      
      if (scanMode === 'single') {
          const params = new URLSearchParams({
              scan_id: data.scan_id,
              ocr_text: data.ocr_text,
              confidence: data.confidence.toString()
          });
          router.push(`/scan/result?${params.toString()}`);
      } else {
          // Pass the returned prescription id to the new result screen
          router.push(`/scan/prescription/result?prescription_id=${data.prescription_id}`);
          // Also, ideally, we'd cache this data or fetch it by ID on the next page
          if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(`rx_${data.prescription_id}`, JSON.stringify(data));
          }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process image. Please try again.');
      setIsProcessing(false);
    }
  }, [router, user, scanMode]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !hasCamera) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        processImage(blob);
      }
    }, 'image/jpeg', 0.8);
  }, [hasCamera, processImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: '640px' }}>
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
          <span style={{ color: 'var(--color-teal-600)' }}>Scan</span>{' '}
          <span style={{ color: 'var(--color-text-primary)' }}>Your {scanMode === 'single' ? 'Medicine' : 'Prescription'}</span>
        </h1>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.9375rem',
          marginTop: '0.375rem',
          lineHeight: 1.5,
        }}>
          {scanMode === 'single' ? 'Get instant, easy-to-understand information about your medicine in your language' : 'Check your entire prescription for safety warnings and interactions instantly'}
        </p>
      </div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', background: 'var(--color-surface-secondary)', borderRadius: 'var(--radius-lg)', padding: '0.25rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setScanMode('single')}
          style={{
            flex: 1,
            padding: '0.625rem',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            background: scanMode === 'single' ? 'var(--color-surface)' : 'transparent',
            boxShadow: scanMode === 'single' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            color: scanMode === 'single' ? 'var(--color-teal-700)' : 'var(--color-text-secondary)',
            fontWeight: scanMode === 'single' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Single Medicine
        </button>
        <button
          onClick={() => setScanMode('prescription')}
          style={{
            flex: 1,
            padding: '0.625rem',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            background: scanMode === 'prescription' ? 'var(--color-surface)' : 'transparent',
            boxShadow: scanMode === 'prescription' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            color: scanMode === 'prescription' ? 'var(--color-teal-700)' : 'var(--color-text-secondary)',
            fontWeight: scanMode === 'prescription' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Full Prescription
        </button>
      </div>


      {/* How it works accordion */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
        <button
          onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          id="how-it-works-toggle"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--color-teal-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{ fontSize: '1.125rem' }}>💡</span>
            </div>
            <span style={{ fontWeight: 600, color: 'var(--color-teal-700)', fontSize: '0.9375rem' }}>
              How it works
            </span>
          </div>
          {howItWorksOpen ? <ChevronUp size={20} color="var(--color-teal-600)" /> : <ChevronDown size={20} color="var(--color-teal-600)" />}
        </button>
        {howItWorksOpen && (
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            marginTop: '0.75rem',
            lineHeight: 1.6,
            paddingLeft: '3rem',
          }}>
            Scan the medicine label using your camera and we&apos;ll show you simple information in your language.
          </p>
        )}
      </div>

      {/* Camera viewfinder area */}
      <div style={{
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        position: 'relative',
        aspectRatio: '4/3',
        background: 'linear-gradient(135deg, #2D3748, #1A202C)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted
          style={{
             width: '100%', 
             height: '100%', 
             objectFit: 'cover',
             display: hasCamera ? 'block' : 'none'
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {isProcessing && (
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                zIndex: 10
            }}>
                <Loader2 size={40} className="animate-spin" style={{ marginBottom: '1rem' }} />
                <p>Analyzing medicine...</p>
            </div>
        )}

        {!hasCamera && !isProcessing && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.85)', position: 'absolute', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ImageIcon size={26} />
              </div>
              <div>
                <p style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>Camera Not Available or In Use</p>
                <p style={{ fontSize: '0.8125rem', opacity: 0.8, margin: '0.2rem 0 0.75rem 0' }}>Select a photo from your files or gallery</p>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary"
                style={{ padding: '0.5rem 1.25rem', fontSize: '0.8125rem', borderRadius: 'var(--radius-full)', width: 'auto' }}
              >
                Choose Photo from Gallery
              </button>
            </div>
        )}

        {/* Corner brackets */}
        {[
          { top: '16px', left: '16px', borderTop: '3px solid white', borderLeft: '3px solid white' },
          { top: '16px', right: '16px', borderTop: '3px solid white', borderRight: '3px solid white' },
          { bottom: '48px', left: '16px', borderBottom: '3px solid white', borderLeft: '3px solid white' },
          { bottom: '48px', right: '16px', borderBottom: '3px solid white', borderRight: '3px solid white' },
        ].map((style, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: '40px',
            height: '40px',
            borderRadius: '4px',
            ...style,
            zIndex: 5
          }} />
        ))}

        {/* Bottom label */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0.75rem',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          textAlign: 'center',
          color: 'white',
          fontSize: '0.8125rem',
          zIndex: 5
        }}>
          Place the medicine label within the frame
        </div>
      </div>

      {/* Camera controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
        marginBottom: '1.5rem',
      }}>
        {/* Gallery */}
        <button
          onClick={() => fileInputRef.current?.click()}
          id="gallery-btn"
          disabled={isProcessing}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.375rem',
            background: 'none',
            border: 'none',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-sans)',
            opacity: isProcessing ? 0.5 : 1
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <ImageIcon size={22} />
          </div>
          <span style={{ fontSize: '0.75rem' }}>Gallery</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />

        {/* Capture */}
        <button
          id="capture-btn"
          onClick={handleCapture}
          disabled={!hasCamera || isProcessing}
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'var(--color-teal-600)',
            border: '4px solid var(--color-teal-200)',
            cursor: (!hasCamera || isProcessing) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(13, 148, 136, 0.3)',
            transition: 'all 0.2s ease',
            opacity: (!hasCamera || isProcessing) ? 0.5 : 1
          }}
        >
          <Camera size={28} color="white" />
        </button>

        {/* Flash */}
        <button
          id="flash-btn"
          type="button"
          onClick={toggleFlash}
          disabled={!hasCamera}
          title={flashOn ? "Turn flash off" : "Turn flash on"}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.375rem',
            background: 'none',
            border: 'none',
            cursor: hasCamera ? 'pointer' : 'not-allowed',
            color: flashOn ? 'var(--color-teal-700)' : 'var(--color-text-secondary)',
            fontFamily: 'var(--font-sans)',
            opacity: hasCamera ? 1 : 0.4,
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: flashOn ? 'var(--color-teal-600)' : 'var(--color-teal-50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: flashOn ? '0 0 12px rgba(13, 148, 136, 0.6)' : 'none',
          }}>
            <Zap size={22} color={flashOn ? 'white' : 'var(--color-teal-600)'} fill={flashOn ? 'white' : 'none'} />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: flashOn ? 600 : 400 }}>
            {flashOn ? 'Torch On' : 'Flash'}
          </span>
        </button>
      </div>

      {/* Ask Voice Pharmacist Quick Banner */}
      <div
        onClick={() => setIsVoiceModalOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
          padding: '1rem 1.125rem',
          background: 'linear-gradient(135deg, var(--color-teal-50), #E6FFFA)',
          borderRadius: 'var(--radius-xl)',
          border: '1.5px solid var(--color-teal-300)',
          marginBottom: '1.25rem',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(13, 148, 136, 0.12)',
          transition: 'all 0.2s ease',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--color-teal-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
            boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)',
          }}
        >
          <Mic size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: 'var(--color-teal-800)', fontSize: '0.9375rem', margin: '0 0 0.125rem 0' }}>
            Have a Medicine Question?
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', margin: 0 }}>
            Tap to ask our AI Voice Pharmacist in your language
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsVoiceModalOpen(true);
          }}
          className="btn-primary"
          style={{
            padding: '0.45rem 0.8rem',
            fontSize: '0.75rem',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          <Sparkles size={13} />
          Ask Voice
        </button>
      </div>

      {/* Phase 5: Rx vs Pill Cross-Check banner */}
      <Link
        href="/scan/reconcile"
        id="reconcile-banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.875rem',
          padding: '1rem 1.125rem',
          background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
          borderRadius: 'var(--radius-xl)',
          border: '1.5px solid #FDE68A',
          marginBottom: '1.25rem',
          textDecoration: 'none',
          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.12)',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #D97706, #F59E0B)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', flexShrink: 0,
          boxShadow: '0 4px 10px rgba(217, 119, 6, 0.3)',
          fontSize: '1.25rem',
        }}>⚖️</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: '#92400E', fontSize: '0.9375rem', margin: '0 0 0.125rem 0' }}>
            Verify Pharmacy Dispensed Correctly
          </p>
          <p style={{ fontSize: '0.8125rem', color: '#B45309', margin: 0 }}>
            Cross-check your prescription vs the actual pill strip
          </p>
        </div>
        <span style={{ fontSize: '1.25rem' }}>›</span>
      </Link>

      {/* Privacy badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1rem',
        background: 'var(--color-teal-50)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--color-teal-200)',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'var(--color-teal-600)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ShieldCheck size={20} color="white" />
        </div>
        <div>
          <p style={{ fontWeight: 600, color: 'var(--color-teal-700)', fontSize: '0.875rem' }}>
            100% Private & Secure
          </p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
            Your data is safe with us. We never share your information.
          </p>
        </div>
      </div>

      {/* Multilingual Voice Pharmacist Modal */}
      <VoicePharmacistModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        medicineName="Your Medicine"
      />
    </div>
  );
}
