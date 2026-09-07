import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, Sparkles, Float, MeshDistortMaterial } from '@react-three/drei';

/**
 * WebGL scene contents. This module is ONLY ever loaded via React.lazy from
 * SceneBackground, which defers mounting until after first paint — so the
 * three.js bundle (~600KB) never blocks initial page load.
 *
 * `frameloop="demand"` + a visibility listener mean the GPU does zero work
 * while the tab is hidden.
 */
export const SceneCanvas: React.FC<{ color: string; full: boolean }> = ({ color, full }) => {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 8], fov: 55 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
      frameloop={typeof document !== 'undefined' && document.hidden ? 'never' : 'always'}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 4, 3]} intensity={24} color={color} />

        <Stars
          radius={90}
          depth={50}
          count={full ? 4200 : 2200}
          factor={3.5}
          saturation={0}
          fade
          speed={0.8}
        />
        <Sparkles
          count={full ? 90 : 40}
          speed={0.35}
          opacity={0.5}
          color={color}
          size={2.4}
          scale={[15, 9, 6]}
          noise={2}
        />

        <Float speed={1.2} rotationIntensity={0.6} floatIntensity={1.2}>
          <mesh position={[3.4, 1.3, -2]}>
            <icosahedronGeometry args={[1.7, 1]} />
            <MeshDistortMaterial
              color={color}
              wireframe
              distort={0.25}
              speed={1.6}
              transparent
              opacity={full ? 0.32 : 0.22}
            />
          </mesh>
        </Float>
        <Float speed={0.9} rotationIntensity={0.8} floatIntensity={1.4}>
          <mesh position={[-3.8, -1.5, -3]}>
            <torusKnotGeometry args={[1.1, 0.32, 96, 12]} />
            <meshStandardMaterial color={color} wireframe transparent opacity={full ? 0.22 : 0.14} />
          </mesh>
        </Float>
      </Suspense>
    </Canvas>
  );
};
