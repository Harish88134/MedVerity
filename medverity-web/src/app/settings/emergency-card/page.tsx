"use client";

import { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { Download, Smartphone, CheckCircle2, HeartPulse } from "lucide-react";
import { useAuth } from "@/hooks/useAuth"; // assuming this exists
import { api } from "@/lib/api";

interface EmergencyData {
  patient_name: string;
  blood_group?: string;
  emergency_notes?: string;
  allergies: string[];
}

export default function EmergencyCardGenerator() {
  const { user } = useAuth();
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const result = await api<EmergencyData>(`/emergency/${user.id}`);
        setData(result);
      } catch (err) {
        console.error("Failed to load emergency data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleExport = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // High resolution
        backgroundColor: "#000000",
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "MedVerity_ICE_Wallpaper.png";
      link.href = dataUrl;
      link.click();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to export image", err);
    } finally {
      setSaving(false);
    }
  };

  const emergencyUrl = typeof window !== "undefined" ? `${window.location.origin}/emergency/${user?.id}` : "";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 flex items-center gap-3">
            <HeartPulse className="text-red-500" size={32} />
            Digital I.C.E. Card
          </h1>
          <p className="text-neutral-500 mt-1">Generate your In Case of Emergency lock-screen wallpaper.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-start">
        {/* Left Column: Actions & Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Why a lock-screen card?</h3>
            <p className="text-neutral-600 mb-4 leading-relaxed">
              In severe emergencies, you might not be able to unlock your phone. First responders are trained to look at a patient's lock screen for critical health flags. By setting this as your wallpaper, paramedics can instantly scan the QR code to view your vital information without needing a password.
            </p>
            <button
              onClick={handleExport}
              disabled={loading || saving || !data}
              className={`w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-white transition-all ${
                saveSuccess 
                  ? "bg-emerald-500 hover:bg-emerald-600" 
                  : "bg-teal-600 hover:bg-teal-700 active:scale-[0.98]"
              }`}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 size={20} />
                  Saved to Gallery
                </>
              ) : (
                <>
                  <Download size={20} />
                  Save as Phone Wallpaper
                </>
              )}
            </button>
            <p className="text-xs text-center text-neutral-400 mt-4 flex justify-center items-center gap-1">
              <Smartphone size={14} /> Designed for 9:16 smartphone screens
            </p>
          </div>
        </div>

        {/* Right Column: Canvas Preview (9:16 Aspect Ratio) */}
        <div className="flex justify-center bg-neutral-100 rounded-3xl p-4 md:p-8">
          <div 
            className="relative shadow-2xl overflow-hidden ring-4 ring-neutral-200 rounded-[2rem]"
            style={{ width: "270px", height: "480px" }} // Approximate 9:16
          >
            {/* THIS IS THE EXPORTED CANVAS ELEMENT */}
            <div 
              ref={cardRef} 
              className="absolute inset-0 bg-neutral-900 flex flex-col items-center p-6 pt-16 text-white"
            >
              {/* Simulated Clock space (leaves room at the top for iOS/Android clock) */}
              <div className="h-24 w-full flex-shrink-0 opacity-20 border-2 border-dashed border-white/50 rounded-xl flex items-center justify-center mb-6">
                <span className="text-xs uppercase font-bold tracking-widest">Phone Clock Area</span>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
              ) : data ? (
                <div className="bg-red-600 w-full rounded-2xl p-4 shadow-xl flex flex-col items-center">
                  <h2 className="text-2xl font-black uppercase mb-1 tracking-tight">I.C.E.</h2>
                  <p className="text-red-100 text-[10px] font-bold tracking-wider uppercase mb-4 text-center leading-tight">
                    In Case of Emergency<br/>Scan for Meds & Info
                  </p>
                  
                  <div className="bg-white p-2 rounded-xl mb-4">
                    <QRCodeSVG 
                      value={emergencyUrl}
                      size={120}
                      level="Q"
                      includeMargin={false}
                    />
                  </div>

                  <div className="w-full text-center space-y-1 mt-2">
                    <p className="text-xs text-red-200 font-bold uppercase tracking-wider">Patient</p>
                    <p className="font-bold text-lg leading-tight truncate">{data.patient_name}</p>
                    {data.blood_group && (
                      <p className="text-sm font-black mt-2 bg-black/20 py-1 rounded">Blood: {data.blood_group}</p>
                    )}
                  </div>
                </div>
              ) : null}
              
              <div className="mt-auto pb-4 w-full text-center">
                <p className="text-[10px] text-neutral-500 font-bold tracking-widest">MEDVERITY</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
