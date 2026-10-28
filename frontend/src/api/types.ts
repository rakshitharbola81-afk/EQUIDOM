export interface Violation {
  _id?: string;
  id: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help?: string;
  helpUrl?: string;
  target?: string[];
  tags?: string[];
  html?: string;
  failureSummary?: string;
  aiExplanation?: string;
  aiCodeFix?: string;
  preventionTip?: string;
  effort?: string;
  wcagGuideline?: string;
  whyItIsAProblem?: string;
  exampleBad?: string;
  exampleGood?: string;
}

export interface ComplianceBreakdown {
  wcag2a?: number;
  wcag2aa?: number;
  section508?: number;
}

export interface SummaryBreakdown {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
}

export interface ScanResult {
  _id: string;
  url: string; // may be empty string for HTML snippet scans
  timestamp: string;
  accessibilityScore: number;
  totalViolations: number;
  summary: SummaryBreakdown;
  complianceBreakdown?: ComplianceBreakdown;
  violations: Violation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
  comparison?: {
    previousScore: number;
    currentScore: number;
    scoreChange: string;
    issuesResolved: number;
    previousTotalViolations: number;
    currentTotalViolations: number;
  };
}

export interface HealthStatus {
  status: string;
  message: string;
}
