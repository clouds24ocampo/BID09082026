import React, { Suspense } from 'react';

const LazySceneCanvas = React.lazy(() =>
  import('./SceneCanvas').then((m) => ({ default: m.SceneCanvas }))
);

interface SceneBackgroundProps {
  /** Tenant brand color — tints geometry, particles and aurora mesh */
  color?: string;
  /** 'full' for cinematic auth pages, 'ambient' for the app shell (lighter) */
  intensity?: 'ambient' | 'full';
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** WebGL scene requires a real browser environment (jsdom/SSR/old browsers fall back to static aurora) */
const canRenderWebGL = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.ResizeObserver === 'function' &&
  !prefersReducedMotion();

const staticAurora = (color: string): React.CSSProperties => ({
  background: `radial-gradient(ellipse 70% 55% at 70% 10%, color-mix(in srgb, ${color} 16%, transparent), transparent 70%),
               radial-gradient(ellipse 60% 50% at 15% 90%, rgba(139, 92, 246, 0.12), transparent 70%)`
});

/**
 * Fixed, brand-tinted 3D scene rendered behind all app content.
 *
 * Performance contract:
 * - Static aurora gradient paints INSTANTLY (pure CSS, zero JS cost).
 * - The WebGL canvas mounts only AFTER first paint (requestIdleCallback /
 *   setTimeout fallback) via React.lazy, so three.js never blocks TTI.
 * - Render loop halts while the tab is hidden (visibilitychange).
 *
 * Safety: `no-export`/`print:hidden` keep it out of print output, and the
 * PDF export engine renders document-sheet subtrees only, never this canvas.
 */
export const SceneBackground: React.FC<SceneBackgroundProps> = ({
  color = '#3b82f6',
  intensity = 'ambient'
}) => {
  const full = intensity === 'full';
  const [mount3D, setMount3D] = React.useState(false);
  const [visible, setVisible] = React.useState(
    typeof document === 'undefined' ? true : !document.hidden
  );

  // Defer WebGL mount until after first paint — initial HTML/CSS render first
  React.useEffect(() => {
    if (!canRenderWebGL()) return;
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) {
      const id = ric(() => setMount3D(true), { timeout: 1200 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setMount3D(true), 150);
    return () => window.clearTimeout(t);
  }, []);

  // Pause the render loop entirely while the tab is hidden
  React.useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div
      aria-hidden
      className="no-export print:hidden fixed inset-0 -z-10 pointer-events-none overflow-hidden"
    >
      {/* Aurora mesh layer (CSS, brand-tinted, instant paint) */}
      <div className="aurora-blob aurora-blob-a" style={{ backgroundColor: color }} />
      <div className="aurora-blob aurora-blob-b" />

      {/* WebGL layer — lazy, post-paint, hidden-tab paused */}
      {mount3D && visible ? (
        <Suspense fallback={<div className="absolute inset-0" style={staticAurora(color)} />}>
          <LazySceneCanvas color={color} full={full} />
        </Suspense>
      ) : (
        !canRenderWebGL() && <div className="absolute inset-0" style={staticAurora(color)} />
      )}

      {/* Holographic grid floor + cinematic vignette */}
      <div className="cyber-grid" />
      <div className="vignette" />
    </div>
  );
};
