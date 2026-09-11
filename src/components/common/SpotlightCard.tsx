import React, { useRef, useEffect } from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  enableTilt?: boolean;
  maxTiltAngle?: number;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColor = 'rgba(59, 130, 246, 0.18)',
  enableTilt = true,
  maxTiltAngle = 7,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!card) return;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);

      if (enableTilt) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = -((y - centerY) / centerY) * maxTiltAngle;
        const tiltY = ((x - centerX) / centerX) * maxTiltAngle;
        card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
      }
    });
  };

  const handleMouseEnter = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--spotlight-opacity', '1');
    card.style.setProperty('--card-scale', '1.015');
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    card.style.setProperty('--spotlight-opacity', '0');
    card.style.setProperty('--card-scale', '1');
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 transition-transform duration-150 ease-out will-change-transform transform-gpu-3d ${className}`}
      style={{
        transform: enableTilt
          ? 'perspective(1000px) rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale3d(var(--card-scale, 1), var(--card-scale, 1), 1)'
          : undefined,
        transformStyle: 'preserve-3d',
      }}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Radial Highlight — CSS GPU Accelerated */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300 z-10"
        style={{
          opacity: 'var(--spotlight-opacity, 0)',
          background: `radial-gradient(420px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), ${spotlightColor}, transparent 75%)`,
        }}
      />

      {/* Surface Glare Reflection Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          opacity: 'calc(var(--spotlight-opacity, 0) * 0.35)',
          background: `radial-gradient(600px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(255, 255, 255, 0.08), transparent 70%)`,
        }}
      />

      {/* Content Container */}
      <div className="relative z-20 h-full">{children}</div>
    </div>
  );
};

export default SpotlightCard;
