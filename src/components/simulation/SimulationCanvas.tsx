/**
 * ============================================================================
 * CYLEN SIMULATION CANVAS — generic Three.js runtime
 * ============================================================================
 *
 * Ini pengganti langsung dari blok canvas 2D manual di LiveVoiceMode.tsx
 * yang dulu isinya `if (shape === 'dna') {...} else if (shape === 'heart')`.
 *
 * Komponen ini TIDAK TAHU APA-APA soal topik simulasi. Ia cuma tahu cara
 * merender primitive geometry generik dan menjalankan behavior generik,
 * berdasarkan data di `ValidatedSimulationSpec`. Kalau AI mengirim entity
 * baru dengan kombinasi geometry+behavior yang belum pernah ada, file ini
 * tetap bisa merendernya tanpa perlu diubah.
 * ============================================================================
 */

import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Line, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { ValidatedSimulationSpec } from '../../lib/simulationSchema';
import type {
  Entity,
  Geometry,
  Behavior,
  Vector3 as SpecVector3,
  DynamicValue,
  Distribution,
} from '../../types/simulation';
import { resolveDynamicValue, type ExpressionScope } from '../../lib/expressionEvaluator';

// ----------------------------------------------------------------------------
// Props
// ----------------------------------------------------------------------------

interface SimulationCanvasProps {
  spec: ValidatedSimulationSpec;
  playing: boolean;
  selectedEntityId?: string | null;
  onSelectEntity?: (id: string | null) => void;
}

// ----------------------------------------------------------------------------
// Helpers kecil
// ----------------------------------------------------------------------------

function v3(v: SpecVector3): [number, number, number] {
  return [v.x, v.y, v.z];
}

function toThreeVector3(v: SpecVector3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z);
}

/** Transform.position bisa Vector3 statis atau array 3 DynamicValue. */
function resolvePosition(
  position: SpecVector3 | DynamicValue[],
  scope: ExpressionScope
): THREE.Vector3 {
  if (Array.isArray(position)) {
    return new THREE.Vector3(
      resolveDynamicValue(position[0], scope, 0),
      resolveDynamicValue(position[1], scope, 0),
      resolveDynamicValue(position[2], scope, 0)
    );
  }
  return toThreeVector3(position);
}

function resolveScale(scale: SpecVector3 | number | undefined): THREE.Vector3 {
  if (scale === undefined) return new THREE.Vector3(1, 1, 1);
  if (typeof scale === 'number') return new THREE.Vector3(scale, scale, scale);
  return toThreeVector3(scale);
}

// ----------------------------------------------------------------------------
// Geometry builders — 1 fungsi generik per primitive, BUKAN per topik
// ----------------------------------------------------------------------------

function buildHelixPoints(radius: number, pitch: number, turns: number, segmentsPerTurn = 32): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const totalSegments = Math.max(8, Math.round(turns * segmentsPerTurn));
  for (let i = 0; i <= totalSegments; i++) {
    const t = (i / totalSegments) * turns * Math.PI * 2;
    const y = (i / totalSegments) * turns * pitch;
    points.push(new THREE.Vector3(Math.cos(t) * radius, y, Math.sin(t) * radius));
  }
  return points;
}

function distributionToPositions(dist: Distribution, count: number): Float32Array {
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    let x = 0, y = 0, z = 0;

    switch (dist.kind) {
      case 'sphereSurface': {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        x = dist.radius * Math.sin(phi) * Math.cos(theta);
        y = dist.radius * Math.sin(phi) * Math.sin(theta);
        z = dist.radius * Math.cos(phi);
        break;
      }
      case 'sphereVolume': {
        const r = dist.radius * Math.cbrt(Math.random());
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = r * Math.cos(phi);
        break;
      }
      case 'boxVolume': {
        x = (Math.random() - 0.5) * dist.size.x;
        y = (Math.random() - 0.5) * dist.size.y;
        z = (Math.random() - 0.5) * dist.size.z;
        break;
      }
      case 'alongPath': {
        const curve = new THREE.CatmullRomCurve3(dist.path.controlPoints.map(toThreeVector3));
        const p = curve.getPointAt(Math.random());
        x = p.x; y = p.y; z = p.z;
        break;
      }
      case 'random': {
        x = THREE.MathUtils.lerp(dist.bounds.min.x, dist.bounds.max.x, Math.random());
        y = THREE.MathUtils.lerp(dist.bounds.min.y, dist.bounds.max.y, Math.random());
        z = THREE.MathUtils.lerp(dist.bounds.min.z, dist.bounds.max.z, Math.random());
        break;
      }
    }

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }

  return positions;
}

