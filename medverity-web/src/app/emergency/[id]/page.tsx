"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, HeartPulse, ShieldAlert, Phone, FileText } from "lucide-react";
import { api } from "@/lib/api";

interface EmergencyMed {
  name: string;
  dosage?: string;
  frequency?: string;
}

interface EmergencyData {
  patient_name: string;
  blood_group?: string;
  emergency_notes?: string;
  allergies: string[];
  critical_meds: EmergencyMed[];
  caregiver_phone?: string;
}

export default function EmergencyPortal() {
  const { id } = useParams();
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchEmergencyData = async () => {
      try {
        const result = await api<EmergencyData>(`/emergency/${id}`);
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load emergency data");
      } finally {
        setLoading(false);
      }
    };
    fetchEmergencyData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-red-600 text-white flex items-center justify-center font-sans">
        <div className="animate-pulse flex flex-col items-center">
          <HeartPulse size={64} className="mb-4" />
          <p className="text-xl font-bold">Loading Emergency Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center p-6">
        <div className="bg-neutral-800 p-8 rounded-xl max-w-md w-full text-center border border-red-500/30">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Error</h1>
          <p className="text-neutral-400">{error || "Profile not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-600 text-white p-4 md:p-8 font-sans selection:bg-white selection:text-red-600">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between border-b-2 border-white/20 pb-6 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight">I.C.E. Profile</h1>
            <p className="text-red-200 font-medium mt-1">In Case of Emergency</p>
          </div>
          <HeartPulse size={48} className="text-white drop-shadow-md" />
        </header>

        {/* Patient Name & Blood Group */}
        <div className="bg-white text-neutral-900 rounded-2xl p-6 mb-6 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-sm uppercase tracking-wider text-neutral-500 font-bold mb-1">Patient Name</p>
            <h2 className="text-3xl font-black">{data.patient_name}</h2>
          </div>
          {data.blood_group && (
            <div className="bg-red-50 text-red-700 px-6 py-3 rounded-xl border border-red-100 flex items-center gap-3">
              <span className="text-sm font-bold uppercase">Blood</span>
              <span className="text-3xl font-black">{data.blood_group}</span>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Allergies */}
          <div className="bg-red-700/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="text-white" size={24} />
              <h3 className="text-xl font-bold">Severe Allergies</h3>
            </div>
            {data.allergies.length > 0 ? (
              <ul className="space-y-2">
                {data.allergies.map((allergy, i) => (
                  <li key={i} className="bg-red-800/80 px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    {allergy}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-red-200 italic">No known severe allergies</p>
            )}
          </div>

          {/* Contact */}
          <div className="bg-red-700/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Phone className="text-white" size={24} />
              <h3 className="text-xl font-bold">Emergency Contact</h3>
            </div>
            {data.caregiver_phone ? (
              <a href={`tel:${data.caregiver_phone}`} className="block bg-white text-red-700 px-4 py-4 rounded-xl font-black text-xl text-center shadow-lg hover:bg-neutral-100 transition-colors">
                {data.caregiver_phone}
              </a>
            ) : (
              <p className="text-red-200 italic">No primary caregiver listed</p>
            )}
          </div>
        </div>

        {/* Critical Meds */}
        <div className="bg-neutral-900 rounded-2xl p-6 mb-6 shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="text-white" size={24} />
            <h3 className="text-xl font-bold">Active Prescriptions</h3>
          </div>
          {data.critical_meds.length > 0 ? (
            <div className="space-y-3">
              {data.critical_meds.map((med, i) => (
                <div key={i} className="bg-neutral-800 p-4 rounded-xl flex justify-between items-center border border-neutral-700">
                  <span className="font-bold text-lg">{med.name}</span>
                  <span className="text-sm text-neutral-400 font-medium px-3 py-1 bg-neutral-900 rounded-full border border-neutral-700">Daily</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-400 italic">No active daily medications found.</p>
          )}
        </div>

        {/* Resuscitation / Notes */}
        {data.emergency_notes && (
          <div className="bg-amber-400 text-neutral-900 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-black uppercase mb-2 flex items-center gap-2">
              <AlertCircle size={24} /> Resuscitation / Notes
            </h3>
            <p className="font-bold text-lg leading-relaxed">{data.emergency_notes}</p>
          </div>
        )}
        
        <footer className="mt-12 text-center text-red-200/60 text-sm font-medium pb-8">
          Powered by MedVerity • For authorized emergency responders only
        </footer>
      </div>
    </div>
  );
}
