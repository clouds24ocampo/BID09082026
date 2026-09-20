import * as THREE from 'three';

export interface RegionalHub {
  id: string;
  name: string;
  region: string;
  category: 'ICT & Goods' | 'Infrastructure' | 'Security & Cloud' | 'Consulting';
  activeProjects: number;
  totalAbc: string;
  coords: [number, number, number]; // 3D spatial coordinate
  color: number;
  leadAgency: string;
  solicitationNo: string;
}

export class ProcurementRadar3DScene {
  public group: THREE.Group;
  public beaconMeshes: THREE.Mesh[] = [];
  private hubMap = new Map<THREE.Mesh, RegionalHub>();
  private radarSweep: THREE.Line | null = null;
  private particleMesh: THREE.Points | null = null;
  private ringPulsers: { mesh: THREE.Mesh; scale: number; speed: number }[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.createRadarGrid();
    this.createArchipelagoMesh();
    this.createRegionalBeacons();
    this.createParticleCloud();
  }

  private createRadarGrid() {
    // Concentric holographic radar rings
    const ringRadii = [2.5, 4.5, 6.5, 8.5];
    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.RingGeometry(r - 0.03, r, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 3 ? 0x00f0ff : 0x1e3a8a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35 + idx * 0.1
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.05;
      this.group.add(ring);
    });

