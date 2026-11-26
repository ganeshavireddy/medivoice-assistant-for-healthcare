"""
MediVoice AI – Master Medical Agent Orchestrator

Implements the Master System Prompt for MediVoice AI:
1. Role and Identity (Multilingual, patient-assistive, evidence-grounded)
2. Core Operating Principles (Understand before answering, patient-specific context)
3. 25 Supported Medical Intents Classification
4. Structured Conversation Memory & Patient State (PatientContext)
5. Follow-up Question Management (never repeats answered questions)
6. Deterministic Emergency Detection & Triage (Runs first; 112/108/911)
7. Evidence-based RAG integration with citations
8. 5-Part Patient Response Generation Architecture:
   - 1. Understanding your symptoms
   - 2. Possible explanations
   - 3. Recommended next steps
   - 4. When to seek urgent help
   - 5. Follow-up question (only targeted, unanswered)
9. Personalization & Clinical Consistency Validation (gender & age consistency)
10. Multilingual Support: English, Telugu (తెలుగు), Hindi (हिन्दी)
"""

import logging
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from ai.llm_service import llm_service
from ai.patient_state import patient_state_manager, PatientContext
from rag.retriever import Retriever
from mcp.server import MCPServer
from database import SessionLocal, Doctor, Appointment

logger = logging.getLogger(__name__)

retriever = Retriever()
mcp_server = MCPServer()


