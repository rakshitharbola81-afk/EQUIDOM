import React, { useEffect, useState } from "react";

interface SpeedometerProps {
  score: number; // 0 to 100
  size?: number;
  label?: string;
}

export const EquidomSpeedometer: React.FC<SpeedometerProps> = ({
  score,
  size = 240,
  label = "EquiDOM Score",
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1400; // ms
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }, [score]);

  // Speedometer semicircle calculations
  const strokeWidth = 14;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = Math.PI * radius; // Half circle arc
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Needle angle (-90deg to +90deg)
  const angle = -90 + (animatedScore / 100) * 180;

  const getColor = (s: number) => {
    if (s >= 90) return "#34d399"; // emerald
    if (s >= 70) return "#ffd60a"; // yellow / amber
    return "#f87171"; // red
  };

  const getTier = (s: number) => {
    if (s >= 90) return "EXCELLENT COMPLIANCE";
    if (s >= 70) return "MODERATE VIOLATIONS";
    if (s >= 50) return "NEEDS IMMEDIATE REMEDIATION";
    return "CRITICAL BARRIERS FOUND";
  };

  const currentColor = getColor(animatedScore);

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <svg
        width={size}
        height={size * 0.65}
        viewBox={`0 0 ${size} ${size * 0.65}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#ffd60a" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background track arc */}
        <path
          d={`M ${strokeWidth} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Dynamic score arc */}
        <path
          d={`M ${strokeWidth} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth} ${size / 2}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter="url(#gaugeGlow)"
          className="transition-all duration-300 ease-out"
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const tickAngle = (-180 + (tick / 100) * 180) * (Math.PI / 180);
          const innerR = radius - 16;
          const outerR = radius - 8;
          const x1 = size / 2 + innerR * Math.cos(tickAngle);
          const y1 = size / 2 + innerR * Math.sin(tickAngle);
          const x2 = size / 2 + outerR * Math.cos(tickAngle);
          const y2 = size / 2 + outerR * Math.sin(tickAngle);
          return (
            <line
              key={tick}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}

        {/* Needle */}
        <g
          transform={`translate(${size / 2}, ${size / 2}) rotate(${angle})`}
          className="transition-transform duration-300 ease-out"
        >
          <path
            d={`M -3 0 L 0 ${-radius + 4} L 3 0 Z`}
            fill={currentColor}
            filter="drop-shadow(0 0 4px rgba(255,214,10,0.6))"
          />
          <circle cx="0" cy="0" r="7" fill="#ffffff" />
          <circle cx="0" cy="0" r="4" fill="#0b0f19" />
        </g>
      </svg>

      {/* Numerical score and title display */}
      <div className="-mt-8 text-center space-y-0.5">
        <span className="text-[11px] font-mono tracking-widest text-white/60 uppercase block">
          {label}
        </span>
        <div
          className="font-mono text-5xl font-black tracking-tight"
          style={{ color: currentColor, textShadow: `0 0 20px ${currentColor}55` }}
        >
          {animatedScore}
          <span className="text-xl text-white/50 font-sans font-normal ml-1">/ 100</span>
        </div>
        <div
          className="text-[11px] font-mono font-bold tracking-wider px-3 py-1 rounded-full border border-white/10 bg-white/5 inline-block mt-1"
          style={{ color: currentColor }}
        >
          {getTier(animatedScore)}
        </div>
      </div>
    </div>
  );
};
