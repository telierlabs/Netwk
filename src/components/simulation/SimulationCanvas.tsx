/**
 * ============================================================================
 * CYLEN SIMULATION CANVAS — generic Three.js runtime (v2)
 * ============================================================================
 * Perubahan dari v1:
 * 1. FIX Rules-of-Hooks: dulu EntityNode manggil useMemo di dalam `if`
 *    (kondisional per geometry.kind). Kalau AI mengganti geometry.kind
 *    entity dengan id yang sama di antara render (mis. permintaan lanjutan
 *    "ubah jadi partikel"), React bisa crash "Rendered more hooks than
 *    during the previous render". Sekarang tiap geometry.kind dirender oleh
 *    KOMPONEN TERPISAH (ParticleEntity, LineEntity, ArrowEntity, TextEntity,
 *    MeshEntity) — masing-masing komponen konsisten jumlah hook-nya sendiri,
 *    jadi React yang urus unmount/remount kalau tipe berubah, bukan hook
 *    yang berubah jumlah di komponen yang sama.
 * 2. Partikel MORPH KONTINU: dulu distributionToPositions menghasilkan array
 *    posisi FINAL langsung (tanpa animasi antar-spec, cuma assembly pass di
 *    awal). Sekarang posisi "current" disimpan di ref dan di-lerp tiap frame
 *    menuju posisi "target" yang baru — jadi kalau user minta ganti/tambah
 *    simulasi, partikel yang sudah ada BERGERAK menyusun ulang, bukan
 *    reset/lompat instan.
 * ============================================================================
 */

import React, { useMemo, useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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

function hashStringToUnit(str: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return (h % 10000) / 10000;
}

function scatterOffsetFor(entityId: string, radius: number): THREE.Vector3 {
  const u = hashStringToUnit(entityId, 17);
  const v = hashStringToUnit(entityId, 91);
  const theta = u * Math.PI * 2;
  const phi = Math.acos(v * 2 - 1);
  const mag = radius * (0.7 + hashStringToUnit(entityId, 53) * 0.6);
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta) * mag,
    Math.sin(phi) * Math.sin(theta) * mag,
    Math.cos(phi) * mag
  );
}

function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

const ASSEMBLY_DURATION_SECONDS = 1.6;
const ASSEMBLY_SCATTER_RADIUS = 2.4;
const PARTICLE_MORPH_LERP = 0.06; // kecepatan partikel "menyusun ulang" ke target baru

// ----------------------------------------------------------------------------
// Helpers kecil
// ----------------------------------------------------------------------------

function v3(v: SpecVector3): [number, number, number] { return [v.x, v.y, v.z]; }
function toThreeVector3(v: SpecVector3): THREE.Vector3 { return new THREE.Vector3(v.x, v.y, v.z); }

function resolvePosition(position: SpecVector3 | DynamicValue[], scope: ExpressionScope): THREE.Vector3 {
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
        const u = Math.random(), v = Math.random();
        const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
        x = dist.radius * Math.sin(phi) * Math.cos(theta);
        y = dist.radius * Math.sin(phi) * Math.sin(theta);
        z = dist.radius * Math.cos(phi);
        break;
      }
      case 'sphereVolume': {
        const r = dist.radius * Math.cbrt(Math.random());
        const u = Math.random(), v = Math.random();
        const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
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
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
  }
  return positions;
}

/** Kunci deteksi "apakah target distribusi ini berubah" antar render. */
function distributionKey(geometry: Extract<Geometry, { kind: 'particleSystem' }>): string {
  return `${geometry.count}:${JSON.stringify(geometry.distribution)}`;
}

const EntityMaterial: React.FC<{ material: Entity['material']; clippingPlanes?: THREE.Plane[] }> = ({ material, clippingPlanes }) => {
  if (material.style === 'wireframe') {
    return <meshBasicMaterial color={material.color} wireframe transparent opacity={material.opacity ?? 0.8} clippingPlanes={clippingPlanes} />;
  }
  const clampedOpacity = Math.min(material.opacity ?? 0.4, 0.6);
  return (
    <meshStandardMaterial
      color={material.color} transparent opacity={clampedOpacity} depthWrite={false}
      emissive={material.color} emissiveIntensity={material.emissiveIntensity ?? 1.2}
      clippingPlanes={clippingPlanes}
    />
  );
};

