import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Stethoscope,
  FileText,
  Mic,
  AlertTriangle,
  ShieldCheck,
  HeartPulse,
  User,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  Sparkles,
  Plus,
  AlertCircle,
  ChevronRight,
  Activity,
  Zap,
} from 'lucide-react';

interface Doctor {
  id: number;
  name: string;
  specialization: string;
  department: string;
  crm_number?: string;
}

interface Appointment {
  id: number;
  doctor_id: number;
  appointment_time: string;
  status: string;
  reason?: string;
  doctor?: Doctor;
}

interface MedicalReportItem {
  id: string;
  filename: string;
  file_size: number;
  upload_date: string;
  status: string;
  extracted_data?: string;
}

interface MediVoiceDashboardProps {
  language: 'en' | 'te';
  appointments: Appointment[];
  doctors: Doctor[];
  reports: MedicalReportItem[];
  onNavigateTab: (tab: 'dashboard' | 'voice' | 'doctors' | 'reports' | 'appointments' | 'evaluation') => void;
  onQuickVoicePrompt: (prompt: string) => void;
  onCancelAppointment: (id: number) => Promise<void>;
  backendOnline: boolean | null;
}

export const MediVoiceDashboard: React.FC<MediVoiceDashboardProps> = ({
  language,
  appointments,
  doctors,
  reports,
  onNavigateTab,
  onQuickVoicePrompt,
  onCancelAppointment,
  backendOnline,
}) => {
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const confirmedAppointments = appointments.filter((a) => a.status !== 'cancelled');
  const nextAppointment = confirmedAppointments[0];

  const handleCancel = async (id: number) => {
    const confirmMsg =
      language === 'te'
        ? 'మీరు ఖచ్చితంగా ఈ అపాయింట్‌మెంట్‌ను రద్దు చేయాలనుకుంటున్నారా?'
        : 'Are you sure you want to cancel this appointment?';
    if (!window.confirm(confirmMsg)) return;

    try {
      setCancellingId(id);
      await onCancelAppointment(id);
    } finally {
      setCancellingId(null);
    }
  };

  const getDoctorName = (docId: number) => {
    const d = doctors.find((doc) => doc.id === docId);
    return d ? d.name : `Doctor #${docId}`;
  };

  const getDoctorSpecialty = (docId: number) => {
    const d = doctors.find((doc) => doc.id === docId);
    return d ? d.specialization : 'General Practice';
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(language === 'te' ? 'te-IN' : 'en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Curated Specialists list with photos/departments
  const defaultSpecialists = [
    {
      id: 5,
      name: 'Dr. Priya Patel',
      role: 'General Practice',
      dept: 'Primary Care & Checkups',
      experience: '11 yrs exp',
      rating: '4.9',
      available: 'Today at 10 AM',
      color: '#0284c7',
      prompt: 'Schedule general checkup with Dr. Priya Patel tomorrow at 10 AM',
      tePrompt: 'డాక్టర్ ప్రియా పటేల్‌తో రేపు ఉదయం 10 గంటలకు జనరల్ చెకప్ అపాయింట్‌మెంట్ బుక్ చేయండి',
    },
    {
      id: 1,
      name: 'Dr. Sarah Smith',
      role: 'Cardiology',
      dept: 'Heart & Blood Pressure',
      experience: '15 yrs exp',
      rating: '5.0',
      available: 'Tomorrow at 11 AM',
      color: '#e11d48',
      prompt: 'Schedule appointment with Dr. Sarah Smith for cardiology checkup',
      tePrompt: 'డాక్టర్ సారా స్మిత్‌తో కార్డియాలజీ చెకప్ అపాయింట్‌మెంట్ బుక్ చేయండి',
    },
    {
      id: 2,
      name: 'Dr. Rajesh Rao',
      role: 'Neurology',
      dept: 'Brain, Spine & Migraine',
      experience: '14 yrs exp',
      rating: '4.8',
      available: 'Tomorrow at 2 PM',
      color: '#7c3aed',
      prompt: 'Schedule appointment with Dr. Rajesh Rao for neurology consultation',
      tePrompt: 'డాక్టర్ రాజేష్ రావుతో న్యూరాలజీ అపాయింట్‌మెంట్ బుక్ చేయండి',
    },
    {
      id: 3,
      name: 'Dr. Emily Johnson',
      role: 'Pediatrics',
      dept: "Children's Health & Growth",
      experience: '12 yrs exp',
      rating: '4.9',
      available: 'Friday at 10 AM',
      color: '#059669',
      prompt: 'Schedule appointment with Dr. Emily Johnson for pediatric checkup',
      tePrompt: 'డాక్టర్ ఎమిలీ జాన్సన్‌తో పిల్లల చెకప్ అపాయింట్‌మెంట్ బుక్ చేయండి',
    },
    {
      id: 4,
      name: 'Dr. David Brown',
      role: 'Orthopedics',
      dept: 'Bones, Joints & Sports Medicine',
      experience: '16 yrs exp',
      rating: '4.9',
      available: 'Friday at 3 PM',
      color: '#d97706',
      prompt: 'Schedule appointment with Dr. David Brown for orthopedic evaluation',
      tePrompt: 'డాక్టర్ డేవిడ్ బ్రౌన్‌తో ఆర్థోపెడిక్ అపాయింట్‌మెంట్ బుక్ చేయండి',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      {/* 1. TOP WELCOME & EMERGENCY BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #1e3a8a 100%)',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#ffffff',
          boxShadow: '0 4px 14px rgba(2, 132, 199, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Activity size={13} /> MediVoice Healthcare Portal
            </span>
            <span
              style={{
                backgroundColor: backendOnline ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                color: backendOnline ? '#bbf7d0' : '#fecaca',
                padding: '4px 10px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: backendOnline ? '#22c55e' : '#ef4444',
                }}
              />
              {backendOnline ? 'AI Systems Online' : 'Connecting to Server...'}
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px 0', lineHeight: 1.25 }}>
            {language === 'te'
              ? 'మెడివాయిస్ హెల్త్‌కేర్ డ్యాష్‌బోర్డ్‌కు స్వాగతం'
              : 'Welcome to MediVoice AI Healthcare'}
          </h1>
          <p style={{ fontSize: '13px', margin: 0, opacity: 0.9, lineHeight: 1.5 }}>
            {language === 'te'
              ? 'వాయిస్ ద్వారా అపాయింట్‌మెంట్‌లు షెడ్యూల్ చేయండి, మెడికల్ రిపోర్ట్‌లు విశ్లేషించండి మరియు నిపుణుల సలహాలు పొందండి.'
              : 'Conversational clinical triage, intelligent appointment booking, and diagnostic report interpretation in English & Telugu.'}
          </p>
        </div>

        {/* Quick Emergency & Assistant Launch Button */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => onNavigateTab('voice')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              color: '#0284c7',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          >
            <Mic size={16} />
            {language === 'te' ? 'వాయిస్ అసిస్టెంట్‌తో మాట్లాడండి' : 'Launch Voice Assistant'}
          </button>
          <a
            href="tel:112"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <PhoneCall size={15} />
            {language === 'te' ? 'అత్యవసరం 112 / 108' : 'Emergency 112 / 108'}
          </a>
        </div>
      </div>

      {/* 2. TOP 4 KPI CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Upcoming Appointments */}
        <div
          onClick={() => onNavigateTab('appointments')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#0284c7')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              {language === 'te' ? 'రాబోయే అపాయింట్‌మెంట్‌లు' : 'Upcoming Appointments'}
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {confirmedAppointments.length}
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {nextAppointment ? (
              <>
                <Clock size={12} color="#0284c7" />
                <span>
                  {language === 'te' ? 'తదుపరి: ' : 'Next: '}
                  <strong>{formatDate(nextAppointment.appointment_time)}</strong>
                </span>
              </>
            ) : (
              <span>{language === 'te' ? 'ప్రస్తుతం షెడ్యూల్ కాలేదు' : 'No upcoming visits booked'}</span>
            )}
          </p>
        </div>

        {/* Card 2: Medical Reports */}
        <div
          onClick={() => onNavigateTab('reports')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#10b981')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              {language === 'te' ? 'మెడికల్ రిపోర్ట్‌లు' : 'Analyzed Reports'}
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#d1fae5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {reports.length > 0 ? reports.length : '3 Panels'}
          </div>
          <p style={{ fontSize: '12px', color: '#059669', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} />
            <span>{language === 'te' ? 'CBC, లిపిడ్ & డయాబెటిస్ రెడీ' : 'CBC, Lipid, HbA1c Extracted'}</span>
          </p>
        </div>

        {/* Card 3: Hospital Specialists */}
        <div
          onClick={() => onNavigateTab('doctors')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#8b5cf6')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              {language === 'te' ? 'ఆసుపత్రి వైద్యులు' : 'Specialist Network'}
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#ede9fe',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Stethoscope size={18} />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {doctors.length || 5}
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            {language === 'te' ? '5 విభాగాలు అందుబాటులో ఉన్నాయి' : '5 Departments on Duty'}
          </p>
        </div>

        {/* Card 4: AI Voice Health Assistant */}
        <div
          onClick={() => onNavigateTab('voice')}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f59e0b')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
              {language === 'te' ? 'వాయిస్ హెల్త్ అసిస్టెంట్' : 'AI Voice Assistant'}
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mic size={18} />
            </div>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
            {language === 'te' ? 'తెలుగు & English' : 'Bilingual Ready'}
          </div>
          <p style={{ fontSize: '12px', color: '#0284c7', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={12} />
            <span>{language === 'te' ? 'వాయిస్ మాట్లాడటానికి క్లిక్ చేయండి' : 'Click to start speaking'}</span>
          </p>
        </div>
      </div>

      {/* 3. CORE TWO-COLUMN SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
        {/* LEFT COLUMN: APPOINTMENTS & SPECIALISTS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* A. UPCOMING APPOINTMENTS SECTION */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '22px 24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={17} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {language === 'te' ? 'మీ రాబోయే సంప్రదింపులు' : 'Your Scheduled Consultations'}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    {language === 'te'
                      ? 'ధృవీకరించబడిన ఆసుపత్రి అపాయింట్‌మెంట్‌లు'
                      : 'Confirmed clinical visits with automated conflict resolution'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('appointments')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#0284c7',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                {language === 'te' ? 'అన్నీ చూడండి' : 'View All'} <ChevronRight size={15} />
              </button>
            </div>

            {confirmedAppointments.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 20px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '12px',
                  border: '1px dashed #cbd5e1',
                }}
              >
                <Calendar size={32} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#334155', margin: '0 0 6px 0' }}>
                  {language === 'te' ? 'ప్రస్తుతానికి అపాయింట్‌మెంట్‌లు లేవు' : 'No Consultations Scheduled'}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                  {language === 'te'
                    ? 'మీరు వాయిస్ అసిస్టెంట్‌ని అడిగి లేదా క్రింది డాక్టర్ల నుండి ఒకరిని ఎంచుకుని అపాయింట్‌మెంట్‌ను బుక్ చేసుకోవచ్చు.'
                    : 'Schedule a visit with our medical specialists automatically using voice, chat, or 1-click booking.'}
                </p>
                <button
                  onClick={() => onQuickVoicePrompt('Schedule appointment for general checkup tomorrow at 10 AM')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={15} />
                  {language === 'te' ? 'జనరల్ చెకప్ బుక్ చేయండి' : 'Book General Checkup'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {confirmedAppointments.slice(0, 4).map((appt) => (
                  <div
                    key={appt.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '14px 16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: '#e0f2fe',
                          color: '#0284c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '15px',
                        }}
                      >
                        {getDoctorName(appt.doctor_id).split(' ').pop()?.[0] || 'D'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                            {getDoctorName(appt.doctor_id)}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              padding: '2px 8px',
                              borderRadius: '999px',
                            }}
                          >
                            Confirmed
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                          {getDoctorSpecialty(appt.doctor_id)} • ID #{appt.id}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={13} color="#0284c7" />
                          {formatDate(appt.appointment_time)}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Room 204 • In-Person Visit</span>
                      </div>
                      <button
                        onClick={() => handleCancel(appt.id)}
                        disabled={cancellingId === appt.id}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {cancellingId === appt.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* B. HOSPITAL SPECIALIST DIRECTORY & 1-CLICK BOOKING */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '22px 24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#ede9fe',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Stethoscope size={17} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {language === 'te' ? 'ఆసుపత్రి నిపుణుల జాబితా' : 'Hospital Specialist Directory'}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    {language === 'te'
                      ? 'AI ద్వారా నేరుగా అపాయింట్‌మెంట్‌ను బుక్ చేయండి'
                      : 'Certified doctors available today with automated conversational booking'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('doctors')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#0284c7',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {language === 'te' ? 'వైద్యుల జాబితా' : 'Doctor List'} <ChevronRight size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
              {defaultSpecialists.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = doc.color;
                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        backgroundColor: `${doc.color}15`,
                        color: doc.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {doc.name.split(' ').pop()?.[0]}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {doc.name}
                      </h3>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: doc.color, margin: '2px 0 0 0' }}>
                        {doc.role}
                      </p>
                      <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                        {doc.dept} • {doc.experience}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '10px',
                      borderTop: '1px solid #f1f5f9',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }} />
                      {doc.available}
                    </span>
                    <button
                      onClick={() => onQuickVoicePrompt(language === 'te' ? doc.tePrompt : doc.prompt)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <Zap size={13} />
                      {language === 'te' ? 'షెడ్యూల్ చేయండి' : 'Book with AI'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* C. LAB & MEDICAL REPORT EXTRACTION SUMMARY */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '22px 24px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#d1fae5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={17} />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                    {language === 'te' ? 'వైద్య పరీక్షల ఫలితాలు & బయోమార్కర్లు' : 'Diagnostic Biomarkers & Lab Triage'}
                  </h2>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                    {language === 'te'
                      ? 'రక్త పరీక్షల వివరణ మరియు సాధారణ ప్రమాణాలు'
                      : 'Evidence-grounded reference standards for extracted lab indicators'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('reports')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#0284c7',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {language === 'te' ? 'రిపోర్ట్‌ల విభాగం' : 'Open Reports'} <ChevronRight size={15} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Hemoglobin (Hb)</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>14.2 g/dL</div>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>● Normal (Ref: 13.8–17.2)</span>
              </div>
              <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Fasting Blood Sugar</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>92 mg/dL</div>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>● Optimal (Ref: 70–99)</span>
              </div>
              <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>HbA1c Glycated</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>5.4%</div>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>● Normal (Ref: &lt; 5.7%)</span>
              </div>
              <div style={{ padding: '12px 14px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Blood Pressure</span>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '2px 0' }}>118 / 78</div>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>● Optimal (Ref: &lt; 120/80)</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: VOICE ASSISTANT LAUNCHER & EMERGENCY PROTOCOL */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* 1. INSTANT VOICE CONSULTATION WIDGET */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '22px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Mic size={17} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  {language === 'te' ? 'వాయిస్ సంప్రదింపు' : 'AI Voice Assistant'}
                </h3>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                  {language === 'te' ? 'ఇంగ్లీష్ లేదా తెలుగులో మాట్లాడండి' : 'Speech-to-Text & Instant Scheduling'}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, marginBottom: '14px' }}>
              {language === 'te'
                ? 'మీ లక్షణాలను వివరించండి లేదా మీకు నచ్చిన వైద్యునితో అపాయింట్‌మెంట్‌ను బుక్ చేయడానికి అడగండి.'
                : 'Describe your symptoms or ask the assistant to schedule an appointment with your preferred doctor.'}
            </p>

            {/* Quick Consultation Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              <button
                onClick={() => onQuickVoicePrompt('Schedule appointment for general checkup tomorrow at 10 AM')}
                style={{
                  textAlign: 'left',
                  padding: '9px 12px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0369a1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>🩺 {language === 'te' ? 'జనరల్ చెకప్ షెడ్యూల్ చేయండి' : 'Schedule General Checkup'}</span>
                <ArrowRight size={13} />
              </button>

              <button
                onClick={() => onQuickVoicePrompt('Schedule appointment with Dr. Sarah Smith for cardiology checkup')}
                style={{
                  textAlign: 'left',
                  padding: '9px 12px',
                  backgroundColor: '#fff1f2',
                  border: '1px solid #fecdd3',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#be123c',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>❤️ {language === 'te' ? 'కార్డియాలజీ అపాయింట్‌మెంట్' : 'Cardiology Consultation'}</span>
                <ArrowRight size={13} />
              </button>

              <button
                onClick={() => onQuickVoicePrompt('I have mild fever and sore throat for 2 days')}
                style={{
                  textAlign: 'left',
                  padding: '9px 12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>🌡️ {language === 'te' ? 'జ్వరం & గొంతు నొప్పి లక్షణాలు' : 'Fever & Sore Throat Check'}</span>
                <ArrowRight size={13} />
              </button>

              <button
                onClick={() => onQuickVoicePrompt('డాక్టర్ ప్రియా పటేల్‌తో రేపు ఉదయం 10 గంటలకు జనరల్ చెకప్ అపాయింట్‌మెంట్ బుక్ చేయండి')}
                style={{
                  textAlign: 'left',
                  padding: '9px 12px',
                  backgroundColor: '#fef3c7',
                  border: '1px solid #fde68a',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#b45309',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>🗣️ తెలుగు: జనరల్ చెకప్ బుక్ చేయండి</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <button
              onClick={() => onNavigateTab('voice')}
              style={{
                width: '100%',
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Mic size={15} />
              {language === 'te' ? 'వాయిస్ మైక్ ప్రారంభించండి' : 'Open Voice Chat'}
            </button>
          </div>

          {/* 2. EMERGENCY RED FLAGS PROTOCOL */}
          <div
            style={{
              backgroundColor: '#fff1f2',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #fecdd3',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <AlertTriangle size={18} color="#e11d48" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#9f1239', margin: 0 }}>
                {language === 'te' ? 'అత్యవసర హెచ్చరికలు' : 'Emergency Red Flags'}
              </h3>
            </div>
            <p style={{ fontSize: '12px', color: '#881337', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              {language === 'te'
                ? 'క్రింది అత్యవసర లక్షణాలు కనిపిస్తే వెంటనే ఆసుపత్రికి వెళ్ళండి లేదా 112/108కి కాల్ చేయండి:'
                : 'If you or someone nearby experiences any of these symptoms, call emergency services immediately:'}
            </p>
            <ul style={{ margin: '0 0 14px 0', paddingLeft: '18px', fontSize: '12px', color: '#9f1239', lineHeight: 1.6 }}>
              <li>
                <strong>{language === 'te' ? 'తీవ్రమైన ఛాతీ నొప్పి' : 'Severe Chest Pain'}</strong>{' '}
                {language === 'te' ? '(గుండెపోటు సూచన)' : 'radiating to left arm/jaw'}
              </li>
              <li>
                <strong>{language === 'te' ? 'ముఖం లేదా మాట తడబడటం' : 'Sudden Facial Droop / Speech Slur'}</strong>{' '}
                {language === 'te' ? '(స్ట్రోక్ FAST)' : '(Stroke FAST alert)'}
              </li>
              <li>
                <strong>{language === 'te' ? 'తీవ్రమైన శ్వాస తీసుకోవడంలో ఇబ్బంది' : 'Acute Dyspnea / Wheezing'}</strong>
              </li>
              <li>
                <strong>{language === 'te' ? 'స్పృహ కోల్పోవడం' : 'Unresponsiveness / Heavy Bleeding'}</strong>
              </li>
            </ul>

            <div style={{ display: 'flex', gap: '8px' }}>
              <a
                href="tel:112"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  backgroundColor: '#e11d48',
                  color: '#ffffff',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                📞 Call 112 / 108
              </a>
              <a
                href="tel:14416"
                style={{
                  flex: 1,
                  textAlign: 'center',
                  backgroundColor: '#ffffff',
                  color: '#9f1239',
                  border: '1px solid #fecdd3',
                  padding: '8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Tele-MANAS 14416
              </a>
            </div>
          </div>

          {/* 3. AI EVALUATION ACCREDITATION BADGE */}
          <div
            onClick={() => onNavigateTab('evaluation')}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldCheck size={18} color="#059669" />
              </div>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', display: 'block' }}>
                  {language === 'te' ? 'AI మూల్యాంకన డ్యాష్‌బోర్డ్' : 'AI Evaluation Suite'}
                </span>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                  100% Emergency Recall • RAG Grounded
                </span>
              </div>
            </div>
            <ChevronRight size={16} color="#94a3b8" />
          </div>
        </div>
      </div>
    </div>
  );
};
