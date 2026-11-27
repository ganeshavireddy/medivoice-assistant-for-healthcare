import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock,
  Unlock,
  ShieldCheck,
  Calendar,
  FileText,
  TrendingUp,
  Activity,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  LogOut,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Scatter,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface AdminDashboardProps {
  apiHost: string;
  onAppointmentsChanged?: () => void;
}

interface RegressionPoint {
  x: number;
  label: string;
  actual: number | null;
  predicted: number | null;
  regression_line?: number | null;
  forecast: number | null;
  is_forecast: boolean;
}

interface RegressionModel {
  slope: number;
  intercept: number;
  r_squared: number;
  equation: string;
  trend_direction: string;
  mode?: string;
  points: RegressionPoint[];
}

interface AdminAnalyticsResponse {
  admin: string;
  summary: {
    total_appointments: number;
    confirmed_appointments: number;
    pending_appointments: number;
    cancelled_appointments: number;
    total_doctors: number;
    total_reports: number;
    total_markers_analyzed: number;
    abnormal_markers: number;
    abnormal_rate_pct: number;
  };
  appointments: Array<{
    id: number;
    patient_id: number;
    doctor_id: number;
    doctor_name: string;
    specialization: string;
    department: string;
    appointment_time: string | null;
    status: string;
    reason?: string;
    created_at?: string;
  }>;
  appointment_status_chart: Array<{ status: string; count: number; color: string }>;
  specialty_chart: Array<{ specialty: string; count: number }>;
  reports: Array<{
    id: string;
    filename: string;
    file_type: string;
    file_size: number;
    upload_date: string | null;
    status: string;
    summary: string;
    parameters: Array<{
      name: string;
      value: number;
      unit: string;
      reference_range: string;
      status: string;
    }>;
    total_markers: number;
    abnormal_count: number;
    normal_count: number;
    abnormal_rate_pct: number;
  }>;
  biomarker_chart: Array<{
    name: string;
    normal: number;
    high: number;
    low: number;
    avg_value: number | null;
  }>;
  linear_regression: {
    appointments: RegressionModel;
    reports_abnormality: RegressionModel;
  };
}

