/**
 * ============================================================================
 * CYLEN SIMULATION SCHEMA — validasi runtime untuk SimulationSpec
 * ============================================================================
 *
 * File ini adalah GERBANG KEAMANAN antara output AI (JSON bebas) dan
 * Simulation Runtime (yang mengasumsikan data sudah bersih & aman).
 *
 * `src/types/simulation.ts` adalah SATU-SATUNYA source of truth untuk bentuk
 * data. Schema di sini mengikuti tipe itu field-per-field — tidak ada
 * struktur baru yang didefinisikan ulang di sini.
 *
 * DUA LAPIS VALIDASI:
 * 1. Schema validation (Zod)   -> apakah BENTUK datanya benar (tipe, field
 *    wajib, angka tidak NaN/Infinity, dll). Ini yang menjaga renderer tidak
 *    crash karena struktur salah.
 * 2. Semantic validation       -> apakah ISI-nya MASUK AKAL (relationship
 *    menunjuk ke entity yang benar-benar ada, parameter value ada di
 *    antara min-max, behaviorRefs valid, dst). Ini menjaga simulasi tidak
 *    "salah nyambung" walau bentuknya valid.
 *
 * Schema ini SENGAJA tidak membatasi topik/domain apapun — geometry, field,
 * behavior kind semuanya mengikuti union generik dari simulation.ts, bukan
 * dipersempit jadi daftar tertutup baru di sini.
 * ============================================================================
 */

import { z } from 'zod';

// ----------------------------------------------------------------------------
// Guard angka: tolak NaN / Infinity / nilai ekstrem yang bisa merusak render
// ----------------------------------------------------------------------------

const MAX_SAFE_MAGNITUDE = 1_000_000;

const safeNumber = z
  .number()
  .finite({ message: 'Nilai numerik tidak boleh NaN atau Infinity' })
  .min(-MAX_SAFE_MAGNITUDE, `Nilai numerik melebihi batas aman (±${MAX_SAFE_MAGNITUDE})`)
  .max(MAX_SAFE_MAGNITUDE, `Nilai numerik melebihi batas aman (±${MAX_SAFE_MAGNITUDE})`);

const safePositive = safeNumber.positive({ message: 'Nilai harus positif' });

const safeNonNegative = safeNumber.nonnegative({ message: 'Nilai tidak boleh negatif' });

const idString = z
  .string()
  .min(1, 'id tidak boleh kosong')
  .max(128, 'id terlalu panjang')
  .regex(/^[a-zA-Z0-9_\-.]+$/, 'id hanya boleh huruf, angka, _, -, .');

// ----------------------------------------------------------------------------
// 1. Primitif matematika dasar
// ----------------------------------------------------------------------------

const Vector3Schema = z.object({
  x: safeNumber,
  y: safeNumber,
  z: safeNumber,
});

const Vector2Schema = z.object({
  x: safeNumber,
  y: safeNumber,
});

// Ekspresi matematis dibatasi karakternya di level schema (bukan dieksekusi
// di sini) supaya tidak ada payload aneh nyelip sebagai "expr". Eksekusi
// aman ekspresi ini adalah tanggung jawab evaluator terpisah nanti, yang
// HARUS pakai parser matematika (mis. mathjs evaluate scoped), BUKAN eval()/
// new Function(). Itu di luar cakupan file ini — cukup dicatat di sini.
const exprString = z
  .string()
  .min(1)
  .max(500)
  .regex(
    /^[a-zA-Z0-9_.,()+\-*/%^\s]*$/,
    'Ekspresi mengandung karakter yang tidak diizinkan'
  );

const DynamicValueSchema = z.union([safeNumber, z.object({ expr: exprString })]);

const BoundingBoxSchema = z.object({
  min: Vector3Schema,
  max: Vector3Schema,
});

// ----------------------------------------------------------------------------
// 2. Geometry — union generik, TIDAK dipersempit dari yang ada di simulation.ts
// ----------------------------------------------------------------------------

const PathDefSchema = z.object({
  controlPoints: z.array(Vector3Schema).min(2, 'Path butuh minimal 2 titik'),
  curveType: z.enum(['catmullRom', 'linear', 'bezier']).optional(),
});

const DistributionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('sphereSurface'), radius: safePositive }),
  z.object({ kind: z.literal('sphereVolume'), radius: safePositive }),
  z.object({ kind: z.literal('boxVolume'), size: Vector3Schema }),
  z.object({ kind: z.literal('alongPath'), path: PathDefSchema }),
  z.object({ kind: z.literal('random'), bounds: BoundingBoxSchema }),
]);

const GeometrySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('sphere'), radius: safePositive, segments: z.number().int().positive().max(256).optional() }),
  z.object({ kind: z.literal('box'), size: Vector3Schema }),
  z.object({
    kind: z.literal('cylinder'),
    radiusTop: safeNonNegative,
    radiusBottom: safeNonNegative,
    height: safePositive,
  }),
  z.object({ kind: z.literal('cone'), radius: safePositive, height: safePositive }),
  z.object({ kind: z.literal('torus'), radius: safePositive, tube: safePositive }),
  z.object({ kind: z.literal('plane'), size: Vector2Schema }),
  z.object({
    kind: z.literal('tube'),
    path: PathDefSchema,
    radius: safePositive,
    closed: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('helix'),
    radius: safePositive,
    pitch: safePositive,
    turns: safePositive.max(1000, 'Jumlah lilitan tidak wajar'),
    tubeRadius: safePositive,
  }),
  z.object({ kind: z.literal('line'), points: z.array(Vector3Schema).min(2) }),
  z.object({
    kind: z.literal('particleSystem'),
    count: z.number().int().positive().max(50_000, 'Jumlah partikel terlalu besar untuk render real-time'),
    particleRadius: safePositive,
    distribution: DistributionSchema,
  }),
  z.object({
    kind: z.literal('vectorArrow'),
    from: Vector3Schema,
    to: Vector3Schema,
    headSize: safePositive.optional(),
  }),
  z.object({ kind: z.literal('text3d'), text: z.string().min(1).max(200), size: safePositive }),
  z.object({ kind: z.literal('custom'), verticesRef: z.string().min(1) }),
]);

// ----------------------------------------------------------------------------
// 3. Transform & Material
// ----------------------------------------------------------------------------

const TransformSchema = z.object({
  position: z.union([Vector3Schema, z.array(DynamicValueSchema).length(3)]),
  rotation: Vector3Schema.optional(),
  scale: z.union([Vector3Schema, safeNumber]).optional(),
  parentId: idString.optional(),
});

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$|^rgba?\(.+\)$|^[a-z]+$/, 'Format warna tidak valid');

const MaterialSchema = z.object({
  color: hexColor,
  // Struktural: hanya 2 gaya holografik yang sah. AI TIDAK BISA mengirim
  // 'solid'/'glass'/'gradient' — spec seperti itu ditolak validator di sini
  // dan dikembalikan ke AI untuk diperbaiki lewat repairPrompt.
  style: z.enum(['wireframe', 'glow']),
  opacity: z.number().min(0).max(1).optional(),
  emissiveIntensity: z.number().min(0).max(10).optional(),
});

const InstancingConfigSchema = z.object({
  count: z.number().int().positive().max(50_000),
  perInstance: z
    .object({
      position: z.array(DynamicValueSchema).length(3).optional(),
      colorVariance: z.number().min(0).max(1).optional(),
    })
    .optional(),
});

// ----------------------------------------------------------------------------
// 4. Entity
// ----------------------------------------------------------------------------

const StateValueSchema = z.union([safeNumber, z.string().max(500), z.boolean(), Vector3Schema]);

const EntitySchema = z.object({
  id: idString,
  name: z.string().max(200).optional(),
  geometry: GeometrySchema,
  transform: TransformSchema,
  material: MaterialSchema,
  instancing: InstancingConfigSchema.optional(),
  initialState: z.record(z.string(), StateValueSchema).optional(),
  behaviorRefs: z.array(idString).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  selectable: z.boolean().optional(),
});

// ----------------------------------------------------------------------------
// 5. Relationship
// ----------------------------------------------------------------------------

const RelationshipSchema = z.object({
  id: idString,
  kind: z.enum(['connection', 'orbit', 'attachment', 'flow', 'dependency']),
  sourceId: idString,
  targetId: idString,
  properties: z.record(z.string(), DynamicValueSchema).optional(),
  visual: z
    .object({
      color: hexColor,
      width: safePositive,
      animatedFlow: z.boolean().optional(),
    })
    .optional(),
});

// ----------------------------------------------------------------------------
// 6. Field
// ----------------------------------------------------------------------------

