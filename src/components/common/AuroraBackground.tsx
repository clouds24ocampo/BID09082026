import React from 'react';

interface AuroraBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  showGrid?: boolean;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  children,
  className = '',
  showGrid = true,
}) => {
  return (
    <div className={`relative w-full overflow-hidden bg-[#070a12] text-slate-100 ${className}`}>
      {/* Ambient Moving Mesh Aurora Layer (Marked no-export for PDF safety) */}
      <div className="no-export pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Glow Orb 1 - Deep Azure / Indigo */}
        <div className="absolute top-[-25%] left-[-15%] w-[65vw] h-[65vw] max-w-200 max-h-200 rounded-full bg-linear-to-br from-blue-600/18 via-indigo-600/10 to-transparent blur-[120px] animate-pulse-dot" />

        {/* Glow Orb 2 - Vibrant Purple / Cyan */}
        <div className="absolute top-[35%] right-[-15%] w-[55vw] h-[55vw] max-w-175 max-h-175 rounded-full bg-linear-to-bl from-purple-600/16 via-cyan-500/10 to-transparent blur-[130px]" />

        {/* Glow Orb 3 - Emerald Subtle Bottom Glow */}
        <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] max-w-150 max-h-150 rounded-full bg-linear-to-tr from-emerald-500/10 via-blue-500/8 to-transparent blur-[140px]" />

        {/* Cyber Matrix Dot-Grid Pattern Overlay */}
        {showGrid && (
          <div className="absolute inset-0 cyber-grid opacity-35 mask-[radial-gradient(ellipse_80%_60%_at_50%_40%,#000_60%,transparent_100%)]" />
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};

export default AuroraBackground;