const TOKEN_STORAGE_KEY = 'medivoice_admin_jwt';
const SPECIALTY_COLORS = ['#0284c7', '#7c3aed', '#059669', '#d97706', '#e11d48', '#0891b2'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ apiHost, onAppointmentsChanged }) => {
  const apiBase = `${apiHost.replace(/\/$/, '')}/api/v1`;

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  });
  const [passkey, setPasskey] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [apptSearch, setApptSearch] = useState('');
  const [apptStatusFilter, setApptStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [reportSearch, setReportSearch] = useState('');
  const [updatingApptId, setUpdatingApptId] = useState<number | null>(null);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setAdminToken(null);
    setAnalytics(null);
    setAuthError(null);
  }, []);

  const fetchAnalytics = useCallback(
    async (tokenOverride?: string) => {
      const token = tokenOverride || adminToken;
      if (!token) return;
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`${apiBase}/admin/analytics`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          setAuthError('Administrator session expired or unauthorized. Please sign in again.');
          return;
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `HTTP ${res.status}`);
        }
        const data: AdminAnalyticsResponse = await res.json();
        setAnalytics(data);
      } catch (err: any) {
        setLoadError(err?.message || 'Failed to load admin analytics from backend.');
      } finally {
        setLoading(false);
      }
    },
    [adminToken, apiBase, handleLogout]
  );

  useEffect(() => {
    if (adminToken) {
      fetchAnalytics(adminToken);
    }
  }, [adminToken, fetchAnalytics]);

  const handleLogin = async (overrideKey?: string) => {
    const key = (overrideKey ?? passkey).trim();
    if (!key) {
      setAuthError('Please enter the administrator passkey.');
      return;
    }
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await fetch(`${apiBase}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: key }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAuthError(err.detail || 'Access denied. Only administrators can access this dashboard.');
        return;
      }
      const data = await res.json();
      if (data.access_token) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, data.access_token);
        setAdminToken(data.access_token);
        setPasskey('');
      } else {
        setAuthError('Authentication failed: no admin token issued.');
      }
    } catch {
      setAuthError('Unable to reach backend authentication server.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpdateApptStatus = async (apptId: number, status: 'confirmed' | 'cancelled') => {
    if (!adminToken) return;
    setUpdatingApptId(apptId);
    try {
      const res = await fetch(`${apiBase}/admin/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        await fetchAnalytics(adminToken);
        onAppointmentsChanged?.();
      }
    } finally {
      setUpdatingApptId(null);
    }
  };

  // -------------------------------------------------------------------------
  // ADMIN-ONLY ACCESS GATE
  // -------------------------------------------------------------------------
  if (!adminToken) {
    return (
      <div
        style={{
          maxWidth: '500px',
          margin: '40px auto',
          padding: '36px 32px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.08)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '62px',
            height: '62px',
            borderRadius: '50%',
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
          }}
        >
          <Lock size={28} />
        </div>

        <span
          style={{
            display: 'inline-block',
            padding: '3px 12px',
            borderRadius: '12px',
            backgroundColor: '#fef3c7',
            color: '#92400e',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '10px',
          }}
        >
          Admin-Only Restricted Access
        </span>

        <h2 style={{ fontSize: '21px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
          Administrator Dashboard Login
        </h2>
        <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6, margin: '0 0 22px 0' }}>
          Only authorized hospital administrators can access all appointments, medical report biomarker analyses, and linear regression analytics.
        </p>

        {authError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '12.5px',
              marginBottom: '16px',
              textAlign: 'left',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{authError}</span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <input
            type="password"
            value={passkey}
            onChange={(e) => setPasskey(e.target.value)}
            placeholder="Enter Administrator Passkey (e.g. admin123)"
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
            }}
          />

          <button
            type="submit"
            disabled={isLoggingIn}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Unlock size={16} />
            {isLoggingIn ? 'Verifying Admin Credentials...' : 'Unlock Admin Dashboard'}
          </button>

          <button
            type="button"
            onClick={() => handleLogin('admin123')}
            style={{
              background: 'none',
              color: '#0284c7',
              fontSize: '12.5px',
              fontWeight: 600,
              textDecoration: 'underline',
              marginTop: '4px',
            }}
          >
            Quick Demo Admin Login (admin123)
          </button>
        </form>
      </div>
    );
  }

  // Filter appointments & reports
  const filteredAppointments = (analytics?.appointments || []).filter((a) => {
    if (apptStatusFilter !== 'all' && (a.status || '').toLowerCase() !== apptStatusFilter) return false;
    if (apptSearch.trim()) {
      const q = apptSearch.toLowerCase();
      return (
        a.doctor_name.toLowerCase().includes(q) ||
        a.specialization.toLowerCase().includes(q) ||
        (a.reason || '').toLowerCase().includes(q) ||
        String(a.id).includes(q)
      );
    }
    return true;
  });

  const filteredReports = (analytics?.reports || []).filter((r) => {
    if (!reportSearch.trim()) return true;
    const q = reportSearch.toLowerCase();
    return r.filename.toLowerCase().includes(q) || r.summary.toLowerCase().includes(q);
  });

  const apptReg = analytics?.linear_regression.appointments;
  const repReg = analytics?.linear_regression.reports_abnormality;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingBottom: '36px' }}>
      {/* Admin Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '16px 22px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Admin Clinical Analytics & Regression Dashboard
              </h2>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  backgroundColor: '#dcfce7',
                  color: '#15803d',
                }}
              >
                ADMIN VERIFIED
              </span>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0 0' }}>
              All appointments, medical report biomarker analysis, OLS linear regression models, and clinical plots.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchAnalytics()}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>

          <button
            onClick={handleLogout}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            <LogOut size={14} /> Lock / Logout
          </button>
        </div>
      </div>

      {loadError && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            color: '#991b1b',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{loadError}</span>
          <button
            onClick={() => fetchAnalytics()}
            style={{ padding: '5px 12px', backgroundColor: '#dc2626', color: '#fff', fontSize: '12px', fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b' }}>TOTAL APPOINTMENTS</span>
            <Calendar size={18} color="#0284c7" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>
            {analytics?.summary.total_appointments ?? '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
            {analytics
              ? `${analytics.summary.confirmed_appointments} Confirmed • ${analytics.summary.pending_appointments} Pending • ${analytics.summary.cancelled_appointments} Cancelled`
              : 'Loading...'}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b' }}>REPORTS ANALYZED</span>
            <FileText size={18} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>
            {analytics?.summary.total_reports ?? '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {analytics
              ? `${analytics.summary.total_markers_analyzed} lab biomarkers extracted`
              : 'Loading...'}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b' }}>ABNORMAL LAB RATE</span>
            <Activity size={18} color="#e11d48" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>
            {analytics ? `${analytics.summary.abnormal_rate_pct}%` : '—'}
          </div>
          <div style={{ fontSize: '12px', color: '#be123c', marginTop: '4px' }}>
            {analytics ? `${analytics.summary.abnormal_markers} High/Low flagged markers` : 'Loading...'}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#64748b' }}>APPT REGRESSION FIT</span>
            <TrendingUp size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
            {apptReg ? `R² = ${apptReg.r_squared.toFixed(2)}` : '—'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#0369a1', marginTop: '4px', fontFamily: 'monospace' }}>
            {apptReg ? apptReg.equation : 'OLS Linear Model'}
          </div>
        </div>
      </div>

      {/* LINEAR REGRESSION PLOTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(430px, 1fr))', gap: '18px' }}>
        {/* Plot 1: Appointments OLS Linear Regression */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Linear Regression: Appointments Volume & Forecast
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Actual daily appointments vs OLS regression line ({apptReg?.equation || 'y = mx + b'})
              </p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
              R² = {apptReg?.r_squared ?? 0} • {apptReg?.trend_direction ?? 'flat'}
            </span>
          </div>

          {!apptReg || apptReg.points.length === 0 ? (
            <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No appointment data available for regression plot yet.
            </div>
          ) : (
            <div style={{ height: '260px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={apptReg.points} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="actual" name="Actual Appointments" barSize={22} fill="#bae6fd" stroke="#0284c7" radius={[6, 6, 0, 0]} />
                  <Line type="linear" dataKey="regression_line" name="OLS Linear Regression (y = mx + b)" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 3, fill: '#7c3aed' }} connectNulls />
                  <Line type="linear" dataKey="forecast" name="Regression Forecast" stroke="#10b981" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4, fill: '#10b981' }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Plot 2: Medical Report Abnormality OLS Linear Regression */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '8px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {repReg?.mode === 'biomarker_deviation'
                  ? 'Linear Regression: Lab Biomarker Deviation (%)'
                  : 'Linear Regression: Report Abnormality Rate (%)'}
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                {repReg?.mode === 'biomarker_deviation'
                  ? `Extracted biomarker deviation from normal range vs OLS fit (${repReg?.equation || 'y = mx + b'})`
                  : `Abnormal lab marker % across reports vs OLS fit (${repReg?.equation || 'y = mx + b'})`}
              </p>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#fff1f2', color: '#be123c', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
              R² = {repReg?.r_squared ?? 0} • {repReg?.trend_direction ?? 'flat'}
            </span>
          </div>

          {!repReg || repReg.points.length === 0 ? (
            <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '0 20px' }}>
              No medical reports uploaded yet. Upload reports in the Reports tab to generate report regression plots.
            </div>
          ) : (
            <div style={{ height: '260px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={repReg.points} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="actual" name="Observed Deviation / Abnormal %" barSize={22} fill="#fecdd3" stroke="#e11d48" radius={[6, 6, 0, 0]} />
                  <Line type="linear" dataKey="regression_line" name="OLS Linear Regression (y = mx + b)" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3, fill: '#0284c7' }} connectNulls />
                  <Line type="linear" dataKey="forecast" name="Projected Trend" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4, fill: '#f59e0b' }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* GRAPHS & PLOTS: SPECIALTY BAR CHART, REPORT BIOMARKER STACKED BAR, STATUS DONUT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
        {/* Specialty Distribution Bar Plot */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <BarChart3 size={17} color="#0284c7" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Appointments by Specialty
            </h3>
          </div>
          {!analytics || analytics.specialty_chart.length === 0 ? (
            <div style={{ height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No appointment data yet.
            </div>
          ) : (
            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.specialty_chart} margin={{ top: 10, right: 16, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="specialty" tick={{ fill: '#475569', fontSize: 11 }} interval={0} angle={-12} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Appointments" radius={[6, 6, 0, 0]}>
                    {analytics.specialty_chart.map((_, idx) => (
                      <Cell key={idx} fill={SPECIALTY_COLORS[idx % SPECIALTY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Report Lab Biomarkers Normal vs High vs Low Plot */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Activity size={17} color="#7c3aed" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Report Lab Biomarker Analysis
            </h3>
          </div>
          {!analytics || analytics.biomarker_chart.length === 0 ? (
            <div style={{ height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '0 16px' }}>
              Upload a lab report to see Normal / High / Low biomarker plots.
            </div>
          ) : (
            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.biomarker_chart} margin={{ top: 10, right: 16, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 10.5 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="normal" name="Normal" stackId="a" fill="#10b981" />
                  <Bar dataKey="high" name="High" stackId="a" fill="#ef4444" />
                  <Bar dataKey="low" name="Low" stackId="a" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Appointment Status Donut Plot */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <PieChartIcon size={17} color="#10b981" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Appointment Status Breakdown
            </h3>
          </div>
          {!analytics || analytics.summary.total_appointments === 0 ? (
            <div style={{ height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No appointments recorded yet.
            </div>
          ) : (
            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.appointment_status_chart.filter((s) => s.count > 0)}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={4}
                  >
                    {analytics.appointment_status_chart
                      .filter((s) => s.count > 0)
                      .map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ALL APPOINTMENTS TABLE */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              All Appointments ({filteredAppointments.length})
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Complete hospital appointment ledger across all patients and specialists
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search doctor, ID, reason..."
                value={apptSearch}
                onChange={(e) => setApptSearch(e.target.value)}
                style={{
                  padding: '6px 10px 6px 28px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  width: '210px',
                }}
              />
              <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '9px', top: '9px' }} />
            </div>

            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
              {(['all', 'confirmed', 'pending', 'cancelled'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setApptStatusFilter(f)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    backgroundColor: apptStatusFilter === f ? '#0284c7' : 'transparent',
                    color: apptStatusFilter === f ? '#ffffff' : '#64748b',
                    textTransform: 'capitalize',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            No appointments match your filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '10px 12px' }}>ID</th>
                  <th style={{ padding: '10px 12px' }}>Doctor & Specialty</th>
                  <th style={{ padding: '10px 12px' }}>Appointment Time</th>
                  <th style={{ padding: '10px 12px' }}>Reason / Case</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>#{a.id}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{a.doctor_name}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{a.specialization}</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>
                      {a.appointment_time ? new Date(a.appointment_time).toLocaleString() : 'N/A'}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#475569', maxWidth: '280px' }}>
                      {a.reason || 'General Consultation'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor:
                            a.status === 'confirmed' ? '#dcfce7' : a.status === 'pending' ? '#fef3c7' : '#fee2e2',
                          color:
                            a.status === 'confirmed' ? '#15803d' : a.status === 'pending' ? '#b45309' : '#b91c1c',
                          textTransform: 'uppercase',
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {a.status !== 'confirmed' && (
                          <button
                            disabled={updatingApptId === a.id}
                            onClick={() => handleUpdateApptStatus(a.id, 'confirmed')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              fontSize: '11.5px',
                              fontWeight: 600,
                            }}
                          >
                            <CheckCircle2 size={12} /> Confirm
                          </button>
                        )}
                        {a.status !== 'cancelled' && (
                          <button
                            disabled={updatingApptId === a.id}
                            onClick={() => handleUpdateApptStatus(a.id, 'cancelled')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: '11.5px',
                              fontWeight: 600,
                            }}
                          >
                            <XCircle size={12} /> Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ALL MEDICAL REPORTS ANALYSIS TABLE */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Medical Report Analysis Ledger ({filteredReports.length})
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Extracted clinical lab summaries, reference flags, and biomarker findings across all uploaded reports
            </p>
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search report filename or finding..."
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              style={{
                padding: '6px 10px 6px 28px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                width: '230px',
              }}
            />
            <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '9px', top: '9px' }} />
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
            No uploaded medical reports found yet. Upload a lab report in the Reports tab to inspect its biomarker analysis here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredReports.map((rep) => (
              <div
                key={rep.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={16} color="#0284c7" />
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{rep.filename}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      ({rep.file_type.toUpperCase()} • {(rep.file_size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: rep.abnormal_count > 0 ? '#fee2e2' : '#dcfce7',
                        color: rep.abnormal_count > 0 ? '#b91c1c' : '#15803d',
                      }}
                    >
                      {rep.abnormal_count > 0
                        ? `${rep.abnormal_count} Abnormal / ${rep.total_markers} Markers`
                        : `${rep.total_markers} Normal Markers`}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {rep.upload_date ? new Date(rep.upload_date).toLocaleString() : ''}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '12.5px', color: '#334155', margin: '0 0 8px 0' }}>{rep.summary}</p>

                {rep.parameters.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {rep.parameters.map((p, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11.5px',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          border: '1px solid',
                          borderColor:
                            p.status === 'HIGH' ? '#fecaca' : p.status === 'LOW' ? '#fde68a' : '#bbf7d0',
                          backgroundColor:
                            p.status === 'HIGH' ? '#fef2f2' : p.status === 'LOW' ? '#fffbeb' : '#f0fdf4',
                          color:
                            p.status === 'HIGH' ? '#b91c1c' : p.status === 'LOW' ? '#b45309' : '#15803d',
                          fontWeight: 600,
                        }}
                      >
                        {p.name}: {p.value} {p.unit} ({p.status})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
