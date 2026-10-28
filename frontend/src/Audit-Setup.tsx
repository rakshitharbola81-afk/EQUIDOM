import { useId, useState, useEffect, type FormEvent } from "react";
import { useSandNavigate } from "./sand-context.ts";
import { scanService } from "./api/scanService";
import { ScanResult, Violation } from "./api/types";
import { 
  Download, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Sparkles,
  Loader2,
  TrendingUp,
  History,
  ShieldCheck,
  Code2,
  Globe,
  ArrowRight,
  Lightbulb,
  Terminal,
  Layers,
  ArrowLeft,
  X,
  BookOpen,
  XCircle,
  HelpCircle,
  GitPullRequest
} from "lucide-react";
import { EquidomSpeedometer } from "./components/EquidomSpeedometer";
import SpotlightCard from "./components/reactbits/SpotlightCard.tsx";
import DecryptedText from "./components/reactbits/DecryptedText.tsx";
import CountUp from "./components/reactbits/CountUp.tsx";
import { getWcagDetailForRule } from "./utils/wcagRules";

import "./Audit-Setup.screen.css";

function normalizeUrl(raw: string): URL | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.includes(".") ? url : null;
  } catch {
    return null;
  }
}

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Accessible Demo Store</title>
</head>
<body>
  <header>
    <nav aria-label="Main Navigation">
      <a href="/">Home</a>
      <a href="/products">Catalog</a>
    </nav>
  </header>
  <main>
    <h1>Featured Products</h1>
    <!-- Missing alt text violation -->
    <img src="/shoes.jpg">
    <!-- Unlabeled button violation -->
    <button class="cart-btn"></button>
    <!-- Low contrast text violation -->
    <p style="color: #ccc; background-color: #fff;">
      Spring sale ends at midnight.
    </p>
  </main>
