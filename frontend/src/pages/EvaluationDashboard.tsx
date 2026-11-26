import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  CheckCircle2,
  ShieldAlert,
  Languages,
  Mic,
  Zap,
  Calendar,
  ListOrdered,
  History,
  RotateCcw,
  Play,
  Download,
  AlertCircle,
} from 'lucide-react';
import { EvaluationService } from '../services/evaluationService';
import {
  OverviewMetrics,
  RAGMetricsData,
  LLMMetricsData,
  SafetyMetricsData,
  LanguageMetricsData,
  VoiceMetricsData,
  PerformanceMetricsData,
  AppointmentMetricsData,
  TestCase,
  EvaluationRun,
} from '../types/evaluation';
import { EvaluationOverview } from '../components/evaluation/EvaluationOverview';
import { RAGMetrics } from '../components/evaluation/RAGMetrics';
import { LLMQualityMetrics } from '../components/evaluation/LLMQualityMetrics';
import { SafetyMetrics } from '../components/evaluation/SafetyMetrics';
import { LanguageComparison } from '../components/evaluation/LanguageComparison';
import { VoiceMetrics } from '../components/evaluation/VoiceMetrics';
import { PerformanceMetrics } from '../components/evaluation/PerformanceMetrics';
import { AppointmentMetrics } from '../components/evaluation/AppointmentMetrics';
import { EvaluationTestCases } from '../components/evaluation/EvaluationTestCases';
import { EvaluationRunHistory } from '../components/evaluation/EvaluationRunHistory';

interface DashboardProps {
  apiHost: string;
}

type TabType =
  | 'overview'
  | 'rag'
  | 'llm'
  | 'safety'
  | 'language'
  | 'voice'
  | 'performance'
  | 'appointments'
  | 'test_cases'
  | 'history';

