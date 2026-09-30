import React from 'react';

interface CoinsIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
  transparent?: boolean;
}

export const CoinsIcon: React.FC<CoinsIconProps> = ({ 
  size = 16, 
  className = '', 
  transparent = false,
  ...props 
}) => {
  const bgFill = transparent ? 'transparent' : '#09090b';

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      {...props}
    >
      {/* Coin Base / Disk */}
      {!transparent && (
        <circle cx="50" cy="50" r="37.5" fill={bgFill} />
      )}

      {/* Outer Emerald Ring */}
      <circle
        cx="50"
        cy="50"
        r="33"
        stroke="#00D26A"
        strokeWidth="9"
        fill="none"
      />

      {/* Central Faceted Diamond Emblem */}
      <g>
        {/* Top-Right Facet (Deep Shadow) */}
        <polygon
          points="50,26 74,50 61,50 50,39"
          fill="#047857"
        />
        {/* Top-Left Facet (Mid-Tone Shadow) */}
        <polygon
          points="50,26 26,50 39,50 50,39"
          fill="#0FA958"
        />
        {/* Bottom-Right Facet (Vibrant Emerald) */}
        <polygon
          points="74,50 50,74 50,61 61,50"
          fill="#00D26A"
        />
        {/* Bottom-Left Facet (Bright Highlight) */}
        <polygon
          points="26,50 50,74 50,61 39,50"
          fill="#10E374"
        />

        {/* Center Diamond Cutout */}
        <polygon
          points="50,39 61,50 50,61 39,50"
          fill={transparent ? 'transparent' : bgFill}
        />
      </g>
    </svg>
  );
};

export const CoinIcon = CoinsIcon;
export default CoinsIcon;
