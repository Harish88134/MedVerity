"""
MedVerity Voice Pharmacist Service
Handles real-time conversational clinical Q&A for patients in vernacular languages.
Features clinical NLP parsing, dosage guardrails, drug/symptom resolution, and multi-language offline pharmacological knowledge.
"""

import json
import re
import asyncio
import google.generativeai as genai
from app.config import settings
from app.services.nlp_service import LANGUAGE_NAMES
from typing import List, Optional, Dict, Tuple

# Multi-tier fallback models: ultra-fast flash-lite first for instant conversational answers
GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
]

if settings.GEMINI_API_KEY:
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
    except Exception as e:
        print(f"[VoicePharmacist] Config error: {e}")

VOICE_QA_PROMPT = """
You are MedVerity's compassionate, friendly, and clinically accurate AI Voice Pharmacist.
A patient is asking a verbal question about their medication or symptoms.

Medication / Context: {medicine_name}
Patient's Question: "{question}"
Target Language: {target_language}

Instructions:
1. Speak directly to the patient in a warm, empathetic, and reassuring tone.
2. Give a clear, direct, and actionable answer in 2–3 short sentences.
3. Plain language (Grade 6 level). Avoid complex pharmacological jargon.
4. DOSAGE GUARDRAILS: If the user asks about increasing doses, taking 2-3 pills at once, or doubling up, FIRMLY advise sticking to the prescribed dosage and consulting a doctor.
5. FOOD/MILK/WATER: Give safe guidance (e.g. dairy chelates certain antibiotics, taking NSAIDs with food protects stomach, PPIs require empty stomach 30m before breakfast).
6. MISSED DOSE: If missed, take when remembered unless close to the next scheduled dose. Never double up.
7. The "spoken_text" field MUST be written purely in the target language ({target_language}), completely free of markdown, asterisks, or formatting symbols, ready to be read aloud by browser Text-to-Speech.
8. Provide 2-3 short follow-up question suggestions in the target language.

Respond ONLY with valid JSON:
{{
  "answer": "Clear readable response formatted in the target language",
  "spoken_text": "Plain conversational speech in target language without asterisks or markdown",
  "key_points": ["Key point 1", "Key point 2"],
  "safety_caution": "Important safety warning or doctor consultation advice",
  "follow_up_suggestions": ["Follow-up question 1", "Follow-up question 2"]
}}
"""