export const EvaluationDashboard: React.FC<DashboardProps> = ({ apiHost }) => {
  const [activeSubTab, setActiveSubTab] = useState<TabType>('overview');
  const [dateFilter, setDateFilter] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [ragData, setRagData] = useState<RAGMetricsData | null>(null);
  const [llmData, setLlmData] = useState<LLMMetricsData | null>(null);
  const [safetyData, setSafetyData] = useState<SafetyMetricsData | null>(null);
  const [languageData, setLanguageData] = useState<LanguageMetricsData | null>(null);
  const [voiceData, setVoiceData] = useState<VoiceMetricsData | null>(null);
  const [perfData, setPerfData] = useState<PerformanceMetricsData | null>(null);
  const [apptData, setApptData] = useState<AppointmentMetricsData | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const service = new EvaluationService(apiHost);

  const loadAllMetrics = async () => {
    setLoading(true);
    try {
      const [ov, tc, rn] = await Promise.all([
        service.getOverview().catch(() => null),
        service.getTestCases().catch(() => []),
        service.getRuns().catch(() => []),
      ]);
      setOverview(ov);
      setTestCases(tc || []);
      setRuns(rn || []);

      // Lazy load sub-tab specific metrics
      if (activeSubTab === 'rag') {
        const rag = await service.getRAGMetrics().catch(() => null);
        setRagData(rag);
      } else if (activeSubTab === 'llm') {
        const llm = await service.getLLMMetrics().catch(() => null);
        setLlmData(llm);
      } else if (activeSubTab === 'safety') {
        const saf = await service.getSafetyMetrics().catch(() => null);
        setSafetyData(saf);
      } else if (activeSubTab === 'language') {
        const lang = await service.getLanguageMetrics().catch(() => null);
        setLanguageData(lang);
      } else if (activeSubTab === 'voice') {
        const vox = await service.getVoiceMetrics().catch(() => null);
        setVoiceData(vox);
      } else if (activeSubTab === 'performance') {
        const perf = await service.getPerformanceMetrics().catch(() => null);
        setPerfData(perf);
      } else if (activeSubTab === 'appointments') {
        const appt = await service.getAppointmentMetrics().catch(() => null);
        setApptData(appt);
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMetrics();
  }, [activeSubTab, dateFilter]);

  const handleRunFullEvaluation = async () => {
    setIsRunning(true);
    setNotification('Executing evaluation suite against MediVoice AI pipeline...');
    try {
      await service.triggerRun();
      setNotification('Evaluation run completed successfully! Updating dashboard.');
      await loadAllMetrics();
    } catch (err) {
      setNotification('Evaluation run encountered an error. Please check backend logs.');
    } finally {
      setIsRunning(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleRunSingleTest = async (testId: string) => {
    setRunningTestId(testId);
    try {
      await service.triggerRun(undefined, testId);
      setNotification(`Test case ${testId} executed. Updating results.`);
      await loadAllMetrics();
    } catch (err) {
      setNotification(`Failed to run test case ${testId}`);
    } finally {
      setRunningTestId(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleAddTestCase = async (newCase: Partial<TestCase>) => {
    await service.createTestCase(newCase);
    setNotification('New evaluation test case created successfully.');
    const updated = await service.getTestCases();
    setTestCases(updated || []);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDownloadReport = (runId?: string, format: 'json' | 'csv' = 'json') => {
    const url = service.getExportUrl(runId, format);
    window.open(url, '_blank');
  };

  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'rag', label: 'RAG Retrieval', icon: Search },
    { id: 'llm', label: 'LLM Response', icon: CheckCircle2 },
    { id: 'safety', label: 'Medical Safety', icon: ShieldAlert },
    { id: 'language', label: 'Bilingual (EN/TE)', icon: Languages },
    { id: 'voice', label: 'Voice (STT/TTS)', icon: Mic },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'appointments', label: 'Appointments', icon: Calendar },
    { id: 'test_cases', label: 'Test Cases', icon: ListOrdered },
    { id: 'history', label: 'Run History', icon: History },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>AI Evaluation & Safety Dashboard</span>
            <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
              HEALTHCARE ANALYTICS
            </span>
          </div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Continuous quality evaluation for clinical RAG, LLM groundedness, emergency safety, and bilingual accuracy.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Date Filter */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
            {(['24h', '7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateFilter(range)}
                style={{
                  border: 'none',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: dateFilter === range ? '#ffffff' : 'transparent',
                  color: dateFilter === range ? '#0284c7' : '#64748b',
                  boxShadow: dateFilter === range ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {range === '24h' ? '24h' : range === '7d' ? '7d' : range === '30d' ? '30d' : 'All'}
              </button>
            ))}
          </div>

          <button
            onClick={handleRunFullEvaluation}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: isRunning ? '#94a3b8' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 4px rgba(2,132,199,0.2)',
            }}
          >
            {isRunning ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} />}
            {isRunning ? 'Evaluating...' : 'Run Evaluation Suite'}
          </button>
        </div>
      </div>

      {/* Live Notification Bar */}
      {notification && (
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1e40af',
            padding: '10px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Sub-Navigation Pill Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: isActive ? '#0284c7' : '#e2e8f0',
                backgroundColor: isActive ? '#0284c7' : '#ffffff',
                color: isActive ? '#ffffff' : '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} color={isActive ? '#ffffff' : '#64748b'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-Tab Content Rendering */}
      <div>
        {activeSubTab === 'overview' && (
          <EvaluationOverview
            data={overview}
            loading={loading && !overview}
            onRunEvaluation={handleRunFullEvaluation}
            isRunning={isRunning}
          />
        )}

        {activeSubTab === 'rag' && (
          <RAGMetrics data={ragData} loading={loading && !ragData} />
        )}

        {activeSubTab === 'llm' && (
          <LLMQualityMetrics data={llmData} loading={loading && !llmData} />
        )}

        {activeSubTab === 'safety' && (
          <SafetyMetrics data={safetyData} loading={loading && !safetyData} />
        )}

        {activeSubTab === 'language' && (
          <LanguageComparison data={languageData} loading={loading && !languageData} />
        )}

        {activeSubTab === 'voice' && (
          <VoiceMetrics data={voiceData} loading={loading && !voiceData} />
        )}

        {activeSubTab === 'performance' && (
          <PerformanceMetrics data={perfData} loading={loading && !perfData} />
        )}

        {activeSubTab === 'appointments' && (
          <AppointmentMetrics data={apptData} loading={loading && !apptData} />
        )}

        {activeSubTab === 'test_cases' && (
          <EvaluationTestCases
            testCases={testCases}
            loading={loading && testCases.length === 0}
            onRunTest={handleRunSingleTest}
            onAddTestCase={handleAddTestCase}
            runningTestId={runningTestId}
          />
        )}

        {activeSubTab === 'history' && (
          <EvaluationRunHistory
            runs={runs}
            loading={loading && runs.length === 0}
            onDownloadReport={handleDownloadReport}
          />
        )}
      </div>
    </div>
  );
};
