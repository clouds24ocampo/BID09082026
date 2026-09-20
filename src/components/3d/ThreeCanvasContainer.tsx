import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BidEnvelope3DScene } from './BidEnvelope3DScene';
import { ProcurementRadar3DScene } from './ProcurementRadar3DScene';
import { RegimeMatrix3DScene } from './RegimeMatrix3DScene';
import { soundEngine } from './SoundEngine';

export type SceneMode = 'ENVELOPE' | 'RADAR' | 'REGIME';

interface ThreeCanvasContainerProps {
  mode: SceneMode;
  unboxed: boolean;
  regime: 'RA_12009' | 'RA_9184';
  onSelectObject: (info: any) => void;
  className?: string;
}

export const ThreeCanvasContainer: React.FC<ThreeCanvasContainerProps> = ({
  mode,
  unboxed,
  regime,
  onSelectObject,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References to keep across re-renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const envelopeSceneRef = useRef<BidEnvelope3DScene | null>(null);
  const radarSceneRef = useRef<ProcurementRadar3DScene | null>(null);
  const regimeSceneRef = useRef<RegimeMatrix3DScene | null>(null);

  const reqAnimIdRef = useRef<number | null>(null);

  // Interaction controls
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef({ radius: 14, theta: 0, phi: Math.PI / 2.3 });
  const targetSphericalRef = useRef({ radius: 14, theta: 0, phi: Math.PI / 2.3 });
  const mousePosRef = useRef(new THREE.Vector2(-999, -999));
  const raycasterRef = useRef(new THREE.Raycaster());

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x070d1e, 0.025);

    // 2. Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 4, 14);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(8, 14, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const cyanPointLight = new THREE.PointLight(0x00f0ff, 3.5, 30);
    cyanPointLight.position.set(-6, 3, 6);
    scene.add(cyanPointLight);

    const goldPointLight = new THREE.PointLight(0xf59e0b, 2.5, 25);
    goldPointLight.position.set(6, -2, 5);
    scene.add(goldPointLight);

    // 5. Instantiate Scenes
    const envelopeScene = new BidEnvelope3DScene();
    const radarScene = new ProcurementRadar3DScene();
    const regimeScene = new RegimeMatrix3DScene();

    envelopeSceneRef.current = envelopeScene;
    radarSceneRef.current = radarScene;
    regimeSceneRef.current = regimeScene;

    scene.add(envelopeScene.group);
    scene.add(radarScene.group);
    scene.add(regimeScene.group);

    // Set initial visibility
    envelopeScene.group.visible = mode === 'ENVELOPE';
    radarScene.group.visible = mode === 'RADAR';
    regimeScene.group.visible = mode === 'REGIME';

    // 6. Animation Loop
    let lastTime = performance.now();
    const animate = () => {
      reqAnimIdRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      // Update current scene
      if (envelopeSceneRef.current && envelopeSceneRef.current.group.visible) {
        envelopeSceneRef.current.update(delta);
      }
      if (radarSceneRef.current && radarSceneRef.current.group.visible) {
        radarSceneRef.current.update(delta);
      }
      if (regimeSceneRef.current && regimeSceneRef.current.group.visible) {
        regimeSceneRef.current.update(delta);
      }

      // Smooth Orbit Camera
      const s = sphericalRef.current;
      const ts = targetSphericalRef.current;
      s.theta += (ts.theta - s.theta) * 0.08;
      s.phi += (ts.phi - s.phi) * 0.08;
      s.radius += (ts.radius - s.radius) * 0.08;

      camera.position.x = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
      camera.position.y = s.radius * Math.cos(s.phi);
      camera.position.z = s.radius * Math.sin(s.phi) * Math.cos(s.theta);
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize Observer
    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqAnimIdRef.current) cancelAnimationFrame(reqAnimIdRef.current);
      renderer.dispose();
      envelopeScene.dispose();
      radarScene.dispose();
      regimeScene.dispose();
    };
  }, []);

  // Update scene visibility on mode change
  useEffect(() => {
    if (envelopeSceneRef.current) envelopeSceneRef.current.group.visible = mode === 'ENVELOPE';
    if (radarSceneRef.current) radarSceneRef.current.group.visible = mode === 'RADAR';
    if (regimeSceneRef.current) regimeSceneRef.current.group.visible = mode === 'REGIME';

    // Camera preset adjustments per mode
    if (mode === 'ENVELOPE') {
      targetSphericalRef.current = { radius: 13, theta: 0.1, phi: Math.PI / 2.3 };
    } else if (mode === 'RADAR') {
      targetSphericalRef.current = { radius: 16, theta: 0.4, phi: Math.PI / 3.0 }; // Higher tilt for map overview
    } else if (mode === 'REGIME') {
      targetSphericalRef.current = { radius: 12, theta: -0.2, phi: Math.PI / 2.2 };
    }
  }, [mode]);

  // Update unboxed progress
  useEffect(() => {
    if (envelopeSceneRef.current) {
      envelopeSceneRef.current.setUnboxed(unboxed ? 1 : 0);
    }
  }, [unboxed]);

  // Update regime in crystal scene
  useEffect(() => {
    if (regimeSceneRef.current) {
      regimeSceneRef.current.setRegime(regime);
    }
  }, [regime]);

  // Mouse & Touch Controls
  const onMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    mousePosRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mousePosRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (isDraggingRef.current) {
      const dx = e.clientX - prevMouseRef.current.x;
      const dy = e.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: e.clientX, y: e.clientY };

      targetSphericalRef.current.theta -= dx * 0.007;
      targetSphericalRef.current.phi = Math.max(0.15, Math.min(Math.PI - 0.2, targetSphericalRef.current.phi - dy * 0.007));
    }
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    targetSphericalRef.current.radius = Math.max(6, Math.min(26, targetSphericalRef.current.radius + e.deltaY * 0.015));
  };

  const onClick = (e: React.MouseEvent) => {
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!camera || !scene) return;

    raycasterRef.current.setFromCamera(mousePosRef.current, camera);

    if (mode === 'ENVELOPE' && envelopeSceneRef.current) {
      const hits = raycasterRef.current.intersectObjects(envelopeSceneRef.current.interactiveMeshes);
      if (hits.length > 0) {
        const mesh = hits[0].object as THREE.Mesh;
        const meta = envelopeSceneRef.current.getMetadata(mesh);
        if (meta) {
          soundEngine.playClick(720);
          onSelectObject({ type: 'ENVELOPE', data: meta });
        }
      }
    } else if (mode === 'RADAR' && radarSceneRef.current) {
      const hits = raycasterRef.current.intersectObjects(radarSceneRef.current.beaconMeshes);
      if (hits.length > 0) {
        const mesh = hits[0].object as THREE.Mesh;
        const hub = radarSceneRef.current.getHub(mesh);
        if (hub) {
          soundEngine.playBeaconPing();
          onSelectObject({ type: 'RADAR_HUB', data: hub });
        }
      }
    } else if (mode === 'REGIME' && regimeSceneRef.current) {
      const hits = raycasterRef.current.intersectObjects(regimeSceneRef.current.interactiveMeshes);
      if (hits.length > 0) {
        const mesh = hits[0].object as THREE.Mesh;
        const facet = regimeSceneRef.current.getFacet(mesh);
        if (facet) {
          soundEngine.playRegimeShift();
          onSelectObject({ type: 'REGIME_FACET', data: facet });
        }
      }
    }
  };

  // Touch Gestures (Mobile & Tablet Support)
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const touchMovedRef = useRef(false);
  const pinchDistRef = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      const t = e.touches[0];
      prevMouseRef.current = { x: t.clientX, y: t.clientY };
      touchStartPosRef.current = { x: t.clientX, y: t.clientY };
      touchMovedRef.current = false;
      pinchDistRef.current = null;
    } else if (e.touches.length === 2) {
      // Two finger pinch start
      isDraggingRef.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const t = e.touches[0];
      const dx = t.clientX - prevMouseRef.current.x;
      const dy = t.clientY - prevMouseRef.current.y;
      prevMouseRef.current = { x: t.clientX, y: t.clientY };

      if (Math.hypot(t.clientX - touchStartPosRef.current.x, t.clientY - touchStartPosRef.current.y) > 6) {
        touchMovedRef.current = true;
      }

      targetSphericalRef.current.theta -= dx * 0.007;
      targetSphericalRef.current.phi = Math.max(0.15, Math.min(Math.PI - 0.2, targetSphericalRef.current.phi - dy * 0.007));
    } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const delta = pinchDistRef.current - currentDist;
      pinchDistRef.current = currentDist;
      targetSphericalRef.current.radius = Math.max(6, Math.min(26, targetSphericalRef.current.radius + delta * 0.05));
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    isDraggingRef.current = false;
    pinchDistRef.current = null;

    // If it was a tap without drag, trigger raycast
    if (!touchMovedRef.current && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const container = containerRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      if (!container || !camera || !scene) return;

      const rect = container.getBoundingClientRect();
      const clickPos = new THREE.Vector2(
        ((t.clientX - rect.left) / rect.width) * 2 - 1,
        -((t.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycasterRef.current.setFromCamera(clickPos, camera);

      if (mode === 'ENVELOPE' && envelopeSceneRef.current) {
        const hits = raycasterRef.current.intersectObjects(envelopeSceneRef.current.interactiveMeshes);
        if (hits.length > 0) {
          const mesh = hits[0].object as THREE.Mesh;
          const meta = envelopeSceneRef.current.getMetadata(mesh);
          if (meta) {
            soundEngine.playClick(720);
            onSelectObject({ type: 'ENVELOPE', data: meta });
          }
        }
      } else if (mode === 'RADAR' && radarSceneRef.current) {
        const hits = raycasterRef.current.intersectObjects(radarSceneRef.current.beaconMeshes);
        if (hits.length > 0) {
          const mesh = hits[0].object as THREE.Mesh;
          const hub = radarSceneRef.current.getHub(mesh);
          if (hub) {
            soundEngine.playBeaconPing();
            onSelectObject({ type: 'RADAR_HUB', data: hub });
          }
        }
      } else if (mode === 'REGIME' && regimeSceneRef.current) {
        const hits = raycasterRef.current.intersectObjects(regimeSceneRef.current.interactiveMeshes);
        if (hits.length > 0) {
          const mesh = hits[0].object as THREE.Mesh;
          const facet = regimeSceneRef.current.getFacet(mesh);
          if (facet) {
            soundEngine.playRegimeShift();
            onSelectObject({ type: 'REGIME_FACET', data: facet });
          }
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none ${className}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