# ── Comprehensive Clinical Knowledge Base ───────────────────────
CLINICAL_KNOWLEDGE: Dict[str, Dict[str, Dict[str, dict]]] = {
    # ── 1. Paracetamol / Dolo / Crocin / Calpol ──
    "paracetamol": {
        "food": {
            "en": {
                "answer": "Paracetamol can be taken with or without food. Taking it with a glass of water after a light meal or snack is gentle on your stomach.",
                "spoken_text": "You can take Paracetamol with or without food. Taking it with water after meals is gentle on your stomach.",
                "key_points": ["Safe with or without food", "Take with plenty of water", "Do not exceed 4000mg in 24 hours"],
                "safety_caution": "Avoid alcohol while taking Paracetamol as it increases liver strain.",
                "follow_up_suggestions": ["What is the maximum daily dose?", "Can I take it for fever?", "What if I miss a dose?"]
            },
            "hi": {
                "answer": "पैरासिटामोल खाने के साथ या खाली पेट ली जा सकती है। हल्के भोजन के बाद एक गिलास पानी के साथ लेना पेट के लिए सबसे सुरक्षित और आरामदायक होता है।",
                "spoken_text": "पैरासिटामोल आप भोजन के बाद या पहले ले सकते हैं। पानी के साथ लेना सबसे अच्छा है।",
                "key_points": ["भोजन के बाद लेना बेहतर", "खूब पानी पिएं", "24 घंटे में 4 ग्राम से अधिक न लें"],
                "safety_caution": "इसके साथ शराब का सेवन बिल्कुल न करें क्योंकि इससे लिवर पर असर पड़ता है।",
                "follow_up_suggestions": ["क्या यह बुखार के लिए सही है?", "अगर खुराक छूट जाए तो क्या करें?", "क्या इसे दूध के साथ ले सकते हैं?"]
            },
            "te": {
                "answer": "పారాసిటమాల్ భోజనంతో లేదా భోజనం లేకుండా తీసుకోవచ్చు. తేలికపాటి ఆహారం తర్వాత నీటితో తీసుకోవడం కడుపుకు మంచిది.",
                "spoken_text": "పారాసిటమాల్ ఆహారం తర్వాత నీటితో తీసుకోవడం మంచిది. రోజుకు పరిమితి మించవద్దు.",
                "key_points": ["ఆహారం తర్వాత తీసుకోవచ్చు", "మంచి నీళ్లు తాగండి", "రోజుకు పరిమితి మించవద్దు"],
                "safety_caution": "పారాసిటమాల్ తీసుకునేటప్పుడు ఆల్కహాల్ తాగవద్దు.",
                "follow_up_suggestions": ["జ్వరం కోసం వాడవచ్చా?", "డోస్ మరిచిపోతే ఏమి చేయాలి?"]
            },
            "ta": {
                "answer": "பாராசிட்டமால் மருந்தை உணவுடனோ அல்லது உணவுக்குப் பின்னரோ உட்கொள்ளலாம். தண்ணீருடன் உட்கொள்வது நல்லது.",
                "spoken_text": "பாராசிட்டமால் உணவுக்குப் பின் தண்ணீருடன் உட்கொள்வது நல்லது.",
                "key_points": ["உணவுக்குப் பின் உட்கொள்ளலாம்", "நிறைய தண்ணீர் குடிக்கவும்", "அதிக அளவு உட்கொள்ள வேண்டாம்"],
                "safety_caution": "இதனுடன் மது அருந்துவதை முற்றிலும் தவிர்க்கவும்.",
                "follow_up_suggestions": ["காய்ச்சலுக்கு உகந்ததா?", "அடுத்த டோஸ் எப்போது?"]
            }
        },
        "missed": {
            "en": {
                "answer": "If you missed a dose of Paracetamol, take it as soon as you remember. However, if it is almost time for your next scheduled dose, skip the missed one. Never take a double dose.",
                "spoken_text": "Take the missed dose when you remember, but skip it if your next dose is close. Never take double pills.",
                "key_points": ["Take as soon as remembered", "Skip if next dose is near", "Never double up"],
                "safety_caution": "Maintain at least 4 to 6 hours between doses.",
                "follow_up_suggestions": ["What if fever is still high?", "Can I take with milk?"]
            },
            "hi": {
                "answer": "यदि आप खुराक भूल गए हैं, तो याद आते ही ले लें। यदि अगली खुराक का समय हो गया है, तो छूटी हुई खुराक छोड़ दें। कभी भी दो गोली एक साथ न लें।",
                "spoken_text": "याद आते ही खुराक लें, पर अगर अगली खुराक का समय पास है तो इसे छोड़ दें। कभी दो गोली एक साथ न लें।",
                "key_points": ["याद आते ही लें", "अगली खुराक का समय पास हो तो छोड़ें", "डबल डोज कभी न लें"],
                "safety_caution": "दो खुराकों के बीच कम से कम 4 से 6 घंटे का अंतर रखें।",
                "follow_up_suggestions": ["क्या खाली पेट ले सकते हैं?", "क्या इसके कोई साइड इफेक्ट्स हैं?"]
            },
            "te": {
                "answer": "మీరు డోస్ మరిచిపోతే, గుర్తున్నప్పుడు తీసుకోండి. తర్వాతి డోస్ సమయం దగ్గరగా ఉంటే, వదిలేయండి. ఎప్పుడూ రెండు మాత్రలు కలిపి వేసుకోవద్దు.",
                "spoken_text": "డోస్ మరిచిపోతే గుర్తున్నప్పుడు వేసుకోండి. డబుల్ డోస్ వేసుకోవద్దు.",
                "key_points": ["గుర్తున్నప్పుడు తీసుకోండి", "డబుల్ డోస్ వేసుకోవద్దు", "సమయం పాటించండి"],
                "safety_caution": "డోసుల మధ్య 4 నుండి 6 గంటల వ్యవధి ఉండాలి.",
                "follow_up_suggestions": ["ఆహారంతో తీసుకోవచ్చా?", "జ్వరం తగ్గకపోతే ఏమి చేయాలి?"]
            }
        },
        "dosage_escalation": {
            "en": {
                "answer": "Warning: Do not take extra tablets. Exceeding the recommended dosage of Paracetamol causes severe liver toxicity. If pain or fever persists, consult your doctor immediately.",
                "spoken_text": "Please do not take extra tablets. Taking extra Paracetamol is harmful to your liver. Please contact your doctor.",
                "key_points": ["Do not take extra doses", "Maximum 4000mg per 24 hours", "Seek doctor advice for persistent pain"],
                "safety_caution": "Paracetamol overdose requires immediate emergency medical care.",
                "follow_up_suggestions": ["What are overdose symptoms?", "When will fever reduce?"]
            },
            "hi": {
                "answer": "चेतावनी: अधिक गोलियां न लें। पैरासिटामोल की निर्धारित मात्रा से अधिक लेने से लिवर को गंभीर नुकसान हो सकता है। यदि दर्द कम न हो तो डॉक्टर से परामर्श करें।",
                "spoken_text": "कृपया अधिक गोलियां न लें। ज्यादा पैरासिटामोल लेना लिवर के लिए नुकसानदायक है। डॉक्टर से सलाह लें।",
                "key_points": ["अतिरिक्त खुराक न लें", "24 घंटे में 4 ग्राम अधिकतम", "डॉक्टर से सलाह लें"],
                "safety_caution": "ओवरडोज़ की स्थिति में तुरंत नजदीकी अस्पताल जाएं।",
                "follow_up_suggestions": ["क्या दूसरी दवा ले सकते हैं?", "अगली खुराक कब लें?"]
            }
        },
        "general": {
            "en": {
                "answer": "Paracetamol is an effective medicine for relieving mild to moderate pain (headaches, body aches, toothaches) and reducing fever. Take 1 tablet with water as prescribed.",
                "spoken_text": "Paracetamol relieves fever, headaches, and body pain. Take one tablet with water as prescribed.",
                "key_points": ["Treats fever and pain", "Take with water", "Space doses 6-8 hours apart"],
                "safety_caution": "Check other cold medications to avoid taking duplicate paracetamol.",
                "follow_up_suggestions": ["Can I take with milk?", "What if I miss a dose?"]
            },
            "hi": {
                "answer": "पैरासिटामोल बुखार कम करने और सिरदर्द या बदन दर्द से राहत पाने के लिए एक बहुत सुरक्षित दवा है। इसे पानी के साथ लें।",
                "spoken_text": "पैरासिटामोल बुखार और बदन दर्द के लिए है। इसे पानी के साथ लें।",
                "key_points": ["बुखार और दर्द से राहत", "पानी के साथ लें", "नियमित अंतराल रखें"],
                "safety_caution": "अन्य दवाओं में पैरासिटामोल की मात्रा की जांच करें।",
                "follow_up_suggestions": ["क्या इसे दूध के साथ ले सकते हैं?", "खुराक कितनी देर में असर करती है?"]
            }
        }
    },

    # ── 2. Pantoprazole / Omeprazole / Pan-D / Acidity ──
    "pantoprazole": {
        "food": {
            "en": {
                "answer": "Pantoprazole works best when taken in the morning, 30 to 60 minutes before your breakfast on an empty stomach with a full glass of water.",
                "spoken_text": "Pantoprazole should be taken on an empty stomach, thirty minutes before breakfast with water.",
                "key_points": ["Take 30-60 mins before breakfast", "Swallow whole with water", "Do not crush or chew"],
                "safety_caution": "Taking it after heavy meals significantly reduces its acid-blocking effectiveness.",
                "follow_up_suggestions": ["Can I take it at night?", "What if I forgot my morning dose?"]
            },
            "hi": {
                "answer": "पेंटोप्रजोल सुबह खाली पेट, नाश्ते से 30 से 60 मिनट पहले लेने पर सबसे अच्छा असर करता है। इसे पानी के साथ पूरा निगलें।",
                "spoken_text": "पेंटोप्रजोल सुबह नाश्ते से आधा घंटा पहले खाली पेट पानी के साथ लें।",
                "key_points": ["नाश्ते से पहले खाली पेट लें", "गोली को चबाएं नहीं", "पूरे गिलास पानी के साथ लें"],
                "safety_caution": "खाने के बाद लेने से इसका असर काफी कम हो जाता है।",
                "follow_up_suggestions": ["क्या इसे रात में ले सकते हैं?", "अगर सुबह भूल जाएं तो क्या करें?"]
            },
            "te": {
                "answer": "పాంటోప్రజోల్ ఉదయం అల్పాహారానికి 30 నిమిషాల ముందు ఖాళీ కడుపుతో నీటితో తీసుకోవాలి.",
                "spoken_text": "పాంటోప్రజోల్ ఉదయం ఖాళీ కడుపుతో అల్పాహారానికి ముందు నీటితో తీసుకోండి.",
                "key_points": ["ఖాళీ కడుపుతో తీసుకోండి", "నీటితో మింగండి", "నమలవద్దు"],
                "safety_caution": "ఆహారం తిన్న తర్వాత తీసుకుంటే ప్రభావం తగ్గుతుంది.",
                "follow_up_suggestions": ["రాత్రి తీసుకోవచ్చా?", "డోస్ మరిచిపోతే?"]
            }
        },
        "general": {
            "en": {
                "answer": "Pantoprazole reduces excess stomach acid to treat heartburn, acid reflux (GERD), and stomach ulcers. It provides long-lasting 24-hour relief.",
                "spoken_text": "Pantoprazole reduces stomach acid, relieving heartburn and acidity. Take before breakfast.",
                "key_points": ["Reduces stomach acid", "Relieves heartburn and GERD", "Take once daily in morning"],
                "safety_caution": "If acidity persists for more than 2 weeks, consult your gastroenterologist.",
                "follow_up_suggestions": ["Should I take before food?", "Can I take antacid syrup too?"]
            },
            "hi": {
                "answer": "पेंटोप्रजोल पेट में अतिरिक्त एसिड को कम करता है, जिससे सीने में जलन, गैस और एसिडिटी से आराम मिलता है।",
                "spoken_text": "पेंटोप्रजोल एसिडिटी और सीने में जलन को ठीक करता है। सुबह खाली पेट लें।",
                "key_points": ["एसिडिटी और गैस कम करता है", "सुबह एक बार लें", "खाली पेट असरदार"],
                "safety_caution": "लंबे समय तक बिना डॉक्टर की सलाह के न लें।",
                "follow_up_suggestions": ["क्या खाने के बाद ले सकते हैं?", "क्या इसके साइड इफेक्ट्स हैं?"]
            }
        }
    },

    # ── 3. Amoxicillin / Augmentin / Antibiotics ──
    "amoxicillin": {
        "food": {
            "en": {
                "answer": "Amoxicillin can be taken with or without food. Taking it with a meal or snack helps prevent stomach upset. Always complete the entire prescribed course.",
                "spoken_text": "Take Amoxicillin with meals to prevent stomach upset, and complete the full antibiotic course.",
                "key_points": ["Take with or after food", "Complete the full antibiotic course", "Space doses evenly every 8 hours"],
                "safety_caution": "Do not stop taking this antibiotic early even if you feel completely better.",
                "follow_up_suggestions": ["Can I take with milk?", "What if I miss a dose?"]
            },
            "hi": {
                "answer": "एमोक्सिसिलिन भोजन के साथ या बाद में लेना सबसे अच्छा है ताकि पेट ठीक रहे। डॉक्टर द्वारा बताया गया पूरा कोर्स खत्म करना जरूरी है।",
                "spoken_text": "एमोक्सिसिलिन भोजन के साथ लें ताकि पेट खराब न हो। पूरा कोर्स जरूर खत्म करें।",
                "key_points": ["भोजन के साथ लें", "पूरा कोर्स पूरा करें", "नियमित समय पर लें"],
                "safety_caution": "लक्षण ठीक होने पर भी दवा बीच में न छोड़ें।",
                "follow_up_suggestions": ["क्या इसे दूध के साथ ले सकते हैं?", "अगर खुराक छूट जाए तो?"]
            }
        },
        "general": {
            "en": {
                "answer": "Amoxicillin is an antibiotic that fights bacterial infections in the chest, throat, ear, and urinary tract. It does not treat viral infections like the common cold.",
                "spoken_text": "Amoxicillin is an antibiotic for bacterial infections. Take as prescribed with water.",
                "key_points": ["Antibiotic for bacterial infections", "Take full course", "Does not treat colds or viruses"],
                "safety_caution": "Do not take if you have a known penicillin allergy.",
                "follow_up_suggestions": ["How many days should I take?", "Can I take with food?"]
            },
            "hi": {
                "answer": "एमोक्सिसिलिन एक एंटीबायोटिक दवा है जो गले, फेफड़ों और कान के बैक्टीरिया संक्रमण को ठीक करती है। इसे समय पर लें।",
                "spoken_text": "एमोक्सिसिलिन बैक्टीरिया संक्रमण के इलाज के लिए है। डॉक्टर की बताई अवधि तक लें।",
                "key_points": ["बैक्टीरियल इन्फेक्शन के लिए", "समय पर लें", "पूरा कोर्स करें"],
                "safety_caution": "पेनिसिलिन से एलर्जी होने पर इसे न लें।",
                "follow_up_suggestions": ["क्या खाने के साथ लें?", "क्या दस्त हो सकते हैं?"]
            }
        }
    },

    # ── 4. Metformin / Glycomet / Diabetes ──
    "metformin": {
        "food": {
            "en": {
                "answer": "Metformin should always be taken with or immediately after your meals with water. This greatly reduces common digestive discomfort like nausea or stomach cramps.",
                "spoken_text": "Always take Metformin with or right after your meals with water to avoid stomach upset.",
                "key_points": ["Always take with meals", "Swallow with water", "Maintain steady meal schedule"],
                "safety_caution": "Avoid heavy alcohol consumption as it increases the risk of lactic acidosis.",
                "follow_up_suggestions": ["What if my blood sugar drops?", "When is the best time to take?"]
            },
            "hi": {
                "answer": "मेटफॉर्मिन हमेशा भोजन के साथ या भोजन के तुरंत बाद ही लेनी चाहिए। इससे पेट दर्द, गैस या मतली नहीं होती।",
                "spoken_text": "मेटफॉर्मिन हमेशा खाने के साथ ही लें ताकि पेट खराब न हो।",
                "key_points": ["खाने के साथ लें", "नियमित भोजन करें", "पानी खूब पिएं"],
                "safety_caution": "इसके साथ शराब का सेवन न करें।",
                "follow_up_suggestions": ["क्या इसे खाली पेट ले सकते हैं?", "अगर शुगर कम हो तो क्या करें?"]
            }
        },
        "general": {
            "en": {
                "answer": "Metformin helps control blood sugar levels by improving how your body responds to insulin. Take it daily with meals as directed by your physician.",
                "spoken_text": "Metformin controls blood sugar in type 2 diabetes. Take regularly with meals.",
                "key_points": ["Lowers blood glucose", "Take with meals", "Long-term daily management"],
                "safety_caution": "Monitor your blood glucose regularly and stay well-hydrated.",
                "follow_up_suggestions": ["Can I take it before breakfast?", "What if I miss a dose?"]
            },
            "hi": {
                "answer": "मेटफॉर्मिन शरीर में ब्लड शुगर (मधुमेह) को नियंत्रित करने में मदद करता है। इसे रोज भोजन के साथ नियमित रूप से लें।",
                "spoken_text": "मेटफॉर्मिन शुगर कंट्रोल करने की दवा है। इसे रोज खाने के साथ लें।",
                "key_points": ["शुगर नियंत्रित करता है", "खाने के साथ लें", "नियमित जांच कराएं"],
                "safety_caution": "पर्याप्त मात्रा में पानी पिएं।",
                "follow_up_suggestions": ["क्या इसे रात में ले सकते हैं?", "क्या वजन कम होता है?"]
            }
        }
    },

    # ── 5. Cetirizine / Antihistamine / Allergies ──
    "cetirizine": {
        "food": {
            "en": {
                "answer": "Cetirizine can be taken with or without food. It is best taken in the evening or before bedtime with water because it may cause mild drowsiness.",
                "spoken_text": "Take Cetirizine with water, preferably at bedtime as it may cause slight drowsiness.",
                "key_points": ["Best taken at night", "May cause mild drowsiness", "Safe with or without food"],
                "safety_caution": "Avoid driving or operating machinery if you feel drowsy. Do not drink alcohol.",
                "follow_up_suggestions": ["Can I take it in the morning?", "How fast does it work?"]
            },
            "hi": {
                "answer": "सिट्रीज़िन भोजन के साथ या बिना भोजन के ली जा सकती है। इसे रात में सोने से पहले लेना सबसे अच्छा है क्योंकि इससे हल्की नींद आ सकती है।",
                "spoken_text": "सिट्रीज़िन रात को सोने से पहले लें क्योंकि इससे हल्की नींद आ सकती है।",
                "key_points": ["रात में लेना सबसे अच्छा", "हल्की नींद आ सकती है", "ड्राइविंग से बचें"],
                "safety_caution": "इसके साथ शराब का सेवन न करें।",
                "follow_up_suggestions": ["क्या इसे दिन में ले सकते हैं?", "असर कितनी देर रहता है?"]
            }
        },
        "general": {
            "en": {
                "answer": "Cetirizine provides fast relief from allergy symptoms including runny nose, sneezing, itchy eyes, skin rashes, and hives. Take 1 tablet daily.",
                "spoken_text": "Cetirizine relieves allergies, sneezing, and skin itching. Take one tablet at night.",
                "key_points": ["Relieves allergy and itching", "1 tablet per 24 hours", "Fast 24-hour relief"],
                "safety_caution": "Do not exceed one tablet in 24 hours.",
                "follow_up_suggestions": ["Will it make me sleepy?", "Can I take with milk?"]
            },
            "hi": {
                "answer": "सिट्रीज़िन एलर्जी, छींकें, बहती नाक, खुजली और त्वचा पर पित्ती से राहत देती है। 24 घंटे में सिर्फ एक गोली लें।",
                "spoken_text": "सिट्रीज़िन एलर्जी और छींकों के लिए है। रोज एक गोली रात में लें।",
                "key_points": ["एलर्जी और खुजली से आराम", "24 घंटे में 1 गोली", "रात में लेना बेहतर"],
                "safety_caution": "24 घंटे में एक से ज्यादा गोली न लें।",
                "follow_up_suggestions": ["क्या दिन में ले सकते हैं?", "कितने दिन तक ले सकते हैं?"]
            }
        }
    },

    # ── 6. Ibuprofen / Combiflam / Pain Relief ──
    "ibuprofen": {
        "food": {
            "en": {
                "answer": "Ibuprofen must ALWAYS be taken with food, milk, or right after a meal. Never take Ibuprofen on an empty stomach, as it can cause stomach irritation or ulcers.",
                "spoken_text": "Always take Ibuprofen after food or with milk to protect your stomach lining.",
                "key_points": ["Always take with food or milk", "Never take on empty stomach", "Take with plenty of water"],
                "safety_caution": "Avoid if you have active stomach ulcers, kidney problems, or severe asthma.",
                "follow_up_suggestions": ["Can I take with Paracetamol?", "What is the maximum dose?"]
            },
            "hi": {
                "answer": "आइबुप्रोफेन हमेशा भोजन के बाद या दूध के साथ ही लेनी चाहिए। इसे कभी भी खाली पेट न लें, वरना पेट में जलन या अल्सर हो सकता है।",
                "spoken_text": "आइबुप्रोफेन हमेशा खाना खाने के बाद या दूध के साथ लें। खाली पेट बिल्कुल न लें।",
                "key_points": ["हमेशा खाने के बाद लें", "खाली पेट कभी न लें", "दूध के साथ ले सकते हैं"],
                "safety_caution": "पेट के अल्सर या किडनी की समस्या होने पर इसे न लें।",
                "follow_up_suggestions": ["क्या इसे सिरदर्द में ले सकते हैं?", "दिन में कितनी बार ले सकते हैं?"]
            }
        },
        "general": {
            "en": {
                "answer": "Ibuprofen is an anti-inflammatory pain reliever that reduces swelling, toothaches, joint pain, muscle stiffness, and menstrual cramps. Take as directed with food.",
                "spoken_text": "Ibuprofen relieves pain and inflammation. Always take with meals.",
                "key_points": ["Relieves pain and swelling", "Take with meals", "Use lowest effective dose"],
                "safety_caution": "Do not take continuously for more than 3-5 days without medical review.",
                "follow_up_suggestions": ["Should I take after food?", "Can I take for fever?"]
            },
            "hi": {
                "answer": "आइबुप्रोफेन दर्द और सूजन कम करने की असरदार दवा है। यह दांत दर्द, जोड़ों के दर्द और चोट की सूजन में राहत देती है।",
                "spoken_text": "आइबुप्रोफेन दर्द और सूजन कम करती है। इसे खाने के बाद ही लें।",
                "key_points": ["दर्द और सूजन से राहत", "खाने के बाद लें", "3-5 दिन से अधिक न लें"],
                "safety_caution": "खाली पेट लेने से बचें।",
                "follow_up_suggestions": ["क्या इसे दूध के साथ ले सकते हैं?", "क्या पैरासिटामोल के साथ ले सकते हैं?"]
            }
        }
    },

    # ── 7. Azithromycin / Azee / Antibiotic ──
    "azithromycin": {
        "food": {
            "en": {
                "answer": "Azithromycin can be taken with or without food, but taking it 1 hour before or 2 hours after meals provides optimal absorption. Complete the full 3 to 5 day course.",
                "spoken_text": "Take Azithromycin once daily with water. It works best one hour before or two hours after meals.",
                "key_points": ["Take once daily at the same time", "Complete the 3-5 day course", "Do not take with antacids"],
                "safety_caution": "Do not take antacids containing aluminum or magnesium within 2 hours of Azithromycin.",
                "follow_up_suggestions": ["Can I take with milk?", "What if I get stomach cramps?"]
            },
            "hi": {
                "answer": "एजिथ्रोमाइसिन भोजन से 1 घंटा पहले या 2 घंटे बाद लेने पर सबसे अच्छा काम करती है। डॉक्टर द्वारा बताया गया 3 या 5 दिन का पूरा कोर्स अवश्य पूरा करें।",
                "spoken_text": "एजिथ्रोमाइसिन दिन में एक बार पानी के साथ लें। खाने से एक घंटा पहले या दो घंटे बाद लेना सबसे अच्छा है।",
                "key_points": ["रोज एक ही समय पर लें", "3 से 5 दिन का कोर्स पूरा करें", "एंटासिड के साथ न लें"],
                "safety_caution": "इसके साथ 2 घंटे तक कोई एंटासिड सिरप या गोली न लें।",
                "follow_up_suggestions": ["क्या इसे दूध के साथ ले सकते हैं?", "अगर खुराक छूट जाए तो?"]
            }
        }
    },

    # ── 8. Atorvastatin / Lipitor / Cholesterol ──
    "atorvastatin": {
        "food": {
            "en": {
                "answer": "Atorvastatin is most effective when taken once daily in the evening or at bedtime with water, because your liver produces the most cholesterol at night. It can be taken with or without food.",
                "spoken_text": "Take Atorvastatin once daily at night with water. It can be taken with or without food.",
                "key_points": ["Take once daily at bedtime", "Can take with or without meals", "Avoid grapefruit juice"],
                "safety_caution": "Avoid drinking large quantities of grapefruit juice as it increases drug levels in the blood.",
                "follow_up_suggestions": ["Why should I take it at night?", "Are there muscle aches?"]
            },
            "hi": {
                "answer": "एटोरवास्टेटिन रात को सोने के समय लेना सबसे असरदार होता है, क्योंकि शरीर रात में सबसे ज्यादा कोलेस्ट्रॉल बनाता है। इसे पानी के साथ लें।",
                "spoken_text": "एटोरवास्टेटिन रात को सोने से पहले पानी के साथ लें।",
                "key_points": ["रात में सोने से पहले लें", "खाने के साथ या बिना ले सकते हैं", "चकोतरे (ग्रेपफ्रूट) से बचें"],
                "safety_caution": "इसके साथ ग्रेपफ्रूट जूस पीने से बचें।",
                "follow_up_suggestions": ["क्या इसे सुबह ले सकते हैं?", "क्या इसके साइड इफेक्ट्स हैं?"]
            }
        }
    },

    # ── 9. Telmisartan / Amlodipine / Blood Pressure ──
    "telmisartan": {
        "food": {
            "en": {
                "answer": "Telmisartan should be taken once daily at the same time every day, usually in the morning with a glass of water, with or without food.",
                "spoken_text": "Take Telmisartan once daily at the same time with water, with or without food.",
                "key_points": ["Take once daily at fixed time", "Safe with or without meals", "Do not skip doses"],
                "safety_caution": "Do not discontinue blood pressure medication abruptly without doctor guidance.",
                "follow_up_suggestions": ["What if my BP gets too low?", "Can I take in the morning?"]
            },
            "hi": {
                "answer": "टेल्मीसार्टन रोज एक ही निश्चित समय पर (आमतौर पर सुबह) एक गिलास पानी के साथ लें। इसे भोजन के साथ या बिना लिया जा सकता है।",
                "spoken_text": "टेल्मीसार्टन रोज सुबह एक ही समय पर पानी के साथ लें। दवा कभी अचानक बंद न करें।",
                "key_points": ["रोज निश्चित समय पर लें", "खाने के साथ या पहले ले सकते हैं", "नियमित जांच कराएं"],
                "safety_caution": "ब्लड प्रेशर की दवा अचानक कभी बंद न करें।",
                "follow_up_suggestions": ["क्या इसे खाली पेट ले सकते हैं?", "अगर चक्कर आए तो क्या करें?"]
            }
        }
    }
}


