import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  History, 
  Download, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink,
  Loader2,
  Server,
  Zap,
  Globe,
  Sparkles,
  TrendingUp,
  Flame,
  GitPullRequest,
  X
} from 'lucide-react';
import { scanService } from './api/scanService';
import { ScanResult } from './api/types';
import { ViolationCard } from './components/ViolationCard';

export const App: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reverifying, setReverifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [activeTab, setActiveTab] = useState<'audit' | 'history'>('audit');
  const [filterImpact, setFilterImpact] = useState<string>('all');
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [reverifyComparison, setReverifyComparison] = useState<{
    previousScore: number;
    currentScore: number;
    scoreChange: string;
    issuesResolved: number;
  } | null>(null);

  // GitHub OAuth & Auto-PR state
  const [githubToken, setGithubToken] = useState<string | null>(() => localStorage.getItem('github_token'));
  const [githubUser, setGithubUser] = useState<{ login: string; name: string; avatar_url: string; html_url: string } | null>(null);
  const [showPrModal, setShowPrModal] = useState(false);
  const [prRepoInput, setPrRepoInput] = useState('');
  const [prFilePath, setPrFilePath] = useState('index.html');
  const [prLoading, setPrLoading] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);
  const [prSuccess, setPrSuccess] = useState<{ prUrl: string; prNumber: number; branch: string } | null>(null);

  // Capture token or auth error from query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const authError = params.get('auth_error');
    if (token) {
      localStorage.setItem('github_token', token);
      setGithubToken(token);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authError) {
      setError(`GitHub OAuth notification: ${decodeURIComponent(authError).replace(/_/g, ' ')}`);
      setShowPrModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch GitHub profile when token exists
  useEffect(() => {
    if (githubToken) {
      scanService.getGitHubStatus(githubToken).then((res) => {
        if (res.connected && res.user) {
          setGithubUser(res.user);
        }
      });
    } else {
      setGithubUser(null);
    }
  }, [githubToken]);

  // Check health and load history on startup
  useEffect(() => {
    checkHealth();
    loadHistory();
  }, []);

  const checkHealth = async () => {
    try {
      await scanService.checkHealth();
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await scanService.getScanHistory();
      setHistory(data);
    } catch (err: any) {
      console.warn('History fetch:', err.message);
    }
  };

  const handleRunScan = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    const targetUrl = (overrideUrl || urlInput).trim();
    if (!targetUrl) return;

    setLoading(true);
    setError(null);
    setReverifyComparison(null);

    try {
      const result = await scanService.runScan(targetUrl);
      setCurrentScan(result);
      setActiveTab('audit');
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to complete accessibility scan.');
    } finally {
      setLoading(false);
    }
  };

  const handleReverify = async () => {
    if (!currentScan?._id) return;
    setReverifying(true);
    setError(null);

    try {
      const res = await scanService.reverifyScan(currentScan._id);
      setCurrentScan(res.data);
      if (res.comparison) {
        setReverifyComparison({
          previousScore: res.comparison.previousScore,
          currentScore: res.comparison.currentScore,
          scoreChange: res.comparison.scoreChange,
          issuesResolved: res.comparison.issuesResolved,
        });
      }
      loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to re-verify scan.');
    } finally {
      setReverifying(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!currentScan?._id) return;
    const downloadUrl = scanService.getPdfReportUrl(currentScan._id);
    window.open(downloadUrl, '_blank');
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';
    if (score >= 70) return 'text-yellow-400 border-yellow-500/40 bg-yellow-950/20';
    return 'text-red-400 border-red-500/40 bg-red-950/20';
  };

  const filteredViolations = currentScan?.violations.filter((v) => {
    if (filterImpact === 'all') return true;
    return v.impact === filterImpact;
  }) || [];

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#080c14]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                EquiDOM
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                WCAG Auditor + AI Fixes
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Backend status indicator */}
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Backend:</span>
              {backendOnline === null ? (
                <span className="text-slate-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking
                </span>
              ) : backendOnline ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Connected
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Disconnected
                </span>
              )}
            </div>

            {/* GitHub OAuth Status Pill */}
            {githubToken ? (
              <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{githubUser ? `@${githubUser.login}` : 'GitHub Connected'}</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('github_token');
                    setGithubToken(null);
                    setGithubUser(null);
                  }}
                  className="text-slate-400 hover:text-red-400 ml-1"
                  title="Disconnect"
                >
                  &times;
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPrModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
              >
                <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
                Connect GitHub
              </button>
            )}

            <nav className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'audit'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Auditor
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                History ({history.length})
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error notification banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <span className="font-semibold">Error:</span> {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-400 hover:text-red-300 underline font-mono"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Auditor */}
        {activeTab === 'audit' && (
          <>
            {/* Hero & Search bar */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-slate-950/80 border border-indigo-900/30 p-6 sm:p-10 shadow-2xl">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                  Full-DOM Headless Chromium + axe-core Engine
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Automated WCAG Auditing with Instant AI Code Fixes
                </h1>
                <p className="text-sm sm:text-base text-slate-400">
                  Enter any live URL to detect WCAG 2.1 Level A/AA violations, understand reasons in plain English, and copy drop-in AI patches.
                </p>
              </div>

              {/* URL Input Form */}
              <form onSubmit={handleRunScan} className="mt-8 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 font-semibold text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Scanning DOM...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Run Audit
                    </>
                  )}
                </button>
              </form>

              {/* Sample Quick URLs */}
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>Quick tests:</span>
                {['https://example.com', 'https://news.ycombinator.com', 'https://wikipedia.org'].map((demoUrl) => (
                  <button
                    key={demoUrl}
                    type="button"
                    onClick={() => {
                      setUrlInput(demoUrl);
                      handleRunScan(undefined, demoUrl);
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-mono transition border border-slate-700/60"
                  >
                    {demoUrl}
                  </button>
                ))}
              </div>
            </div>

            {/* Reverify Comparison Banner */}
            {reverifyComparison && (
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/60 text-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-100 text-sm">
                      Re-Verification Complete!
                    </h4>
                    <p className="text-xs text-emerald-300/80">
                      Score changed by <span className="font-bold text-white">{reverifyComparison.scoreChange}</span> pts. Resolved{' '}
                      <span className="font-bold text-white">{reverifyComparison.issuesResolved}</span> issues.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-700">
                    Prev: {reverifyComparison.previousScore} / 100
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-bold">
                    Now: {reverifyComparison.currentScore} / 100
                  </span>
                </div>
              </div>
            )}

            {/* Active Audit Results */}
            {currentScan ? (
              <div className="space-y-6">
                {/* Result Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
                  <div className="space-y-1">
                    <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                      Audit Target
                    </span>
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 break-all">
                      {currentScan.url}
                      <a
                        href={currentScan.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-indigo-400 transition"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">
                      Scanned at: {new Date(currentScan.timestamp).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions (Reverify + Download PDF + Create Auto-PR) */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleReverify}
                      disabled={reverifying}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs sm:text-sm flex items-center gap-2 transition disabled:opacity-50"
                    >
                      <RotateCcw className={`w-4 h-4 ${reverifying ? 'animate-spin text-indigo-400' : ''}`} />
                      {reverifying ? 'Re-verifying...' : 'Re-verify Fixes'}
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF Audit
                    </button>
                    <button
                      onClick={() => {
                        if (!githubToken) {
                          window.location.href = scanService.getGitHubAuthUrl();
                          return;
                        }
                        setPrError(null);
                        setPrSuccess(null);
                        setShowPrModal(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-indigo-500/40 font-medium text-xs sm:text-sm flex items-center gap-2 transition shadow-sm"
                    >
                      <GitPullRequest className="w-4 h-4 text-indigo-400" />
                      Create Auto-PR
                    </button>
                  </div>
                </div>

                {/* Score & Breakdown Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* Overall Score */}
                  <div className={`col-span-2 md:col-span-1 p-5 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(currentScan.accessibilityScore)}`}>
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                      Score
                    </span>
                    <span className="text-4xl font-extrabold tracking-tight">
                      {currentScan.accessibilityScore}
                    </span>
                    <span className="text-xs text-slate-400 mt-1">out of 100</span>
                  </div>

                  {/* Critical */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-red-900/40 text-center flex flex-col justify-center">
                    <span className="text-xs font-mono uppercase text-red-400">Critical</span>
                    <span className="text-2xl font-bold text-red-300 mt-1">
                      {currentScan.summary?.critical || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">-15 pts each</span>
                  </div>

                  {/* Serious */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-900/40 text-center flex flex-col justify-center">
                    <span className="text-xs font-mono uppercase text-amber-400">Serious</span>
                    <span className="text-2xl font-bold text-amber-300 mt-1">
                      {currentScan.summary?.serious || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">-10 pts each</span>
                  </div>

                  {/* Moderate */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-yellow-900/40 text-center flex flex-col justify-center">
                    <span className="text-xs font-mono uppercase text-yellow-300">Moderate</span>
                    <span className="text-2xl font-bold text-yellow-200 mt-1">
                      {currentScan.summary?.moderate || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">-5 pts each</span>
                  </div>

                  {/* Minor */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-blue-900/40 text-center flex flex-col justify-center">
                    <span className="text-xs font-mono uppercase text-blue-400">Minor</span>
                    <span className="text-2xl font-bold text-blue-200 mt-1">
                      {currentScan.summary?.minor || 0}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">-2 pts each</span>
                  </div>
                </div>

                {/* Filter and Violations List */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-base font-bold text-white">
                        Violations Found ({filteredViolations.length} of {currentScan.totalViolations})
                      </h3>
                    </div>

                    {/* Filter buttons */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                      {['all', 'critical', 'serious', 'moderate', 'minor'].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setFilterImpact(lvl)}
                          className={`px-3 py-1 rounded-lg capitalize font-medium transition ${
                            filterImpact === lvl
                              ? 'bg-slate-700 text-white font-semibold'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredViolations.length === 0 ? (
                    <div className="p-8 rounded-xl bg-slate-900/40 border border-slate-800 text-center space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                      <h4 className="text-base font-semibold text-slate-200">No violations match this criteria</h4>
                      <p className="text-xs text-slate-400">
                        Select "all" or run a new scan with a different target page.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredViolations.map((violation, idx) => (
                        <ViolationCard key={`${violation.id}-${idx}`} violation={violation} index={idx} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty state before first scan */
              <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-800 space-y-3">
                <Sparkles className="w-12 h-12 text-indigo-400/80 mx-auto" />
                <h3 className="text-lg font-bold text-slate-200">No URL scanned yet</h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                  Paste any public website URL above or choose a sample to inspect accessibility issues and generate AI-assisted patches.
                </p>
              </div>
            )}
          </>
        )}

        {/* Tab 2: History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                Recent Scan Records ({history.length})
              </h2>
              <button
                onClick={loadHistory}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Refresh List
              </button>
            </div>

            {history.length === 0 ? (
              <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm">
                No past scans recorded yet. Run your first audit to see it listed here!
              </div>
            ) : (
              <div className="grid gap-3">
                {history.map((item) => (
                  <div
                    key={item._id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          item.accessibilityScore >= 90 ? 'bg-emerald-950 text-emerald-400' :
                          item.accessibilityScore >= 70 ? 'bg-yellow-950 text-yellow-400' :
                          'bg-red-950 text-red-400'
                        }`}>
                          Score: {item.accessibilityScore}/100
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {item.totalViolations} violations
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200 break-all">
                        {item.url}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setCurrentScan(item);
                          setActiveTab('audit');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                      >
                        Inspect Report
                      </button>
                      <button
                        onClick={() => window.open(scanService.getPdfReportUrl(item._id), '_blank')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Auto-PR Modal */}
      {showPrModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Create Accessibility Pull Request</h3>
              </div>
              <button
                onClick={() => setShowPrModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {prSuccess ? (
              <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="font-semibold text-white text-base">Pull Request Created!</h4>
                <p className="text-xs text-slate-300">
                  Branch <code className="text-indigo-300 font-mono">{prSuccess.branch}</code> was created with the automated fixes.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <a
                    href={prSuccess.prUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <span>View Pull Request #{prSuccess.prNumber}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      setPrSuccess(null);
                      setShowPrModal(false);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!prRepoInput.trim()) {
                    setPrError('Please enter repository name (e.g. username/repo-name or full URL).');
                    return;
                  }
                  setPrLoading(true);
                  setPrError(null);
                  try {
                    let fileContent = '';
                    if (currentScan?.violations && currentScan.violations.length > 0) {
                      fileContent = currentScan.violations
                        .filter(v => v.aiCodeFix)
                        .map(v => `<!-- [Fix: ${v.id}] ${v.description} -->\n${v.aiCodeFix}`)
                        .join('\n\n');
                    }
                    const res = await scanService.triggerAutoPR({
                      token: githubToken || undefined,
                      repoUrl: prRepoInput.trim(),
                      filePath: prFilePath.trim() || 'index.html',
                      fileContent: fileContent || '<!-- ♿ EquiDOM Accessibility Fixes Applied -->\n',
                      commitMessage: `♿ EquiDom: Automated accessibility fix for ${currentScan?.url || 'target page'}`,
                      scanId: currentScan?._id
                    });
                    setPrSuccess({
                      prUrl: res.data.prUrl,
                      prNumber: res.data.prNumber,
                      branch: res.data.branch
                    });
                  } catch (err: any) {
                    setPrError(err.message || 'Failed to create Pull Request');
                  } finally {
                    setPrLoading(false);
                  }
                }}
                className="space-y-4 text-xs font-mono"
              >
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-medium">GitHub Repository</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. username/repo or https://github.com/org/repo"
                    value={prRepoInput}
                    onChange={(e) => setPrRepoInput(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-medium">File Path in Repository</label>
                  <input
                    type="text"
                    required
                    placeholder="index.html"
                    value={prFilePath}
                    onChange={(e) => setPrFilePath(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
                  />
                </div>

                {prError && (
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{prError}</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPrModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={prLoading}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50"
                  >
                    {prLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening PR...</span>
                      </>
                    ) : (
                      <>
                        <GitPullRequest className="w-3.5 h-3.5" />
                        <span>Create Pull Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#080c14]/90 py-6 text-center text-xs text-slate-400">
        EquiDOM • Automated WCAG 2.1 Web Accessibility Auditor powered by axe-core & AI
      </footer>
    </div>
  );
};

export default App;
