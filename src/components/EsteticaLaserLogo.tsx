import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'light';
}

export default function EsteticaLaserLogo({
  className = '',
  size = 'md',
  theme = 'dark'
}: LogoProps) {
  const isDark = theme === 'dark';

  const sizeClasses = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-14'
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Visual Icon: Cyan/Blue rounded triangular shape with stylized italic 'e' */}
      <svg
        viewBox="0 0 100 100"
        className={`${sizeClasses[size]} w-auto shrink-0 drop-shadow-sm`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logo-triangle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00c8e0" />
            <stop offset="60%" stopColor="#0099cc" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
          <linearGradient id="logo-star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        {/* Rounded triangular guitar-pick contour */}
        <path
          d="M 22 26 C 26 12, 70 20, 80 44 C 88 62, 58 88, 40 85 C 22 82, 16 48, 22 26 Z"
          fill="url(#logo-triangle-grad)"
        />

        {/* Lower contrast shadow curve inside badge */}
        <path
          d="M 32 78 C 45 83, 72 65, 76 48 C 65 72, 42 76, 32 78 Z"
          fill="#0369a1"
          opacity="0.6"
        />

        {/* Stylized lowercase italic 'e' */}
        <text
          x="44"
          y="62"
          textAnchor="middle"
          fontSize="48"
          fontStyle="italic"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          fill="#ffffff"
        >
          e
        </text>

        {/* Orbit arc */}
        <path
          d="M 12 70 C 25 20, 75 10, 95 30"
          stroke="#00c8e0"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />

        {/* Star sparkle on top right */}
        <path
          d="M 94 28 L 96 20 L 98 28 L 106 30 L 98 32 L 96 40 L 94 32 L 86 30 Z"
          fill="url(#logo-star-grad)"
        />
      </svg>

      {/* Typography: "estética láser" + "ROSARIO" */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-baseline gap-1.5 font-bold tracking-tight">
          <span className="text-[#00bcd4] font-extrabold text-sm sm:text-base tracking-tight">
            estética
          </span>
          <span
            className={`font-black text-sm sm:text-base tracking-tight ${
              isDark ? 'text-slate-100' : 'text-slate-800'
            }`}
          >
            láser
          </span>
          {/* Subtle star accent */}
          <span className="text-[#00bcd4] text-xs -translate-y-1">✦</span>
        </div>
        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black tracking-[0.28em] uppercase text-[#0284c7] mt-0.5">
          <span>R</span>
          <span>O</span>
          <span>S</span>
          <span>A</span>
          <span>R</span>
          <span>I</span>
          <span>O</span>
        </div>
      </div>
    </div>
  );
}