const EntityGeometry: React.FC<{ geometry: Geometry }> = ({ geometry }) => {
  switch (geometry.kind) {
    case 'sphere': return <sphereGeometry args={[geometry.radius, geometry.segments ?? 32, geometry.segments ?? 32]} />;
    case 'box': return <boxGeometry args={[geometry.size.x, geometry.size.y, geometry.size.z]} />;
    case 'cylinder': return <cylinderGeometry args={[geometry.radiusTop, geometry.radiusBottom, geometry.height, 32]} />;
    case 'cone': return <coneGeometry args={[geometry.radius, geometry.height, 32]} />;
    case 'torus': return <torusGeometry args={[geometry.radius, geometry.tube, 16, 100]} />;
    case 'plane': return <planeGeometry args={[geometry.size.x, geometry.size.y]} />;
    case 'tube': {
      const curve = new THREE.CatmullRomCurve3(geometry.path.controlPoints.map(toThreeVector3), geometry.closed ?? false);
      return <tubeGeometry args={[curve, 128, geometry.radius, 8, geometry.closed ?? false]} />;
    }
    case 'helix': {
      const points = buildHelixPoints(geometry.radius, geometry.pitch, geometry.turns);
      const curve = new THREE.CatmullRomCurve3(points);
      return <tubeGeometry args={[curve, Math.max(64, points.length), geometry.tubeRadius, 8, false]} />;
    }
    default: return null;
  }
};

// ----------------------------------------------------------------------------
// Runtime registry — dipakai behavior engine tiap frame
// ----------------------------------------------------------------------------

interface EntityRuntime {
  groupRef: React.RefObject<THREE.Group>;
  basePosition: THREE.Vector3;
  baseScale: THREE.Vector3;
  baseRotation: THREE.Vector3;
}

type CommonEntityProps = {
  entity: Entity;
  registerRuntime: (id: string, runtime: EntityRuntime) => void;
  selected: boolean;
  selectable: boolean;
  onSelect?: (id: string) => void;
  clippingPlanes?: THREE.Plane[];
};

/** Hook bersama: posisi/skala/rotasi dasar + registrasi ke runtime map.
 * Dipakai identik di semua sub-komponen entity di bawah — konsisten. */
function useEntityBase(entity: Entity, registerRuntime: CommonEntityProps['registerRuntime']) {
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
  return { groupRef, basePosition, baseScale, baseRotation };
}