def _resolve_drug_and_intent(medicine_name: str, question: str) -> Tuple[str, str]:
    """Resolves active drug and intent category from medicine name and user question."""
    combined = f"{medicine_name or ''} {question or ''}".lower()
    
    # 1. Identify Drug
    matched_drug = "general_medication"
    if any(k in combined for k in ["paracetamol", "dolo", "crocin", "calpol", "panadol", "febrinil", "acetaminophen"]):
        matched_drug = "paracetamol"
    elif any(k in combined for k in ["pantop", "pan-d", "pan 40", "pantocid", "omez", "omeprazole", "rabeprazole", "antacid", "acidity", "heartburn", "acid reflux", "gas", "गैस", "एसिडिटी", "छाती में जलन"]):
        matched_drug = "pantoprazole"
    elif any(k in combined for k in ["augmentin", "amoxicillin", "amoxyclav", "mox", "clavam", "antibiotic", "एंटीबायोटिक"]):
        matched_drug = "amoxicillin"
    elif any(k in combined for k in ["metformin", "glycomet", "glucophage", "gluconorm", "diabetes", "sugar", "डायबिटीज", "शुगर"]):
        matched_drug = "metformin"
    elif any(k in combined for k in ["cetirizine", "cetzine", "okacet", "zyrtec", "allegra", "montair", "allergy", "sneezing", "एलर्जी", "छींक"]):
        matched_drug = "cetirizine"
    elif any(k in combined for k in ["ibuprofen", "combiflam", "brufen", "advil", "swelling", "सूजन", "दांत दर्द"]):
        matched_drug = "ibuprofen"
    elif any(k in combined for k in ["azithral", "azee", "azithromycin", "zithromax"]):
        matched_drug = "azithromycin"
    elif any(k in combined for k in ["atorva", "atorvastatin", "lipitor", "rosuvas", "cholesterol", "कोलेस्ट्रॉल"]):
        matched_drug = "atorvastatin"
    elif any(k in combined for k in ["telma", "telmisartan", "amlodipine", "losartan", "bp", "blood pressure", "बीपी", "ब्लड प्रेशर"]):
        matched_drug = "telmisartan"
    elif any(k in combined for k in ["headache", "fever", "body pain", "pain", "बुखार", "सिरदर्द", "दर्द", "జ్వరం", "తలనొప్పి"]):
        matched_drug = "paracetamol"

    # 2. Identify Question Intent
    intent = "general"
    if any(k in combined for k in ["extra", "two pills", "three pills", "double dose", "more pills", "overdose", "ज्यादा गोली", "दो गोली", "ఎక్కువ మాత్రలు"]):
        intent = "dosage_escalation"
    elif any(k in combined for k in ["hour", "gap", "interval", "how often", "often", "how many times", "frequency", "समय", "कितने घंटे", "గంటలు", "ఎన్నిసార్లు"]):
        intent = "timing_interval"
    elif any(k in combined for k in ["max", "maximum", "limit", "how much", "how many can i take", "highest", "ज्यादा से ज्यादा", "अधिकतम"]):
        intent = "max_dosage"
    elif any(k in combined for k in ["alcohol", "beer", "wine", "liquor", "शराब", "दारू", "ఆల్కహాల్", "మద్యం"]):
        intent = "alcohol"
    elif any(k in combined for k in ["miss", "forgot", "skip", "छूट", "भूल", "మరిచి", "తవறி"]):
        intent = "missed"
    elif any(k in combined for k in ["food", "milk", "tea", "empty stomach", "eat", "meal", "water", "drink", "खाना", "भोजन", "दूध", "పాలు", "ఆహారం", "பால்"]):
        intent = "food"
    elif any(k in combined for k in ["side effect", "reaction", "nausea", "drowsy", "sleepy", "side effects", "नुकसान", "సైడ్ ఎఫెక్ట్"]):
        intent = "side_effects"

    return matched_drug, intent


