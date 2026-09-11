import React from 'react';

interface CyberBadgeProps {
  label: string;
  variant?: 'blue' | 'emerald' | 'amber' | 'purple';
  telemetry?: string;
  icon?: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

export const CyberBadge: React.FC<CyberBadgeProps> = ({
  label,
  variant = 'blue',
  telemetry,
  icon,
  pulse = true,
  className = '',
}) => {
  const variantStyles = {
    blue: {
      container: 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_12px_-2px_rgba(59,130,246,0.25)]',
      dot: 'bg-blue-400',
      pill: 'bg-blue-500/20 text-blue-300',
    },
    emerald: {
      container: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_-2px_rgba(16,185,129,0.25)]',
      dot: 'bg-emerald-400',
      pill: 'bg-emerald-500/20 text-emerald-300',
    },
    amber: {
      container: 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_12px_-2px_rgba(245,158,11,0.25)]',
      dot: 'bg-amber-400',
      pill: 'bg-amber-500/20 text-amber-300',
    },
    purple: {
      container: 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_12px_-2px_rgba(168,85,247,0.25)]',
      dot: 'bg-purple-400',
      pill: 'bg-purple-500/20 text-purple-300',
    },
  }[variant];

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wide backdrop-blur-md transition-all duration-300 ${variantStyles.container} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variantStyles.dot}`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${variantStyles.dot}`}
          />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="font-sans">{label}</span>
      {telemetry && (
        <span
          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${variantStyles.pill}`}
        >
          {telemetry}
        </span>
      )}
    </div>
  );
};