// ── ParticleEntity — geometry.kind === 'particleSystem' ──────────────────
const ParticleEntity: React.FC<CommonEntityProps> = ({ entity, registerRuntime }) => {
  const geometry = entity.geometry as Extract<Geometry, { kind: 'particleSystem' }>;
  const { groupRef, basePosition, baseScale } = useEntityBase(entity, registerRuntime);

  const targetRef = useRef<Float32Array>(distributionToPositions(geometry.distribution, geometry.count));
  const currentRef = useRef<Float32Array>(new Float32Array(targetRef.current)); // mulai = target, assembly pass yang urus efek "muncul"
  const bufferAttrRef = useRef<THREE.BufferAttribute>(null!);
  const keyRef = useRef(distributionKey(geometry));

  // Spec baru dengan geometry SAMA id tapi distribusi berubah -> jangan
  // reset currentRef (biar animasi morph mulus), cukup ganti targetRef.
  useEffect(() => {
    const key = distributionKey(geometry);
    if (key !== keyRef.current) {
      keyRef.current = key;
      const newTarget = distributionToPositions(geometry.distribution, geometry.count);
      if (currentRef.current.length !== newTarget.length) {
        // Jumlah partikel berubah: buat buffer current baru, isi bagian yang
        // overlap dari posisi lama supaya tidak "pop" total, sisanya scatter.
        const resized = new Float32Array(newTarget.length);
        const overlap = Math.min(resized.length, currentRef.current.length);
        resized.set(currentRef.current.subarray(0, overlap));
        currentRef.current = resized;
      }
      targetRef.current = newTarget;
    }
  }, [geometry]);

  useFrame(() => {
    const cur = currentRef.current;
    const tgt = targetRef.current;
    let changed = false;
    const n = Math.min(cur.length, tgt.length);
    for (let i = 0; i < n; i++) {
      const d = tgt[i] - cur[i];
      if (Math.abs(d) > 0.0005) { cur[i] += d * PARTICLE_MORPH_LERP; changed = true; }
    }
    if (changed && bufferAttrRef.current) bufferAttrRef.current.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={basePosition} scale={baseScale}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            ref={bufferAttrRef}
            attach="attributes-position"
            count={geometry.count}
            array={currentRef.current}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={entity.material.color}
          size={geometry.particleRadius}
          transparent
          opacity={entity.material.opacity ?? 0.85}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
};

// ── LineEntity — geometry.kind === 'line' ─────────────────────────────────
const LineEntity: React.FC<CommonEntityProps> = ({ entity, registerRuntime }) => {
  const geometry = entity.geometry as Extract<Geometry, { kind: 'line' }>;
  const { groupRef, basePosition, baseScale } = useEntityBase(entity, registerRuntime);
  return (
    <group ref={groupRef} position={basePosition} scale={baseScale}>
      <Line points={geometry.points.map(v3)} color={entity.material.color} lineWidth={2} transparent opacity={entity.material.opacity ?? 1} />
    </group>
  );
};

// ── ArrowEntity — geometry.kind === 'vectorArrow' ─────────────────────────
const ArrowEntity: React.FC<CommonEntityProps> = ({ entity, registerRuntime }) => {
  const geometry = entity.geometry as Extract<Geometry, { kind: 'vectorArrow' }>;
  const { groupRef, basePosition, baseScale } = useEntityBase(entity, registerRuntime);
  const arrow = useMemo(() => {
    const from = toThreeVector3(geometry.from);
    const to = toThreeVector3(geometry.to);
    const dir = to.clone().sub(from);
    const length = dir.length();
    const headLength = geometry.headSize ?? Math.max(0.1, length * 0.15);
    return new THREE.ArrowHelper(dir.clone().normalize(), from, length, entity.material.color, headLength, headLength * 0.6);
  }, [geometry, entity.material.color]);
  return (
    <group ref={groupRef} position={basePosition} scale={baseScale}>
      <primitive object={arrow} />
    </group>
  );
};

// ── TextEntity — geometry.kind === 'text3d' ───────────────────────────────
const TextEntity: React.FC<CommonEntityProps> = ({ entity, registerRuntime }) => {
  const geometry = entity.geometry as Extract<Geometry, { kind: 'text3d' }>;
  const { groupRef, basePosition, baseScale } = useEntityBase(entity, registerRuntime);
  return (
    <group ref={groupRef} position={basePosition} scale={baseScale}>
      <Text fontSize={geometry.size} color={entity.material.color} anchorX="center" anchorY="middle">
        {geometry.text}
      </Text>
    </group>
  );
};

// ── MeshEntity — semua primitif solid-outline generik (sphere/box/cylinder/
// cone/torus/plane/tube/helix), SELALU lewat EntityMaterial (wireframe/glow
// saja — tidak ada jalur mesh opaque/solid apapun) ────────────────────────
const MeshEntity: React.FC<CommonEntityProps> = ({ entity, registerRuntime, selected, selectable, onSelect, clippingPlanes }) => {
  const { groupRef, basePosition, baseScale, baseRotation } = useEntityBase(entity, registerRuntime);
  return (
    <group
      ref={groupRef}
      position={basePosition}
      scale={baseScale}
      rotation={[baseRotation.x, baseRotation.y, baseRotation.z]}
      onClick={(e) => { if (!selectable) return; e.stopPropagation(); onSelect?.(entity.id); }}
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

/** Dispatcher: pilih sub-komponen berdasarkan geometry.kind. Karena tiap
 * cabang adalah KOMPONEN BERBEDA (bukan hook kondisional di komponen yang
 * sama), React menangani perubahan tipe lewat unmount/remount normal —
 * tidak pernah melanggar Rules of Hooks walau AI mengganti geometry.kind
 * entity yang sama antar permintaan lanjutan. */
const EntityNode: React.FC<CommonEntityProps> = (props) => {
  switch (props.entity.geometry.kind) {
    case 'particleSystem': return <ParticleEntity {...props} />;
    case 'line': return <LineEntity {...props} />;
    case 'vectorArrow': return <ArrowEntity {...props} />;
    case 'text3d': return <TextEntity {...props} />;
    case 'custom': return null; // verticesRef belum diimplementasi di MVP
    default: return <MeshEntity {...props} />;
  }
};

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
          const orbitRel = spec.relationships.find((r) => r.kind === 'orbit' && r.targetId === targetId);
          let center = new THREE.Vector3(0, 0, 0);
          if (orbitRel) {
            const centerRuntime = runtimeMap.get(orbitRel.sourceId);
            if (centerRuntime?.groupRef.current) center = centerRuntime.groupRef.current.position.clone();
          }
          const angle = elapsedTime * speed;
          group.position.set(center.x + Math.cos(angle) * radius, center.y, center.z + Math.sin(angle) * radius);
          break;
        }
        case 'pulse': {
          const speed = p('speed', 1);
          const amplitude = p('amplitude', 0.15);
          const factor = 1 + Math.sin(elapsedTime * speed) * amplitude;
          group.scale.set(runtime.baseScale.x * factor, runtime.baseScale.y * factor, runtime.baseScale.z * factor);
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
          break; // no-op aman untuk MVP
      }
    });
  });
}