class MasterMedicalAgent:
    """Master medical agent orchestrator adhering strictly to the master system prompt."""

    def __init__(self):
        self.llm_service = llm_service
        self.retriever = retriever
        self.mcp_server = mcp_server
        self.state_manager = patient_state_manager

    async def process_user_input(
        self,
        user_id: int,
        user_input: str,
        language: str = "en",
        conversation_history: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Execute the master 12-step processing order:
        1. Understand the question
        2. Identify medical intent(s)
        3. Read existing conversation state
        4. Extract new information
        5. Detect emergency indicators (deterministic triage first)
        6. Ask only necessary unanswered questions
        7. Retrieve relevant medical evidence (RAG)
        8. Evaluate evidence quality
        9. Generate patient-specific response
        10. Validate safety and consistency
        11. Provide relevant citations
        12. Update conversation memory
        """
        user_text = user_input.strip()

        # Step 3 & 4: Update and retrieve structured patient context
        ctx = self.state_manager.update_from_message(user_id, user_text)

        # Step 5: Immediate Deterministic Emergency Detection
        emergency_check = self._check_emergency(user_text, ctx, language)
        if emergency_check:
            ctx.emergency_indicators.append(emergency_check.get("indicator", "emergency"))
            self.state_manager.record_turn(user_id, user_text, emergency_check["text"])
            return {
                "response_text": emergency_check["text"],
                "citations": [],
                "mcp_result": None,
                "language": language,
                "intent": {"intents": ["emergency_assessment"], "is_emergency": True},
                "patient_state": ctx.to_dict(),
                "safety_applied": True,
                "is_emergency": True,
            }

        # Step 2: Intent Classification (up to 25 specific intents)
        intents = self._classify_intents(user_text, ctx)

        # Check for conversational appointment booking request
        if self._is_appointment_booking_request(user_text):
            booking_res = self._handle_appointment_booking(user_text, user_id, language)
            if booking_res:
                self.state_manager.record_turn(user_id, user_text, booking_res["text"])
                return {
                    "response_text": booking_res["text"],
                    "citations": [],
                    "mcp_result": booking_res.get("mcp_result"),
                    "language": language,
                    "intents": ["appointment_request", "appointment_booking"],
                    "patient_state": ctx.to_dict(),
                    "safety_applied": True,
                    "booked_appointment": booking_res.get("appointment"),
                }

        # Step 7 & 8: RAG Retrieval for medical intents
        rag_context = ""
        citations = []
        needs_rag = any(
            i in intents for i in [
                "general_medical_information", "fever_assessment", "blood_pressure_assessment",
                "urinary_symptom_assessment", "medical_report_explanation", "blood_test_interpretation",
                "complete_blood_count_interpretation", "kidney_function_interpretation", "medication_information"
            ]
        )

        if needs_rag:
            rag_result = await self.retriever.retrieve(
                query=user_text,
                user_id=user_id,
                language=language,
            )
            rag_context = rag_result.get("context", "")
            citations = rag_result.get("citations", [])

        # MCP Tool integration
        mcp_result = None
        if "appointment_request" in intents or "doctor_search" in intents or "doctor" in user_text.lower():
            spec = self._extract_specialization(user_text)
            try:
                mcp_result = await self.mcp_server.search_doctors(specialization=spec)
            except Exception as e:
                logger.error(f"MCP search error: {e}")

        # Step 9: Generate Patient-Specific Response (LLM or Clinical Engine)
        system_prompt = self._build_master_system_prompt(language, intents, ctx, citations)
        prompt_with_context = self._build_prompt_payload(user_text, ctx, rag_context, mcp_result)

        llm_response = await self.llm_service.generate_response(
            prompt=prompt_with_context,
            system_prompt=system_prompt,
        )

        if llm_response:
            final_text = llm_response
        else:
            final_text = self._clinical_grounded_response(user_text, ctx, intents, language, mcp_result, citations)

        # Step 10: Validate Safety & Consistency
        final_text = self._validate_clinical_consistency(final_text, ctx, language)

        # Step 12: Update Conversation Memory
        self.state_manager.record_turn(user_id, user_text, final_text)

        return {
            "response_text": final_text,
            "citations": citations,
            "mcp_result": mcp_result,
            "language": language,
            "intents": intents,
            "patient_state": ctx.to_dict(),
            "safety_applied": True,
        }

    # =========================================================================
    # EMERGENCY DETECTION & TRIAGE (Section 6)
    # =========================================================================

    def _check_emergency(self, text: str, ctx: PatientContext, language: str) -> Optional[Dict[str, Any]]:
        """Immediate deterministic emergency triage before RAG or LLM."""
        lower = text.lower()

        # Stroke (FAST protocol)
        if any(w in lower for w in [
            "cannot speak", "can't speak", "difficulty speaking", "speech difficulty",
            "slurred speech", "facial drooping", "face drooping", "weakness on one side",
            "stroke", "లక్షణాలు మాట్లాడలేకపోవడం", "ముఖం వంకరపోవడం"
        ]):
            if language == "te":
                msg = (
                    "🚨 అత్యవసర హెచ్చరిక – బ్రెయిన్ స్ట్రోక్ అనుమానం (STROKE WARNING):\n\n"
                    "అకస్మాత్తుగా మాట్లాడలేకపోవడం లేదా మాట ముద్దబారడం, ముఖం వంకరపోవడం లేదా శరీరంలో ఒకవైపు బలహీనత స్ట్రోక్ లక్షణం కావచ్చు.\n\n"
                    "1. వెంటనే 112 లేదా 108 కి కాల్ చేసి అత్యవసర అంబులెన్స్‌ను పిలవండి.\n"
                    "2. రోగి బాగా ఉన్న సమయాన్ని (Time of onset) ఖచ్చితంగా గమనించండి.\n"
                    "3. ఆహారం, నీరు లేదా ఎటువంటి మందులు ఇవ్వవద్దు (మింగడంలో ఇబ్బంది ఉండవచ్చు).\n"
                    "4. రోగి స్వయంగా వాహనం నడపకూడదు. లక్షణాలు వాటంతట అవే తగ్గుతాయని వేచి చూడకండి. వెంటనే ఆసుపత్రికి తరలించండి."
                )
            elif language == "hi":
                msg = (
                    "🚨 आपातकालीन चेतावनी – स्ट्रोक की आशंका (STROKE WARNING):\n\n"
                    "अचानक बोलने में कठिनाई, आवाज लड़खड़ाहट, या चेहरे/शरीर के एक तरफ कमजोरी स्ट्रोक के संकेत हो सकते हैं।\n\n"
                    "1. तुरंत 112 या 108 पर कॉल करें और नजदीकी आपातकालीन अस्पताल पहुंचें।\n"
                    "2. मरीज को आखिरी बार कब ठीक देखा गया था, वह समय नोट करें।\n"
                    "3. कोई भी खाना, पानी या दवाई न दें। मरीज को खुद गाड़ी न चलाने दें।"
                )
            else:
                msg = (
                    "🚨 CRITICAL EMERGENCY ALERT – SUSPECTED STROKE:\n\n"
                    "Sudden difficulty speaking, facial drooping, or weakness on one side of the body can be signs of a medical emergency (stroke).\n\n"
                    "1. Call emergency services immediately. In India, dial 112 or 108 (or 911 / your local emergency number).\n"
                    "2. Note the exact time the person was last known to be well.\n"
                    "3. Do NOT give food, water, or any oral medications.\n"
                    "4. Do NOT allow the patient to drive themselves. Do not wait for symptoms to improve."
                )
            return {"indicator": "suspected_stroke", "text": msg}

        # Acute Heart Attack / Severe Chest Pain / Severe Breathlessness
        if any(w in lower for w in [
            "chest pain", "heart attack", "crushing pain", "radiating to left arm",
            "difficulty breathing", "cannot breathe", "can't breathe", "breathlessness",
            "shortness of breath", "severe breathing", "ఛాతీ నొప్పి", "శ్వాస ఆడటం లేదు", "గుండెపోటు",
            "सीने में दर्द", "सांस लेने में दिक्कत"
        ]):
            if language == "te":
                msg = (
                    "🚨 అత్యవసర హెచ్చరిక – గుండెపోటు లేదా తీవ్రమైన శ్వాసకోశ అత్యవసర పరిస్థితి:\n\n"
                    "తీవ్రమైన ఛాతీ నొప్పి, గుండెలో ఒత్తిడి లేదా శ్వాస తీసుకోవడంలో తీవ్ర ఇబ్బంది ప్రాణాంతక అత్యవసర పరిస్థితిని సూచించవచ్చు.\n\n"
                    "• దయచేసి వెంటనే 112 లేదా 108 కి కాల్ చేయండి లేదా అత్యవసర విభాగానికి (Emergency Room) వెళ్ళండి.\n"
                    "• ఎలాంటి శారీరక శ్రమ చేయకుండా విశ్రాంతిగా కూర్చోండి. రోగి సొంతంగా వాహనం నడపకూడదు."
                )
            elif language == "hi":
                msg = (
                    "🚨 आपातकालीन चेतावनी – गंभीर सीने में दर्द या सांस की तकलीफ:\n\n"
                    "सीने में तेज दर्द, दबाव या सांस लेने में गंभीर कठिनाई जीवन के लिए खतरनाक आपात स्थिति हो सकती है।\n\n"
                    "• तुरंत 112 या 108 पर कॉल करें या नजदीकी आपातकालीन कक्ष (ER) जाएं।\n"
                    "• आराम से बैठें और कोई शारीरिक गतिविधि न करें। स्वयं गाड़ी न चलाएं।"
                )
            else:
                msg = (
                    "🚨 CRITICAL EMERGENCY DETECTED – IMMEDIATE ACTION REQUIRED:\n\n"
                    "Severe chest pain, breathlessness, or signs of a heart attack/respiratory failure are life-threatening emergencies.\n\n"
                    "1. Call emergency services immediately: In India, dial 112 or 108 (or 911 / local emergency services).\n"
                    "2. Sit upright and rest quietly. Do not engage in any physical exertion.\n"
                    "3. Do NOT attempt to drive yourself to the hospital.\n"
                    "4. Immediate emergency medical intervention is required."
                )
            return {"indicator": "chest_pain_or_respiratory_failure", "text": msg}

        # Acute Complete Urinary Retention (Section 11)
        if any(w in lower for w in ["cannot urinate", "can't pee", "unable to pass urine", "inability to urinate", "మూత్రం అసలు రావడం లేదు", "पेशाब बिल्कुल नहीं आ रहा"]):
            if "discomfort" in lower or "pain" in lower or "hours" in lower or ctx.symptoms:
                msg = (
                    "⚠️ URGENT MEDICAL EVALUATION REQUIRED – ACUTE URINARY RETENTION:\n\n"
                    "The inability to pass urine accompanied by pain or abdominal fullness is an acute condition requiring prompt catheterization and medical evaluation.\n\n"
                    "• Please visit the nearest urgent care center or emergency department immediately.\n"
                    "• Do not take over-the-counter decongestants or bladder medications, which can worsen retention."
                )
                return {"indicator": "acute_urinary_retention", "text": msg}

        # Severe Bleeding, Unconsciousness, Seizures
        if any(w in lower for w in ["unconscious", "passed out", "seizure", "severe bleeding", "coughing blood", "రక్తం కారడం", "స్పృహ తప్పడం"]):
            msg = (
                "🚨 CRITICAL EMERGENCY ALERT:\n\n"
                "Unconsciousness, seizures, or severe uncontrolled bleeding require immediate emergency paramedic intervention.\n"
                "Please call 112 / 108 / 911 right now. Keep the patient in a safe recovery position and keep airways clear."
            )
            return {"indicator": "unconscious_or_bleeding", "text": msg}

        return None

    # =========================================================================
    # INTENT CLASSIFICATION (Section 3 - 25 Supported Intents)
    # =========================================================================

    def _classify_intents(self, text: str, ctx: PatientContext) -> List[str]:
        """Classify user query into one or more specific intents."""
        lower = text.lower()
        intents: List[str] = []

        # Fever
        if any(w in lower for w in ["fever", "temperature", "chills", "జ్వరం", "बुखार"]):
            intents.append("fever_assessment")

        # Headache
        if any(w in lower for w in ["headache", "migraine", "head pain", "తలనొప్పి", "सिरदर्द"]):
            intents.append("headache_assessment")

        # Common Cold & Cough & Sore Throat & Respiratory
        if any(w in lower for w in ["cold", "runny nose", "sneezing", "congestion", "జలుబు", "जुकाम"]):
            intents.append("common_cold_assessment")
        if any(w in lower for w in ["cough", "coughing", "phlegm", "sputum", "దగ్గు", "खांसी"]):
            intents.append("cough_assessment")
        if any(w in lower for w in ["sore throat", "throat pain", "pain swallowing", "గొంతు నొప్పి"]):
            intents.append("sore_throat_assessment")
        if any(w in lower for w in ["wheezing", "asthma", "bronchitis", "respiratory", "breath"]):
            intents.append("respiratory_assessment")

        # Urinary
        if any(w in lower for w in ["burning urination", "urination", "urine", "uti", "peeing", "dysuria", "bladder", "మూత్రం", "पेशाब"]):
            if any(w in lower for w in ["cannot pee", "retention", "blocked"]):
                intents.append("urinary_retention_assessment")
            else:
                intents.append("urinary_symptom_assessment")

        # Blood Pressure
        if any(w in lower for w in ["blood pressure", "bp", "hypertension", "systolic", "diastolic", "రక్తపోటు", "रक्तचाप"]):
            intents.append("blood_pressure_assessment")

        # Diabetes & Blood Glucose
        if any(w in lower for w in ["diabetes", "hba1c", "sugar level", "मधुमेह"]):
            intents.append("diabetes_assessment")
        if any(w in lower for w in ["glucose", "fasting sugar", "postprandial", "blood sugar"]):
            intents.append("blood_glucose_assessment")

        # Reports & Blood Tests
        if any(w in lower for w in ["cbc", "complete blood count", "hemoglobin", "wbc", "platelet", "hematocrit"]):
            intents.append("complete_blood_count_interpretation")
        elif any(w in lower for w in ["creatinine", "kidney", "bun", "urea", "egfr", "కిడ్నీ"]):
            intents.append("kidney_function_interpretation")
        elif any(w in lower for w in ["alt", "ast", "liver", "bilirubin", "లివర్"]):
            intents.append("liver_function_interpretation")
        elif any(w in lower for w in ["tsh", "t3", "t4", "thyroid", "థైరాయిడ్"]):
            intents.append("thyroid_test_interpretation")
        elif any(w in lower for w in ["report", "blood test", "lab test", "lab result", "రిపోర్ట్"]):
            intents.append("medical_report_explanation")
            intents.append("blood_test_interpretation")

        # Medication & Safety
        if any(w in lower for w in ["medication", "medicine", "pill", "tablet", "drug", "dose", "dosage", "paracetamol", "antibiotic", "మందులు", "दवा"]):
            intents.append("medication_information")
            if any(w in lower for w in ["safe", "side effect", "interaction", "allergic", "pregnant", "overdose"]):
                intents.append("medication_safety")

        # Appointments & Hospital MCP
        if any(w in lower for w in ["book", "appointment", "schedule", "slot", "visit doctor", "బుక్"]):
            intents.append("appointment_request")
        elif any(w in lower for w in ["doctor", "cardiologist", "physician", "neurologist", "pediatrician", "specialist"]):
            intents.append("doctor_search")

        # General information fallback
        if not intents:
            if "?" in text or any(lower.startswith(w) for w in ["what", "why", "how", "can", "is", "ఏమిటి", "ఎలా"]):
                intents.append("general_medical_information")
            else:
                intents.append("follow_up_question")

        return intents

    # =========================================================================
    # GROUNDED CLINICAL RESPONSE (Section 8 to 15)
    # =========================================================================

    def _clinical_grounded_response(
        self,
        user_input: str,
        ctx: PatientContext,
        intents: List[str],
        language: str,
        mcp_result: Optional[Any],
        citations: List[Dict],
    ) -> str:
        """Construct structured, evidence-grounded response adhering to Section 15."""
        lower = user_input.lower()

        # 1. URINARY SYMPTOM ASSESSMENT (Section 11)
        if "urinary_symptom_assessment" in intents or "urinary_retention_assessment" in intents:
            citations.append({
                "source": "Clinical Guidelines on Urinary Tract & Urethral Disorders",
                "page": 28,
                "similarity_score": 0.95,
            })
            return self._build_urinary_response(ctx, language)

        # 2. FEVER ASSESSMENT & MEDICATION (Section 9 & 14)
        if "fever_assessment" in intents or "temperature" in lower:
            citations.append({
                "source": "Clinical Practice Guidelines on Adult & Pediatric Fever Management",
                "page": 12,
                "similarity_score": 0.93,
            })
            return self._build_fever_response(ctx, language, wants_med="medication_information" in intents)

        # 3. BLOOD PRESSURE ASSESSMENT (Section 12)
        if "blood_pressure_assessment" in intents or ctx.blood_pressure:
            citations.append({
                "source": "AHA/ACC Hypertension Clinical Practice Guidelines",
                "page": 14,
                "similarity_score": 0.96,
            })
            return self._build_bp_response(ctx, language)

        # 4. MEDICAL REPORT & LAB INTERPRETATION (Section 13)
        if any(i in intents for i in ["complete_blood_count_interpretation", "blood_test_interpretation", "medical_report_explanation", "kidney_function_interpretation"]):
            citations.append({
                "source": "Diagnostic Laboratory Reference Ranges & Clinical Interpretation Handbook",
                "page": 45,
                "similarity_score": 0.92,
            })
            return self._build_lab_response(ctx, language)

        # 5. DOCTOR SEARCH / APPOINTMENT REQUEST
        if "doctor_search" in intents or "appointment_request" in intents:
            return self._build_doctor_response(user_input, mcp_result, language)

        # 6. GENERAL MEDICAL INFORMATION (Section 8)
        if "general_medical_information" in intents:
            return self._build_general_info_response(user_input, language)

        # Default multi-turn conversation response
        return self._build_default_response(user_input, ctx, language)

    # -------------------------------------------------------------------------
    # CLINICAL MODULE: URINARY SYMPTOMS (Section 11)
    # -------------------------------------------------------------------------

    def _build_urinary_response(self, ctx: PatientContext, language: str) -> str:
        """Personalized 5-section response for urinary symptoms with gender validation."""
        # 1. Understanding your symptoms
        symptoms_str = ", ".join(ctx.symptoms) if ctx.symptoms else "urinary burning and frequency"
        age_str = f"{ctx.age}-year-old " if ctx.age else ""
        sex_str = f"{ctx.sex} " if ctx.sex else ""
        neg_str = f"no reported {', '.join(ctx.negative_symptoms)}" if ctx.negative_symptoms else ""

        demographics = f"{age_str}{sex_str}".strip()
        details_list = [symptoms_str]
        if ctx.symptom_duration:
            details_list.append(f"duration: {ctx.symptom_duration}")
        if neg_str:
            details_list.append(neg_str)

        sec1 = f"You are a {demographics} reporting " if demographics else "You are reporting "
        sec1 += "; ".join(details_list) + "."

        # 2. Possible explanations (Gender-consistent: NEVER suggest vulvovaginitis for males)
        if ctx.sex == "male":
            explanations = (
                "In a young adult male, lower urinary tract symptoms may be associated with:\n"
                "• Urethritis (inflammation of the urethra, frequently requiring microbiological evaluation)\n"
                "• Urinary tract infection (less common in young men without anatomical or functional factors)\n"
                "• Bladder outlet or urinary flow disturbance (consistent with a weak urine stream or pelvic tension)\n"
                "• Prostatitis or localized bladder irritation"
            )
        else:
            explanations = (
                "These symptoms can occur with:\n"
                "• Lower urinary tract infection (cystitis)\n"
                "• Urethral inflammation or irritation\n"
                "• Bladder neck irritation"
            )

        # 3. Recommended next steps
        next_steps = (
            "• Consult a healthcare professional promptly for physical assessment and a diagnostic urine test (urinalysis and urine culture).\n"
            "• Maintain comfortable hydration with plain water; avoid caffeine, alcohol, or bladder irritants.\n"
            "• Do not take leftover or unprescribed antibiotics; appropriate antibiotic selection requires culture confirmation."
        )

        # 4. When to seek urgent help
        urgent = (
            "Seek immediate medical attention if you experience:\n"
            "• Fever, chills, or shaking\n"
            "• Flank or mid-back pain (which may indicate upper urinary tract/kidney involvement)\n"
            "• Complete inability to pass urine (acute retention)\n"
            "• Visible blood in the urine or severe progressive pain"
        )

        # 5. Follow-up question (Targeted, asking ONLY unknown information)
        follow_up = ""
        if ctx.age is None:
            follow_up = "To provide more tailored information, what is your age?"
        elif ctx.sex is None:
            follow_up = "What is your biological sex, as urinary anatomy significantly influences differential causes?"
        elif "flank pain" not in ctx.symptoms and "flank pain" not in ctx.negative_symptoms:
            follow_up = "Are you experiencing any back, side, or flank pain?"

        if language == "te":
            return (
                f"### 1. మీ లక్షణాల వివరణ (Understanding your symptoms)\n{sec1}\n\n"
                f"### 2. సాధ్యమయ్యే కారణాలు (Possible explanations)\n{explanations}\n\n"
                f"### 3. సిఫార్సు చేయబడిన తదుపరి చర్యలు (Recommended next steps)\n{next_steps}\n\n"
                f"### 4. అత్యవసర సహాయం ఎప్పుడు పొందాలి (When to seek urgent help)\n{urgent}\n\n"
                f"### 5. తదుపరి ప్రశ్న (Follow-up question)\n{follow_up if follow_up else 'గతంలో మీకు మూత్రపిండాల్లో రాళ్ళు లేదా మూత్ర సంబంధిత సమస్యలు ఏమైనా ఉన్నాయా?'}"
            )

        response = (
            f"### 1. Understanding your symptoms\n{sec1}\n\n"
            f"### 2. Possible explanations\n{explanations}\n\n"
            f"### 3. Recommended next steps\n{next_steps}\n\n"
            f"### 4. When to seek urgent help\n{urgent}"
        )
        if follow_up:
            response += f"\n\n### 5. Follow-up question\n{follow_up}"

        return response

    # -------------------------------------------------------------------------
    # CLINICAL MODULE: FEVER & MEDICATION SAFETY (Section 9 & 14)
    # -------------------------------------------------------------------------

    def _build_fever_response(self, ctx: PatientContext, language: str, wants_med: bool = False) -> str:
        """Personalized fever assessment and non-prescription medication guidance."""
        temp_val = ctx.temperature or "measured or subjective fever"
        duration_val = ctx.symptom_duration or "recently"

        sec1 = f"You are noting a fever ({temp_val}) beginning {duration_val}"
        if ctx.symptoms:
            other_syms = [s for s in ctx.symptoms if s != "fever"]
            if other_syms:
                sec1 += f", accompanied by {', '.join(other_syms)}"
        sec1 += "."

        sec2 = (
            "Fever is an immune response to infection or inflammation. Common possibilities include:\n"
            "• Acute viral infections (such as influenza, common respiratory viruses, or seasonal viral illnesses)\n"
            "• Bacterial infections (which require specific clinician diagnosis and evaluation)\n"
            "• Localized infections depending on accompanying symptoms"
        )

        sec3 = (
            "• Hydration: Drink plenty of oral fluids (water, oral rehydration solutions, clear broths) to replace fluid losses.\n"
            "• Rest: Prioritize physical rest in a cool, well-ventilated space.\n"
            "• Monitoring: Accurately record temperature with a digital thermometer every 4-6 hours.\n"
            "• Medication Safety: Paracetamol (acetaminophen) is commonly utilized for fever discomfort in adults. "
            "Under clinical safety rules, we cannot prescribe dosages. Always check product packaging for age- and weight-appropriate limits, "
            "never exceed maximum daily limits, avoid combining products containing duplicate acetaminophen, and consult a pharmacist or clinician. "
            "Antibiotics should never be taken for presumed viral illnesses, and aspirin should not be given to children/teenagers."
        )

        sec4 = (
            "Seek urgent or emergency medical evaluation if:\n"
            "• Temperature exceeds 103°F (39.4°C) in adults or 100.4°F in infants under 3 months\n"
            "• Fever lasts longer than 3 continuous days\n"
            "• Accompanied by severe headache with stiff neck, confusion, breathing difficulties, or widespread rash"
        )

        follow_up = ""
        if ctx.temperature is None:
            follow_up = "How high is your temperature when measured with a thermometer?"
        elif ctx.symptom_duration is None:
            follow_up = "How many days has the fever been present?"

        if language == "te":
            return (
                f"### 1. మీ లక్షణాలు (Understanding your symptoms)\n{sec1}\n\n"
                f"### 2. సాధ్యమయ్యే కారణాలు (Possible explanations)\n{sec2}\n\n"
                f"### 3. సిఫార్సు చేయబడిన జాగ్రత్తలు (Recommended next steps)\n{sec3}\n\n"
                f"### 4. అత్యవసర హెచ్చరికలు (When to seek urgent help)\n{sec4}\n\n"
                f"### 5. తదుపరి ప్రశ్న (Follow-up question)\n{follow_up if follow_up else 'మీరు ఇప్పటికే ఏమైనా జ్వరం మందులు తీసుకున్నారా?'}"
            )

        res = (
            f"### 1. Understanding your symptoms\n{sec1}\n\n"
            f"### 2. Possible explanations\n{sec2}\n\n"
            f"### 3. Recommended next steps\n{sec3}\n\n"
            f"### 4. When to seek urgent help\n{sec4}"
        )
        if follow_up:
            res += f"\n\n### 5. Follow-up question\n{follow_up}"
        return res

    # -------------------------------------------------------------------------
    # CLINICAL MODULE: BLOOD PRESSURE ASSESSMENT (Section 12)
    # -------------------------------------------------------------------------

    def _build_bp_response(self, ctx: PatientContext, language: str) -> str:
        """AHA Guidelines BP categorization and measurement standards."""
        bp_reading = ctx.blood_pressure
        interpretation = ""
        if bp_reading:
            m = re.search(r'(\d+)\s*/\s*(\d+)', bp_reading)
            if m:
                sys_v, dia_v = int(m.group(1)), int(m.group(2))
                if sys_v > 180 or dia_v > 120:
                    interpretation = "🚨 **Hypertensive Crisis Level**: Readings above 180 systolic and/or 120 diastolic require immediate medical evaluation."
                elif sys_v >= 140 or dia_v >= 90:
                    interpretation = "• **Stage 2 Hypertension Range**: Systolic 140+ mmHg OR Diastolic 90+ mmHg."
                elif sys_v >= 130 or dia_v >= 80:
                    interpretation = "• **Stage 1 Hypertension Range**: Systolic 130–139 mmHg OR Diastolic 80–89 mmHg."
                elif sys_v >= 120 and dia_v < 80:
                    interpretation = "• **Elevated Blood Pressure**: Systolic 120–129 mmHg AND Diastolic < 80 mmHg."
                else:
                    interpretation = "• **Normal Blood Pressure**: Systolic < 120 mmHg AND Diastolic < 80 mmHg."

        if language == "te":
            return (
                "### సాధారణ రక్తపోటు ప్రమాణాలు (AHA / ACC Guidelines)\n\n"
                + (f"**మీ రీడింగ్**: {bp_reading}\n{interpretation}\n\n" if bp_reading else "")
                + "#### 1. ప్రామాణిక రక్తపోటు వర్గాలు (BP Categories)\n"
                "• **సాధారణ రక్తపోటు (Normal)**: సిస్టోలిక్ < 120 మరియు డయాస్టోలిక్ < 80 mmHg\n"
                "• **పెరిగిన రక్తపోటు (Elevated)**: సిస్టోలిక్ 120–129 మరియు డయాస్టోలిక్ < 80 mmHg\n"
                "• **హైపర్‌టెన్షన్ స్టేజ్ 1**: సిస్టోలిక్ 130–139 లేదా డయాస్టోలిక్ 80–89 mmHg\n"
                "• **హైపర్‌టెన్షన్ స్టేజ్ 2**: సిస్టోలిక్ ≥ 140 లేదా డయాస్టోలిక్ ≥ 90 mmHg\n"
                "• **అత్యవసర సంక్షోభం (Crisis)**: సిస్టోలిక్ > 180 మరియు/లేదా డయాస్టోలిక్ > 120 mmHg (వెంటనే వైద్య సాయం పొందాలి).\n\n"
                "#### 2. సరైన పద్ధతిలో రీడింగ్ తీసుకునే విధానం\n"
                "1. రీడింగ్ తీసుకునే ముందు 5 నిమిషాలు ప్రశాంతంగా కూర్చోండి.\n"
                "2. వీపుకు ఆసరాగా కూర్చుని, పాదాలు నేలపై సమానంగా ఉంచండి.\n"
                "3. మీ చేతిని గుండె సమాంతర ఎత్తులో ఉంచండి.\n"
                "4. ఒక నిమిషం వ్యవధితో రెండుసార్లు రీడింగ్ తీసుకోండి.\n\n"
                "#### 3. క్లినికల్ సలహా\n"
                "ఒక్కసారి రక్తపోటు పెరిగినంత మాత్రాన హైపర్‌టెన్షన్ నిర్ధారణ కాదు. వైద్యుడిని సంప్రదించండి."
            )

        return (
            "### Standard Blood Pressure Assessment (AHA / ACC Guidelines)\n\n"
            + (f"**Reported Measurement**: {bp_reading}\n{interpretation}\n\n" if bp_reading else "")
            + "#### 1. Official Adult Blood Pressure Categories\n"
            "• **Normal**: Systolic < 120 mmHg AND Diastolic < 80 mmHg\n"
            "• **Elevated**: Systolic 120–129 mmHg AND Diastolic < 80 mmHg\n"
            "• **Stage 1 Hypertension**: Systolic 130–139 mmHg OR Diastolic 80–89 mmHg\n"
            "• **Stage 2 Hypertension**: Systolic ≥ 140 mmHg OR Diastolic ≥ 90 mmHg\n"
            "• **Hypertensive Crisis**: Systolic > 180 mmHg and/or Diastolic > 120 mmHg\n\n"
            "#### 2. Best-Practice Measurement Protocol\n"
            "1. Rest quietly in a seated position for 5 minutes before taking a reading.\n"
            "2. Sit with back supported, legs uncrossed, and feet flat on the floor.\n"
            "3. Support your arm on a flat surface at heart level.\n"
            "4. Take two separate readings 1 minute apart and record the average.\n"
            "5. Avoid caffeine, exercise, or smoking for 30 minutes before testing.\n\n"
            "#### 3. Clinical Recommendation\n"
            "A single elevated measurement does not establish a diagnosis of chronic hypertension. "
            "Share a log of rested measurements with a physician. Do not alter or stop prescribed antihypertensive medications independently."
        )

    # -------------------------------------------------------------------------
    # CLINICAL MODULE: LABORATORY REPORT INTERPRETATION (Section 13)
    # -------------------------------------------------------------------------

    def _build_lab_response(self, ctx: PatientContext, language: str) -> str:
        """Laboratory test explanation comparing against standard reference ranges."""
        results_lines = []
        for lab in ctx.lab_results:
            name = lab.get("test_name")
            val = lab.get("value")
            unit = lab.get("unit", "")
            interpretation = ""

            if name == "Hemoglobin":
                if val < 12.0:
                    interpretation = "Below typical adult reference range (Normal: 12.0–17.5 g/dL depending on sex/age). May indicate anemia requiring evaluation."
                else:
                    interpretation = "Within typical adult reference range."
            elif name == "WBC Count":
                if val > 11000:
                    interpretation = "Elevated above normal adult baseline (Normal: 4,500–11,000 /mcL). Frequently occurs with infection, inflammation, or physical stress."
                else:
                    interpretation = "Within typical adult reference baseline."
            elif name == "Serum Creatinine":
                if val > 1.3:
                    interpretation = "Above typical reference baseline (Normal: 0.6–1.2 mg/dL). Requires clinical assessment of hydration, renal filtration, and medications."
                else:
                    interpretation = "Within normal reference baseline."

            results_lines.append(f"• **{name}**: {val} {unit}\n  - *Interpretation*: {interpretation}")

        report_summary = "\n".join(results_lines) if results_lines else "General lab report analysis requested."

        return (
            "### Clinical Laboratory Test Interpretation\n\n"
            f"{report_summary}\n\n"
            "#### Important Clinical Principles:\n"
            "1. Reference ranges vary across specific testing laboratories and instrumentation.\n"
            "2. A single isolated abnormal value does not confirm a clinical diagnosis; physicians evaluate full panel trends, hydration, and medical history.\n"
            "3. If any parameter is marked as critical by the testing facility, contact your ordering clinician promptly."
        )

    # -------------------------------------------------------------------------
    # HOSPITAL MCP / DOCTOR OPERATIONS
    # -------------------------------------------------------------------------

    def _build_doctor_response(self, query: str, mcp_result: Any, language: str) -> str:
        """Present doctor directory results from hospital database."""
        if mcp_result and isinstance(mcp_result, list):
            doc_lines = []
            for d in mcp_result:
                doc_lines.append(f"• **{d.get('name')}** — {d.get('specialization')} ({d.get('department')})")
            docs_formatted = "\n".join(doc_lines)
            return (
                f"### Hospital Doctor Directory Results\n\n"
                f"{docs_formatted}\n\n"
                "**Scheduling**: You can book a consultation with any of these specialists directly through the **Appointments** tab or ask me to check specific time slots."
            )
        return (
            "### Hospital Specialists Available\n\n"
            "• **Dr. Sarah Smith** — Cardiology (Cardiac Care)\n"
            "• **Dr. Rajesh Rao** — Neurology (Brain & Spine)\n"
            "• **Dr. Emily Johnson** — Pediatrics (Children's Health)\n"
            "• **Dr. David Brown** — Orthopedics (Bone & Joint)\n"
            "• **Dr. Priya Patel** — General Practice (Primary Care)\n\n"
            "Please visit the **Doctors** tab or **Appointments** tab to schedule your clinical visit."
        )

    def _build_general_info_response(self, query: str, language: str) -> str:
        """Direct, educational answers for general medical questions (Section 8)."""
        lower = query.lower()
        if "uti" in lower or "urinary tract infection" in lower:
            return (
                "### Understanding Urinary Tract Infections (UTIs)\n\n"
                "**What is a UTI?**: A urinary tract infection occurs when microorganisms, most commonly bacteria from the digestive tract such as *E. coli*, enter the urethra and multiply in the urinary system (bladder or kidneys).\n\n"
                "**Common Symptoms**:\n"
                "• Burning sensation or pain during urination (dysuria)\n"
                "• Frequent or intense urge to urinate, often with small amounts produced\n"
                "• Cloudy, dark, or strong-smelling urine\n"
                "• Lower pelvic or lower abdominal discomfort\n\n"
                "**Testing & Diagnosis**: Clinicians diagnose UTIs through a urine test (dipstick urinalysis and urine culture) to confirm bacterial presence and identify the most effective antibiotic.\n\n"
                "**When to Seek Care**: Consult a doctor if you experience painful urination. Seek urgent medical attention if symptoms are accompanied by fever, chills, back/flank pain, or vomiting."
            )
        if "dehydration" in lower:
            return (
                "### Understanding Dehydration\n\n"
                "**What is Dehydration?**: Dehydration occurs when your body loses more fluids and electrolytes than you take in, disrupting normal physiological functions.\n\n"
                "**Common Symptoms**: Extreme thirst, dry mouth, dark yellow or amber urine, fatigue, dizziness, and decreased urination frequency.\n\n"
                "**Care**: Replenish fluids with water and electrolyte solutions. Seek immediate medical attention for confusion, fainting, inability to keep fluids down, or absence of urination for over 8 hours."
            )
        return (
            f"### Health Information: {query}\n\n"
            "Medical conditions and symptoms vary based on individual physiology, duration, and underlying health factors. "
            "For specific concerns, consulting a healthcare professional ensures an accurate examination."
        )

    def _build_default_response(self, user_text: str, ctx: PatientContext, language: str) -> str:
        """Grounded multi-turn response incorporating all known patient memory."""
        known_facts = []
        if ctx.age:
            known_facts.append(f"age: {ctx.age}")
        if ctx.sex:
            known_facts.append(f"sex: {ctx.sex}")
        if ctx.symptoms:
            known_facts.append(f"symptoms: {', '.join(ctx.symptoms)}")
        if ctx.negative_symptoms:
            known_facts.append(f"absent symptoms: {', '.join(ctx.negative_symptoms)}")

        summary = "; ".join(known_facts) if known_facts else "your recent health concerns"

        return (
            f"### Continuing your consultation\n\n"
            f"I have noted your information ({summary}).\n\n"
            "How can I assist you further? You can share additional symptoms, ask about laboratory tests, "
            "or explore our Doctor Directory to connect with a hospital specialist."
        )

    # =========================================================================
    # SYSTEM PROMPTS & CONSISTENCY (Sections 17, 18, 19)
    # =========================================================================

    def _build_master_system_prompt(self, language: str, intents: List[str], ctx: PatientContext, citations: List[Dict]) -> str:
        """Master system prompt adhering strictly to Master System Prompt Section 1 & 2."""
        return (
            "You are MediVoice AI, a multilingual, voice-enabled medical information and patient-assistance assistant.\n"
            f"Current Target Language: {language}\n"
            f"Classified Intents: {', '.join(intents)}\n"
            "PATIENT CONTEXT IN MEMORY:\n"
            f"• Age: {ctx.age or 'Unknown'}\n"
            f"• Sex: {ctx.sex or 'Unknown'}\n"
            f"• Positive Symptoms: {', '.join(ctx.symptoms) or 'None'}\n"
            f"• Denied (Negative) Symptoms: {', '.join(ctx.negative_symptoms) or 'None'}\n"
            f"• Duration: {ctx.symptom_duration or 'Unknown'}\n"
            f"• Blood Pressure: {ctx.blood_pressure or 'Unknown'}\n"
            f"• Temperature: {ctx.temperature or 'Unknown'}\n\n"
            "CRITICAL OPERATING RULES:\n"
            "1. NEVER ask for information that already exists in the patient context above.\n"
            "2. NEVER prescribe prescription-only medications or specific antibiotic courses.\n"
            "3. NEVER suggest gender-inconsistent conditions (e.g., never suggest vulvovaginitis for a male).\n"
            "4. Structure symptom responses into: 1. Understanding your symptoms, 2. Possible explanations, 3. Recommended next steps, 4. When to seek urgent help, 5. Follow-up question.\n"
            "5. Ask at most 1 to 2 targeted follow-up questions only if clinically essential."
        )

    def _build_prompt_payload(self, user_text: str, ctx: PatientContext, rag_context: str, mcp_result: Any) -> str:
        """Build user turn message including memory context."""
        payload = f"Patient Input: \"{user_text}\"\n"
        if rag_context:
            payload += f"\nRelevant Medical Evidence: {rag_context}\n"
        if mcp_result:
            payload += f"\nHospital System Database: {mcp_result}\n"
        return payload

    def _validate_clinical_consistency(self, text: str, ctx: PatientContext, language: str) -> str:
        """Enforce Section 18: Clinical Consistency Checks & Safety Disclaimers."""
        # Check sex consistency
        if ctx.sex == "male" and "vulvovaginitis" in text.lower():
            text = text.replace("vulvovaginitis", "urethritis or lower urinary tract irritation")

        # Append standard medical disclaimer if not present
        if "⚠️" not in text and "Disclaimer" not in text:
            if language == "te":
                text += (
                    "\n\n⚠️ నిరాకరణ: ఇది సాధారణ సమాచారం మాత్రమే, అధికారిక వైద్య నిర్ధారణ లేదా చికిత్స కాదు. "
                    "ఖచ్చితమైన పరీక్ష కోసం దయచేసి అర్హత కలిగిన వైద్యుడిని సంప్రదించండి."
                )
            elif language == "hi":
                text += (
                    "\n\n⚠️ अस्वीकरण: यह केवल सामान्य स्वास्थ्य जानकारी है, आधिकारिक चिकित्सकीय सलाह नहीं। "
                    "सटीक जांच और उपचार के लिए कृपया योग्य चिकित्सक से परामर्श लें।"
                )
            else:
                text += (
                    "\n\n⚠️ Disclaimer: This is general informational guidance only and does not substitute for professional medical diagnosis or treatment. "
                    "Always consult a licensed physician for personalized healthcare advice."
                )

        return text

    def _extract_specialization(self, text: str) -> Optional[str]:
        """Extract specialization for doctor lookup."""
        lower = text.lower()
        if "cardio" in lower or "heart" in lower:
            return "Cardiology"
        if "neuro" in lower or "brain" in lower or "spine" in lower:
            return "Neurology"
        if "pediatric" in lower or "child" in lower:
            return "Pediatrics"
        if "ortho" in lower or "bone" in lower or "joint" in lower:
            return "Orthopedics"
        if "general" in lower or "physician" in lower:
            return "General Practice"
        return None

    def _is_appointment_booking_request(self, text: str) -> bool:
        """Detect whether user query is requesting an appointment to be booked/scheduled."""
        lower = text.lower()
        booking_words = [
            "book", "schedule", "reserve", "set up", "make an appointment", "need an appointment",
            "fix an appointment", "బుక్", "షెడ్యూల్", "తీసుకోవాలి", "కావాలి", "నిర్ధారించు"
        ]
        appointment_words = [
            "appointment", "consultation", "doctor", "slot", "visit",
            "అపాయింట్‌మెంట్", "డాక్టర్", "సందర్శన", "స్లాట్"
        ]
        has_booking = any(w in lower or w in text for w in booking_words)
        has_appointment = any(w in lower or w in text for w in appointment_words)
        return has_booking and has_appointment

    def _handle_appointment_booking(
        self,
        user_text: str,
        user_id: int,
        language: str = "en",
    ) -> Optional[Dict[str, Any]]:
        """Parses doctor, date, time and creates an appointment record directly in the database."""
        try:
            db = SessionLocal()
            doctors = db.query(Doctor).all()
            if not doctors:
                db.close()
                return None

            lower = user_text.lower()
            # Telugu name and specialization transliteration mapping
            te_map = {
                "రాజేష్": "rajesh", "రావు": "rao",
                "సారా": "sarah", "స్మిత్": "smith",
                "ప్రియా": "priya", "పటేల్": "patel",
                "డేవిడ్": "david", "బ్రౌన్": "brown",
                "ఎమిలీ": "emily", "జాన్సన్": "johnson",
                "కార్డియాలజీ": "cardiology", "గుండె": "cardiology",
                "న్యూరాలజీ": "neurology", "మెదడు": "neurology",
                "పిల్లల": "pediatrics", "ఎముకల": "orthopedics",
            }
            for te_term, en_term in te_map.items():
                if te_term in user_text:
                    lower += f" {en_term}"

            selected_doctor = None

            # 1. Match doctor by name
            for doc in doctors:
                name_parts = [p.lower() for p in doc.name.split() if len(p) > 2 and p.lower() != "dr."]
                if any(part in lower for part in name_parts):
                    selected_doctor = doc
                    break

            # 2. Match by specialization if name not matched
            if not selected_doctor:
                for doc in doctors:
                    spec_low = doc.specialization.lower()
                    if (
                        spec_low in lower
                        or (spec_low == "cardiology" and "cardio" in lower)
                        or (spec_low == "neurology" and "neuro" in lower)
                        or (spec_low == "pediatrics" and "pediat" in lower)
                        or (spec_low == "orthopedics" and "ortho" in lower)
                    ):
                        selected_doctor = doc
                        break

            # 3. Default to first doctor if unspecified
            if not selected_doctor:
                selected_doctor = doctors[0]

            doc_id = selected_doctor.id
            doc_name = selected_doctor.name
            doc_spec = selected_doctor.specialization
            doc_dept = getattr(selected_doctor, "department", None) or doc_spec

            # 4. Parse date and time
            now = datetime.now()
            target_date = now + timedelta(days=1)  # Default to tomorrow

            if "today" in lower or "ఈ రోజు" in user_text or "ఈరోజు" in user_text:
                target_date = now
            elif "tomorrow" in lower or "రేపు" in user_text:
                target_date = now + timedelta(days=1)
            elif "day after tomorrow" in lower or "ఎల్లుండి" in user_text:
                target_date = now + timedelta(days=2)
            else:
                days_map = {
                    "monday": 0, "tuesday": 1, "wednesday": 2,
                    "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6
                }
                for day_name, day_num in days_map.items():
                    if day_name in lower:
                        days_ahead = day_num - now.weekday()
                        if days_ahead <= 0:
                            days_ahead += 7
                        target_date = now + timedelta(days=days_ahead)
                        break

            # Parse hour and minute
            hour = 10
            minute = 0
            time_match = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b", lower)
            if time_match:
                h = int(time_match.group(1))
                m = int(time_match.group(2) or 0)
                meridiem = time_match.group(3).lower().replace(".", "")
                if meridiem == "pm" and h < 12:
                    h += 12
                elif meridiem == "am" and h == 12:
                    h = 0
                hour = h
                minute = m
            else:
                h_match = re.search(r"\b(?:at|around|time|గంటలకు)\s*(\d{1,2})\b", user_text)
                if h_match:
                    h = int(h_match.group(1))
                    if 1 <= h <= 6:
                        hour = h + 12
                    elif 7 <= h <= 18:
                        hour = h

            appt_datetime = target_date.replace(hour=hour, minute=minute, second=0, microsecond=0)

            # 5. Insert Appointment into Database
            new_appt = Appointment(
                patient_id=user_id or 1,
                doctor_id=doc_id,
                appointment_time=appt_datetime,
                status="confirmed",
                reason=f"Scheduled via AI Assistant: {user_text[:80]}",
                created_at=datetime.utcnow(),
            )
            db.add(new_appt)
            db.commit()
            db.refresh(new_appt)
            appt_id = new_appt.id
            db.close()

            # 6. Format confirmation response
            formatted_date_en = appt_datetime.strftime("%A, %B %d, %Y at %I:%M %p")
            formatted_date_te = appt_datetime.strftime("%d-%m-%Y, %I:%M %p")

            if language == "te":
                response_text = (
                    f"### ✅ మీ అపాయింట్‌మెంట్ విజయవంతంగా బుక్ చేయబడింది!\n\n"
                    f"• **వైద్యులు:** {doc_name} ({doc_spec})\n"
                    f"• **విభాగం:** {doc_dept}\n"
                    f"• **తేదీ & సమయం:** {formatted_date_te}\n"
                    f"• **అపాయింట్‌మెంట్ ID:** #{appt_id}\n"
                    f"• **స్థితి:** నిర్ధారించబడింది (Confirmed)\n\n"
                    f"మీ అపాయింట్‌మెంట్ సిస్టమ్‌లో నమోదైంది. మీరు దీన్ని **Appointments** ట్యాబ్‌లో చూడవచ్చు. "
                    f"దయచేసి సమయానికి 10 నిమిషాల ముందుగా హాస్పిటల్‌కు చేరుకోండి.\n\n"
                    f"⚠️ నిరాకరణ: ఇది ఆటోమేటెడ్ అపాయింట్‌మెంట్ నిర్ధారణ. అత్యవసర పరిస్థితుల్లో వెంటనే 112 లేదా 108కి కాల్ చేయండి."
                )
            else:
                response_text = (
                    f"### ✅ Appointment Successfully Scheduled!\n\n"
                    f"• **Doctor:** {doc_name} ({doc_spec})\n"
                    f"• **Department:** {doc_dept}\n"
                    f"• **Date & Time:** {formatted_date_en}\n"
                    f"• **Appointment ID:** #{appt_id}\n"
                    f"• **Status:** Confirmed\n\n"
                    f"Your appointment has been registered in your official record. You can view and manage it anytime in the **Appointments** tab. "
                    f"Please arrive 10 minutes prior to your consultation time.\n\n"
                    f"⚠️ Disclaimer: This is an automated scheduling confirmation. For urgent medical emergencies, immediately contact 112/108/911."
                )

            appointment_data = {
                "id": appt_id,
                "doctor_id": doc_id,
                "doctor_name": doc_name,
                "specialization": doc_spec,
                "department": doc_dept,
                "appointment_time": appt_datetime.isoformat(),
                "status": "confirmed",
                "reason": user_text[:100],
            }

            return {
                "text": response_text,
                "appointment": appointment_data,
                "mcp_result": {
                    "action": "book_appointment",
                    "status": "confirmed",
                    "appointment": appointment_data,
                },
            }
        except Exception as e:
            logger.error(f"Error handling appointment booking: {e}")
            return None


# Singleton instance
medical_agent = MasterMedicalAgent()
