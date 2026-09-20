import * as THREE from 'three';

export interface RegimeFacet {
  id: string;
  regime: 'RA_12009' | 'RA_9184';
  title: string;
  pillar: string;
  description: string;
  legalBasis: string;
  status: string;
}

export class RegimeMatrix3DScene {
  public group: THREE.Group;
  public interactiveMeshes: THREE.Mesh[] = [];
  private facetMap = new Map<THREE.Mesh, RegimeFacet>();
  private crystalCore: THREE.Mesh | null = null;
  private outerRing1: THREE.Mesh | null = null;
  private outerRing2: THREE.Mesh | null = null;
  private particles: THREE.Points | null = null;
  private currentRegime: 'RA_12009' | 'RA_9184' = 'RA_12009';

  constructor() {
    this.group = new THREE.Group();
    this.createCrystalCore();
    this.createOrbitalRings();
    this.createStatutoryNodes();
    this.createParticleStream();
  }

  private createCrystalCore() {
    // Octahedron representing the balanced dual statutory crystal
    const geo = new THREE.OctahedronGeometry(2.2, 0);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x00f0ff,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.85,
      thickness: 1.5,
      transparent: true,
      opacity: 0.85
    });

    this.crystalCore = new THREE.Mesh(geo, mat);
    this.group.add(this.crystalCore);

    // Inner wireframe core
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.6
    });
    const innerWire = new THREE.Mesh(new THREE.OctahedronGeometry(2.25, 1), wireMat);
    this.crystalCore.add(innerWire);
  }

  private createOrbitalRings() {
    // Ring 1: RA 12009 Primary Ring
    const ring1Geo = new THREE.TorusGeometry(3.6, 0.04, 16, 100);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });
    this.outerRing1 = new THREE.Mesh(ring1Geo, ring1Mat);
    this.outerRing1.rotation.x = Math.PI / 3;
    this.group.add(this.outerRing1);

    // Ring 2: RA 9184 Transitional Ring
    const ring2Geo = new THREE.TorusGeometry(4.2, 0.04, 16, 100);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      roughness: 0.3
    });
    this.outerRing2 = new THREE.Mesh(ring2Geo, ring2Mat);
    this.outerRing2.rotation.y = Math.PI / 4;
    this.group.add(this.outerRing2);
  }

  private createStatutoryNodes() {
    const nodes: {
      position: [number, number, number];
      facet: RegimeFacet;
      color: number;
    }[] = [
      {
        position: [0, 3.4, 0],
        color: 0x00f0ff,
        facet: {
          id: 'facet-meat',
          regime: 'RA_12009',
          title: 'MEAT Modality (Most Economically Advantageous Tender)',
          pillar: 'Evaluation Innovation',
          description: 'Replaces rigid lowest price with quality-price scoring ratio, factoring lifecycle cost and socio-environmental impact.',
          legalBasis: 'RA 12009 Section 33 / GPPB Res 02-2025',
          status: 'ACTIVE_STATUTORY_LAW'
        }
      },
      {
        position: [3.2, 0.5, 1.2],
        color: 0x10b981,
        facet: {
          id: 'facet-gpp',
          regime: 'RA_12009',
          title: 'Green Public Procurement (GPP)',
          pillar: 'Sustainability Mandate',
          description: 'Mandatory environmental criteria and carbon lifecycle certification for goods and infrastructure bids.',
          legalBasis: 'RA 12009 Section 61',
          status: 'ACTIVE_STATUTORY_LAW'
        }
      },
      {
        position: [-3.2, 0.5, 1.2],
        color: 0x38bdf8,
        facet: {
          id: 'facet-zero-whitespace',
          regime: 'RA_12009',
          title: 'Automated Zero-Whitespace Legal PDF Engine',
          pillar: 'Digital Bid Assembly',
          description: '100% full-page balanced table packing for legal 8.5" x 13" paper with cryptographic QR seals.',
          legalBasis: 'GPPB Res. 02-2025 Standard Forms',
          status: 'BiDOCS_INTEGRATED'
        }
      },
      {
        position: [0, -3.4, 0],
        color: 0xf59e0b,
        facet: {
          id: 'facet-lcrb',
          regime: 'RA_9184',
          title: 'LCRB / HRRB Evaluation Standard',
          pillar: 'Legacy Procurement Engine',
          description: 'Traditional Lowest Calculated Responsive Bid mechanism supported during the 3-year statutory transition.',
          legalBasis: 'RA 9184 Section 32 (2016 IRR)',
          status: 'TRANSITIONAL_VALID_UNTIL_2027'
        }
      },
      {
        position: [0, 0, 3.4],
        color: 0x8b5cf6,
        facet: {
          id: 'facet-mphilgeps',
          regime: 'RA_12009',
          title: 'mPhilGEPS Open API & Platinum Sync',
          pillar: 'Interoperability',
          description: 'Live automated cryptographic verification of Annex "A" eligibility credentials directly from PhilGEPS servers.',
          legalBasis: 'RA 12009 Section 8',
          status: 'ACTIVE_INTEGRATION'
        }
      }
    ];

    nodes.forEach((n) => {
      const geo = new THREE.DodecahedronGeometry(0.38);
      const mat = new THREE.MeshStandardMaterial({
        color: n.color,
        emissive: n.color,
        emissiveIntensity: 0.7,
        roughness: 0.2
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...n.position);
      this.group.add(mesh);

      // Connecting tether line to center
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...n.position)
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: n.color,
        transparent: true,
        opacity: 0.35
      });
      this.group.add(new THREE.Line(lineGeo, lineMat));

      this.interactiveMeshes.push(mesh);
      this.facetMap.set(mesh, n.facet);
    });
  }

  private createParticleStream() {
    const particleCount = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.05,
      transparent: true,
      opacity: 0.6
    });

    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
  }

  public setRegime(regime: 'RA_12009' | 'RA_9184') {
    this.currentRegime = regime;
    if (this.crystalCore) {
      const targetColor = regime === 'RA_12009' ? 0x00f0ff : 0xf59e0b;
      const targetEmissive = regime === 'RA_12009' ? 0x0284c7 : 0xd97706;
      (this.crystalCore.material as THREE.MeshPhysicalMaterial).color.setHex(targetColor);
      (this.crystalCore.material as THREE.MeshPhysicalMaterial).emissive.setHex(targetEmissive);
    }
  }

  public getRegime(): 'RA_12009' | 'RA_9184' {
    return this.currentRegime;
  }

  public update(delta: number) {
    if (this.crystalCore) {
      this.crystalCore.rotation.y += delta * 0.4;
      this.crystalCore.rotation.x += delta * 0.2;
    }
    if (this.outerRing1) {
      this.outerRing1.rotation.z += delta * 0.6;
    }
    if (this.outerRing2) {
      this.outerRing2.rotation.x += delta * 0.5;
    }
    if (this.particles) {
      this.particles.rotation.y += delta * 0.15;
    }
  }

  public getFacet(mesh: THREE.Mesh): RegimeFacet | undefined {
    return this.facetMap.get(mesh);
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
    this.interactiveMeshes.length = 0;
    this.facetMap.clear();
  }
}
