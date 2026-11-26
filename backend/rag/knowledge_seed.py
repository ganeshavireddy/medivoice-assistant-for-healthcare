"""
MediVoice AI - Medical Knowledge Base Seed Data

Contains evidence-grounded clinical guideline documents matching official
standards (ACC/AHA, ADA, ATA, WHO, CDC) to populate ChromaDB.
"""

from typing import List, Dict, Any

CLINICAL_KNOWLEDGE_DOCUMENTS: List[Dict[str, Any]] = [
    {
        "id": "hypertension_guidelines_2023",
        "title": "ACC/AHA Clinical Guidelines for High Blood Pressure in Adults",
        "source": "hypertension_guidelines_2023",
        "page": 1,
        "content": (
            "ACC/AHA Hypertension Diagnostic Criteria and Blood Pressure Categories: "
            "Normal Blood Pressure: Systolic less than 120 mmHg and diastolic less than 80 mmHg. "
            "Elevated Blood Pressure: Systolic 120-129 mmHg and diastolic less than 80 mmHg. "
            "Stage 1 Hypertension: Systolic 130-139 mmHg or diastolic 80-89 mmHg. "
            "Stage 2 Hypertension: Systolic 140 mmHg or higher, or diastolic 90 mmHg or higher. "
            "Hypertensive Crisis: Systolic over 180 mmHg and/or diastolic over 120 mmHg requiring prompt medical attention. "
            "Home blood pressure monitoring: Check twice daily (morning before medication, evening before dinner) seated quietly for 5 minutes."
        ),
    },
    {
        "id": "diabetes_management_v2",
        "title": "ADA Standards of Medical Care in Diabetes - Diagnostic Criteria",
        "source": "diabetes_management_v2",
        "page": 1,
        "content": (
            "American Diabetes Association (ADA) Diagnostic Criteria for Diabetes Mellitus: "
            "Normal Hemoglobin A1c (HbA1c): Below 5.7 percent. Normal fasting plasma glucose: 70 to 99 mg/dL. "
            "Pre-diabetes: HbA1c 5.7 percent to 6.4 percent, or impaired fasting glucose 100 to 125 mg/dL. "
            "Diabetes Mellitus: HbA1c 6.5 percent or higher on two separate tests, or fasting plasma glucose 126 mg/dL or higher. "
            "Oral Glucose Tolerance Test (OGTT): 2-hour plasma glucose 140-199 mg/dL indicates prediabetes; 200 mg/dL or higher indicates diabetes. "
            "Lifestyle interventions: 150 minutes per week of moderate physical activity and 5-7% weight reduction reduce diabetes progression risk by 58%."
        ),
    },
    {
        "id": "cbc_reference_standards",
        "title": "Complete Blood Count (CBC) Standard Reference Ranges & Interpretation",
        "source": "cbc_reference_standards",
        "page": 1,
        "content": (
            "Complete Blood Count (CBC) Adult Normal Reference Ranges: "
            "Hemoglobin (Hb): Adult males 13.8 to 17.2 g/dL; adult females 12.1 to 15.1 g/dL. Low hemoglobin indicates anemia; high indicates polycythemia. "
            "White Blood Cell Count (WBC): 4,000 to 11,000 cells per microliter (mcL). Elevated WBC (leukocytosis) suggests infection, inflammation, or stress; low WBC (leukopenia) suggests viral suppression or bone marrow issues. "
            "Platelets: 150,000 to 450,000 platelets per microliter. Low platelets (thrombocytopenia < 150k) carries bleeding risk; thrombocytosis (> 450k) indicates reactive or primary marrow condition. "
            "Red Blood Cell (RBC) count: Males 4.7 to 6.1 million/mcL, Females 4.2 to 5.4 million/mcL."
        ),
    },
    {
        "id": "lipid_profile_interpretation",
        "title": "NCEP ATP-III Clinical Guidelines for Lipid Panel Management",
        "source": "lipid_profile_interpretation",
        "page": 1,
        "content": (
            "Cardiovascular Lipid Profile Reference Standards and Optimal Targets: "
            "Total Cholesterol: Desirable below 200 mg/dL; Borderline high 200 to 239 mg/dL; High 240 mg/dL and above. "
            "Low-Density Lipoprotein (LDL) Cholesterol: Optimal less than 100 mg/dL; Near optimal 100-129 mg/dL; Borderline 130-159 mg/dL; High 160-189 mg/dL; Very high 190 mg/dL+. "
            "High-Density Lipoprotein (HDL) 'Good' Cholesterol: Protective 60 mg/dL or higher; Major risk factor if below 40 mg/dL in men or below 50 mg/dL in women. "
            "Triglycerides: Normal less than 150 mg/dL; Borderline 150-199 mg/dL; High 200-499 mg/dL; Very high 500 mg/dL+."
        ),
    },
    {
        "id": "thyroid_disorders_guide",
        "title": "American Thyroid Association (ATA) Hypothyroidism and TSH Guide",
        "source": "thyroid_disorders_guide",
        "page": 1,
        "content": (
            "Thyroid Function Tests & Hypothyroidism Clinical Guidance: "
            "Thyroid Stimulating Hormone (TSH) Normal Reference Range: 0.45 to 4.5 mIU/L (milli-international units per liter). "
            "Elevated TSH (> 4.5 mIU/L): Indicates primary hypothyroidism (underactive thyroid gland failing to produce adequate thyroid hormone T4). "
            "Clinical Symptoms of Hypothyroidism: Chronic fatigue, unexplained weight gain, cold intolerance, dry skin, constipation, bradycardia, muscle weakness, and depression. "
            "Suppressed TSH (< 0.4 mIU/L): Indicates hyperthyroidism (overactive thyroid), presenting with tachycardia, tremors, heat intolerance, and insomnia. "
            "Confirmatory testing: Free T4 (FT4) and Free T3 (FT3) levels."
        ),
    },
    {
        "id": "dengue_clinical_management",
        "title": "WHO Clinical Guidelines for Dengue Fever Diagnosis and Triage",
        "source": "dengue_clinical_management",
        "page": 1,
        "content": (
            "Dengue Fever Clinical Presentation and Warning Signs: "
            "Early Symptoms: Sudden onset high fever (up to 104 F / 40 C), severe retro-orbital eye pain, severe headaches, generalized muscle and joint pain ('breakbone fever'), nausea, and maculopapular rash. "
            "Critical Phase Warning Signs (Day 3-7): Severe continuous abdominal pain, persistent vomiting, mucosal bleeding (gums, nose), lethargy, and fluid accumulation. "
            "Management: Oral rehydration, paracetamol for fever. Avoid NSAIDs (aspirin, ibuprofen) due to bleeding risk. Monitor platelet count and hematocrit closely."
        ),
    },
]