const FieldSchema = z.object({
  id: idString,
  kind: z.enum(['gravity', 'pressure', 'temperature', 'electromagnetic', 'velocity', 'custom']),
  valueExpr: exprString,
  sourceEntityId: idString.optional(),
  affectsTags: z.array(z.string().max(50)).optional(),
  visualization: z.enum(['none', 'vectorField', 'heatmap', 'contourLines', 'particles']).optional(),
});

// ----------------------------------------------------------------------------
// 7. Equation
// ----------------------------------------------------------------------------

const EquationDefSchema = z.object({
  id: idString,
  formula: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  variableBindings: z.record(z.string(), z.string()).optional(),
});

// ----------------------------------------------------------------------------
// 8. Parameter
// ----------------------------------------------------------------------------

const ParameterSchema = z
  .object({
    id: idString,
    label: z.string().min(1).max(100),
    value: safeNumber,
    min: safeNumber,
    max: safeNumber,
    step: safePositive.optional(),
    unit: z.string().max(20).optional(),
  })
  .refine((p) => p.min <= p.max, { message: 'min harus <= max', path: ['min'] })
  .refine((p) => p.value >= p.min && p.value <= p.max, {
    message: 'value harus berada di antara min dan max',
    path: ['value'],
  });

// ----------------------------------------------------------------------------
// 9. Behavior
// ----------------------------------------------------------------------------

const BehaviorStateSchema = z.object({
  name: z.string().min(1).max(100),
  durationMs: z.number().int().positive().max(600_000).optional(),
  onEnter: z.record(z.string(), DynamicValueSchema).optional(),
  nextState: z.string().max(100).optional(),
});

const BehaviorSchema = z.object({
  id: idString,
  kind: z.enum([
    'rotate',
    'orbit',
    'pulse',
    'oscillate',
    'flowAlongPath',
    'followField',
    'stateMachine',
    'colorTransition',
    'custom',
  ]),
  targetIds: z.array(idString).min(1, 'Behavior harus punya minimal 1 target'),
  params: z.record(z.string(), DynamicValueSchema),
  states: z.array(BehaviorStateSchema).optional(),
});

// ----------------------------------------------------------------------------
// 10. Timeline
// ----------------------------------------------------------------------------

const TimelineKeyframeSchema = z.object({
  timeMs: safeNonNegative,
  label: z.string().max(100).optional(),
  changes: z.record(z.string(), DynamicValueSchema).optional(),
});

const TimelineDefSchema = z.object({
  totalDurationMs: z.number().positive().max(3_600_000).optional(),
  loop: z.boolean(),
  keyframes: z.array(TimelineKeyframeSchema).max(500),
});

// ----------------------------------------------------------------------------
// 11. Label
// ----------------------------------------------------------------------------

const LabelSchema = z.object({
  id: idString,
  text: z.string().min(1).max(200),
  anchor: z.union([z.object({ entityId: idString }), z.object({ position: Vector3Schema })]),
  offset: Vector2Schema.optional(),
  style: z.enum(['callout', 'inline', 'badge']).optional(),
  color: hexColor.optional(),
});

// ----------------------------------------------------------------------------
// 12. Layer
// ----------------------------------------------------------------------------

const LayerSchema = z.object({
  id: idString,
  name: z.string().min(1).max(100),
  entityIds: z.array(idString).min(1),
  visibleByDefault: z.boolean(),
  clipPlane: z.object({ normal: Vector3Schema, constant: safeNumber }).optional(),
  explodeOffset: Vector3Schema.optional(),
});

// ----------------------------------------------------------------------------
// 13. Interaction & Camera
// ----------------------------------------------------------------------------

const InteractionConfigSchema = z.object({
  rotate: z.boolean(),
  zoom: z.boolean(),
  pan: z.boolean(),
  selectObject: z.boolean(),
  playPause: z.boolean(),
  reset: z.boolean(),
  toggleableLayerIds: z.array(idString).optional(),
});

const CameraConfigSchema = z.object({
  mode: z.enum(['orbit', 'fixed', 'follow']),
  initialPosition: Vector3Schema,
  lookAt: Vector3Schema,
  fov: z.number().min(1).max(179).optional(),
});

// ----------------------------------------------------------------------------
// 14. Scene & Meta
// ----------------------------------------------------------------------------

const LightingConfigSchema = z.object({
  ambientIntensity: z.number().min(0).max(10),
  keyLightIntensity: z.number().min(0).max(10),
  glow: z.boolean().optional(),
});

