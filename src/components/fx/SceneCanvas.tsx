import React, { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Sparkles, Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

const DocumentConstellation: React.FC<{ color: string }> = ({ color }) => {
  const groupRef = React.useRef<THREE.Group>(null);
  const ringRef = React.useRef<THREE.Mesh>(null);

  useFrame(({ pointer }, delta) => {
    if (!groupRef.current || !ringRef.current) return;

    groupRef.current.rotation.y += delta * 0.12;
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      pointer.y * 0.1,
      0.035
    );
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      2.25 + pointer.x * 0.32,
      0.035
    );
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      0.15 + pointer.y * 0.18,
      0.035
    );
    ringRef.current.rotation.z -= delta * 0.45;
  });

  return (
    <group ref={groupRef} position={[2.25, 0.15, -0.7]} rotation={[0.18, -0.35, 0.12]}>
      <Float speed={1.4} rotationIntensity={0.18} floatIntensity={0.35}>
        <mesh position={[0, 0.32, 0.22]} rotation={[0.05, -0.12, 0.08]}>
          <boxGeometry args={[2.45, 0.08, 1.65]} />
          <meshStandardMaterial color="#dbeafe" emissive={color} emissiveIntensity={0.08} metalness={0.25} roughness={0.32} />
        </mesh>
        <mesh position={[-0.18, 0.43, 0.1]} rotation={[0.05, -0.12, 0.08]}>
          <boxGeometry args={[2.05, 0.06, 1.3]} />
          <meshStandardMaterial color="#f8fafc" emissive={color} emissiveIntensity={0.12} metalness={0.12} roughness={0.42} />
        </mesh>
        <mesh position={[0.22, 0.54, -0.04]} rotation={[0.05, -0.12, 0.08]}>
          <boxGeometry args={[1.65, 0.045, 0.95]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.22} metalness={0.4} roughness={0.28} transparent opacity={0.72} />
        </mesh>
      </Float>

      <mesh ref={ringRef} rotation={[Math.PI / 2.2, 0.1, 0]}>
        <torusGeometry args={[1.62, 0.012, 12, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.52} />
      </mesh>
      <mesh rotation={[Math.PI / 2.7, 0.8, 0.4]}>
        <torusGeometry args={[1.35, 0.008, 10, 96]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.36} />
      </mesh>
      <mesh position={[0.95, 0.74, 0.2]}>
        <sphereGeometry args={[0.075, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      <mesh position={[-1.1, -0.55, 0.2]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#22d3ee" />
      </mesh>
    </group>
  );
};

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

        <DocumentConstellation color={color} />

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
