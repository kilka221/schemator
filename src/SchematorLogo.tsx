import React from 'react';

interface SchematorLogoProps {
  className?: string;
  size?: number | string;
}

export const SchematorLogo: React.FC<SchematorLogoProps> = ({ 
  className = "w-7 h-7 select-none shrink-0", 
  size 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      role="img"
      aria-label="Схематор"
    >
      {/* Dark teal branch connector lines */}
      <g stroke="#094A3D" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round">
        {/* Left branch from diamond down-left, then vertically into left pill */}
        <path d="M 215 215 L 155 275 L 155 315" />
        {/* Right branch from diamond down-right, then vertically into right pill */}
        <path d="M 297 215 L 357 275 L 357 315" />
      </g>

      {/* Top Emerald Green Diamond (Decision node) */}
      <g transform="translate(256, 175) rotate(45)">
        <rect 
          x="-55" 
          y="-55" 
          width="110" 
          height="110" 
          rx="14" 
          fill="#00C853" 
        />
      </g>

      {/* Left Bottom Pill (Terminal/Process node) */}
      <rect 
        x="75" 
        y="312" 
        width="160" 
        height="66" 
        rx="33" 
        stroke="#00C853" 
        strokeWidth="22" 
        fill="none" 
      />

      {/* Right Bottom Pill (Terminal/Process node) */}
      <rect 
        x="277" 
        y="312" 
        width="160" 
        height="66" 
        rx="33" 
        stroke="#00C853" 
        strokeWidth="22" 
        fill="none" 
      />
    </svg>
  );
};
