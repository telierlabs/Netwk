import * as THREE from 'three';
import { SimulationSpec } from '../types/simulation';

export const TOTAL_PARTICLES = 3000;

export interface ExpandedParticleData {
  targetPositions: Float32Array;
  colors: Float32Array;
  callouts: Array<{
    id: string;
    label: string;
    sublabel?: string;
    position: [number, number, number];
  }>;
  connections: Array<{
    from: [number, number, number];
    to: [number, number, number];
    label?: string;
  }>;
}

// 8 Titik Sudut & 12 Rusuk Kubus Presisi [-0.5, 0.5]
const BOX_VERTICES = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5],  [0.5, -0.5, 0.5],  [0.5, 0.5, 0.5],  [-0.5, 0.5, 0.5]
];
const BOX_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0], // Loop Bawah
  [4, 5], [5, 6], [6, 7], [7, 4], // Loop Atas
  [0, 4], [1, 5], [2, 6], [3, 7]  // Rusuk Vertikal
];

// STATE INITIAL: Bola Silver Platinum (Hanya Dibuat 1x Saat Mount)
export function generateInitialParticles(): { positions: Float32Array; colors: Float32Array } {
  const positions = new Float32Array(TOTAL_PARTICLES * 3);
  const colors = new Float32Array(TOTAL_PARTICLES * 3);

  for (let i = 0; i < TOTAL_PARTICLES; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / TOTAL_PARTICLES);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const r = 1.1; // Radius silver rapi

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Warna Silver Platinum (#d1d5db)
    colors[i * 3] = 0.82;
    colors[i * 3 + 1] = 0.84;
    colors[i * 3 + 2] = 0.86;
  }

  return { positions, colors };
}

// EKSPANSI SPEC GEMINI KE PARTIKEL 3D
export function expandSpecToParticles(spec: SimulationSpec): ExpandedParticleData {
  const targetPositions = new Float32Array(TOTAL_PARTICLES * 3);
  const colors = new Float32Array(TOTAL_PARTICLES * 3);
  const callouts: ExpandedParticleData['callouts'] = [];
  const connectionLines: ExpandedParticleData['connections'] = [];

  const particlesPerComp = Math.floor(TOTAL_PARTICLES / spec.components.length);
  let pIdx = 0;

  spec.components.forEach((comp) => {
    const [cx, cy, cz] = comp.center;
    const [sx, sy, sz] = comp.scale;
    const color = new THREE.Color(comp.color || '#00f0ff');

    callouts.push({
      id: comp.id,
      label: comp.label,
      sublabel: comp.sublabel,
      position: [cx, cy, cz]
    });

    for (let i = 0; i < particlesPerComp && pIdx < TOTAL_PARTICLES; i++) {
      let x = 0, y = 0, z = 0;
      const progress = i / particlesPerComp;

      switch (comp.type) {
        case 'helix': {
          // DNA: 70% Strand Spiral, 30% Connector Rung
          const isRung = progress > 0.7;

          if (!isRung) {
            const strandProgress = progress / 0.7;
            const t = strandProgress * Math.PI * 8;
            const h = (strandProgress - 0.5) * 2;
            const strand = i % 2 === 0 ? 0 : Math.PI;
            x = Math.cos(t + strand) * sx;
            y = h * sy;
            z = Math.sin(t + strand) * sz;
          } else {
            const rungProgress = (progress - 0.7) / 0.3;
            const stepIndex = Math.floor(rungProgress * 12);
            const h = (stepIndex / 12 - 0.5) * 2;
            const t = (stepIndex / 12) * Math.PI * 8;
            const tInRung = (rungProgress * 12) % 1 - 0.5;
            x = tInRung * Math.cos(t) * 2 * sx;
            y = h * sy;
            z = tInRung * Math.sin(t) * 2 * sz;
          }
          break;
        }

        case 'box_outline': {
          // Rusuk Kubus Presisi (12 Edges)
          const edgeIdx = Math.floor(progress * 12) % 12;
          const edgeProg = (progress * 12) % 1;
          const [vA, vB] = BOX_EDGES[edgeIdx];

          const pA = BOX_VERTICES[vA];
          const pB = BOX_VERTICES[vB];

          x = (pA[0] + (pB[0] - pA[0]) * edgeProg) * sx;
          y = (pA[1] + (pB[1] - pA[1]) * edgeProg) * sy;
          z = (pA[2] + (pB[2] - pA[2]) * edgeProg) * sz;
          break;
        }

        case 'sphere': {
          const phi = Math.acos(1 - 2 * progress);
          const theta = Math.PI * (1 + Math.sqrt(5)) * i;
          const r = Math.cbrt(progress);
          x = r * Math.sin(phi) * Math.cos(theta) * sx;
          y = r * Math.sin(phi) * Math.sin(theta) * sy;
          z = r * Math.cos(phi) * sz;
          break;
        }

        case 'ring': {
          const theta = progress * Math.PI * 2;
          x = Math.cos(theta) * sx;
          y = 0;
          z = Math.sin(theta) * sz;
          break;
        }

        case 'flow': {
          x = (progress - 0.5) * 2.5 * sx;
          y = Math.sin(progress * Math.PI * 4) * 0.25 * sy;
          z = Math.cos(progress * Math.PI * 2) * 0.2 * sz;
          break;
        }

        default: { // radial_grid
          const angle = progress * Math.PI * 10;
          const dist = progress * sx;
          x = Math.cos(angle) * dist;
          y = 0;
          z = Math.sin(angle) * dist;
          break;
        }
      }

      targetPositions[pIdx * 3] = x + cx;
      targetPositions[pIdx * 3 + 1] = y + cy;
      targetPositions[pIdx * 3 + 2] = z + cz;

      colors[pIdx * 3] = color.r;
      colors[pIdx * 3 + 1] = color.g;
      colors[pIdx * 3 + 2] = color.b;

      pIdx++;
    }
  });

  // KONEKSI ANTAR KOMPONEN
  if (spec.connections) {
    const compMap = new Map(spec.components.map((c) => [c.id, c]));
    spec.connections.forEach((conn) => {
      const fromC = compMap.get(conn.fromId);
      const toC = compMap.get(conn.toId);
      if (fromC && toC) {
        connectionLines.push({
          from: fromC.center,
          to: toC.center,
          label: conn.label
        });
      }
    });
  }

  while (pIdx < TOTAL_PARTICLES) {
    targetPositions[pIdx * 3] = 0;
    targetPositions[pIdx * 3 + 1] = 0;
    targetPositions[pIdx * 3 + 2] = 0;
    colors[pIdx * 3] = 0;
    colors[pIdx * 3 + 1] = 0;
    colors[pIdx * 3 + 2] = 0;
    pIdx++;
  }

  return { targetPositions, colors, callouts, connections: connectionLines };
}