/** Merender 1 Geometry generik jadi JSX Three.js. */
const EntityGeometry: React.FC<{ geometry: Geometry }> = ({ geometry }) => {
  switch (geometry.kind) {
    case 'sphere':
      return <sphereGeometry args={[geometry.radius, geometry.segments ?? 32, geometry.segments ?? 32]} />;
    case 'box':
      return <boxGeometry args={[geometry.size.x, geometry.size.y, geometry.size.z]} />;
    case 'cylinder':
      return <cylinderGeometry args={[geometry.radiusTop, geometry.radiusBottom, geometry.height, 32]} />;
    case 'cone':
      return <coneGeometry args={[geometry.radius, geometry.height, 32]} />;
    case 'torus':
      return <torusGeometry args={[geometry.radius, geometry.tube, 16, 100]} />;
    case 'plane':
      return <planeGeometry args={[geometry.size.x, geometry.size.y]} />;
    case 'tube': {
      const curve = new THREE.CatmullRomCurve3(
        geometry.path.controlPoints.map(toThreeVector3),
        geometry.closed ?? false
      );
      return <tubeGeometry args={[curve, 128, geometry.radius, 8, geometry.closed ?? false]} />;
    }
    case 'helix': {
      const points = buildHelixPoints(geometry.radius, geometry.pitch, geometry.turns);
      const curve = new THREE.CatmullRomCurve3(points);
      return <tubeGeometry args={[curve, Math.max(64, points.length), geometry.tubeRadius, 8, false]} />;
    }
    default:
      return null;
  }
};

/** Merender Material generik jadi JSX Three.js. */
const EntityMaterial: React.FC<{ material: Entity['material']; clippingPlanes?: THREE.Plane[] }> = ({
  material,
  clippingPlanes,
}) => {
  const commonProps = {
    color: material.color,
    transparent: (material.opacity ?? 1) < 1 || material.style === 'glass',
    opacity: material.opacity ?? 1,
    wireframe: material.style === 'wireframe',
    clippingPlanes,
  };

  if (material.style === 'glow') {
    return (
      <meshStandardMaterial
        {...commonProps}
        emissive={material.color}
        emissiveIntensity={material.emissiveIntensity ?? 1.2}
      />
    );
  }

  if (material.style === 'glass') {
    return (
      <meshPhysicalMaterial
        {...commonProps}
        roughness={0.1}
        metalness={0}
        transmission={0.85}
        opacity={material.opacity ?? 0.4}
      />
    );
  }

  // 'solid', 'wireframe', 'gradient' (gradient disederhanakan jadi solid
  // color "from" untuk MVP — shader gradient asli bisa ditambah belakangan)
  return <meshStandardMaterial {...commonProps} color={material.gradient ? material.gradient.from : material.color} />;
};

// ----------------------------------------------------------------------------
// Runtime state per entity — dipakai behavior engine tiap frame
// ----------------------------------------------------------------------------

interface EntityRuntime {
  groupRef: React.RefObject<THREE.Group>;
  basePosition: THREE.Vector3;
  baseScale: THREE.Vector3;
  baseRotation: THREE.Vector3;
}

// ----------------------------------------------------------------------------
// Behavior engine — generic, dijalankan tiap frame untuk SEMUA entity
// ----------------------------------------------------------------------------