// ----------------------------------------------------------------------------
// Relationship visual & label overlay (tidak berubah dari v1)
// ----------------------------------------------------------------------------

const RelationshipLine: React.FC<{ fromRuntime?: EntityRuntime; toRuntime?: EntityRuntime; color: string; width: number }> = ({ fromRuntime, toRuntime, color, width }) => {
  const [points, setPoints] = React.useState<[number, number, number][]>([[0, 0, 0], [0, 0, 0]]);
  useFrame(() => {
    const from = fromRuntime?.groupRef.current?.position;
    const to = toRuntime?.groupRef.current?.position;
    if (from && to) setPoints([[from.x, from.y, from.z], [to.x, to.y, to.z]]);
  });
  return <Line points={points} color={color} lineWidth={width} />;
};

const LabelOverlay: React.FC<{ text: string; runtime?: EntityRuntime; staticPosition?: SpecVector3; color?: string }> = ({ text, runtime, staticPosition, color }) => {
  const [position, setPosition] = React.useState<[number, number, number]>(staticPosition ? v3(staticPosition) : [0, 0, 0]);
  useFrame(() => {
    if (staticPosition) return;
    const p = runtime?.groupRef.current?.position;
    if (p) setPosition([p.x, p.y, p.z]);
  });
  return (
    <Html position={position} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
      <div style={{
        color: color ?? '#ffffff', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
        textShadow: '0 0 6px rgba(0,0,0,0.9)', background: 'rgba(0,0,0,0.35)', padding: '2px 6px',
        borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)',
      }}>
        {text}
      </div>
    </Html>
  );
};

// ----------------------------------------------------------------------------
// Scene inner
// ----------------------------------------------------------------------------

