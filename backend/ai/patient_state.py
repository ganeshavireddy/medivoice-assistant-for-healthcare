"""
MediVoice AI - Patient Conversation State & Memory Module

Implements Section 4 (Conversation Memory and Patient State) of the Master System Prompt:
Maintains structured persistent context across conversation turns:
- Age & Sex
- Positive & Negative (denied) symptoms
- Symptom duration & severity
- Physiological measurements (temperature, blood pressure, heart rate)
- Medical history, medications, allergies, laboratory results
- Question tracking to prevent asking repetitive questions
"""

import re
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class PatientContext:
    """Structured patient context representation."""

    def __init__(self, patient_id: int):
        self.patient_id = patient_id
        self.age: Optional[int] = None
        self.sex: Optional[str] = None
        self.symptoms: List[str] = []
        self.negative_symptoms: List[str] = []
        self.symptom_duration: Optional[str] = None
        self.severity: Optional[str] = None
        self.temperature: Optional[str] = None
        self.blood_pressure: Optional[str] = None
        self.heart_rate: Optional[str] = None
        self.medical_history: List[str] = []
        self.current_medications: List[str] = []
        self.allergies: List[str] = []
        self.lab_results: List[Dict[str, Any]] = []
        self.previous_questions: List[str] = []
        self.answered_questions: List[str] = []
        self.pending_questions: List[str] = []
        self.emergency_indicators: List[str] = []
        self.conversation_summary: str = ""
        self.turns: List[Dict[str, str]] = []
        self.last_updated: datetime = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert state to schema dictionary."""
        return {
            "patient_id": self.patient_id,
            "age": self.age,
            "sex": self.sex,
            "symptoms": list(self.symptoms),
            "negative_symptoms": list(self.negative_symptoms),
            "symptom_duration": self.symptom_duration,
            "severity": self.severity,
            "temperature": self.temperature,
            "blood_pressure": self.blood_pressure,
            "heart_rate": self.heart_rate,
            "medical_history": list(self.medical_history),
            "current_medications": list(self.current_medications),
            "allergies": list(self.allergies),
            "lab_results": list(self.lab_results),
            "previous_questions": list(self.previous_questions),
            "answered_questions": list(self.answered_questions),
            "pending_questions": list(self.pending_questions),
            "emergency_indicators": list(self.emergency_indicators),
            "conversation_summary": self.conversation_summary,
        }


class PatientStateManager:
    """Manages active conversation states for patients."""

    def __init__(self):
        self._states: Dict[int, PatientContext] = {}

    def get_context(self, patient_id: int) -> PatientContext:
        """Get or initialize context for patient."""
        if patient_id not in self._states:
            self._states[patient_id] = PatientContext(patient_id)
        return self._states[patient_id]

    def reset_context(self, patient_id: int) -> PatientContext:
        """Clear patient context for a new session."""
        self._states[patient_id] = PatientContext(patient_id)
        return self._states[patient_id]

    def update_from_message(self, patient_id: int, user_message: str) -> PatientContext:
        """Extract structured medical information from patient message."""
        ctx = self.get_context(patient_id)
        text = user_message.strip()
        lower = text.lower()

        # 1. Age extraction (e.g., "23 years old", "23 year old", "23M", "age 45", "45 yo")
        age_match = re.search(r'\b(?:i am|i\'m|age:?|aged)?\s*(\d{1,3})\s*(?:years old|year old|yo|y\.o\.|\-year\-old)\b', lower)
        if not age_match:
            age_match = re.search(r'\b(\d{1,3})\s*(?:m|f|male|female)\b', lower)
        if age_match:
            try:
                age_val = int(age_match.group(1))
                if 0 <= age_val <= 120:
                    ctx.age = age_val
            except ValueError:
                pass

        # 2. Sex extraction
        if re.search(r'\b(male|man|boy|gentleman|పురుషుడు|మగ)\b', lower):
            ctx.sex = "male"
        elif re.search(r'\b(female|woman|girl|lady|స్త్రీ|ఆడ)\b', lower):
            ctx.sex = "female"

        # 3. Temperature extraction (e.g. 102°F, 102 F, 38.5 C, temperature of 102)
        temp_match = re.search(r'(\d{2,3}(?:\.\d+)?)\s*(?:°\s*[fc]|f|c|degrees|deg)?(?:\s*fever|\s*temp)?', lower)
        if temp_match:
            val = float(temp_match.group(1))
            if 95 <= val <= 108:
                ctx.temperature = f"{val}°F"
            elif 35 <= val <= 43:
                ctx.temperature = f"{val}°C"

        # 4. Blood pressure extraction (e.g., 155/98, 120/80 mmHg)
        bp_match = re.search(r'(\d{2,3})\s*/\s*(\d{2,3})(?:\s*mmhg)?', lower)
        if bp_match:
            sys_val = int(bp_match.group(1))
            dia_val = int(bp_match.group(2))
            if 60 <= sys_val <= 260 and 40 <= dia_val <= 160:
                ctx.blood_pressure = f"{sys_val}/{dia_val} mmHg"

        # 5. Symptom duration (e.g. since yesterday, for 3 days, past 2 weeks)
        duration_match = re.search(r'(?:since|for|past|over the last)\s+([a-zA-Z0-9\s]+?(?:days?|weeks?|months?|hours?|yesterday|morning|night))', lower)
        if duration_match:
            ctx.symptom_duration = duration_match.group(0).strip()

        # 6. Negative symptoms (explicitly denied symptoms)
        # e.g., "no fever", "don't have fever", "do not have fever", "no chills", "without back pain"
        neg_patterns = [
            (r'(?:no|don\'t have|do not have|haven\'t had|without|denies?)\s+(fever|chills|cough|headache|back pain|flank pain|nausea|vomiting|rash|chest pain|blood in urine)', r'\1'),
            (r'(fever|chills|cough|headache|pain)\s+(?:is absent|not present|లేదు)', r'\1'),
        ]
        for pat, group_ref in neg_patterns:
            for match in re.finditer(pat, lower):
                symptom_denied = match.group(1).strip()
                if symptom_denied not in ctx.negative_symptoms:
                    ctx.negative_symptoms.append(symptom_denied)
                # Remove from positive symptoms if previously added erroneously
                if symptom_denied in ctx.symptoms:
                    ctx.symptoms.remove(symptom_denied)

        # 7. Positive symptoms extraction
        symptom_dict = {
            "burning urination": ["burning urination", "burning during urination", "burning while urinating", "burning when urinating", "painful urination", "dysuria", "మంట"],
            "frequent urination": ["frequent urination", "peeing often", "urinating often", "frequency", "ఎక్కువసార్లు మూత్రం"],
            "weak urine stream": ["weak urine stream", "weak stream", "slow stream", "dribbling", "సన్నని ధార"],
            "lower abdominal pain": ["lower abdominal pain", "lower belly pain", "pelvic pain", "కడుపు నొప్పి"],
            "fever": ["fever", "feeling feverish", "high temperature", "chills", "జ్వరం"],
            "headache": ["headache", "head pain", "migraine", "తలనొప్పి"],
            "cough": ["cough", "coughing", "dry cough", "productive cough", "దగ్గు"],
            "sore throat": ["sore throat", "throat pain", "pain swallowing", "గొంతు నొప్పి"],
            "chest pain": ["chest pain", "tightness in chest", "pressure in chest", "ఛాతీ నొప్పి"],
            "breathlessness": ["breathlessness", "difficulty breathing", "shortness of breath", "dyspnea", "శ్వాస ఆడటం లేదు"],
            "body pain": ["body pain", "body ache", "muscle pain", "myalgia", "ఒళ్ళు నొప్పులు"],
            "blood in urine": ["blood in urine", "red urine", "hematuria"],
            "flank pain": ["flank pain", "back pain near kidneys", "kidney pain"],
            "palpitations": ["palpitation", "heart racing", "fluttering heart", "గుండె దడ"],
            "dizziness": ["dizziness", "dizzy", "lightheaded", "తలతిరగడం"],
            "nausea": ["nausea", "queasy", "వాంతులు"],
        }

        for sym_name, triggers in symptom_dict.items():
            if any(t in lower for t in triggers):
                # Verify not negated
                if sym_name not in ctx.negative_symptoms and not any(f"no {t}" in lower or f"not {t}" in lower for t in triggers):
                    if sym_name not in ctx.symptoms:
                        ctx.symptoms.append(sym_name)

        # 8. Laboratory test values extraction
        lab_patterns = [
            (r'hemoglobin\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)\s*(g/dl)?', "Hemoglobin", "g/dL"),
            (r'wbc\s*(?:count)?\s*(?:is|:|=)?\s*(\d+(?:,\d+)?)\s*(/mcl|\/ul)?', "WBC Count", "/mcL"),
            (r'platelets?\s*(?:count)?\s*(?:is|:|=)?\s*(\d+(?:,\d+)?)\s*(/mcl|\/ul)?', "Platelet Count", "/mcL"),
            (r'creatinine\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)\s*(mg/dl)?', "Serum Creatinine", "mg/dL"),
            (r'hba1c\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)\s*%?', "HbA1c", "%"),
            (r'(?:fasting|random)?\s*(?:blood)?\s*glucose\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)\s*(mg/dl)?', "Blood Glucose", "mg/dL"),
            (r'tsh\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)\s*(miu/l|uiu/ml)?', "TSH", "mIU/L"),
        ]

        for pat, test_name, default_unit in lab_patterns:
            m = re.search(pat, lower)
            if m:
                val = m.group(1).replace(',', '')
                existing = [x for x in ctx.lab_results if x.get("test_name") == test_name]
                if not existing:
                    ctx.lab_results.append({
                        "test_name": test_name,
                        "value": float(val) if '.' in val else int(val),
                        "unit": default_unit,
                    })

        # 9. Medications extraction
        med_keywords = ["paracetamol", "acetaminophen", "ibuprofen", "aspirin", "amoxicillin", "metformin", "amlodipine", "azithromycin"]
        for med in med_keywords:
            if med in lower and med not in ctx.current_medications:
                ctx.current_medications.append(med)

        ctx.last_updated = datetime.utcnow()
        return ctx

    def record_turn(self, patient_id: int, user_message: str, assistant_message: str):
        """Record conversation turn."""
        ctx = self.get_context(patient_id)
        ctx.turns.append({"user": user_message, "assistant": assistant_message})


patient_state_manager = PatientStateManager()
