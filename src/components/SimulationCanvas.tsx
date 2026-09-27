import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';
import { SimulationSpec } from '../types/simulation';
import { generateInitialParticles, expandSpecToParticles, TOTAL_PARTICLES } from '../lib/proceduralExpander';

const MORPH_SPEED = 0.08;

interface CanvasProps {
  spec: SimulationSpec | null;
  isProcessing?: boolean;
}

function ParticleHologramEngine({ spec, isProcessing }: CanvasProps) {
  const geoRef = useRef<THREE.BufferGeometry>(null);

  const initial = useMemo(() => generateInitialParticles(), []);

  const currentPositions = useRef<Float32Array>(new Float32Array(initial.positions));
  const currentColors = useRef<Float32Array>(new Float32Array(initial.colors));

  const targetPositions = useRef<Float32Array>(new Float32Array(initial.positions));
  const targetColors = useRef<Float32Array>(new Float32Array(initial.colors));

  const [callouts, setCallouts] = useState<Array<{ id: string; label: string; sublabel?: string; position: [number, number, number] }>>([]);
  const [connections, setConnections] = useState<Array<{ from: [number, number, number]; to: [number, number, number]; label?: string }>>([]);

  useEffect(() => {
    // ATURAN SANGAT TEGAS: Jika spec null/undefined (Gagal), TARGET DITAHAN!
    if (!spec) return;

    const expanded = expandSpecToParticles(spec);
    targetPositions.current = expanded.targetPositions;
    targetColors.current = expanded.colors;
    setCallouts(expanded.callouts);
    setConnections(expanded.connections);
  }, [spec]);

  // LERP MORPHING + FIXED PROCESSING MOTION (NO DRIFT BUG)
  useFrame((state) => {
    if (!geoRef.current) return;

    const posAttr = geoRef.current.attributes.position as THREE.BufferAttribute;
    const colAttr = geoRef.current.attributes.color as THREE.BufferAttribute;

    const currPos = currentPositions.current;
    const currCol = currentColors.current;
    const targPos = targetPositions.current;
    const targCol = targetColors.current;

    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    const time = state.clock.elapsedTime;

    for (let i = 0; i < TOTAL_PARTICLES; i++) {
      const idx = i * 3;

      // 1. Permanen Lerp Posisi (Base)
      currPos[idx]     += (targPos[idx]     - currPos[idx])     * MORPH_SPEED;
      currPos[idx + 1] += (targPos[idx + 1] - currPos[idx + 1]) * MORPH_SPEED;
      currPos[idx + 2] += (targPos[idx + 2] - currPos[idx + 2]) * MORPH_SPEED;

      currCol[idx]     += (targCol[idx]     - currCol[idx])     * MORPH_SPEED;
      currCol[idx + 1] += (targCol[idx + 1] - currCol[idx + 1]) * MORPH_SPEED;
      currCol[idx + 2] += (targCol[idx + 2] - currCol[idx + 2]) * MORPH_SPEED;

      // 2. Temporary Render Offset (Fix Drift: Tidak mengubah currPos)
      let vibX = 0, vibY = 0, vibZ = 0;
      if (isProcessing) {
        vibX = Math.sin(time * 12 + i) * 0.0025;
        vibY = Math.cos(time * 10 + i * 2) * 0.0025;
        vibZ = Math.sin(time * 14 + i * 3) * 0.0025;
      }

      posArray[idx]     = currPos[idx]     + vibX;
      posArray[idx + 1] = currPos[idx + 1] + vibY;
      posArray[idx + 2] = currPos[idx + 2] + vibZ;

      colArray[idx]     = currCol[idx];
      colArray[idx + 1] = currCol[idx + 1];
      colArray[idx + 2] = currCol[idx + 2];
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <group>
      {/* Renderer Utama Partikel Hologram */}
      <points>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute
            attach="attributes-position"
            args={[currentPositions.current, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[currentColors.current, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Garis Koneksi Antar Komponen */}
      {connections.map((conn, idx) => (
        <Line
          key={idx}
          points={[new THREE.Vector3(...conn.from), new THREE.Vector3(...conn.to)]}
          color="#00f0ff"
          lineWidth={1.2}
          transparent
          opacity={0.35}
          dashed
        />
      ))}

      {/* Callouts (Line + Floating HTML) */}
      {callouts.map((c) => {
        const start = new THREE.Vector3(...c.position);
        const end = new THREE.Vector3(c.position[0] + 1.0, c.position[1] + 0.5, c.position[2]);

        return (
          <group key={c.id}>
            <Line points={[start, end]} color="#ffffff" lineWidth={1} transparent opacity={0.35} />
            <Html position={end} center distanceFactor={8}>
              <div className="bg-black/90 border border-white/20 backdrop-blur-md px-2.5 py-1 rounded text-white text-xs whitespace-nowrap pointer-events-none shadow-[0_0_15px_rgba(0,240,255,0.15)]">
                <div className="font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  {c.label}
                </div>
                {c.sublabel && <div className="text-[10px] text-gray-400 font-mono mt-0.5">{c.sublabel}</div>}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

export default function SimulationCanvas({ spec, isProcessing }: CanvasProps) {
  return (
    <div className="w-full h-full bg-black relative">
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }}>
        <ParticleHologramEngine spec={spec} isProcessing={isProcessing} />
        <OrbitControls enableZoom={true} enablePan={false} />
      </Canvas>

      {spec && (
        <div className="absolute top-6 left-6 pointer-events-none">
          <h1 className="text-white text-base font-bold tracking-wider uppercase">{spec.title}</h1>
          {spec.subtitle && <p className="text-cyan-400 text-[11px] font-mono mt-0.5">{spec.subtitle}</p>}
        </div>
      )}
    </div>
  );
}
