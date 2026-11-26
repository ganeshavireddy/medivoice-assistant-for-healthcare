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

export class EvaluationService {
  private apiHost: string;

  constructor(apiHost: string) {
    this.apiHost = apiHost.replace(/\/$/, '');
  }

  private async fetchWithFallback<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Try /api/v1/evaluation first, fallback to /api/evaluation
    const urls = [
      `${this.apiHost}/api/v1/evaluation${endpoint}`,
      `${this.apiHost}/api/evaluation${endpoint}`,
    ];

    let lastError: any = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error(`Failed to fetch from ${endpoint}`);
  }

  async getOverview(): Promise<OverviewMetrics> {
    return this.fetchWithFallback<OverviewMetrics>('/overview');
  }

  async getRAGMetrics(): Promise<RAGMetricsData> {
    return this.fetchWithFallback<RAGMetricsData>('/rag');
  }

  async getLLMMetrics(): Promise<LLMMetricsData> {
    return this.fetchWithFallback<LLMMetricsData>('/llm');
  }

  async getSafetyMetrics(): Promise<SafetyMetricsData> {
    return this.fetchWithFallback<SafetyMetricsData>('/safety');
  }

  async getLanguageMetrics(): Promise<LanguageMetricsData> {
    return this.fetchWithFallback<LanguageMetricsData>('/languages');
  }

  async getVoiceMetrics(): Promise<VoiceMetricsData> {
    return this.fetchWithFallback<VoiceMetricsData>('/voice');
  }

  async getPerformanceMetrics(): Promise<PerformanceMetricsData> {
    return this.fetchWithFallback<PerformanceMetricsData>('/performance');
  }

  async getAppointmentMetrics(): Promise<AppointmentMetricsData> {
    return this.fetchWithFallback<AppointmentMetricsData>('/appointments');
  }

  async getTestCases(category?: string, language?: string, search?: string): Promise<TestCase[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (language && language !== 'all') params.append('language', language);
    if (search) params.append('search', search);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    return this.fetchWithFallback<TestCase[]>(`/test-cases${queryStr}`);
  }

  async createTestCase(testCase: Partial<TestCase>): Promise<TestCase> {
    return this.fetchWithFallback<TestCase>('/test-cases', {
      method: 'POST',
      body: JSON.stringify(testCase),
    });
  }

  async updateTestCase(testId: string, testCase: Partial<TestCase>): Promise<TestCase> {
    return this.fetchWithFallback<TestCase>(`/test-cases/${testId}`, {
      method: 'PUT',
      body: JSON.stringify(testCase),
    });
  }

  async deleteTestCase(testId: string): Promise<void> {
    await this.fetchWithFallback<void>(`/test-cases/${testId}`, {
      method: 'DELETE',
    });
  }

  async triggerRun(category?: string, testId?: string): Promise<any> {
    return this.fetchWithFallback<any>('/run', {
      method: 'POST',
      body: JSON.stringify({ category, test_id: testId, trigger_type: 'manual' }),
    });
  }

  async getRuns(): Promise<EvaluationRun[]> {
    return this.fetchWithFallback<EvaluationRun[]>('/runs');
  }

  async getRunDetails(runId: string): Promise<{ run: EvaluationRun; results: any[] }> {
    return this.fetchWithFallback<{ run: EvaluationRun; results: any[] }>(`/runs/${runId}`);
  }

  getExportUrl(runId?: string, format: 'json' | 'csv' = 'json'): string {
    const runParam = runId ? `&run_id=${encodeURIComponent(runId)}` : '';
    return `${this.apiHost}/api/v1/evaluation/export?format=${format}${runParam}`;
  }
}