const SceneConfigSchema = z.object({
  background: hexColor,
  unitScale: safePositive.optional(),
  lighting: LightingConfigSchema.optional(),
  bounds: BoundingBoxSchema.optional(),
});

const SimulationMetaSchema = z.object({
  title: z.string().min(1).max(150),
  summary: z.string().min(1).max(500),
  domain: z.string().max(100).optional(),
});

const ExplanationSchema = z.object({
  narration: z.string().min(1).max(2000),
  keyPoints: z.array(z.string().max(300)).max(20).optional(),
});

// ----------------------------------------------------------------------------
// 15. ROOT: SimulationSpec
// ----------------------------------------------------------------------------

const MAX_ENTITIES = 2000;

export const SimulationSpecSchema = z.object({
  schemaVersion: z.literal('1.0'),
  id: idString,
  meta: SimulationMetaSchema,
  mode: z.enum(['1d', '2d', '3d']),
  scene: SceneConfigSchema,
  entities: z.array(EntitySchema).min(1, 'Simulasi harus punya minimal 1 entity').max(MAX_ENTITIES),
  relationships: z.array(RelationshipSchema),
  fields: z.array(FieldSchema),
  equations: z.array(EquationDefSchema),
  parameters: z.array(ParameterSchema),
  state: z.record(z.string(), StateValueSchema),
  behaviors: z.array(BehaviorSchema),
  timeline: TimelineDefSchema.optional(),
  labels: z.array(LabelSchema),
  layers: z.array(LayerSchema),
  interactions: InteractionConfigSchema,
  camera: CameraConfigSchema,
  explanation: ExplanationSchema,
});

// Tipe hasil inferensi Zod — dipakai runtime, dijamin identik bentuknya
// dengan `SimulationSpec` di simulation.ts selama file itu diikuti benar.
export type ValidatedSimulationSpec = z.infer<typeof SimulationSpecSchema>;

// ----------------------------------------------------------------------------
// 16. SEMANTIC VALIDATION — cek relasi & referensi antar bagian
// ----------------------------------------------------------------------------

export interface SemanticIssue {
  path: string;
  message: string;
}

/**
 * Validasi lapis kedua: mengecek bahwa referensi ID antar bagian benar-benar
 * ada, bukan sekadar bentuk string yang valid. Ini TIDAK mengecek "apakah
 * simulasinya masuk akal secara ilmiah" — hanya konsistensi struktural.
 */
