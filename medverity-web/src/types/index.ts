// ── Shared TypeScript types for MedVerity ──

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  preferred_language: string;
  role: 'patient' | 'caregiver';
  created_at: string;
}

export interface CaregiverLink {
  id: string;
  caregiver_id: string;
  patient_id: string;
  status: 'pending' | 'active';
  created_at: string;
  patient?: User;
  caregiver?: User;
}

export interface Scan {
  id: string;
  user_id: string;
  image_url: string;
  ocr_confidence: number;
  extracted_text: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  scanned_at: string;
}

export interface Allergy {
  id: string;
  user_id: string;
  allergy_name: string;
  created_at: string;
}

export interface Drug {
  id: string;
  generic_name: string;
  brand_names: string[];
  uses: string;
  side_effects: string;
  food_interactions: string[];
  pregnancy_note: string;
  dosage_limit: string;
}

export interface InteractionRule {
  id: string;
  drug_a_id: string;
  drug_b_id: string;
  risk_level: 'low' | 'moderate' | 'high';
  description: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  scan_id?: string;
  medicine_name: string;
  time: string;
  frequency: string;
  status: 'upcoming' | 'taken' | 'missed';
  channel: 'app' | 'sms';
}

export interface ScanResult {
  ocr_text: string;
  confidence: number;
  extraction: {
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    category: string;
    uses: string;
    how_to_take: string;
    warnings: string[];
  };
  translated_text?: string;
  alternatives?: {
    name: string;
    description: string;
  }[];
}

export type Language = {
  code: string;
  name: string;
  nativeName: string;
  script: string;
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', script: 'अ' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'తెలు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'அ' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'অ' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'म' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'ગુ' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'ಕ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'മ' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'ਪੰ' },
  { code: 'en', name: 'English', nativeName: 'English', script: 'A' },
];
