import { apiClient } from './client';
import { ApiResponse, ScanResult, HealthStatus } from './types';

export const scanService = {
  /**
   * Health check to test backend connection
   */
  async checkHealth(): Promise<HealthStatus> {
    const response = await apiClient.get<HealthStatus>('/health');
    return response.data;
  },

  /**
   * Run a new accessibility scan for a given URL
   */
  async runScan(url: string): Promise<ScanResult> {
    const response = await apiClient.post<ApiResponse<ScanResult>>('/scan', { url });
    return response.data.data;
  },

  /**
   * Run an accessibility scan for a raw HTML code snippet
   */
  async runHtmlScan(html: string): Promise<ScanResult> {
    const response = await apiClient.post<ApiResponse<ScanResult>>('/scan', { html });
    return response.data.data;
  },

  /**
   * Fetch recent scan history
   */
  async getScanHistory(): Promise<ScanResult[]> {
    const response = await apiClient.get<ApiResponse<ScanResult[]>>('/scan/history');
    return response.data.data || [];
  },

  /**
   * Fetch a specific scan by ID
   */
  async getScanById(id: string): Promise<ScanResult> {
    const response = await apiClient.get<ApiResponse<ScanResult>>(`/scan/${id}`);
    return response.data.data;
  },

  /**
   * Re-verify a previous scan to check for fixes
   */
  async reverifyScan(id: string): Promise<{ data: ScanResult; comparison: ApiResponse<ScanResult>['comparison'] }> {
    const response = await apiClient.post<ApiResponse<ScanResult>>(`/scan/reverify/${id}`);
    return {
      data: response.data.data,
      comparison: response.data.comparison,
    };
  },

  /**
   * Get direct URL or trigger download for PDF audit report
   */
  getPdfReportUrl(id: string): string {
    const baseURL = apiClient.defaults.baseURL || 'http://localhost:5001/api';
    return `${baseURL}/scan/report/pdf/${id}`;
  },

  /**
   * Trigger automated GitHub pull request with accessibility remediations
   */
  async triggerAutoPR(payload: {
    token?: string;
    repoOwner?: string;
    repoName?: string;
    repoUrl?: string;
    filePath?: string;
    fileContent?: string;
    commitMessage?: string;
    prTitle?: string;
    scanId?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      prUrl: string;
      prNumber: number;
      branch: string;
      base: string;
      title: string;
      repo: string;
      filePath: string;
    };
  }> {
    const token = payload.token || localStorage.getItem('github_token') || undefined;
    const response = await apiClient.post('/scan/pr', {
      ...payload,
      token
    }, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });
    return response.data;
  },

  /**
   * Get GitHub OAuth authorization URL
   */
  getGitHubAuthUrl(): string {
    const baseURL = apiClient.defaults.baseURL || 'http://localhost:5001/api';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5174';
    return `${baseURL}/auth/github?origin=${encodeURIComponent(origin)}`;
  },

  /**
   * Check connected GitHub user profile
   */
  async getGitHubStatus(token?: string): Promise<{
    connected: boolean;
    user?: { login: string; name: string; avatar_url: string; html_url: string };
  }> {
    const authToken = token || localStorage.getItem('github_token');
    if (!authToken) return { connected: false };
    try {
      const response = await apiClient.get('/auth/status', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      return response.data;
    } catch {
      return { connected: false };
    }
  }
};