function validateSemantics(spec: ValidatedSimulationSpec): SemanticIssue[] {
  const issues: SemanticIssue[] = [];

  const entityIds = new Set(spec.entities.map((e) => e.id));
  const behaviorIds = new Set(spec.behaviors.map((b) => b.id));
  const parameterIds = new Set(spec.parameters.map((p) => p.id));
  const layerIds = new Set(spec.layers.map((l) => l.id));

  // Duplikat ID entity
  if (entityIds.size !== spec.entities.length) {
    issues.push({ path: 'entities', message: 'Ada id entity yang duplikat' });
  }

  // parentId di transform harus entity yang ada, dan tidak boleh merujuk diri sendiri
  spec.entities.forEach((entity, i) => {
    const parentId = entity.transform.parentId;
    if (parentId) {
      if (!entityIds.has(parentId)) {
        issues.push({
          path: `entities[${i}].transform.parentId`,
          message: `parentId "${parentId}" tidak ditemukan di entities`,
        });
      }
      if (parentId === entity.id) {
        issues.push({
          path: `entities[${i}].transform.parentId`,
          message: 'Entity tidak boleh menjadi parent dari dirinya sendiri',
        });
      }
    }

    entity.behaviorRefs?.forEach((refId) => {
      if (!behaviorIds.has(refId)) {
        issues.push({
          path: `entities[${i}].behaviorRefs`,
          message: `behaviorRefs merujuk id behavior "${refId}" yang tidak ada`,
        });
      }
    });
  });

  // Relationship harus menunjuk entity yang benar-benar ada
  spec.relationships.forEach((rel, i) => {
    if (!entityIds.has(rel.sourceId)) {
      issues.push({
        path: `relationships[${i}].sourceId`,
        message: `sourceId "${rel.sourceId}" tidak ditemukan di entities`,
      });
    }
    if (!entityIds.has(rel.targetId)) {
      issues.push({
        path: `relationships[${i}].targetId`,
        message: `targetId "${rel.targetId}" tidak ditemukan di entities`,
      });
    }
    if (rel.sourceId === rel.targetId) {
      issues.push({
        path: `relationships[${i}]`,
        message: 'sourceId dan targetId tidak boleh sama',
      });
    }
  });

  // Field.sourceEntityId harus ada
  spec.fields.forEach((field, i) => {
    if (field.sourceEntityId && !entityIds.has(field.sourceEntityId)) {
      issues.push({
        path: `fields[${i}].sourceEntityId`,
        message: `sourceEntityId "${field.sourceEntityId}" tidak ditemukan di entities`,
      });
    }
  });

  // Behavior.targetIds harus entity yang ada
  spec.behaviors.forEach((behavior, i) => {
    behavior.targetIds.forEach((targetId) => {
      if (!entityIds.has(targetId)) {
        issues.push({
          path: `behaviors[${i}].targetIds`,
          message: `targetIds merujuk entity "${targetId}" yang tidak ada`,
        });
      }
    });
    // stateMachine wajib punya states
    if (behavior.kind === 'stateMachine' && (!behavior.states || behavior.states.length === 0)) {
      issues.push({
        path: `behaviors[${i}].states`,
        message: 'Behavior kind "stateMachine" wajib mengisi field states',
      });
    }
    // nextState (kalau ada) harus merujuk state lain yang ada di array yang sama
    if (behavior.states) {
      const stateNames = new Set(behavior.states.map((s) => s.name));
      behavior.states.forEach((s, si) => {
        if (s.nextState && !stateNames.has(s.nextState)) {
          issues.push({
            path: `behaviors[${i}].states[${si}].nextState`,
            message: `nextState "${s.nextState}" tidak ditemukan di daftar states behavior ini`,
          });
        }
      });
    }
  });

  // Label anchor.entityId harus ada
  spec.labels.forEach((label, i) => {
    if ('entityId' in label.anchor && !entityIds.has(label.anchor.entityId)) {
      issues.push({
        path: `labels[${i}].anchor.entityId`,
        message: `anchor.entityId "${label.anchor.entityId}" tidak ditemukan di entities`,
      });
    }
  });

  // Layer.entityIds harus ada
  spec.layers.forEach((layer, i) => {
    layer.entityIds.forEach((entId) => {
      if (!entityIds.has(entId)) {
        issues.push({
          path: `layers[${i}].entityIds`,
          message: `entityIds merujuk entity "${entId}" yang tidak ada`,
        });
      }
    });
  });

  // interactions.toggleableLayerIds harus layer yang ada
  spec.interactions.toggleableLayerIds?.forEach((layerId) => {
    if (!layerIds.has(layerId)) {
      issues.push({
        path: 'interactions.toggleableLayerIds',
        message: `Layer id "${layerId}" tidak ditemukan di layers`,
      });
    }
  });

  // equations.variableBindings sebaiknya menunjuk parameters.<id> yang ada
  spec.equations.forEach((eq, i) => {
    if (eq.variableBindings) {
      Object.values(eq.variableBindings).forEach((bindingPath) => {
        const match = bindingPath.match(/^parameters\.(.+)$/);
        if (match && !parameterIds.has(match[1])) {
          issues.push({
            path: `equations[${i}].variableBindings`,
            message: `Binding "${bindingPath}" merujuk parameter yang tidak ada`,
          });
        }
      });
    }
  });

  // Jumlah entity terlalu besar untuk mode 1d/2d (batas lebih ketat dari 3d)
  if (spec.mode !== '3d' && spec.entities.length > 500) {
    issues.push({
      path: 'entities',
      message: `Mode "${spec.mode}" biasanya tidak butuh lebih dari 500 entity (dapat ${spec.entities.length})`,
    });
  }

  return issues;
}

// ----------------------------------------------------------------------------
// 17. HASIL TERSTRUKTUR — dipakai orchestrator buat memutuskan repair/retry
// ----------------------------------------------------------------------------

export interface ValidationSuccess {
  ok: true;
  spec: ValidatedSimulationSpec;
}

