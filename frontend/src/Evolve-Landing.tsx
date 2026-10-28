import { useRef, useEffect, useState } from "react";
import { useSandNavigate } from "./sand-context.ts";
import ShinyText from "./components/reactbits/ShinyText.tsx";
import CountUp from "./components/reactbits/CountUp.tsx";
import SpotlightCard from "./components/reactbits/SpotlightCard.tsx";
import ScrollVelocity from "./components/reactbits/ScrollVelocity.tsx";
import DecryptedText from "./components/reactbits/DecryptedText.tsx";
import GridScan from "./components/reactbits/GridScan.tsx";
import { 
  Search, 
  Sparkles, 
  Wrench, 
  FileText, 
  ArrowRight 
} from "lucide-react";

import "./Evolve-Landing.screen.css";

/* ── Fade-on-scroll wrapper ─────────────────────────────────────── */
function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ── Scroll Reveal with high-contrast text ─────────────────────── */
function ScrollReveal({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
      setProgress(p);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const words = text.split(" ");

  return (
    <p ref={containerRef} className={className}>
      {words.map((word, i) => {
        const wordProgress = Math.max(
          0,
          Math.min(1, (progress * words.length - i) * 1.5)
        );
        return (
          <span
            key={i}
            style={{
              opacity: 0.4 + wordProgress * 0.6,
              filter: `blur(${(1 - wordProgress) * 2}px)`,
              transition: "opacity 0.15s, filter 0.15s",
              display: "inline",
            }}
            className={wordProgress > 0.4 ? "text-white font-medium" : "text-zinc-300"}
          >
            {word}{" "}
          </span>
        );
      })}
    </p>
  );
}

/* ── Feature card content (Zero Emojis, Real Lucide Icons) ───── */
const FEATURES = [
  {
    icon: <Search className="w-6 h-6 text-amber-300" />,
    title: "Automated Audit",
    description:
      "Headless Chromium and axe-core inspect every DOM node in seconds, evaluating against strict WCAG criteria without manual effort.",
  },
  {
    icon: <Sparkles className="w-6 h-6 text-amber-300" />,
    title: "AI Suggestions",
    description:
      "Advanced AI explains every violation in plain English with comprehensive root-cause accessibility analysis.",
  },
  {
    icon: <Wrench className="w-6 h-6 text-amber-300" />,
    title: "Copy-Paste Fixes",
    description:
      "Drop-in verified code patches generated per violation — simply copy, paste, and ship.",
  },
  {
    icon: <FileText className="w-6 h-6 text-amber-300" />,
    title: "PDF Report",
    description:
      "One-click downloadable audit reports with scores, severity breakdown, and remediation roadmaps.",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Paste URL", desc: "Enter any live website address or raw HTML markup" },
  { step: "02", title: "Run Audit", desc: "axe-core evaluates every node across the DOM tree" },
  { step: "03", title: "AI Analysis", desc: "Each issue gets plain-language explanations & code fixes" },
  { step: "04", title: "Export", desc: "Download your official PDF report or re-verify in real time" },
];

/* ═══════════════════════════════════════════════════════════════════
   LANDING PAGE (Clean, Spacious, High-Contrast Typography)
   ═══════════════════════════════════════════════════════════════════ */
export default function EvolveLanding() {
  const go = useSandNavigate();

  return (
    <div className="text-foreground w-full min-h-screen overflow-x-hidden">
      <div className="antialiased flex relative flex-col min-h-screen overflow-hidden">

        {/* ── HERO SECTION (Clean, Minimal, Spacious) ───────────── */}
        <main className="text-center flex relative z-10 py-20 sm:py-28 flex-col justify-center items-center flex-1 px-4 sm:px-8">
          <FadeIn>
            <h1 className="font-mono text-4xl leading-tight -tracking-[0.08em] max-w-full overflow-hidden sm:text-6xl md:text-7xl lg:text-8xl">
              <span className="whitespace-nowrap text-white block font-medium">
                Equidom
              </span>
              <span className="whitespace-nowrap text-white/95 block font-medium">
                Make Every Site
              </span>
              <span className="whitespace-nowrap text-[#ffd60a] block font-semibold">
                Accessible
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.15}>
            <div className="mt-6 max-w-xl px-2">
              <ShinyText
                text="Audit websites for WCAG issues, understand what is wrong, and apply copy-paste fixes that make the web work for everyone."
                speed={3}
                className="text-zinc-200 text-base leading-relaxed sm:text-lg font-normal"
                shineColor="rgba(255, 214, 10, 0.6)"
              />
            </div>
          </FadeIn>

          {/* Clean CTA Button (NO Magnet) */}
          <FadeIn delay={0.3}>
            <div className="mt-8 flex items-center justify-center">
              <button
                type="button"
                className="font-semibold transition shadow-xl rounded-full bg-white text-neutral-950 text-sm sm:text-base px-8 py-3.5 hover:bg-neutral-100 hover:scale-105 hover:-translate-y-0.5 active:scale-100 flex items-center gap-2 group cursor-pointer"
                onClick={() => go("/audit-setup")}
              >
                <span>Run an Audit</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </FadeIn>
        </main>

        {/* ── STATS FOOTER (Open, Minimal, with CountUp inside subtle SpotlightCards) ── */}
        <FadeIn className="relative z-10 px-4 sm:px-8 pb-14">
          <div className="grid mx-auto gap-4 grid-cols-2 w-full max-w-5xl sm:gap-5 sm:grid-cols-4">
            {[
              { symbol: "<", value: 2, suffix: "min", label: "Automated Audit" },
              { symbol: "%", text: "WCAG", suffix: "2.2", label: "Standards Coverage" },
              { symbol: "*", value: 100, suffix: "%", label: "Actionable Fixes" },
              { symbol: "↑", text: "score", suffix: "", label: "Before / After Rescan" },
            ].map((stat, i) => (
              <SpotlightCard
                key={i}
                className="!rounded-2xl !p-5 !border-white/10 !bg-black/30 backdrop-blur-md"
                spotlightColor="rgba(255, 214, 10, 0.12)"
                theme="dark"
              >
                <div className="flex flex-col items-center gap-1 text-center">
                  <div className="font-mono text-[#ffd60a] text-2xl font-light">{stat.symbol}</div>
                  <div className="font-medium tabular-nums text-white text-xl tracking-tight flex items-baseline gap-1">
                    {stat.value !== undefined ? (
                      <CountUp to={stat.value} duration={1.8} className="text-xl text-white font-medium" />
                    ) : (
                      <span>{stat.text}</span>
                    )}
                    {stat.suffix && (
                      <span className="text-sm text-zinc-300 ml-0.5">{stat.suffix}</span>
                    )}
                  </div>
                  <div className="text-zinc-300 text-xs font-medium">{stat.label}</div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </FadeIn>

        {/* ── SCROLL VELOCITY MARQUEE ──────────────────────────── */}
        <div className="relative z-10 py-5 overflow-hidden border-t border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <ScrollVelocity
            texts={[
              "WCAG 2.2 · Contrast · Alt Text · Keyboard Focus · ARIA Labels · Form Labels · Screen Reader ·",
              "axe-core · Headless Chromium · AI Fixes · PDF Reports · Instant Audit · Copy-Paste Solutions ·",
            ]}
            velocity={1.8}
            className="font-mono text-zinc-300 text-sm font-medium tracking-wide"
          />
        </div>

        {/* ── WHAT EQUIDOM DOES — Clean Open Scroll Reveal ─────── */}
        <section className="relative z-10 py-24 px-4 sm:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <FadeIn>
              <h2 className="font-mono text-3xl sm:text-5xl -tracking-[0.06em] text-white font-medium">
                <DecryptedText
                  text="What Equidom Does"
                  speed={60}
                  animateOn="view"
                  sequential
                  revealDirection="start"
                  className="font-mono text-white"
                />
              </h2>
            </FadeIn>
            <ScrollReveal
              text="Equidom automates the entire accessibility workflow. It launches a headless browser, scans every element on your page with axe-core, identifies WCAG 2.1 Level A and AA violations, then uses Gemini AI to explain each issue in plain English and generate a copy-paste code fix. The result is a comprehensive audit report with an EquiDOM Score, severity breakdown, and actionable remediation steps — all in under two minutes."
              className="text-lg sm:text-xl leading-relaxed text-zinc-200 font-sans"
            />
          </div>

          {/* GridScan Background */}
          <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none">
            <GridScan
              cells={30}
              linesColor="rgba(255,214,10, 0.4)"
              scanColor="rgba(255,214,10, 0.7)"
              autoScan
              scanDuration={4}
              interactive={false}
            />
          </div>
        </section>

        {/* ── FEATURES — Clean Spotlight Cards ─────────────────── */}
        <section className="relative z-10 py-16 px-4 sm:px-8">
          <FadeIn className="text-center mb-12">
            <h2 className="font-mono text-3xl sm:text-5xl -tracking-[0.06em] text-white font-medium">
              <DecryptedText
                text="Features"
                speed={60}
                animateOn="view"
                sequential
                revealDirection="center"
                className="font-mono text-white"
              />
            </h2>
          </FadeIn>

          <div className="max-w-5xl mx-auto grid gap-5 sm:grid-cols-2">
            {FEATURES.map((feat, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <SpotlightCard
                  className="!rounded-2xl !p-6 h-full !border-white/10 !bg-black/40 backdrop-blur-md hover:border-amber-400/30 transition-colors"
                  spotlightColor="rgba(255, 214, 10, 0.1)"
                  theme="dark"
                >
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 mt-1">{feat.icon}</div>
                    <div className="space-y-2 flex-1">
                      <h3 className="font-mono text-lg font-semibold text-white -tracking-[0.04em]">
                        {feat.title}
                      </h3>
                      <p className="text-sm text-zinc-200 leading-relaxed font-normal">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                </SpotlightCard>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS — Stepper ───────────────────────────── */}
        <section className="relative z-10 py-16 px-4 sm:px-8">
          <FadeIn className="text-center mb-12">
            <h2 className="font-mono text-3xl sm:text-5xl -tracking-[0.06em] text-white font-medium">
              <DecryptedText
                text="How It Works"
                speed={60}
                animateOn="view"
                sequential
                revealDirection="start"
                className="font-mono text-white"
              />
            </h2>
          </FadeIn>

          <div className="max-w-3xl mx-auto relative">
            {/* Vertical connecting line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-white/15 sm:left-8" />

            <div className="space-y-8">
              {HOW_IT_WORKS.map((item, i) => (
                <FadeIn key={i} delay={i * 0.12}>
                  <div className="flex items-start gap-5 pl-2 sm:pl-4">
                    <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-amber-300/40 bg-black/80 flex items-center justify-center font-mono text-sm font-bold text-[#ffd60a] shrink-0 shadow-lg">
                      {item.step}
                    </div>
                    <div className="pt-1.5 flex-1">
                      <h4 className="font-mono text-base sm:text-lg font-semibold text-white -tracking-[0.04em]">
                        {item.title}
                      </h4>
                      <p className="text-sm text-zinc-300 mt-1 leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLOSING CTA (Clean & Direct) ─────────────────────── */}
        <section className="relative z-10 py-24 px-4 sm:px-8">
          <FadeIn className="text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="font-mono text-3xl sm:text-5xl -tracking-[0.06em] text-white font-medium">
                Ready to audit?
              </h2>
              <p className="text-zinc-200 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
                Start your first scan and make the web accessible for everyone.
              </p>
              
              <button
                type="button"
                className="font-semibold transition shadow-xl rounded-full bg-[#ffd60a] text-black text-sm sm:text-base px-10 py-4 hover:scale-105 hover:-translate-y-1 active:scale-100 flex items-center justify-center gap-2 mx-auto cursor-pointer group"
                onClick={() => go("/audit-setup")}
                style={{
                  boxShadow: "0 0 40px rgba(255, 214, 10, 0.3), 0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                <span>Begin Audit Now</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </FadeIn>
        </section>

        {/* ── Bottom marquee ───────────────────────────────────── */}
        <div className="relative z-10 py-4 overflow-hidden border-t border-white/10 bg-black/20">
          <ScrollVelocity
            texts={[
              "EquiDOM · Accessible Web · WCAG Compliance · AI-Powered Remediation ·",
            ]}
            velocity={1.5}
            className="font-mono text-zinc-400 text-xs font-medium"
          />
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <footer className="relative z-10 py-8 text-center text-xs text-zinc-400 border-t border-white/10">
          EquiDOM • Automated WCAG 2.1 Web Accessibility Auditor powered by axe-core & AI
        </footer>
      </div>
    </div>
  );
}