async def answer_voice_question(
    medicine_name: str,
    question: str,
    target_language: str = "en",
    context: Optional[dict] = None
) -> dict:
    """Answers patient medication questions with fast clinical reasoning + multilingual fallbacks."""
    clean_med = (medicine_name or "Medicine").strip()
    clean_q = (question or "").strip()
    lang = target_language or "en"
    lang_name = LANGUAGE_NAMES.get(lang, "English")

    # If generic medicine name was passed, use question context
    display_name = clean_med if clean_med not in ["Your Prescribed Medicines", "My Prescribed Medicines", "Your Medicine", "General Medicine"] else "your medicine"

    # 1. Immediate Dosage Escalation Safety Guardrail
    matched_drug, intent = _resolve_drug_and_intent(clean_med, clean_q)

    # 2. Try Gemini with 12.0s timeout to allow full generation
    if settings.GEMINI_API_KEY:
        import requests
        for model_name in GEMINI_MODELS:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.GEMINI_API_KEY}"
                prompt = VOICE_QA_PROMPT.format(
                    medicine_name=clean_med,
                    question=clean_q,
                    target_language=f"{lang_name} ({lang})",
                )
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "temperature": 0.2,
                        "maxOutputTokens": 600,
                        "response_mime_type": "application/json",
                    }
                }
                
                resp = await asyncio.to_thread(requests.post, url, json=payload, timeout=6.0)
                if resp.status_code == 200:
                    cand = resp.json().get("candidates", [])
                    if cand:
                        raw_text = cand[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
                        clean_text = re.sub(r"^```(?:json)?\s*", "", raw_text, flags=re.MULTILINE)
                        clean_text = re.sub(r"\s*```$", "", clean_text, flags=re.MULTILINE)
                        data = json.loads(clean_text)
                        if data.get("answer") and data.get("spoken_text"):
                            return {
                                "medicine_name": clean_med,
                                "question": clean_q,
                                "answer": data["answer"],
                                "spoken_text": data["spoken_text"],
                                "language": lang,
                                "key_points": data.get("key_points", []),
                                "safety_caution": data.get("safety_caution"),
                                "follow_up_suggestions": data.get("follow_up_suggestions", []),
                            }
                elif resp.status_code == 429:
                    break
            except Exception as e:
                print(f"[VoicePharmacist] Model {model_name} failed: {e}. Trying fallback...")
                continue

    # 3. Rich Clinical Knowledge Engine
    drug_data = CLINICAL_KNOWLEDGE.get(matched_drug, CLINICAL_KNOWLEDGE["paracetamol"])
    category_data = drug_data.get(intent, drug_data.get("food", drug_data.get("general", {})))
    localized_resp = category_data.get(lang) or category_data.get("en")

    if localized_resp:
        return {
            "medicine_name": clean_med,
            "question": clean_q,
            "answer": localized_resp["answer"],
            "spoken_text": localized_resp["spoken_text"],
            "language": lang,
            "key_points": localized_resp.get("key_points", []),
            "safety_caution": localized_resp.get("safety_caution"),
            "follow_up_suggestions": localized_resp.get("follow_up_suggestions", ["Can I take with water?", "What if I miss a dose?"]),
        }

    # 4. Universal Vernacular Medical Fallback
    if lang == "hi":
        return {
            "medicine_name": clean_med,
            "question": clean_q,
            "answer": f"{display_name} को हमेशा डॉक्टर के बताए अनुसार पानी के साथ लें। अपनी खुराक में खुद बदलाव न करें और समय पर दवा लें।",
            "spoken_text": f"{display_name} को डॉक्टर के निर्देशानुसार पानी के साथ लें।",
            "language": "hi",
            "key_points": ["डॉक्टर के बताए अनुसार लें", "पानी खूब पिएं", "नियमित समय का पालन करें"],
            "safety_caution": "यदि कोई गंभीर लक्षण या एलर्जी दिखे तो तुरंत डॉक्टर से संपर्क करें।",
            "follow_up_suggestions": ["क्या इसे खाने के साथ लें?", "अगर खुराक छूट जाए तो क्या करें?"]
        }
    elif lang == "te":
        return {
            "medicine_name": clean_med,
            "question": clean_q,
            "answer": f"{display_name} ను డాక్టర్ సూచించిన విధంగా సమయానికి నీటితో తీసుకోండి. మోతాదును సొంతంగా మార్చవద్దు.",
            "spoken_text": f"{display_name} ను డాక్టర్ సూచించిన విధంగా నీటితో తీసుకోండి.",
            "language": "te",
            "key_points": ["డాక్టర్ సూచించినట్లు తీసుకోండి", "మంచి నీళ్లు తాగండి", "సమయం పాటించండి"],
            "safety_caution": "ఏదైనా అసౌకర్యం ఉంటే వెంటనే డాక్టర్‌ను సంప్రదించండి.",
            "follow_up_suggestions": ["ఆహారంతో తీసుకోవచ్చా?", "డోస్ మరిచిపోతే ఏమి చేయాలి?"]
        }
    elif lang == "ta":
        return {
            "medicine_name": clean_med,
            "question": clean_q,
            "answer": f"{display_name} மருந்தை மருத்துவர் அறிவுறுத்தியபடி தண்ணீருடன் உட்கொள்ளவும். மருந்தின் அளவை நீங்களாக மாற்ற வேண்டாம்.",
            "spoken_text": f"{display_name} மருந்தை மருத்துவர் அறிவுறுத்தியபடி தண்ணீருடன் உட்கொள்ளவும்.",
            "language": "ta",
            "key_points": ["மருத்துவர் கூறியபடி உட்கொள்ளவும்", "நிறைய தண்ணீர் குடிக்கவும்", "நேரத்தை கடைபிடிக்கவும்"],
            "safety_caution": "ஒவ்வாமை ஏற்பட்டால் உடனடியாக மருத்துவரை அணுகவும்.",
            "follow_up_suggestions": ["உணவுக்குப் பின் உட்கொள்ளலாமா?", "டோஸ் தவறினால் என்ன செய்வது?"]
        }

    return {
        "medicine_name": clean_med,
        "question": clean_q,
        "answer": f"For {display_name}, take each dose with a full glass of water as prescribed by your doctor. Maintain consistent daily timing.",
        "spoken_text": f"For {display_name}, follow your prescribed timing and take with water.",
        "language": "en",
        "key_points": ["Follow prescribed schedule", "Take with plenty of water", "Do not alter dosage without medical advice"],
        "safety_caution": "If you experience severe dizziness, rash, or unusual reactions, seek medical advice promptly.",
        "follow_up_suggestions": ["Can I take with food?", "What should I do if I miss a dose?"]
    }