</body>
</html>`;

export default function AuditSetup() {
  const go = useSandNavigate();
  const inputId = useId();
  const errorId = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reverifying, setReverifying] = useState(false);
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null);
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [filterImpact, setFilterImpact] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [inputMode, setInputMode] = useState<"url" | "html">("url");
  const [htmlInput, setHtmlInput] = useState("");
  const [reverifyComparison, setReverifyComparison] = useState<{
    previousScore: number;
    currentScore: number;
    scoreChange: string;
    issuesResolved: number;
  } | null>(null);

  // GitHub OAuth & Auto-PR state
  const [githubToken, setGithubToken] = useState<string | null>(() => localStorage.getItem("github_token"));
  const [githubUser, setGithubUser] = useState<{ login: string; name: string; avatar_url: string; html_url: string } | null>(null);
  const [showPrModal, setShowPrModal] = useState(false);
  const [prRepoInput, setPrRepoInput] = useState("");
  const [prFilePath, setPrFilePath] = useState("index.html");
  const [prLoading, setPrLoading] = useState(false);
  const [prError, setPrError] = useState<string | null>(null);
  const [prSuccess, setPrSuccess] = useState<{ prUrl: string; prNumber: number; branch: string; title: string } | null>(null);
  const [patInput, setPatInput] = useState("");
  const [patLoading, setPatLoading] = useState(false);

  // Capture GitHub OAuth token from redirect query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const authError = params.get("auth_error");

    if (token) {
      localStorage.setItem("github_token", token);
      setGithubToken(token);
      // Clean query string from browser address bar
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authError) {
      setError(`GitHub OAuth notification: ${decodeURIComponent(authError).replace(/_/g, ' ')}`);
      setShowPrModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Fetch GitHub profile when token is active
  useEffect(() => {
    if (githubToken) {
      scanService.getGitHubStatus(githubToken).then((res) => {
        if (res.connected && res.user) {
          setGithubUser(res.user);
        } else {
          setGithubUser(null);
        }
      });
    } else {
      setGithubUser(null);
    }
  }, [githubToken]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await scanService.getScanHistory();
      setHistory(data);
    } catch (e: any) {
      console.warn("Could not load scan history:", e.message);
    }
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (inputMode === "html") {
      if (!htmlInput.trim()) {
        setError("Paste some HTML markup to audit.");
        return;
      }
      setError("");
      setLoading(true);
      setReverifyComparison(null);
      try {
        const result = await scanService.runHtmlScan(htmlInput.trim());
        setCurrentScan(result);
        loadHistory();
      } catch (err: any) {
        setError(err.message || "Failed to scan HTML snippet.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const parsed = normalizeUrl(value);
    if (!parsed) {
      setError("Enter a full website address, like https://example.com");
      return;
    }

    setError("");
    setLoading(true);
    setReverifyComparison(null);

    try {
      const result = await scanService.runScan(parsed.toString());
      setCurrentScan(result);
      loadHistory();
    } catch (err: any) {
      setError(err.message || "Failed to complete accessibility scan.");
    } finally {
      setLoading(false);
    }
  }

  const handleReverify = async () => {
    if (!currentScan?._id) return;
    setReverifying(true);
    setError("");

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
      setError(err.message || "Failed to re-verify fixes.");
    } finally {
      setReverifying(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!currentScan?._id) return;
    window.open(scanService.getPdfReportUrl(currentScan._id), "_blank");
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredViolations = currentScan?.violations.filter((v) => {
    if (filterImpact === "all") return true;
    return v.impact === filterImpact;
  }) || [];

  return (
    <main className="min-h-dvh w-full px-4 sm:px-8 py-8 text-white relative">
      
      {/* ── 80-85% SCREEN WIDTH CONTAINER ──────────────────────── */}
      <div className="w-[85%] max-w-[1400px] mx-auto space-y-8">
        
        {/* ── HEADER / TOP NAVIGATION BAR ────────────────────── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => go("/evolve-landing")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-300 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Home
            </button>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
              <h1 className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-white">
                <DecryptedText
                  text="Accessibility Audit Workspace"
                  speed={40}
                  animateOn="view"
                  sequential
                  className="font-mono text-white"
                />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentScan ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Score: {currentScan.accessibilityScore}/100
              </span>
            ) : loading ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium">
                <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                Auditing DOM...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-xs font-mono">
                WCAG 2.2 Ready
              </span>
            )}

            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-200 transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-amber-300" />
                History ({history.length})
              </button>
            )}

            {/* GitHub OAuth Connection Status */}
            {githubToken ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium">
                {githubUser?.avatar_url ? (
                  <img src={githubUser.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{githubUser ? `@${githubUser.login}` : "GitHub Connected"}</span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("github_token");
                    setGithubToken(null);
                    setGithubUser(null);
                  }}
                  className="text-zinc-400 hover:text-red-300 ml-1 text-xs cursor-pointer"
                  title="Disconnect GitHub account"
                >
                  &times;
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPrModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono text-zinc-200 hover:text-white transition cursor-pointer"
              >
                <GitPullRequest className="w-3.5 h-3.5 text-amber-300" />
                Connect GitHub
              </button>
            )}
          </div>
        </header>

        {/* ── SECTION 1: AUDIT CONTROL CONSOLE (Harmonized Dark Surface) ── */}
        <section aria-labelledby="console-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="console-heading" className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              01 • Target Configuration
            </h2>
            <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/40 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setInputMode("url")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-xs font-medium transition cursor-pointer ${
                  inputMode === "url"
                    ? "bg-white text-neutral-950 font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Globe className="w-3 h-3" />
                Website URL
              </button>
              <button
                type="button"
                onClick={() => setInputMode("html")}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-xs font-medium transition cursor-pointer ${
                  inputMode === "html"
                    ? "bg-white text-neutral-950 font-semibold shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Code2 className="w-3 h-3" />
                Raw HTML
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left Box (8 cols): Input Form (Blends softly with dark background) */}
            <div className="lg:col-span-8 p-6 sm:p-8 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
              <form onSubmit={onSubmit} noValidate className="space-y-5">
                {inputMode === "url" ? (
                  <div className="space-y-3">
                    <label
                      htmlFor={inputId}
                      className="block text-sm font-medium text-white font-mono"
                    >
                      Website Address to Crawl
                    </label>
                    <div className="relative">
                      <input
                        id={inputId}
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        placeholder="https://example.com"
                        value={value}
                        disabled={loading}
                        onChange={(e) => {
                          setValue(e.target.value);
                          if (error) setError("");
                        }}
                        aria-invalid={!!error}
                        aria-describedby={error ? errorId : undefined}
                        className="h-13 w-full rounded-2xl border border-white/15 bg-black/60 pl-4 pr-32 text-base text-white placeholder:text-zinc-500 font-mono transition outline-none hover:border-white/30 focus:border-[#ffd60a] focus:ring-1 focus:ring-[#ffd60a]"
                      />
                      <button
                        type="submit"
                        disabled={loading}
                        className="absolute right-2 top-2 bottom-2 px-5 rounded-xl bg-white text-neutral-950 text-xs font-semibold hover:bg-neutral-100 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Scanning</span>
                          </>
                        ) : (
                          <>
                            <span>Run Audit</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-xs text-zinc-400 font-mono">Quick Presets:</span>
                      {["https://example.com", "https://google.com", "https://wikipedia.org", "https://news.ycombinator.com"].map((demo) => (
                        <button
                          key={demo}
                          type="button"
                          onClick={() => {
                            setValue(demo);
                            setError("");
                          }}
                          className="px-2.5 py-1 text-xs rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/15 hover:text-white font-mono transition cursor-pointer"
                        >
                          {demo.replace("https://", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`${inputId}-html`}
                        className="block text-sm font-medium text-white font-mono"
                      >
                        Raw HTML Markup
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setHtmlInput(SAMPLE_HTML);
                          setError("");
                        }}
                        className="text-xs font-mono text-amber-300 hover:underline cursor-pointer"
                      >
                        Insert Demo Markup
                      </button>
                    </div>
                    <textarea
                      id={`${inputId}-html`}
                      placeholder="Paste your HTML code snippet here..."
                      value={htmlInput}
                      disabled={loading}
                      onChange={(e) => {
                        setHtmlInput(e.target.value);
                        if (error) setError("");
                      }}
                      rows={6}
                      className="w-full rounded-2xl border border-white/15 bg-black/60 p-4 text-xs font-mono text-white placeholder:text-zinc-500 transition outline-none hover:border-white/30 focus:border-[#ffd60a] focus:ring-1 focus:ring-[#ffd60a] leading-relaxed resize-y"
                    />
                    <button
                      type="submit"
                      disabled={loading}
                      className="h-11 px-6 rounded-xl bg-white text-neutral-950 text-xs font-semibold hover:bg-neutral-100 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Scanning HTML Markup...</span>
                        </>
                      ) : (
                        <>
                          <span>Run HTML Audit</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {error && (
                  <p id={errorId} role="alert" className="text-xs text-red-300 flex items-center gap-1.5 p-3 rounded-xl bg-red-950/60 border border-red-500/30">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    {error}
                  </p>
                )}
              </form>
            </div>

            {/* Right Box (4 cols): Specification Tiles */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-3">
              <SpotlightCard
                className="!rounded-2xl !p-4 !border-white/10 !bg-black/60 backdrop-blur-xl shadow-lg"
                spotlightColor="rgba(255, 214, 10, 0.12)"
                theme="dark"
              >
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="text-[11px] font-mono uppercase text-zinc-400 font-medium">Standard</div>
                  <div className="text-base font-bold text-white font-mono">WCAG 2.2 AA</div>
                  <div className="text-[11px] text-zinc-400">Level A & AA criteria evaluated</div>
                </div>
              </SpotlightCard>

              <SpotlightCard
                className="!rounded-2xl !p-4 !border-white/10 !bg-black/60 backdrop-blur-xl shadow-lg"
                spotlightColor="rgba(255, 214, 10, 0.12)"
                theme="dark"
              >
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="text-[11px] font-mono uppercase text-zinc-400 font-medium">Auditor</div>
                  <div className="text-base font-bold text-white font-mono">axe-core v4.10</div>
                  <div className="text-[11px] text-zinc-400">DOM node inspection engine</div>
                </div>
              </SpotlightCard>

              <SpotlightCard
                className="!rounded-2xl !p-4 !border-white/10 !bg-black/60 backdrop-blur-xl shadow-lg"
                spotlightColor="rgba(255, 214, 10, 0.12)"
                theme="dark"
              >
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="text-[11px] font-mono uppercase text-zinc-400 font-medium">Remediation</div>
                  <div className="text-base font-bold text-white font-mono">Gemini AI</div>
                  <div className="text-[11px] text-zinc-400">Root-cause & copy-paste fixes</div>
                </div>
              </SpotlightCard>

              <SpotlightCard
                className="!rounded-2xl !p-4 !border-white/10 !bg-black/60 backdrop-blur-xl shadow-lg"
                spotlightColor="rgba(255, 214, 10, 0.12)"
                theme="dark"
              >
                <div className="flex flex-col justify-between h-full space-y-2">
                  <div className="text-[11px] font-mono uppercase text-zinc-400 font-medium">Reporting</div>
                  <div className="text-base font-bold text-white font-mono">PDF Export</div>
                  <div className="text-[11px] text-zinc-400">Executive compliance summary</div>
                </div>
              </SpotlightCard>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: HEALTH OVERVIEW & SCORE DASHBOARD ───── */}
        {currentScan && (
          <section aria-labelledby="score-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="score-heading" className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                02 • Compliance Score & Severity Breakdown
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReverify}
                  disabled={reverifying || !currentScan.url}
                  className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono font-medium text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${reverifying ? "animate-spin text-amber-300" : ""}`} />
                  {reverifying ? "Rescanning..." : "Re-scan Fixes"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 py-1.5 rounded-xl bg-white text-neutral-950 hover:bg-neutral-100 text-xs font-mono font-semibold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF Report
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!githubToken) {
                      window.location.href = scanService.getGitHubAuthUrl();
                      return;
                    }
                    setPrError(null);
                    setPrSuccess(null);
                    if (currentScan?.url && !prRepoInput) {
                      const u = currentScan.url;
                      const ghIoMatch = u.match(/https?:\/\/([^.]+)\.github\.io\/([^/?#]+)?/i);
                      if (ghIoMatch) {
                        setPrRepoInput(`${ghIoMatch[1]}/${ghIoMatch[2] || 'my-site'}`);
                      } else {
                        const ghRepoMatch = u.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
                        if (ghRepoMatch) {
                          setPrRepoInput(`${ghRepoMatch[1]}/${ghRepoMatch[2]}`);
                        }
                      }
                    }
                    setShowPrModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-xs font-mono font-semibold text-amber-300 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <GitPullRequest className="w-3.5 h-3.5 text-amber-300" />
                  Create Auto-PR
                </button>
              </div>
            </div>

            {/* Re-verification Comparison Banner */}
            {reverifyComparison && (
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white text-sm">Re-Verification Completed</h4>
                    <p className="text-xs text-emerald-300">
                      Score changed by <span className="font-bold text-white">{reverifyComparison.scoreChange}</span>. Resolved{" "}
                      <span className="font-bold text-white">{reverifyComparison.issuesResolved}</span> issues.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-3 py-1 rounded-lg border border-emerald-700/60 bg-emerald-950/60 text-zinc-300">
                    Previous: {reverifyComparison.previousScore}
                  </span>
                  <span className="px-3 py-1 rounded-lg border border-emerald-400 bg-emerald-500/20 text-white font-bold">
                    Current: {reverifyComparison.currentScore}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Speedometer Card */}
              <div className="lg:col-span-4 p-6 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center text-center">
                <EquidomSpeedometer
                  score={currentScan.accessibilityScore}
                  size={240}
                  label="EquiDOM Score"
                />
                <div className="mt-2 text-xs font-mono">
                  {currentScan.accessibilityScore >= 90 ? (
                    <span className="text-emerald-400 font-semibold">High Accessibility Compliance</span>
                  ) : currentScan.accessibilityScore >= 70 ? (
                    <span className="text-amber-400 font-semibold">Moderate Compliance • Needs Work</span>
                  ) : (
                    <span className="text-red-400 font-semibold">Critical Barriers Detected</span>
                  )}
                </div>
              </div>

              {/* Right Severity Matrix */}
              <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SpotlightCard
                  className="!rounded-2xl !p-5 !border-red-500/25 !bg-black/60 backdrop-blur-xl shadow-lg"
                  spotlightColor="rgba(239, 68, 68, 0.15)"
                  theme="dark"
                >
                  <div className="flex flex-col justify-between h-full space-y-2">
                    <span className="text-[11px] font-mono uppercase text-red-400 font-bold tracking-wider">Critical</span>
                    <div className="text-3xl font-mono font-bold text-red-200">
                      <CountUp to={currentScan.summary?.critical || 0} duration={1.2} />
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">Severe accessibility blockers</p>
                  </div>
                </SpotlightCard>

                <SpotlightCard
                  className="!rounded-2xl !p-5 !border-amber-500/25 !bg-black/60 backdrop-blur-xl shadow-lg"
                  spotlightColor="rgba(245, 158, 11, 0.15)"
                  theme="dark"
                >
                  <div className="flex flex-col justify-between h-full space-y-2">
                    <span className="text-[11px] font-mono uppercase text-amber-400 font-bold tracking-wider">Serious</span>
                    <div className="text-3xl font-mono font-bold text-amber-200">
                      <CountUp to={currentScan.summary?.serious || 0} duration={1.2} />
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">Major barrier to users</p>
                  </div>
                </SpotlightCard>

                <SpotlightCard
                  className="!rounded-2xl !p-5 !border-yellow-500/25 !bg-black/60 backdrop-blur-xl shadow-lg"
                  spotlightColor="rgba(234, 179, 8, 0.15)"
                  theme="dark"
                >
                  <div className="flex flex-col justify-between h-full space-y-2">
                    <span className="text-[11px] font-mono uppercase text-yellow-300 font-bold tracking-wider">Moderate</span>
                    <div className="text-3xl font-mono font-bold text-yellow-100">
                      <CountUp to={currentScan.summary?.moderate || 0} duration={1.2} />
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">Contrast & layout issues</p>
                  </div>
                </SpotlightCard>

                <SpotlightCard
                  className="!rounded-2xl !p-5 !border-blue-500/25 !bg-black/60 backdrop-blur-xl shadow-lg"
                  spotlightColor="rgba(59, 130, 246, 0.15)"
                  theme="dark"
                >
                  <div className="flex flex-col justify-between h-full space-y-2">
                    <span className="text-[11px] font-mono uppercase text-blue-400 font-bold tracking-wider">Minor</span>
                    <div className="text-3xl font-mono font-bold text-blue-200">
                      <CountUp to={currentScan.summary?.minor || 0} duration={1.2} />
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">Semantic recommendations</p>
                  </div>
                </SpotlightCard>
              </div>
            </div>
          </section>
        )}

        {/* ── SECTION 3: VIOLATION REMEDIATION LAB & WCAG EXAMPLES ── */}
        {currentScan && (
          <section aria-labelledby="findings-heading" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/10">
              <h2 id="findings-heading" className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                03 • Remediation Lab & WCAG Guidance ({filteredViolations.length} of {currentScan.totalViolations} Findings)
              </h2>

              {/* Severity Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {["all", "critical", "serious", "moderate", "minor"].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFilterImpact(lvl)}
                    className={`px-3 py-1 rounded-full capitalize font-mono text-xs transition cursor-pointer ${
                      filterImpact === lvl
                        ? "bg-white text-neutral-950 font-semibold shadow"
                        : "bg-white/5 border border-white/15 text-zinc-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {filteredViolations.length === 0 ? (
              <div className="p-8 text-center rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-white">No violations match this filter!</p>
                <p className="text-xs text-zinc-400">All elements evaluated under this category passed WCAG rules.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredViolations.map((v: Violation, idx: number) => {
                  const cardKey = `${v.id}-${idx}`;
                  const isOpen = expandedId === cardKey;
                  const wcagDetail = getWcagDetailForRule(v.id, v);

                  return (
                    <div
                      key={cardKey}
                      className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl hover:border-amber-400/30 overflow-hidden transition shadow-lg"
                    >
                      {/* Card Header */}
                      <div
                        onClick={() => setExpandedId(isOpen ? null : cardKey)}
                        className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-white/[0.04] transition select-none"
                      >
                        <div className="flex items-start gap-3.5 flex-1">
                          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 text-white font-mono text-xs font-bold mt-0.5 shrink-0 border border-white/10">
                            #{idx + 1}
                          </span>
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                                  v.impact === "critical"
                                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                                    : v.impact === "serious"
                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                    : v.impact === "moderate"
                                    ? "bg-yellow-500/20 text-yellow-200 border border-yellow-500/30"
                                    : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                }`}
                              >
                                {v.impact || "minor"}
                              </span>
                              <span className="font-mono text-xs text-amber-300 font-semibold">
                                {v.id}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/30 text-[10px] font-mono text-amber-300 font-semibold">
                                {wcagDetail.scNumber !== 'WCAG' && wcagDetail.scNumber !== 'ARIA-BP'
                                  ? `WCAG ${wcagDetail.scNumber}`
                                  : wcagDetail.level}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-300">
                                {wcagDetail.level}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-white leading-snug">
                              {v.description}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {v.aiCodeFix && (
                            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 text-xs font-medium">
                              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> AI Fix Available
                            </span>
                          )}
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Remediation & WCAG Education Panel */}
                      {isOpen && (
                        <div className="px-5 pb-6 pt-4 border-t border-white/10 bg-black/80 space-y-4 text-xs">
                          {/* ── WCAG GUIDELINE & LIVE REMEDIATION PANEL ── */}
                          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                            {/* Guideline Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-amber-300 shrink-0" />
                                <span className="font-mono text-sm font-bold text-white">
                                  {wcagDetail.wcagGuideline}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/10 text-zinc-300">
                                  Principle: {wcagDetail.principle}
                                </span>
                                {v.helpUrl && (
                                  <a
                                    href={v.helpUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] font-mono text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1"
                                  >
                                    Official Docs &rarr;
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Why this is a problem on the inspected site */}
                            <div className="space-y-1.5">
                              <span className="font-mono uppercase text-[10px] text-amber-300 font-semibold tracking-wider flex items-center gap-1.5">
                                <HelpCircle className="w-3.5 h-3.5 text-amber-300" /> Compliance Failure Diagnosis:
                              </span>
                              <p className="text-zinc-200 text-xs leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5">
                                {wcagDetail.whyItIsAProblem}
                              </p>
                            </div>

                            {/* Target DOM Location on their website */}
                            {v.target && v.target.length > 0 && (
                              <div>
                                <span className="font-mono uppercase text-zinc-400 text-[10px] block mb-1 font-semibold">
                                  Target DOM Selector on Inspected Website:
                                </span>
                                <div className="p-2 rounded-xl bg-black/70 border border-white/10 font-mono text-amber-200 overflow-x-auto text-[11px]">
                                  {v.target.join(" > ")}
                                </div>
                              </div>
                            )}

                            {/* Side-by-Side: Inspected Failing Node vs Compliant Solution */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              {/* Failing Inspected Element */}
                              <div className="p-3.5 rounded-xl bg-red-950/25 border border-red-500/25 space-y-2">
                                <div className="flex items-center justify-between text-red-300 font-mono text-[11px] font-semibold">
                                  <div className="flex items-center gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 text-red-400" /> Inspected DOM Node (Failing):
                                  </div>
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                                    From Your Website
                                  </span>
                                </div>
                                <pre className="p-3 rounded-lg bg-black/70 border border-red-500/20 font-mono text-red-200 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48">
                                  <code>{wcagDetail.exampleBad}</code>
                                </pre>
                              </div>

                              {/* Compliant Accessible Solution */}
                              <div className="p-3.5 rounded-xl bg-emerald-950/25 border border-emerald-500/25 space-y-2">
                                <div className="flex items-center justify-between text-emerald-300 font-mono text-[11px] font-semibold">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Accessible Replacement Patch:
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyCode(cardKey, wcagDetail.exampleGood)}
                                    className="px-2 py-0.5 rounded-md bg-white text-neutral-950 text-[10px] font-semibold flex items-center gap-1 hover:bg-neutral-100 transition cursor-pointer"
                                  >
                                    {copiedId === cardKey ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-600" /> Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" /> Copy Fix
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="p-3 rounded-lg bg-black/70 border border-emerald-500/20 font-mono text-emerald-200 text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-48">
                                  <code>{wcagDetail.exampleGood}</code>
                                </pre>
                              </div>
                            </div>

                            {/* AI Analysis & Developer Prevention Tip */}
                            {(v.aiExplanation || v.preventionTip) && (
                              <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {v.aiExplanation && (
                                  <div className="p-3 rounded-xl border border-amber-400/20 bg-amber-950/20 text-zinc-200 space-y-1">
                                    <div className="font-semibold text-amber-300 flex items-center gap-1.5 text-[11px]">
                                      <Sparkles className="w-3.5 h-3.5" /> Plain-English Analysis:
                                    </div>
                                    <p className="leading-relaxed text-[11px]">{v.aiExplanation}</p>
                                  </div>
                                )}
                                {v.preventionTip && (
                                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-300 space-y-1">
                                    <div className="font-semibold text-amber-300 flex items-center gap-1.5 text-[11px]">
                                      <Lightbulb className="w-3.5 h-3.5 text-amber-300" /> Prevention Tip:
                                    </div>
                                    <p className="leading-relaxed text-[11px]">{v.preventionTip}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Reference Specification */}
                            {wcagDetail.referenceSpec && (
                              <div className="pt-2 border-t border-white/5 text-[11px] text-zinc-400 flex flex-wrap items-center justify-between gap-2">
                                <span>WCAG Criterion Requirement: {wcagDetail.referenceSpec}</span>
                                {v.helpUrl && (
                                  <a
                                    href={v.helpUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-amber-300 hover:underline shrink-0"
                                  >
                                    View Full Specification &rarr;
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── AUTOMATED PULL REQUEST MODAL ───────────────────── */}
        {showPrModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-neutral-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="w-4 h-4 text-amber-300" />
                  <h3 className="font-mono text-base font-semibold text-white">Automated Accessibility Pull Request</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrModal(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* GitHub Auth Status in Modal */}
              {!githubToken ? (
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20 mb-1">
                      <GitPullRequest className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">Connect GitHub to Create Pull Requests</h4>
                    <p className="text-xs text-zinc-400">
                      Choose OAuth login or quick-connect with a Personal Access Token with <code className="text-amber-300">repo</code> scope.
                    </p>
                  </div>

                  {/* Option 1: GitHub OAuth */}
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-white">GitHub OAuth Login</div>
                      <div className="text-[11px] text-zinc-400">Standard OAuth application redirect</div>
                    </div>
                    <a
                      href={scanService.getGitHubAuthUrl()}
                      className="h-9 px-4 rounded-xl bg-white text-neutral-950 text-xs font-semibold hover:bg-neutral-100 transition inline-flex items-center gap-1.5 shrink-0"
                    >
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>Connect OAuth</span>
                    </a>
                  </div>

                  <div className="relative text-center">
                    <span className="px-3 bg-neutral-950 text-zinc-500 text-[10px] uppercase font-mono tracking-wider">
                      Or Quick Connect via Token (PAT)
                    </span>
                  </div>

                  {/* Option 2: Direct Token Input */}
                  <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2.5">
                    <div className="text-xs font-semibold text-zinc-300">Personal Access Token (Classic or Fine-Grained)</div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        value={patInput}
                        onChange={(e) => setPatInput(e.target.value)}
                        className="flex-1 rounded-xl border border-white/15 bg-black/80 px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-600 outline-none focus:border-[#ffd60a]"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!patInput.trim()) return;
                          const token = patInput.trim();
                          setPatLoading(true);
                          try {
                            const status = await scanService.getGitHubStatus(token);
                            localStorage.setItem("github_token", token);
                            setGithubToken(token);
                            if (status.connected && status.user) {
                              setGithubUser(status.user);
                            }
                          } catch {
                            localStorage.setItem("github_token", token);
                            setGithubToken(token);
                          } finally {
                            setPatLoading(false);
                          }
                        }}
                        className="h-9 px-4 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 text-xs font-semibold font-mono transition shrink-0 cursor-pointer"
                      >
                        {patLoading ? "Verifying..." : "Save Token"}
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      GitHub &rarr; Settings &rarr; Developer Settings &rarr; Personal Access Tokens &rarr; Generate with <span className="text-zinc-400">repo</span> scope.
                    </p>
                  </div>
                </div>
              ) : prSuccess ? (
                /* Success State */
                <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-3">
                  <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto" />
                  <h4 className="font-semibold text-white text-sm">Pull Request Opened Successfully!</h4>
                  <p className="text-xs text-zinc-300">
                    A new branch <code className="text-amber-300 font-mono">{prSuccess.branch}</code> was created and submitted for review.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                    <a
                      href={prSuccess.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-10 rounded-xl bg-white text-neutral-950 text-xs font-semibold hover:bg-neutral-100 transition flex items-center justify-center gap-2 shadow"
                    >
                      <span>View PR #{prSuccess.prNumber} on GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setPrSuccess(null);
                        setShowPrModal(false);
                      }}
                      className="w-full sm:w-auto h-10 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono font-medium text-white transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* PR Input Form */
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!prRepoInput.trim()) {
                      setPrError("Please enter a repository (e.g. username/repo-name or full GitHub URL).");
                      return;
                    }
                    setPrLoading(true);
                    setPrError(null);
                    setPrSuccess(null);

                    try {
                      let fileContent = "";
                      if (currentScan?.violations && currentScan.violations.length > 0) {
                        const fixBlocks = currentScan.violations
                          .filter(v => v.aiCodeFix && !v.aiCodeFix.startsWith('Refer to'))
                          .map(v => `<!-- [WCAG FIX: ${v.id}] ${v.description} -->\n${v.aiCodeFix}`)
                          .join('\n\n');
                        fileContent = `<!-- ♿ EquiDOM Automated Accessibility Remediations -->\n<!-- Scanned Target: ${currentScan.url || 'HTML snippet'} -->\n\n${fixBlocks}\n`;
                      } else if (inputMode === "html" && htmlInput) {
                        fileContent = htmlInput;
                      } else {
                        fileContent = `<!-- ♿ EquiDOM Automated Accessibility Fixes Applied -->\n`;
                      }

                      const res = await scanService.triggerAutoPR({
                        token: githubToken || undefined,
                        repoUrl: prRepoInput.trim(),
                        filePath: prFilePath.trim() || 'index.html',
                        fileContent,
                        commitMessage: `♿ EquiDom: Fix accessibility issues on ${currentScan?.url || 'target page'}`,
                        prTitle: `♿ EquiDom: Automated Accessibility Fixes`,
                        scanId: currentScan?._id
                      });

                      setPrSuccess({
                        prUrl: res.data.prUrl,
                        prNumber: res.data.prNumber,
                        branch: res.data.branch,
                        title: res.data.title
                      });
                    } catch (err: any) {
                      setPrError(err.message || "Failed to create Pull Request. Please verify repository write access.");
                    } finally {
                      setPrLoading(false);
                    }
                  }}
                  className="space-y-4 text-xs font-mono"
                >
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px]">
                    <span className="text-zinc-400">Authenticated via GitHub:</span>
                    <span className="text-emerald-300 font-semibold">{githubUser ? `@${githubUser.login}` : "Connected"}</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-zinc-300 font-medium">
                      Target GitHub Repository
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. username/repo-name or https://github.com/org/repo"
                      value={prRepoInput}
                      onChange={(e) => setPrRepoInput(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-black/60 p-3 text-xs text-white placeholder:text-zinc-500 transition outline-none hover:border-white/30 focus:border-[#ffd60a] focus:ring-1 focus:ring-[#ffd60a]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-zinc-300 font-medium">
                      File Path in Repository
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="index.html or src/App.tsx"
                      value={prFilePath}
                      onChange={(e) => setPrFilePath(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-black/60 p-3 text-xs text-white placeholder:text-zinc-500 transition outline-none hover:border-white/30 focus:border-[#ffd60a] focus:ring-1 focus:ring-[#ffd60a]"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-200 text-[11px] leading-relaxed">
                    ✨ EquiDom will create a fresh branch <code className="text-white font-bold">fix/accessibility-[timestamp]</code>, commit the AI-verified WCAG fixes for {currentScan?.violations?.length || 0} issues, and open a PR against the default branch.
                  </div>

                  {prError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/30 text-red-200 text-[11px] flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{prError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPrModal(false)}
                      className="h-10 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono font-medium text-white transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={prLoading}
                      className="h-10 px-5 rounded-xl bg-white text-neutral-950 text-xs font-semibold hover:bg-neutral-100 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {prLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating PR on GitHub...</span>
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

        {/* ── HISTORY DRAWER MODAL ───────────────────────────── */}
        {showHistory && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-neutral-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-300" />
                  <h3 className="font-mono text-base font-semibold text-white">Recent Audit History</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div
                    key={h._id}
                    onClick={() => {
                      setCurrentScan(h);
                      setValue(h.url);
                      setShowHistory(false);
                    }}
                    className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition cursor-pointer flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white break-all">{h.url}</div>
                      <div className="text-zinc-400 font-mono text-[11px] mt-0.5">
                        {new Date(h.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[#ffd60a]/20 text-[#ffd60a] border border-[#ffd60a]/30 font-mono font-bold">
                      {h.accessibilityScore}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