const SceneContent: React.FC<SimulationCanvasProps> = ({ spec, playing, selectedEntityId, onSelectEntity }) => {
  const runtimeMapRef = useRef<Map<string, EntityRuntime>>(new Map());
  const elapsedTimeRef = useRef(0);
  const assemblyStartRef = useRef(0);
  const prevSpecIdRef = useRef(spec.id);

  const registerRuntime = (id: string, runtime: EntityRuntime) => { runtimeMapRef.current.set(id, runtime); };

  const parameterScope: ExpressionScope = useMemo(() => {
    const scope: ExpressionScope = {};
    spec.parameters.forEach((p) => { scope[p.id] = p.value; });
    return scope;
  }, [spec.parameters]);

  const positionDrivenIds = useMemo(() => {
    const set = new Set<string>();
    spec.behaviors.forEach((b) => {
      if (b.kind === 'orbit' || b.kind === 'oscillate' || b.kind === 'flowAlongPath') b.targetIds.forEach((id) => set.add(id));
    });
    return set;
  }, [spec.behaviors]);

  useEffect(() => {
    if (prevSpecIdRef.current !== spec.id) {
      assemblyStartRef.current = elapsedTimeRef.current;
      prevSpecIdRef.current = spec.id;
    }
  }, [spec.id]);

  useFrame((_, delta) => {
    if (playing) elapsedTimeRef.current += delta;
    applyBehaviors(spec, runtimeMapRef.current, elapsedTimeRef.current, parameterScope);

    const assemblyElapsed = elapsedTimeRef.current - assemblyStartRef.current;
    const progress = easeOutCubic(assemblyElapsed / ASSEMBLY_DURATION_SECONDS);

    spec.entities.forEach((entity) => {
      const runtime = runtimeMapRef.current.get(entity.id);
      const group = runtime?.groupRef.current;
      if (!runtime || !group) return;

      if (!positionDrivenIds.has(entity.id)) group.position.copy(runtime.basePosition);

      if (progress < 1) {
        const offset = scatterOffsetFor(entity.id, ASSEMBLY_SCATTER_RADIUS);
        const remaining = 1 - progress;
        group.position.x += offset.x * remaining;
        group.position.y += offset.y * remaining;
        group.position.z += offset.z * remaining;
      }
    });
  });

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
    spec.layers.forEach((layer) => { if (!layer.visibleByDefault) layer.entityIds.forEach((id) => hiddenIds.add(id)); });
    return spec.entities.filter((e) => !hiddenIds.has(e.id)).map((e) => e.id);
  }, [spec.entities, spec.layers]);

  return (
    <>
      {spec.scene.lighting?.glow !== false && <ambientLight intensity={spec.scene.lighting?.ambientIntensity ?? 0.4} />}
      <directionalLight position={[4, 6, 4]} intensity={spec.scene.lighting?.keyLightIntensity ?? 1} />
      <pointLight position={[-4, -2, -4]} intensity={0.3} />

      {spec.entities.filter((e) => visibleEntityIds.includes(e.id)).map((entity) => (
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

      {spec.relationships.filter((r) => r.kind === 'connection' || r.kind === 'flow').map((rel) => (
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
// Auto-framing kamera (tidak berubah dari v1)
// ----------------------------------------------------------------------------

function estimateGeometryRadius(geometry: Geometry): number {
  switch (geometry.kind) {
    case 'sphere': return geometry.radius;
    case 'box': return Math.max(geometry.size.x, geometry.size.y, geometry.size.z) / 2;
    case 'cylinder': return Math.max(geometry.radiusTop, geometry.radiusBottom, geometry.height / 2);
    case 'cone': return Math.max(geometry.radius, geometry.height / 2);
    case 'torus': return geometry.radius + geometry.tube;
    case 'plane': return Math.max(geometry.size.x, geometry.size.y) / 2;
    case 'tube': {
      const pts = geometry.path.controlPoints;
      if (pts.length === 0) return geometry.radius;
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
      const spread = Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.y - cy, p.z - cz)));
      return spread + geometry.radius;
    }
    case 'helix': return Math.max(geometry.radius, (geometry.pitch * geometry.turns) / 2) + geometry.tubeRadius;
    case 'line': {
      const pts = geometry.points;
      if (pts.length === 0) return 0.5;
      const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
      const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
      return Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.y - cy, p.z - cz)));
    }
    case 'particleSystem': {
      const dist = geometry.distribution;
      if (dist.kind === 'sphereSurface' || dist.kind === 'sphereVolume') return dist.radius;
      if (dist.kind === 'boxVolume') return Math.max(dist.size.x, dist.size.y, dist.size.z) / 2;
      if (dist.kind === 'random') {
        return Math.max(dist.bounds.max.x - dist.bounds.min.x, dist.bounds.max.y - dist.bounds.min.y, dist.bounds.max.z - dist.bounds.min.z) / 2;
      }
      return 1;
    }
    case 'vectorArrow': return toThreeVector3(geometry.from).distanceTo(toThreeVector3(geometry.to)) / 2;
    case 'text3d': return geometry.size;
    default: return 0.5;
  }
}

function scaleMagnitude(scale: SpecVector3 | number | undefined): number {
  if (scale === undefined) return 1;
  if (typeof scale === 'number') return scale;
  return Math.max(scale.x, scale.y, scale.z);
}

interface AutoCameraResult { position: [number, number, number]; target: [number, number, number]; }

/**
 * FIX: sekarang menerima `aspect` (width/height layar). Sebelumnya cuma
 * menghitung jarak kamera dari FOV VERTIKAL saja — di layar portrait (HP,
 * lebih sempit dari tinggi) FOV horizontal lebih sempit dari vertikal,
 * jadi objek yang "pas" secara vertikal malah kepotong di kiri-kanan
 * ("keluar dari samping"). Sekarang dihitung jarak yang dibutuhkan untuk
 * MUAT di kedua sumbu (vertikal & horizontal), dipakai yang paling jauh.
 */
function computeAutoFramedCamera(spec: ValidatedSimulationSpec, aspect: number): AutoCameraResult {
  const baseScope: ExpressionScope = { t: 0 };
  spec.parameters.forEach((p) => { baseScope[p.id] = p.value; });

  const entityBounds = spec.entities
    .filter((e) => e.geometry.kind !== 'custom')
    .map((entity) => {
      const center = resolvePosition(entity.transform.position, baseScope);
      const radius = estimateGeometryRadius(entity.geometry) * scaleMagnitude(entity.transform.scale);
      return { center, radius: Math.max(radius, 0.05) };
    });

  if (entityBounds.length === 0) return { position: [0, 0, 5], target: [0, 0, 0] };

  const centroid = new THREE.Vector3();
  entityBounds.forEach((e) => centroid.add(e.center));
  centroid.divideScalar(entityBounds.length);

  let sceneRadius = 0.5;
  entityBounds.forEach((e) => {
    const dist = e.center.distanceTo(centroid) + e.radius;
    if (dist > sceneRadius) sceneRadius = dist;
  });

  const fovDeg = spec.camera.fov ?? 50;
  const vFovRad = (fovDeg * Math.PI) / 180;
  // FOV horizontal dari FOV vertikal + aspect ratio (rumus standar kamera
  // perspektif Three.js: fov prop selalu FOV VERTIKAL).
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * Math.max(aspect, 0.0001));

  const margin = 1.5;
  const distanceForVertical = (sceneRadius / Math.sin(vFovRad / 2)) * margin;
  const distanceForHorizontal = (sceneRadius / Math.sin(hFovRad / 2)) * margin;
  let distance = Math.max(distanceForVertical, distanceForHorizontal);
  distance = THREE.MathUtils.clamp(distance, 1.5, 200);

  const aiPosition = toThreeVector3(spec.camera.initialPosition);
  const aiLookAt = toThreeVector3(spec.camera.lookAt);
  let direction = aiPosition.clone().sub(aiLookAt);
  if (direction.lengthSq() < 1e-6) direction = new THREE.Vector3(0, 0.3, 1);
  direction.normalize();

  const finalPosition = centroid.clone().add(direction.multiplyScalar(distance));
  return { position: [finalPosition.x, finalPosition.y, finalPosition.z], target: [centroid.x, centroid.y, centroid.z] };
}