    // Crosshairs
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.25 });
    const pointsX = [new THREE.Vector3(-9, 0, 0), new THREE.Vector3(9, 0, 0)];
    const pointsZ = [new THREE.Vector3(0, 0, -9), new THREE.Vector3(0, 0, 9)];

    const geoX = new THREE.BufferGeometry().setFromPoints(pointsX);
    const geoZ = new THREE.BufferGeometry().setFromPoints(pointsZ);

    this.group.add(new THREE.Line(geoX, lineMat));
    this.group.add(new THREE.Line(geoZ, lineMat));

    // Rotating Radar Sweep Line
    const sweepPoints = [new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(8.5, 0.02, 0)];
    const sweepGeo = new THREE.BufferGeometry().setFromPoints(sweepPoints);
    const sweepMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });
    this.radarSweep = new THREE.Line(sweepGeo, sweepMat);
    this.group.add(this.radarSweep);
  }

  private createArchipelagoMesh() {
    // Stylized low-poly floating islands representing the Philippine Archipelago (Luzon, Visayas, Mindanao)
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x0c1e3d,
      roughness: 0.5,
      metalness: 0.4,
      wireframe: false
    });

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });

    // Luzon Mass
    const luzonGeo = new THREE.ConeGeometry(2.4, 1.2, 7);
    const luzon = new THREE.Mesh(luzonGeo, islandMat);
    luzon.rotation.x = Math.PI;
    luzon.position.set(0.2, -0.6, -3.2);
    luzon.scale.set(1.4, 0.8, 2.2);
    this.group.add(luzon);

    const luzonWire = new THREE.Mesh(luzonGeo, wireMat);
    luzonWire.rotation.x = Math.PI;
    luzonWire.position.copy(luzon.position);
    luzonWire.scale.copy(luzon.scale).multiplyScalar(1.02);
    this.group.add(luzonWire);

    // Visayas Cluster
    const visayasGeo = new THREE.CylinderGeometry(1.2, 0.3, 0.8, 6);
    const visayas = new THREE.Mesh(visayasGeo, islandMat);
    visayas.position.set(1.5, -0.4, 0.8);
    visayas.scale.set(1.2, 0.6, 1.1);
    this.group.add(visayas);

    // Mindanao Mass
    const mindanaoGeo = new THREE.ConeGeometry(2.0, 1.4, 7);
    const mindanao = new THREE.Mesh(mindanaoGeo, islandMat);
    mindanao.rotation.x = Math.PI;
    mindanao.position.set(1.2, -0.7, 4.2);
    mindanao.scale.set(1.6, 0.7, 1.5);
    this.group.add(mindanao);
  }

  private createRegionalBeacons() {
    const hubs: RegionalHub[] = [
      {
        id: 'car-hub',
        name: 'CAR Regional Procurement Hub (La Trinidad)',
        region: 'Cordillera Administrative Region',
        category: 'ICT & Goods',
        activeProjects: 3,
        totalAbc: '₱12,500,000.00',
        coords: [-0.2, 0.6, -4.6],
        color: 0x00f0ff,
        leadAgency: 'Municipality of La Trinidad',
        solicitationNo: '2025-12-4162-MO'
      },
      {
        id: 'ncr-hub',
        name: 'NCR National Capital Command (Manila)',
        region: 'National Capital Region',
        category: 'Infrastructure',
        activeProjects: 8,
        totalAbc: '₱48,900,000.00',
        coords: [0.3, 0.8, -2.4],
        color: 0xeab308,
        leadAgency: 'DPWH - National Capital Region',
        solicitationNo: 'DPWH-NCR-2026-048'
      },
      {
        id: 'r7-hub',
        name: 'Region VII Visayas Innovation Center (Cebu)',
        region: 'Central Visayas',
        category: 'Security & Cloud',
        activeProjects: 5,
        totalAbc: '₱27,850,000.00',
        coords: [1.8, 0.6, 0.9],
        color: 0x10b981,
        leadAgency: 'DICT Regional Office VII',
        solicitationNo: 'DICT-R7-2026-119'
      },
      {
        id: 'r11-hub',
        name: 'Region XI Mindanao Telemetry Node (Davao)',
        region: 'Davao Region',
        category: 'Consulting',
        activeProjects: 4,
        totalAbc: '₱18,200,000.00',
        coords: [1.4, 0.7, 4.1],
        color: 0xa855f7,
        leadAgency: 'DOH Davao Regional Center',
        solicitationNo: 'DOH-R11-2026-082'
      }
    ];

    hubs.forEach((hub) => {
      // Beacon Column Cylinder
      const colGeo = new THREE.CylinderGeometry(0.04, 0.04, hub.coords[1] + 1.2, 16);
      const colMat = new THREE.MeshBasicMaterial({
        color: hub.color,
        transparent: true,
        opacity: 0.65
      });
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(hub.coords[0], (hub.coords[1] + 1.2) / 2, hub.coords[2]);
      this.group.add(col);

      // Glowing Beacon Sphere
      const sphereGeo = new THREE.SphereGeometry(0.26, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: hub.color,
        emissive: hub.color,
        emissiveIntensity: 0.8,
        roughness: 0.2
      });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(hub.coords[0], hub.coords[1] + 1.2, hub.coords[2]);
      this.group.add(sphere);

      // Register for raycasting
      this.beaconMeshes.push(sphere);
      this.hubMap.set(sphere, hub);

      // Pulsing Base Ring
      const ringGeo = new THREE.RingGeometry(0.1, 0.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: hub.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(hub.coords[0], 0.01, hub.coords[2]);
      this.group.add(ring);

      this.ringPulsers.push({
        mesh: ring,
        scale: 1,
        speed: 1.2 + Math.random() * 0.8
      });
    });
  }

  private createParticleCloud() {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const c1 = new THREE.Color(0x00f0ff);
    const c2 = new THREE.Color(0x8b5cf6);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 7.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 3.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      const mixed = c1.clone().lerp(c2, Math.random());
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.75
    });

    this.particleMesh = new THREE.Points(geometry, material);
    this.group.add(this.particleMesh);
  }

  public update(delta: number) {
    // Rotate radar sweep
    if (this.radarSweep) {
      this.radarSweep.rotation.y += delta * 1.5;
    }

    // Animate pulsing rings
    this.ringPulsers.forEach((p) => {
      p.scale += delta * p.speed;
      if (p.scale > 2.8) {
        p.scale = 0.5;
      }
      p.mesh.scale.set(p.scale, p.scale, p.scale);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - (p.scale / 2.8));
    });

    // Rotate particle cloud gently
    if (this.particleMesh) {
      this.particleMesh.rotation.y += delta * 0.1;
    }
  }

  public getHub(mesh: THREE.Mesh): RegionalHub | undefined {
    return this.hubMap.get(mesh);
  }

  public dispose() {
    this.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh || (child as THREE.Points).isPoints || (child as THREE.Line).isLine) {
        const obj = child as THREE.Mesh;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    this.beaconMeshes.length = 0;
    this.hubMap.clear();
    this.ringPulsers.length = 0;
  }
}
