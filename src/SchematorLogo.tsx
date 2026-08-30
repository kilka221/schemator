import React, { useId } from 'react';

interface SchematorLogoProps {
  className?: string;
  size?: number | string;
}

export const SchematorLogo: React.FC<SchematorLogoProps> = ({ 
  className = "w-8 h-8 rounded-lg shadow-sm select-none", 
  size 
}) => {
  const uniqueId = useId().replace(/:/g, '_');
  const blueId = `blueGrad_${uniqueId}`;
  const orangeId = `orangeGrad_${uniqueId}`;
  const greenId = `greenGrad_${uniqueId}`;
  const purpleId = `purpleGrad_${uniqueId}`;

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      className={className}
      style={size ? { width: size, height: size } : undefined}
      role="img"
      aria-label="Схематор"
    >
      <defs>
        <linearGradient id={blueId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id={orangeId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9900" />
          <stop offset="100%" stopColor="#FF5500" />
        </linearGradient>
        <linearGradient id={greenId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E676" />
          <stop offset="100%" stopColor="#00B0FF" />
        </linearGradient>
        <linearGradient id={purpleId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9C27B0" />
          <stop offset="100%" stopColor="#7C4DFF" />
        </linearGradient>
      </defs>

      {/* Dark connecting paths */}
      <g stroke="#334155" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Vertical line from top block to diamond */}
        <path d="M 256 120 L 256 180" />
        {/* Line from diamond left, down, and bottom curve */}
        <path d="M 190 256 L 115 256 C 115 256, 115 410, 115 420 C 115 430, 125 430, 220 430 L 256 430" />
        {/* Line from diamond right, down, and bottom curve */}
        <path d="M 322 256 L 397 256 C 397 256, 397 410, 397 420 C 397 430, 387 430, 292 430 L 256 430" />
      </g>

      {/* Top Blue Block */}
      <rect x="176" y="50" width="160" height="70" rx="22" fill={`url(#${blueId})`} />

      {/* Center Orange Diamond Block */}
      <g transform="translate(256, 256) rotate(45)">
        <rect x="-48" y="-48" width="96" height="96" rx="16" fill={`url(#${orangeId})`} />
      </g>

      {/* Left Green Block */}
      <rect x="60" y="300" width="110" height="65" rx="20" fill={`url(#${greenId})`} />

      {/* Right Purple Block */}
      <rect x="342" y="300" width="110" height="65" rx="20" fill={`url(#${purpleId})`} />

      {/* Bottom Circle Node */}
      <circle cx="256" cy="430" r="22" fill="#FFFFFF" stroke="#334155" strokeWidth="16" />
    </svg>
  );
};
