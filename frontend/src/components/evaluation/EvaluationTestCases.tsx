import React, { useState } from 'react';
import { TestCase } from '../../types/evaluation';
import { Search, Plus, Play, CheckCircle2, AlertTriangle, Filter } from 'lucide-react';

interface TestCaseProps {
  testCases: TestCase[];
  loading: boolean;
  onRunTest: (testId: string) => void;
  onAddTestCase: (newCase: Partial<TestCase>) => Promise<void>;
  runningTestId: string | null;
}

export const EvaluationTestCases: React.FC<TestCaseProps> = ({
  testCases,
  loading,
  onRunTest,
  onAddTestCase,
  runningTestId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New test case state
  const [newTestId, setNewTestId] = useState('');
  const [newCategory, setNewCategory] = useState('medical_safety');
  const [newLanguage, setNewLanguage] = useState<'en' | 'te'>('en');
  const [newQuery, setNewQuery] = useState('');
  const [newBehavior, setNewBehavior] = useState('');
  const [newLabel, setNewLabel] = useState('emergency');
  const [newSeverity, setNewSeverity] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredCases = testCases.filter((tc) => {
    if (selectedCategory !== 'all' && tc.category !== selectedCategory) return false;
    if (selectedLanguage !== 'all' && tc.language !== selectedLanguage) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tc.test_id.toLowerCase().includes(q) ||
        tc.query.toLowerCase().includes(q) ||
        tc.expected_behavior.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestId || !newQuery || !newBehavior) return;
    setIsSubmitting(true);
    try {
      await onAddTestCase({
        test_id: newTestId,
        category: newCategory as any,
        language: newLanguage,
        query: newQuery,
        expected_behavior: newBehavior,
        expected_label: newLabel,
        severity: newSeverity,
        enabled: true,
        is_reviewed: false, // User created test cases start as unreviewed
      });
      setShowAddModal(false);
      setNewTestId('');
      setNewQuery('');
      setNewBehavior('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Filters and Add Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>
          {/* Search box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', minWidth: '220px' }}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Search test queries or IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%' }}
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}
          >
            <option value="all">All Categories</option>
            <option value="medical_safety">Medical Safety</option>
            <option value="rag">RAG Retrieval</option>
            <option value="llm_response">LLM Quality</option>
            <option value="english_telugu">English / Telugu</option>
            <option value="voice">Voice (STT/TTS)</option>
            <option value="appointment_workflow">Appointments</option>
          </select>

          {/* Language Filter */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', backgroundColor: '#fff', outline: 'none' }}
          >
            <option value="all">All Languages</option>
            <option value="en">English (en)</option>
            <option value="te">Telugu (te)</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 14px',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Add Test Case
        </button>
      </div>

      {/* Test Cases Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
            Evaluation Benchmark Test Cases ({filteredCases.length})
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            Curated clinical scenarios and synthetic test suites
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#0284c7' }}>Loading test cases...</div>
        ) : filteredCases.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No test cases match your filter.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px' }}>ID</th>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px' }}>Lang</th>
                  <th style={{ padding: '10px 12px' }}>Query</th>
                  <th style={{ padding: '10px 12px' }}>Expected Behavior</th>
                  <th style={{ padding: '10px 12px' }}>Severity</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((tc) => (
                  <tr key={tc.test_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{tc.test_id}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                        {tc.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textTransform: 'uppercase', fontWeight: 600, color: '#64748b' }}>{tc.language}</td>
                    <td style={{ padding: '10px 12px', color: '#1e293b', maxWidth: '280px' }}>{tc.query}</td>
                    <td style={{ padding: '10px 12px', color: '#475569', maxWidth: '300px', fontSize: '12px' }}>{tc.expected_behavior}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: tc.severity === 'critical' ? '#fee2e2' : tc.severity === 'high' ? '#ffedd5' : '#f1f5f9',
                          color: tc.severity === 'critical' ? '#991b1b' : tc.severity === 'high' ? '#9a3412' : '#475569',
                        }}
                      >
                        {tc.severity.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={() => onRunTest(tc.test_id)}
                        disabled={runningTestId === tc.test_id}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          color: '#15803d',
                          borderRadius: '6px',
                          cursor: runningTestId === tc.test_id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Play size={12} />
                        {runningTestId === tc.test_id ? 'Testing...' : 'Run'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Test Case Modal */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: '18px', color: '#0f172a', marginBottom: '16px' }}>
              Add Evaluation Test Case
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Test ID (e.g. MED-SAF-011)
                </label>
                <input
                  type="text"
                  required
                  value={newTestId}
                  onChange={(e) => setNewTestId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="medical_safety">Medical Safety</option>
                    <option value="rag">RAG Retrieval</option>
                    <option value="llm_response">LLM Quality</option>
                    <option value="english_telugu">English / Telugu</option>
                    <option value="voice">Voice (STT/TTS)</option>
                    <option value="appointment_workflow">Appointments</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Language
                  </label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="en">English (en)</option>
                    <option value="te">Telugu (te)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Patient Query
                </label>
                <textarea
                  required
                  rows={2}
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  placeholder="e.g. Patient reports chest pain radiating to left arm..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Expected Clinical Behavior
                </label>
                <textarea
                  required
                  rows={2}
                  value={newBehavior}
                  onChange={(e) => setNewBehavior(e.target.value)}
                  placeholder="e.g. Immediate cardiac emergency alert, ambulance 112/108..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Expected Label
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="emergency or target doc"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#0284c7', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Saving...' : 'Save Test Case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
