import React from 'react';
import { motion, animate, useInView } from 'framer-motion';

/* ------------------------------------------------------------------ */
/* GlowButton — brand-colored action button with neon glow            */
/* ------------------------------------------------------------------ */
interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const GlowButton: React.FC<GlowButtonProps> = ({ children, className = '', ...rest }) => (
  <motion.button
    whileTap={{ scale: 0.97 }}
    whileHover={{ y: -1 }}
    className={`btn-glow text-white font-semibold rounded-xl px-4 py-2.5 text-xs flex items-center gap-2 ${className}`}
    {...(rest as any)}
  >
    {children}
  </motion.button>
);

/* ------------------------------------------------------------------ */
/* SectionHeader — display-font title with holo divider               */
/* ------------------------------------------------------------------ */
interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle, action }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2 rounded-xl border border-white/10 bg-white/5 text-brand-primary shadow-[0_0_16px_var(--brand-soft)]">
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-white tracking-wide text-glow">
            {title}
          </h2>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    <hr className="holo-divider" />
  </div>
);

/* ------------------------------------------------------------------ */
/* TiltCard — glass card with 3D hover lift                           */
/* ------------------------------------------------------------------ */
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    whileHover={{ y: -5, rotateX: 2, rotateY: -2 }}
    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    onClick={onClick}
    className={`fx-tilt ${className}`}
  >
    {children}
  </motion.div>
);

/* ------------------------------------------------------------------ */
/* CountUp — animated number that counts up when scrolled into view   */
/* ------------------------------------------------------------------ */
interface CountUpProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

export const CountUp: React.FC<CountUpProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  duration = 1.2
}) => {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v)
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : Math.round(display).toLocaleString();

  return (
    <span ref={ref} className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
};
