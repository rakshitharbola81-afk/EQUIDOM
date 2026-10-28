import React, { useState } from 'react';
import { Violation } from '../api/types';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, Copy, Check, ChevronDown, ChevronUp, Code2, Sparkles, ExternalLink, Lightbulb } from 'lucide-react';

interface ViolationCardProps {
  violation: Violation;
  index: number;
}

export const ViolationCard: React.FC<ViolationCardProps> = ({ violation, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const getImpactBadge = (impact?: string) => {
    switch (impact) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-950/80 text-red-400 border border-red-800/60">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            CRITICAL
          </span>
        );
      case 'serious':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/60">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            SERIOUS
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-950/80 text-yellow-300 border border-yellow-800/60">
            <Info className="w-3.5 h-3.5 text-yellow-300" />
            MODERATE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-800/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" />
            MINOR
          </span>
        );
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 rounded-xl transition-all duration-200 overflow-hidden shadow-lg backdrop-blur-sm">
      <div 
        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4 flex-1">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono font-bold mt-0.5">
            #{index + 1}
          </span>
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {getImpactBadge(violation.impact)}
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800/90 text-indigo-300 border border-slate-700">
                {violation.id}
              </span>
              {violation.helpUrl && (
                <a
                  href={violation.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400 transition-colors ml-1"
                >
                  Docs <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <h4 className="text-sm md:text-base font-semibold text-slate-100 leading-snug">
              {violation.description}
            </h4>
            {violation.help && (
              <p className="text-xs text-slate-400">
                {violation.help}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          {violation.aiCodeFix && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 font-medium">
              <Sparkles className="w-3 h-3 text-indigo-400" /> AI Fix Ready
            </span>
          )}
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-800/60 bg-slate-950/40 space-y-4">
          {/* Target Selector */}
          {violation.target && violation.target.length > 0 && (
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
                Target DOM Selector
              </span>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
                {violation.target.join(' > ')}
              </div>
            </div>
          )}

          {/* AI Plain-English Context */}
          {violation.aiExplanation && (
            <div className="p-3.5 rounded-lg bg-indigo-950/30 border border-indigo-900/40 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Plain-English Explanation:
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {violation.aiExplanation}
              </p>
            </div>
          )}

          {/* Prevention Tip */}
          {violation.preventionTip && (
            <div className="text-xs text-slate-300 flex items-start gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5 shrink-0">
                <Lightbulb className="w-3.5 h-3.5 text-amber-300" /> Prevention Tip:
              </span>
              <span>{violation.preventionTip}</span>
            </div>
          )}

          {/* Code Fix */}
          {violation.aiCodeFix ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                  <Code2 className="w-3.5 h-3.5" /> Recommended Patch / Solution:
                </span>
                <button
                  onClick={() => handleCopy(violation.aiCodeFix || '')}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Fix
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre-wrap">
                <code>{violation.aiCodeFix}</code>
              </pre>
            </div>
          ) : (
            violation.helpUrl && (
              <div className="text-xs text-slate-400">
                <span>Refer to official documentation: </span>
                <a
                  href={violation.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  {violation.helpUrl}
                </a>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
