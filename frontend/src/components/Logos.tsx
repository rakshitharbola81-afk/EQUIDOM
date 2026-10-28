import React from "react";

/** Official Chromium SVG Logo */
export function ChromiumLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4.5" fill="#3B82F6" />
      <path
        d="M12 2C8.5 2 5.5 3.8 3.8 6.6L7.7 13.4C8.3 10.9 10 9 12.3 8.6L12 2Z"
        fill="#EF4444"
      />
      <path
        d="M20.2 6.6C18.5 3.8 15.5 2 12 2L15.9 8.6C17.5 9.4 18.6 11 18.8 12.9L22 7.4C21.6 7.1 21.2 6.8 20.8 6.5L20.2 6.6Z"
        fill="#EAB308"
      />
      <path
        d="M12 22C15.5 22 18.5 20.2 20.2 17.4L16.3 10.6C15.7 13.1 14 15 11.7 15.4L12 22Z"
        fill="#22C55E"
      />
      <circle cx="12" cy="12" r="3.2" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="2.5" fill="#2563EB" />
    </svg>
  );
}

/** Official Google Gemini AI Sparkle Logo */
export function GeminiLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="50%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#F472B6" />
        </linearGradient>
      </defs>
      <path
        d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z"
        fill="url(#geminiGrad)"
      />
    </svg>
  );
}

/** Deque / axe-core Logo */
export function AxeCoreLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#8B5CF6" />
      <path
        d="M6 18L11 6H13L18 18H15.5L14.2 15H9.8L8.5 18H6ZM10.5 13H13.5L12 9.2L10.5 13Z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Official W3C / WCAG Standards Logo */
export function W3CLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 24" fill="none">
      <rect width="40" height="24" rx="4" fill="#0284C7" />
      <text
        x="6"
        y="16.5"
        fill="#FFFFFF"
        fontFamily="system-ui, sans-serif"
        fontSize="12"
        fontWeight="800"
        letterSpacing="0.5"
      >
        W3C
      </text>
    </svg>
  );
}

/** Equidom Shield Emblem */
export function EquidomEmblem({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        fill="rgba(255, 214, 10, 0.15)"
        stroke="#ffd60a"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="#ffd60a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