function applyBehaviors(
  spec: ValidatedSimulationSpec,
  runtimeMap: Map<string, EntityRuntime>,
  elapsedTime: number,
  parameterScope: ExpressionScope
) {
  spec.behaviors.forEach((behavior: Behavior) => {
    behavior.targetIds.forEach((targetId) => {
      const runtime = runtimeMap.get(targetId);
      const group = runtime?.groupRef.current;
      if (!runtime || !group) return;

      const scope: ExpressionScope = { t: elapsedTime, ...parameterScope };
      const p = (key: string, fallback: number) =>
        behavior.params[key] !== undefined ? resolveDynamicValue(behavior.params[key], scope, fallback) : fallback;

      switch (behavior.kind) {
        case 'rotate': {
          const speed = p('speed', 0.3);
          group.rotation.y = runtime.baseRotation.y + elapsedTime * speed;
          break;
        }

        case 'orbit': {
          const radius = p('radius', 3);
          const speed = p('speed', 0.5);

          // Cari relationship kind 'orbit' yang targetId = entity ini, buat
          // dapetin pusat orbit. Kalau tidak ada, orbit di sekitar origin.
          const orbitRel = spec.relationships.find(
            (r) => r.kind === 'orbit' && r.targetId === targetId
          );
          let center = new THREE.Vector3(0, 0, 0);
          if (orbitRel) {
            const centerRuntime = runtimeMap.get(orbitRel.sourceId);
            if (centerRuntime?.groupRef.current) {
              center = centerRuntime.groupRef.current.position.clone();
            }
          }

          const angle = elapsedTime * speed;
          group.position.set(
            center.x + Math.cos(angle) * radius,
            center.y,
            center.z + Math.sin(angle) * radius
          );
          break;
        }

        case 'pulse': {
          const speed = p('speed', 1);
          const amplitude = p('amplitude', 0.15);
          const factor = 1 + Math.sin(elapsedTime * speed) * amplitude;
          group.scale.set(
            runtime.baseScale.x * factor,
            runtime.baseScale.y * factor,
            runtime.baseScale.z * factor
          );
          break;
        }

        case 'oscillate': {
          const speed = p('speed', 1);
          const amplitude = p('amplitude', 0.5);
          const axis = (behavior.params.axis as unknown as string) || 'y';
          const offset = Math.sin(elapsedTime * speed) * amplitude;
          const base = runtime.basePosition;
          if (axis === 'x') group.position.set(base.x + offset, base.y, base.z);
          else if (axis === 'z') group.position.set(base.x, base.y, base.z + offset);
          else group.position.set(base.x, base.y + offset, base.z);
          break;
        }

        case 'flowAlongPath': {
          // MVP: butuh relationship kind 'flow' yang targetId = entity ini,
          // lalu entity ini bergerak linear antara posisi sourceId <-> targetId
          // relationship tsb secara berulang (mis. partikel darah/data yang
          // "mengalir" sepanjang koneksi).
          const flowRel = spec.relationships.find((r) => r.kind === 'flow' && r.targetId === targetId);
          const speed = p('speed', 0.5);
          if (flowRel) {
            const from = runtimeMap.get(flowRel.sourceId)?.groupRef.current?.position;
            const to = runtimeMap.get(flowRel.targetId)?.groupRef.current?.position ?? runtime.basePosition;
            if (from) {
              const progress = (elapsedTime * speed) % 1;
              group.position.lerpVectors(from, to, progress);
            }
          }
          break;
        }

        case 'colorTransition': {
          const mesh = group.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh | undefined;
          const mat = mesh?.material as THREE.MeshStandardMaterial | undefined;
          const toColorHex = (behavior.params.toColor as unknown as string) || '#ffffff';
          if (mat && mat.color) {
            const target = new THREE.Color(toColorHex);
            const speed = p('speed', 0.5);
            mat.color.lerp(target, Math.min(1, speed * 0.02));
          }
          break;
        }

        case 'stateMachine':
        case 'followField':
        case 'custom':
          // Ditinggalkan sebagai no-op aman untuk MVP — spec tetap valid dan
          // tidak crash, tapi behavior ini belum divisualisasikan secara
          // penuh. Kandidat penguatan di iterasi berikutnya.
          break;
      }
    });
  });
}

// ----------------------------------------------------------------------------
// Satu entity, dirender sebagai <group> yang menampung geometry + material
// ----------------------------------------------------------------------------