export interface ValidationFailure {
  ok: false;
  /** Ringkasan siap-pakai untuk dikirim balik ke AI sebagai instruksi perbaikan. */
  repairPrompt: string;
  /** Detail error mentah, buat logging/debugging di sisi developer. */
  schemaIssues: { path: string; message: string }[];
  semanticIssues: SemanticIssue[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

function formatIssuesForRepairPrompt(
  schemaIssues: { path: string; message: string }[],
  semanticIssues: SemanticIssue[]
): string {
  const lines: string[] = [
    'SimulationSpec yang kamu hasilkan tidak valid. Perbaiki HANYA bagian yang bermasalah berikut, jaga sisanya tetap sama:',
  ];

  schemaIssues.forEach((issue) => {
    lines.push(`- [struktur] ${issue.path}: ${issue.message}`);
  });
  semanticIssues.forEach((issue) => {
    lines.push(`- [referensi] ${issue.path}: ${issue.message}`);
  });

  lines.push(
    'Kirim ulang SimulationSpec lengkap dalam format JSON yang sama, sesuai schemaVersion "1.0".'
  );

  return lines.join('\n');
}

/**
 * Entry point utama: validasi JSON mentah dari AI terhadap schema + semantic
 * rules. TIDAK PERNAH throw — selalu mengembalikan ValidationResult supaya
 * orchestrator bisa memutuskan repair/retry/fallback tanpa try-catch di
 * banyak tempat.
 */
export function parseSimulationSpec(rawJson: unknown): ValidationResult {
  const schemaResult = SimulationSpecSchema.safeParse(rawJson);

  if (!schemaResult.success) {
    const schemaIssues = schemaResult.error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
    }));
    return {
      ok: false,
      repairPrompt: formatIssuesForRepairPrompt(schemaIssues, []),
      schemaIssues,
      semanticIssues: [],
    };
  }

  const semanticIssues = validateSemantics(schemaResult.data);

  if (semanticIssues.length > 0) {
    return {
      ok: false,
      repairPrompt: formatIssuesForRepairPrompt([], semanticIssues),
      schemaIssues: [],
      semanticIssues,
    };
  }

  return { ok: true, spec: schemaResult.data };
}

/** Alias yang lebih deskriptif untuk dipakai di orchestrator. */
export const validateSimulationSpec = parseSimulationSpec;

// ----------------------------------------------------------------------------
// 18. FALLBACK — spec minimal aman, generic, TANPA preset per-topik
// ----------------------------------------------------------------------------

/**
 * Dipakai kalau AI gagal menghasilkan spec valid setelah beberapa kali
 * repair/retry. Ini BUKAN "simulasi default" untuk topik tertentu — cuma
 * satu bola netral dengan narasi yang jujur bilang ada masalah, supaya UI
 * tidak blank/crash. Sengaja tidak ada variasi per-domain di sini.
 */
export function createFallbackSimulationSpec(reason?: string): ValidatedSimulationSpec {
  return {
    schemaVersion: '1.0',
    id: `fallback-${Date.now()}`,
    meta: {
      title: 'Simulasi tidak tersedia',
      summary: 'Terjadi kendala saat membuat simulasi untuk permintaan ini.',
    },
    mode: '3d',
    scene: {
      background: '#000000',
      lighting: { ambientIntensity: 0.4, keyLightIntensity: 1, glow: true },
    },
    entities: [
      {
        id: 'fallback-sphere',
        geometry: { kind: 'sphere', radius: 1, segments: 32 },
        transform: { position: { x: 0, y: 0, z: 0 } },
        material: { color: '#ffffff', style: 'glow', opacity: 0.9 },
        behaviorRefs: ['fallback-rotate'],
      },
    ],
    relationships: [],
    fields: [],
    equations: [],
    parameters: [],
    state: {},
    behaviors: [
      {
        id: 'fallback-rotate',
        kind: 'rotate',
        targetIds: ['fallback-sphere'],
        params: { speed: 0.2 },
      },
    ],
    labels: [],
    layers: [],
    interactions: {
      rotate: true,
      zoom: true,
      pan: true,
      selectObject: false,
      playPause: true,
      reset: true,
    },
    camera: {
      mode: 'orbit',
      initialPosition: { x: 0, y: 0, z: 4 },
      lookAt: { x: 0, y: 0, z: 0 },
      fov: 50,
    },
    explanation: {
      narration: reason
        ? `Maaf, saya belum bisa membuat simulasi itu dengan benar. ${reason}`
        : 'Maaf, saya belum bisa membuat simulasi itu dengan benar. Coba jelaskan dengan cara lain.',
    },
  };
}