/**
 * CameraRig — dijalankan DI DALAM <Canvas>, akses langsung ke camera & size
 * asli lewat useThree (bukan dihitung sekali di luar Canvas seperti v1/v2).
 * Efeknya jalan ulang tiap kali `spec` berganti ATAU ukuran layar berubah
 * (resize/rotasi HP) — jadi framing selalu akurat, termasuk pas pindah dari
 * IDLE_SPEC ke simulasi baru, TANPA remount seluruh Canvas (partikel yang
 * sedang morph tidak ke-reset).
 */
const CameraRig: React.FC<{ spec: ValidatedSimulationSpec; controlsRef: React.RefObject<any> }> = ({ spec, controlsRef }) => {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const { position, target } = computeAutoFramedCamera(spec, aspect);
    camera.position.set(position[0], position[1], position[2]);
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      (camera as THREE.PerspectiveCamera).fov = spec.camera.fov ?? 50;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
    if (controlsRef.current) {
      controlsRef.current.target.set(target[0], target[1], target[2]);
      controlsRef.current.update();
    } else {
      camera.lookAt(target[0], target[1], target[2]);
    }
  }, [spec, size.width, size.height, camera, controlsRef]);
  return null;
};

// ----------------------------------------------------------------------------
// Komponen publik
// ----------------------------------------------------------------------------

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ spec, playing, selectedEntityId, onSelectEntity }) => {
  const controlsRef = useRef<any>(null);

  return (
    <Canvas
      gl={{ localClippingEnabled: true, antialias: true, alpha: false }}
      // FIX background "kebiru-biruan": clear color WebGL diset EKSPLISIT
      // ke warna solid dari spec, bukan dibiarkan transparan lalu numpuk
      // dengan CSS di belakangnya (celah blending itu yang bisa bikin hitam
      // kelihatan sedikit ngambang/kebiruan pada sebagian layar HP).
      onCreated={({ gl, scene }) => {
        const bg = new THREE.Color(spec.scene.background || '#000000');
        gl.setClearColor(bg, 1);
        scene.background = bg;
      }}
      style={{ background: spec.scene.background }}
    >
      <Suspense fallback={null}>
        <CameraRig spec={spec} controlsRef={controlsRef} />
        <SceneContent spec={spec} playing={playing} selectedEntityId={selectedEntityId} onSelectEntity={onSelectEntity} />
      </Suspense>
      <OrbitControls
        ref={controlsRef}
        enableRotate={spec.interactions.rotate}
        enableZoom={spec.interactions.zoom}
        enablePan={spec.interactions.pan}
        makeDefault
      />
    </Canvas>
  );
};

export default SimulationCanvas;