const EntityNode: React.FC<{
  entity: Entity;
  registerRuntime: (id: string, runtime: EntityRuntime) => void;
  selected: boolean;
  selectable: boolean;
  onSelect?: (id: string) => void;
  clippingPlanes?: THREE.Plane[];
}> = ({ entity, registerRuntime, selected, selectable, onSelect, clippingPlanes }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const basePosition = useMemo(() => resolvePosition(entity.transform.position, { t: 0 }), [entity]);
  const baseScale = useMemo(() => resolveScale(entity.transform.scale), [entity]);
  const baseRotation = useMemo(
    () => (entity.transform.rotation ? toThreeVector3(entity.transform.rotation) : new THREE.Vector3()),
    [entity]
  );

  useEffect(() => {
    registerRuntime(entity.id, { groupRef, basePosition, baseScale, baseRotation });
  }, [entity.id, registerRuntime, basePosition, baseScale, baseRotation]);

  // particleSystem dirender beda: pakai <points>, bukan mesh tunggal.
  if (entity.geometry.kind === 'particleSystem') {
    const positions = useMemo(
      () => distributionToPositions(entity.geometry.kind === 'particleSystem' ? entity.geometry.distribution : { kind: 'random', bounds: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } } }, entity.geometry.count),
      [entity]
    );
    return (
      <group ref={groupRef} position={basePosition} scale={baseScale}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={entity.geometry.count} array={positions} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial
            color={entity.material.color}
            size={entity.geometry.particleRadius}
            transparent
            opacity={entity.material.opacity ?? 0.85}
            sizeAttenuation
            blending={entity.material.style === 'glow' ? THREE.AdditiveBlending : THREE.NormalBlending}
            depthWrite={false}
          />
        </points>
      </group>
    );
  }

  if (entity.geometry.kind === 'line') {
    return (
      <group ref={groupRef} position={basePosition} scale={baseScale}>
        <Line points={entity.geometry.points.map(v3)} color={entity.material.color} lineWidth={2} transparent opacity={entity.material.opacity ?? 1} />
      </group>
    );
  }

  if (entity.geometry.kind === 'vectorArrow') {
    const from = toThreeVector3(entity.geometry.from);
    const to = toThreeVector3(entity.geometry.to);
    const dir = to.clone().sub(from);
    const length = dir.length();
    const headLength = entity.geometry.headSize ?? Math.max(0.1, length * 0.15);
    return (
      <group ref={groupRef} position={basePosition} scale={baseScale}>
        <primitive object={new THREE.ArrowHelper(dir.clone().normalize(), from, length, entity.material.color, headLength, headLength * 0.6)} />
      </group>
    );
  }

  if (entity.geometry.kind === 'text3d') {
    return (
      <group ref={groupRef} position={basePosition} scale={baseScale}>
        <Text fontSize={entity.geometry.size} color={entity.material.color} anchorX="center" anchorY="middle">
          {entity.geometry.text}
        </Text>
      </group>
    );
  }

  if (entity.geometry.kind === 'custom') {
    // verticesRef belum diimplementasi di MVP — dilewati dengan aman.
    return null;
  }

  return (
    <group
      ref={groupRef}
      position={basePosition}
      scale={baseScale}
      rotation={[baseRotation.x, baseRotation.y, baseRotation.z]}
      onClick={(e) => {
        if (!selectable) return;
        e.stopPropagation();
        onSelect?.(entity.id);
      }}
    >
      <mesh>
        <EntityGeometry geometry={entity.geometry} />
        <EntityMaterial material={entity.material} clippingPlanes={clippingPlanes} />
      </mesh>
      {selected && (
        <mesh scale={1.08}>
          <EntityGeometry geometry={entity.geometry} />
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
};

// ----------------------------------------------------------------------------
// Relationship visual (connection/flow line antar entity)
// ----------------------------------------------------------------------------

const RelationshipLine: React.FC<{
  fromRuntime?: EntityRuntime;
  toRuntime?: EntityRuntime;
  color: string;
  width: number;
}> = ({ fromRuntime, toRuntime, color, width }) => {
  const [points, setPoints] = React.useState<[number, number, number][]>([
    [0, 0, 0],
    [0, 0, 0],
  ]);

  useFrame(() => {
    const from = fromRuntime?.groupRef.current?.position;
    const to = toRuntime?.groupRef.current?.position;
    if (from && to) {
      setPoints([
        [from.x, from.y, from.z],
        [to.x, to.y, to.z],
      ]);
    }
  });

  return <Line points={points} color={color} lineWidth={width} />;
};

// ----------------------------------------------------------------------------
// Label overlay (HTML anchored ke posisi 3D entity)
// ----------------------------------------------------------------------------

const LabelOverlay: React.FC<{
  text: string;
  runtime?: EntityRuntime;
  staticPosition?: SpecVector3;
  color?: string;
}> = ({ text, runtime, staticPosition, color }) => {
  const position: [number, number, number] = staticPosition
    ? v3(staticPosition)
    : runtime?.groupRef.current
    ? v3({
        x: runtime.groupRef.current.position.x,
        y: runtime.groupRef.current.position.y,
        z: runtime.groupRef.current.position.z,
      })
    : [0, 0, 0];

  return (
    <Html position={position} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
      <div
        style={{
          color: color ?? '#ffffff',
          fontSize: '11px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          textShadow: '0 0 6px rgba(0,0,0,0.9)',
          background: 'rgba(0,0,0,0.35)',
          padding: '2px 6px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.15)',
        }}
      >
        {text}
      </div>
    </Html>
  );
};

// ----------------------------------------------------------------------------
// Scene inner — dijalankan di dalam <Canvas>, punya akses useFrame
// ----------------------------------------------------------------------------

const SceneContent: React.FC<SimulationCanvasProps> = ({ spec, playing, selectedEntityId, onSelectEntity }) => {
  const runtimeMapRef = useRef<Map<string, EntityRuntime>>(new Map());
  const elapsedTimeRef = useRef(0);

  const registerRuntime = (id: string, runtime: EntityRuntime) => {
    runtimeMapRef.current.set(id, runtime);
  };

  const parameterScope: ExpressionScope = useMemo(() => {
    const scope: ExpressionScope = {};
    spec.parameters.forEach((p) => {
      scope[p.id] = p.value;
    });
    return scope;
  }, [spec.parameters]);

  useFrame((_, delta) => {
    if (playing) {
      elapsedTimeRef.current += delta;
    }
    applyBehaviors(spec, runtimeMapRef.current, elapsedTimeRef.current, parameterScope);
  });

  // clipPlane aktif per layer (cross-section/cutaway), dikumpulkan sekali.
  const clippingPlanesByEntity = useMemo(() => {
    const map = new Map<string, THREE.Plane[]>();
    spec.layers.forEach((layer) => {
      if (!layer.clipPlane) return;
      const plane = new THREE.Plane(toThreeVector3(layer.clipPlane.normal), layer.clipPlane.constant);
      layer.entityIds.forEach((entId) => {
        const existing = map.get(entId) ?? [];
        existing.push(plane);
        map.set(entId, existing);
      });
    });
    return map;
  }, [spec.layers]);

  const visibleEntityIds = useMemo(() => {
    const hiddenIds = new Set<string>();
    spec.layers.forEach((layer) => {
      if (!layer.visibleByDefault) {
        layer.entityIds.forEach((id) => hiddenIds.add(id));
      }
    });
    return spec.entities.filter((e) => !hiddenIds.has(e.id)).map((e) => e.id);
  }, [spec.entities, spec.layers]);

  return (
    <>
      {spec.scene.lighting?.glow !== false && <ambientLight intensity={spec.scene.lighting?.ambientIntensity ?? 0.4} />}
      <directionalLight position={[4, 6, 4]} intensity={spec.scene.lighting?.keyLightIntensity ?? 1} />
      <pointLight position={[-4, -2, -4]} intensity={0.3} />

      {spec.entities
        .filter((e) => visibleEntityIds.includes(e.id))
        .map((entity) => (
          <EntityNode
            key={entity.id}
            entity={entity}
            registerRuntime={registerRuntime}
            selected={selectedEntityId === entity.id}
            selectable={entity.selectable ?? false}
            onSelect={onSelectEntity}
            clippingPlanes={clippingPlanesByEntity.get(entity.id)}
          />
        ))}

      {spec.relationships
        .filter((r) => r.kind === 'connection' || r.kind === 'flow')
        .map((rel) => (
          <RelationshipLine
            key={rel.id}
            fromRuntime={runtimeMapRef.current.get(rel.sourceId)}
            toRuntime={runtimeMapRef.current.get(rel.targetId)}
            color={rel.visual?.color ?? '#666666'}
            width={rel.visual?.width ?? 1}
          />
        ))}

      {spec.labels.map((label) => (
        <LabelOverlay
          key={label.id}
          text={label.text}
          color={label.color}
          runtime={'entityId' in label.anchor ? runtimeMapRef.current.get(label.anchor.entityId) : undefined}
          staticPosition={'position' in label.anchor ? label.anchor.position : undefined}
        />
      ))}
    </>
  );
};

// ----------------------------------------------------------------------------
// Komponen publik
// ----------------------------------------------------------------------------

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  spec,
  playing,
  selectedEntityId,
  onSelectEntity,
}) => {
  return (
    <Canvas
      camera={{
        position: v3(spec.camera.initialPosition),
        fov: spec.camera.fov ?? 50,
      }}
      gl={{ localClippingEnabled: true, antialias: true }}
      style={{ background: spec.scene.background }}
    >
      <Suspense fallback={null}>
        <SceneContent spec={spec} playing={playing} selectedEntityId={selectedEntityId} onSelectEntity={onSelectEntity} />
      </Suspense>
      <OrbitControls
        enableRotate={spec.interactions.rotate}
        enableZoom={spec.interactions.zoom}
        enablePan={spec.interactions.pan}
        target={v3(spec.camera.lookAt)}
        makeDefault
      />
    </Canvas>
  );
};

export default SimulationCanvas;
