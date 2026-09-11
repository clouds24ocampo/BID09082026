import React from 'react';

interface ShinyTextProps {
  text: string;
  className?: string;
  disabled?: boolean;
  speed?: number; // seconds
}

export const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  className = '',
  disabled = false,
  speed = 5,
}) => {
  if (disabled) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span
      className={`inline-block bg-clip-text text-transparent bg-gradient-to-r from-slate-200 via-white to-slate-400 font-bold bg-[length:200%_auto] ${className}`}
      style={{
        animation: `shimmerGlow ${speed}s linear infinite`,
      }}
    >
      {text}
    </span>
  );
};
