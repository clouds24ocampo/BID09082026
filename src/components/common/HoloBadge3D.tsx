import React, { useRef, useEffect } from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface HoloBadge3DProps {
  brandColor?: string;
  companyName?: string;
  brandCode?: string;
  subText?: string;
  className?: string;
}

export const HoloBadge3D: React.FC<HoloBadge3DProps> = ({
  brandColor = '#3b82f6',
  companyName = 'BiDOCS Enterprise',
  brandCode = 'BID',
  subText = 'RA 12009 NGPA Compliant',
  className = '',
}) => {
  const badgeRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const badge = badgeRef.current;
    if (!badge) return;

    const rect = badge.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!badge) return;
      const tiltX = -((y - centerY) / centerY) * 14;
      const tiltY = ((x - centerX) / centerX) * 14;
      badge.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
      badge.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
      badge.style.setProperty('--glare-x', `${(tiltY * 3).toFixed(1)}px`);
      badge.style.setProperty('--glare-y', `${(tiltX * 3).toFixed(1)}px`);
    });
  };

  const handleMouseEnter = () => {
    const badge = badgeRef.current;
    if (!badge) return;
    badge.style.setProperty('--badge-scale', '1.04');
    badge.style.setProperty('--glare-opacity', '0.35');
  };

  const handleMouseLeave = () => {
    const badge = badgeRef.current;
    if (!badge) return;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    badge.style.setProperty('--tilt-x', '0deg');
    badge.style.setProperty('--tilt-y', '0deg');
    badge.style.setProperty('--badge-scale', '1');
    badge.style.setProperty('--glare-opacity', '0');
    badge.style.setProperty('--glare-x', '0px');
    badge.style.setProperty('--glare-y', '0px');
  };

  return (
    <div
      ref={badgeRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`perspective-1000 cursor-pointer select-none will-change-transform ${className}`}
    >
      <div
        className="relative rounded-2xl p-4 transition-transform duration-150 ease-out transform-gpu-3d border border-slate-700/60 bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-slate-900/90 shadow-2xl overflow-hidden"
        style={{
          transform:
            'rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale3d(var(--badge-scale, 1), var(--badge-scale, 1), 1)',
        }}
      >
        {/* Holographic Iridescent Shimmer Glare */}
        <div
          className="pointer-events-none absolute -inset-full transition-opacity duration-300"
          style={{
            opacity: 'var(--glare-opacity, 0)',
            background:
              'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)',
            transform: 'translate(var(--glare-x, 0px), var(--glare-y, 0px))',
          }}
        />

        {/* Ambient Brand Halo */}
        <div
          className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl opacity-30 pointer-events-none transition-transform duration-300"
          style={{
            backgroundColor: brandColor,
            transform: 'translate(var(--glare-x, 0px), var(--glare-y, 0px))',
          }}
        />

        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white text-xs shadow-md"
              style={{ backgroundColor: brandColor }}
            >
              {brandCode.substring(0, 3)}
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-tight leading-none">{companyName}</p>
              <span className="text-[9px] font-mono text-slate-400">CORP VERIFIED</span>
            </div>
          </div>

          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            3D VAULT
          </span>
        </div>

        {/* Center Spec Info */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center gap-1.5 text-xs text-slate-200 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Digital Holographic Seal</span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono leading-tight">{subText}</p>
        </div>

        {/* Bottom Micro Telemetry Bar */}
        <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-400">
          <span className="flex items-center gap-1 text-slate-300">
            <Sparkles className="w-3 h-3 text-amber-400" />
            SEALED 3-COPY
          </span>
          <span className="text-emerald-400 font-bold">100% PASS</span>
        </div>
      </div>
    </div>
  );
};

export default HoloBadge3D;
