import * as THREE from 'three';

export interface EnvelopeMetadata {
  id: string;
  name: string;
  copy: 'ORIGINAL' | 'COPY_1' | 'COPY_2' | 'MOTHER';
  component: 'MOTHER' | 'TECHNICAL' | 'FINANCIAL';
  color: number;
  description: string;
  statutoryReference: string;
  mandatoryDocuments: string[];
}

export class BidEnvelope3DScene {
  public group: THREE.Group;
  public interactiveMeshes: THREE.Mesh[] = [];
  private meshMetadataMap = new Map<THREE.Mesh, EnvelopeMetadata>();
  private envelopeObjects: {
    mesh: THREE.Mesh;
    basePos: THREE.Vector3;
    explodedPos: THREE.Vector3;
    baseRot: THREE.Euler;
    explodedRot: THREE.Euler;
  }[] = [];

  private unboxedProgress = 0; // 0 = closed/sealed mother box, 1 = fully exploded
  private targetProgress = 0;
  private canvasTextures: THREE.CanvasTexture[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.createPackageHierarchy();
  }

  // Create procedural canvas textures for envelopes
  private createCoverTexture(title: string, copy: string, subtitle: string, borderColor = '#c29b38'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 724; // ~1:1.414 standard proportion
    const ctx = canvas.getContext('2d')!;

    // Kraft / Manila paper background
    ctx.fillStyle = '#1e2638';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle paper grain
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let i = 0; i < 3000; i++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 1.5);
    }

    // Outer gold border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // Republic of the Philippines Header
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('REPUBLIC OF THE PHILIPPINES', canvas.width / 2, 60);
    ctx.font = '12px monospace';
    ctx.fillText('RA 12009 (NGPA) & RA 9184 COMPLIANT BID SUBMISSION', canvas.width / 2, 80);

    // Official Stamp Box
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.strokeRect(canvas.width / 2 - 180, 110, 360, 90);
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(copy, canvas.width / 2, 145);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px sans-serif';
    ctx.fillText('OFFICIAL BID DOCUMENT SUBMISSION', canvas.width / 2, 172);

    // Document Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(title, canvas.width / 2, 260);

    // Subtitle / Component
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '16px monospace';
    ctx.fillText(subtitle, canvas.width / 2, 295);

    // Bidder Information Block
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(50, 330, canvas.width - 100, 170);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(50, 330, canvas.width - 100, 170);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('BIDDER: QUANTUM CLOUD CORPORATION', 70, 365);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('PhilGEPS Plat: 202106-237062-883905538', 70, 395);
    ctx.fillText('TIN: 000-000-000-000 | PCAB: AAA / Large B', 70, 420);
    ctx.fillText('AMO: Mark-Vin F. Ocampo (President)', 70, 445);
    ctx.fillText('Procuring: MUNICIPALITY OF LA TRINIDAD', 70, 470);

    // Tamper Evident Warning Strip
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(40, 530, canvas.width - 80, 40);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DO NOT OPEN BEFORE BID OPENING DATE & TIME', canvas.width / 2, 555);

    // Bottom Security QR Mock
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(canvas.width / 2 - 40, 600, 80, 80);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '9px monospace';
    ctx.fillText('SHA-256 VERIFIED', canvas.width / 2, 700);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.canvasTextures.push(texture);
    return texture;
  }

  private createPackageHierarchy() {
    // Envelope geometry proportions (Width: 3.6, Height: 4.8, Depth: 0.16)
    const envGeo = new THREE.BoxGeometry(3.6, 4.8, 0.14);
    const motherGeo = new THREE.BoxGeometry(4.2, 5.4, 0.9);

    // 1. MOTHER BOX / ENVELOPE (CONTAINER)
    const motherTexture = this.createCoverTexture('MOTHER ENVELOPE', 'OUTER SEALED CONTAINER', 'ORIGINAL + COPY 1 + COPY 2 ENCLOSED', '#eab308');
    const motherMat = [
      new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.6, metalness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.6, metalness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.6, metalness: 0.2 }),
      new THREE.MeshStandardMaterial({ color: 0x1a2233, roughness: 0.6, metalness: 0.2 }),
      new THREE.MeshStandardMaterial({ map: motherTexture, roughness: 0.4, metalness: 0.1 }), // Front
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 }) // Back
    ];
    const motherMesh = new THREE.Mesh(motherGeo, motherMat);
    motherMesh.castShadow = true;
    motherMesh.receiveShadow = true;

    const motherMeta: EnvelopeMetadata = {
      id: 'mother-container',
      name: 'Outer Sealed Mother Envelope / Box',
      copy: 'MOTHER',
      component: 'MOTHER',
      color: 0xeab308,
      description: 'The sealed outermost package enclosing the Original, Copy 1, and Copy 2 bid submissions.',
      statutoryReference: 'RA 12009 Sec 25.1 / RA 9184 Sec 25.1',
      mandatoryDocuments: [
        'Outer Security Wax Seal & Tamper-Proof Tape',
        'Authorized Managing Officer (AMO) Official Mark',
        'PhilGEPS Platinum QR Code & Bid Reference Badge',
        'Complete Project Identification Details'
      ]
    };
    this.meshMetadataMap.set(motherMesh, motherMeta);
    this.interactiveMeshes.push(motherMesh);

    this.envelopeObjects.push({
      mesh: motherMesh,
      basePos: new THREE.Vector3(0, 0, 0),
      explodedPos: new THREE.Vector3(0, 0, -3.2),
      baseRot: new THREE.Euler(0, 0, 0),
      explodedRot: new THREE.Euler(-0.25, 0, 0)
    });
    this.group.add(motherMesh);

    // 2. INNER ENVELOPES (ORIGINAL, COPY 1, COPY 2)
    const copies: { key: 'ORIGINAL' | 'COPY_1' | 'COPY_2'; label: string; xOffset: number }[] = [
      { key: 'ORIGINAL', label: 'ORIGINAL BID', xOffset: 0 },
      { key: 'COPY_1', label: 'COPY NO. 1', xOffset: -4.6 },
      { key: 'COPY_2', label: 'COPY NO. 2', xOffset: 4.6 }
    ];

    copies.forEach((c) => {
      // Technical Envelope
      const techTexture = this.createCoverTexture('TECHNICAL COMPONENT', `${c.label} - ENVELOPE 1`, 'LEGAL, TECHNICAL & FINANCIAL ELIGIBILITY', '#00f0ff');
      const techMat = [
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ map: techTexture, roughness: 0.35 }),
        new THREE.MeshStandardMaterial({ color: 0x0a0f1d, roughness: 0.8 })
      ];
      const techMesh = new THREE.Mesh(envGeo, techMat);
      techMesh.castShadow = true;
      techMesh.receiveShadow = true;

      const techMeta: EnvelopeMetadata = {
        id: `tech-${c.key.toLowerCase()}`,
        name: `${c.label} — Technical Component Envelope`,
        copy: c.key,
        component: 'TECHNICAL',
        color: 0x00f0ff,
        description: 'First envelope containing the eligibility documents, technical specifications, and bid security.',
        statutoryReference: 'RA 12009 Sec 25.2(a) / RA 9184 Rule VIII Sec 25.2(a)',
        mandatoryDocuments: [
          'PhilGEPS Platinum Registration Certificate (Annex "A")',
          'Mayor’s / Business Permit (2026)',
          'BIR Tax Clearance Certificate (EO 398)',
          'PCAB License & Registration (Infra bids)',
          'Statement of Single Largest Completed Contract (SLCC)',
          'NFCC Computation or Committed Line of Credit (CLC)',
          'Bid Securing Declaration or Bank Guarantee',
          'Omnibus Sworn Statement (10-Point GPPB Format)'
        ]
      };
      this.meshMetadataMap.set(techMesh, techMeta);
      this.interactiveMeshes.push(techMesh);

      // Financial Envelope
      const finTexture = this.createCoverTexture('FINANCIAL COMPONENT', `${c.label} - ENVELOPE 2`, 'BID FORM, BILL OF QUANTITIES & PRICE SCHEDULES', '#10b981');
      const finMat = [
        new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.5 }),
        new THREE.MeshStandardMaterial({ map: finTexture, roughness: 0.35 }),
        new THREE.MeshStandardMaterial({ color: 0x022c22, roughness: 0.8 })
      ];
      const finMesh = new THREE.Mesh(envGeo, finMat);
      finMesh.castShadow = true;
      finMesh.receiveShadow = true;

      const finMeta: EnvelopeMetadata = {
        id: `fin-${c.key.toLowerCase()}`,
        name: `${c.label} — Financial Component Envelope`,
        copy: c.key,
        component: 'FINANCIAL',
        color: 0x10b981,
        description: 'Second envelope containing the financial bid form and bill of quantities/schedules.',
        statutoryReference: 'RA 12009 Sec 25.2(b) / RA 9184 Rule VIII Sec 25.2(b)',
        mandatoryDocuments: [
          'Original Signed & Accomplished Bid Form',
          'Price Schedule / Bill of Quantities (Detailed)',
          'Cash Flow by Quarter & Payment Schedule',
          'Itemized Breakdown of Unit Costs & Taxes'
        ]
      };
      this.meshMetadataMap.set(finMesh, finMeta);
      this.interactiveMeshes.push(finMesh);

      // Add to animation arrays
      // In closed state, they sit neatly inside the mother envelope
      // In exploded state, they fan out laterally
      this.envelopeObjects.push({
        mesh: techMesh,
        basePos: new THREE.Vector3(0, 0, 0.15),
        explodedPos: new THREE.Vector3(c.xOffset, 1.2, 1.2),
        baseRot: new THREE.Euler(0, 0, 0),
        explodedRot: new THREE.Euler(0.1, (c.xOffset !== 0 ? (c.xOffset > 0 ? -0.15 : 0.15) : 0), 0)
      });

      this.envelopeObjects.push({
        mesh: finMesh,
        basePos: new THREE.Vector3(0, 0, 0.28),
        explodedPos: new THREE.Vector3(c.xOffset, -1.6, 2.0),
        baseRot: new THREE.Euler(0, 0, 0),
        explodedRot: new THREE.Euler(0.15, (c.xOffset !== 0 ? (c.xOffset > 0 ? -0.15 : 0.15) : 0), 0)
      });

      this.group.add(techMesh);
      this.group.add(finMesh);
    });

    // Add glowing perimeter pedestal
    const pedestalGeo = new THREE.CylinderGeometry(8.5, 9.5, 0.2, 48);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x070d1e,
      roughness: 0.7,
      metalness: 0.3
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = -3.2;
    pedestal.receiveShadow = true;
    this.group.add(pedestal);

    // Glowing circle ring on pedestal
    const ringGeo = new THREE.RingGeometry(8.2, 8.4, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -3.09;
    this.group.add(ring);
  }

  public setUnboxed(target: number) {
    this.targetProgress = Math.max(0, Math.min(1, target));
  }

  public getUnboxed(): number {
    return this.targetProgress;
  }

  public toggleUnboxed(): number {
    this.targetProgress = this.targetProgress > 0.5 ? 0 : 1;
    return this.targetProgress;
  }

  public update(delta: number) {
    // Smooth interpolation between closed and exploded
    this.unboxedProgress += (this.targetProgress - this.unboxedProgress) * Math.min(1, delta * 4.5);

    this.envelopeObjects.forEach((obj) => {
      obj.mesh.position.lerpVectors(obj.basePos, obj.explodedPos, this.unboxedProgress);
      obj.mesh.rotation.x = THREE.MathUtils.lerp(obj.baseRot.x, obj.explodedRot.x, this.unboxedProgress);
      obj.mesh.rotation.y = THREE.MathUtils.lerp(obj.baseRot.y, obj.explodedRot.y, this.unboxedProgress);
      obj.mesh.rotation.z = THREE.MathUtils.lerp(obj.baseRot.z, obj.explodedRot.z, this.unboxedProgress);
    });

    // Gentle global hover float
    const time = Date.now() * 0.001;
    this.group.position.y = Math.sin(time * 1.2) * 0.12;
  }

  public getMetadata(mesh: THREE.Mesh): EnvelopeMetadata | undefined {
    return this.meshMetadataMap.get(mesh);
  }

  public dispose() {
    this.canvasTextures.forEach((t) => t.dispose());
    this.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });
    this.meshMetadataMap.clear();
    this.interactiveMeshes.length = 0;
    this.envelopeObjects.length = 0;
  }
}
