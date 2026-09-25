/**
 * ============================================================================
 * CYLEN UNIVERSAL SIMULATION DSL
 * ============================================================================
 *
 * Ini adalah "kontrak" antara AI (yang generate simulasi dari natural language)
 * dan Runtime (yang membaca spec ini dan merender visual + interaksi).
 *
 * PRINSIP DESAIN:
 * - GENERIC: tidak ada daftar tertutup seperti simulationType = 'dna' | 'heart'.
 *   AI menyusun simulasi apapun dari primitive yang tersedia di sini.
 * - COMPOSABLE: entity, behavior, field, relationship bisa digabung bebas.
 * - MODE-AGNOSTIC: mendukung 1D (garis waktu/grafik fungsi), 2D (chart/graph/
 *   diagram jaringan), dan 3D (scene spasial) di bawah satu struktur yang sama.
 * - VALIDATED AT THE EDGE: file ini hanya definisi TIPE. Validasi runtime
 *   (Zod schema) ada di file terpisah (src/lib/simulationSchema.ts) supaya
 *   AI-generated JSON tidak pernah masuk ke renderer tanpa dicek dulu.
 *
 * JANGAN tambahkan union type tertutup untuk "jenis simulasi". Kalau butuh
 * konsep baru, tambahkan ke primitive generic (geometry baru, behavior baru,
 * field baru) — bukan tambah cabang khusus per topik.
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 0. MODE & META
// ----------------------------------------------------------------------------

/** Dimensi utama rendering. Menentukan renderer mana yang dipakai runtime. */
export type SimulationMode = '1d' | '2d' | '3d';

/** Root object yang dikirim AI dan dibaca runtime. */
export interface SimulationSpec {
  /** Versi skema, buat jaga kompatibilitas kalau DSL berkembang nanti. */
  schemaVersion: '1.0';

  /** ID unik untuk sesi simulasi ini (dipakai buat update/patch berikutnya). */
  id: string;

  /** Judul singkat & deskripsi untuk ditampilkan/dibacakan ke user. */
  meta: SimulationMeta;

  mode: SimulationMode;

  scene: SceneConfig;

  /** Semua "benda" dalam simulasi — objek fisik, node abstrak, titik data, dll. */
  entities: Entity[];

  /** Hubungan antar entity (pipa->tangki, server->router, planet->matahari). */
  relationships: Relationship[];

  /** Medan/gaya yang mempengaruhi entity tapi bukan entity itu sendiri. */
  fields: Field[];

  /** Persamaan yang mendasari perilaku (opsional, buat referensi/label). */
  equations: EquationDef[];

  /** Parameter yang bisa diubah user lewat slider/kontrol. */
  parameters: Parameter[];

  /** Nilai state saat ini (hasil evaluasi behavior + parameter). */
  state: Record<string, StateValue>;

  /** Aturan generik yang menjalankan/mengubah state tiap frame atau tiap step. */
  behaviors: Behavior[];

  /** Timeline/urutan tahapan, kalau simulasi punya fase (mis. siklus mesin). */
  timeline?: TimelineDef;

  /** Label & anotasi teks dengan garis penunjuk ke entity/titik tertentu. */
  labels: Label[];

  /** Lapisan tampilan (buat cutaway, cross-section, exploded view, toggle). */
  layers: Layer[];

  /** Kontrol interaksi yang tersedia buat user di simulasi ini. */
  interactions: InteractionConfig;

  camera: CameraConfig;

  /** Penjelasan naratif yang dibacakan AI/TTS, terpisah dari data visual. */
  explanation: Explanation;
}

export interface SimulationMeta {
  title: string;
  /** Ringkasan konsep, 1-2 kalimat, buat ditampilkan di UI. */
  summary: string;
  /** Domain bebas (mis. "biologi", "teknik mesin") — hanya label, bukan enum. */
  domain?: string;
}

export interface SceneConfig {
  /** Warna/nuansa latar, tetap dark theme sesuai branding Cylen. */
  background: string;
  /** Skala satuan dunia -> unit render (mis. 1 unit = 1 nanometer). */
  unitScale?: number;
  lighting?: LightingConfig;
  /** Batas area render, dipakai mode 1D/2D buat menentukan viewport grafik. */
  bounds?: BoundingBox;
}

export interface LightingConfig {
  ambientIntensity: number;
  keyLightIntensity: number;
  glow?: boolean;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

// ----------------------------------------------------------------------------
// 1. PRIMITIF MATEMATIKA DASAR
// ----------------------------------------------------------------------------

export interface Vector3 { x: number; y: number; z: number; }
export interface Vector2 { x: number; y: number; }

/** Nilai bisa konstan, atau ekspresi yang bergantung pada parameter/state/waktu. */
export type DynamicValue =
  | number
  | { expr: string }; // ekspresi matematis, mis. "sin(t * speed) * amplitude"

// ----------------------------------------------------------------------------
// 2. ENTITY — "benda" generik dalam simulasi
// ----------------------------------------------------------------------------

/**
 * Entity adalah unit dasar apapun yang muncul di simulasi: bola atom, node
 * server, titik data grafik, segmen pipa, planet, partikel individual, dll.
 * Tidak ada field "type: dna_strand" — bentuknya ditentukan oleh `geometry`.
 */
export interface Entity {
  id: string;
  /** Nama tampilan (buat label otomatis / debug), bukan penentu render. */
  name?: string;

  geometry: Geometry;
  transform: Transform;
  material: Material;

  /** Kalau entity ini representasi kumpulan (partikel/instance banyak). */
  instancing?: InstancingConfig;

  /** State awal entity ini (posisi custom, nilai numerik terkait, dst). */
  initialState?: Record<string, StateValue>;

  /** ID behavior (dari `behaviors[]`) yang dipasang ke entity ini. */
  behaviorRefs?: string[];

  /** Grup/tag bebas buat query relationship, layer, atau interaksi. */
  tags?: string[];

  /** Bisa dipilih/di-klik user (dipakai untuk "select object"). */
  selectable?: boolean;
}

/**
 * Daftar geometry ini adalah PRIMITIVE GENERIK, bukan daftar objek dunia
 * nyata. AI menyusun bentuk kompleks (DNA, jantung, mesin) dari kombinasi
 * primitive ini + parameter, bukan memilih dari preset "dna_shape".
 */
export type Geometry =
  | { kind: 'sphere'; radius: number; segments?: number }
  | { kind: 'box'; size: Vector3 }
  | { kind: 'cylinder'; radiusTop: number; radiusBottom: number; height: number }
  | { kind: 'cone'; radius: number; height: number }
  | { kind: 'torus'; radius: number; tube: number }
  | { kind: 'plane'; size: Vector2 }
  | { kind: 'tube'; path: PathDef; radius: number; closed?: boolean }
  | { kind: 'helix'; radius: number; pitch: number; turns: number; tubeRadius: number }
  | { kind: 'line'; points: Vector3[] }
  | { kind: 'particleSystem'; count: number; particleRadius: number; distribution: Distribution }
  | { kind: 'vectorArrow'; from: Vector3; to: Vector3; headSize?: number }
  | { kind: 'text3d'; text: string; size: number }
  | { kind: 'custom'; verticesRef: string }; // rujukan ke data mesh terpisah, jika perlu

export interface PathDef {
  /** Titik kontrol kurva; runtime yang interpolasi (spline). */
  controlPoints: Vector3[];
  curveType?: 'catmullRom' | 'linear' | 'bezier';
}

export type Distribution =
  | { kind: 'sphereSurface'; radius: number }
  | { kind: 'sphereVolume'; radius: number }
  | { kind: 'boxVolume'; size: Vector3 }
  | { kind: 'alongPath'; path: PathDef }
  | { kind: 'random'; bounds: BoundingBox };

export interface Transform {
  position: Vector3 | DynamicValue[]; // bisa statis atau per-axis dinamis
  rotation?: Vector3;
  scale?: Vector3 | number;
  /** Parent entity id, buat hierarki (mis. bulan mengelilingi planet). */
  parentId?: string;
}

export interface Material {
  color: string;
  /** 'solid' | 'wireframe' | 'glass' dst — gaya render generik, bukan per-topik. */
  style: 'solid' | 'wireframe' | 'glass' | 'glow' | 'gradient';
  opacity?: number;
  emissiveIntensity?: number;
  gradient?: { from: string; to: string };
}

export interface InstancingConfig {
  count: number;
  /** Variasi posisi/warna antar instance, dievaluasi per index. */
  perInstance?: {
    position?: DynamicValue[];
    colorVariance?: number;
  };
}

// ----------------------------------------------------------------------------
// 3. RELATIONSHIP — hubungan antar entity
// ----------------------------------------------------------------------------

export type RelationshipKind =
  | 'connection'   // garis/pipa/kabel penghubung visual
  | 'orbit'        // childId mengorbit parentId
  | 'attachment'   // menempel rigid ke parent
  | 'flow'         // aliran (data/fluida/darah) dari source ke target
  | 'dependency';  // logis, tidak selalu tervisualisasi langsung

export interface Relationship {
  id: string;
  kind: RelationshipKind;
  sourceId: string;
  targetId: string;
  /** Parameter tambahan spesifik relasi, mis. flowRate, capacity, distance. */
  properties?: Record<string, DynamicValue>;
  /** Gaya visual garis penghubung, kalau relasi ini tervisualisasi. */
  visual?: { color: string; width: number; animatedFlow?: boolean };
}

// ----------------------------------------------------------------------------
// 4. FIELD — medan/gaya yang mempengaruhi entity
// ----------------------------------------------------------------------------

export type FieldKind = 'gravity' | 'pressure' | 'temperature' | 'electromagnetic' | 'velocity' | 'custom';

export interface Field {
  id: string;
  kind: FieldKind;
  /** Fungsi nilai field terhadap posisi/waktu, dievaluasi runtime. */
  valueExpr: string; // mis. "1 / distance(pos, source)^2 * strength"
  sourceEntityId?: string;
  /** Entity mana saja yang terpengaruh field ini (kosong = semua). */
  affectsTags?: string[];
  /** Cara memvisualisasikan field itu sendiri (opsional). */
  visualization?: 'none' | 'vectorField' | 'heatmap' | 'contourLines' | 'particles';
}

// ----------------------------------------------------------------------------
// 5. EQUATION — buat referensi ilmiah/edukasi, ditampilkan sebagai label/panel
// ----------------------------------------------------------------------------

export interface EquationDef {
  id: string;
  /** Representasi LaTeX atau plain text, ditampilkan di UI panel penjelasan. */
  formula: string;
  description?: string;
  /** Variabel dalam formula yang terhubung ke parameter/state tertentu. */
  variableBindings?: Record<string, string>; // { "P": "parameters.pressure" }
}

// ----------------------------------------------------------------------------
// 6. PARAMETER — kontrol yang bisa diubah user
// ----------------------------------------------------------------------------

export interface Parameter {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

// ----------------------------------------------------------------------------
// 7. STATE — nilai kondisi saat ini (hasil behavior + parameter)
// ----------------------------------------------------------------------------

export type StateValue = number | string | boolean | Vector3;

// ----------------------------------------------------------------------------
// 8. BEHAVIOR — aturan generik yang mengubah state/transform tiap waktu
// ----------------------------------------------------------------------------

/**
 * `kind` di sini adalah PERILAKU generik (bisa dipasang ke entity manapun),
 * BUKAN nama simulasi. "orbit" bisa dipakai planet, elektron, atau apapun.
 */
export type BehaviorKind =
  | 'rotate'
  | 'orbit'
  | 'pulse'
  | 'oscillate'
  | 'flowAlongPath'
  | 'followField'
  | 'stateMachine'  // buat siklus bertahap (mis. 4 fase mesin, siklus air)
  | 'colorTransition'
  | 'custom';

export interface Behavior {
  id: string;
  kind: BehaviorKind;
  /** Entity yang dikenai behavior ini (bisa dirujuk balik dari entity.behaviorRefs). */
  targetIds: string[];
  params: Record<string, DynamicValue>;
  /** Untuk stateMachine: daftar fase & kondisi transisi. */
  states?: BehaviorState[];
}

export interface BehaviorState {
  name: string;
  durationMs?: number;
  onEnter?: Record<string, DynamicValue>; // perubahan state saat masuk fase ini
  nextState?: string;
}

// ----------------------------------------------------------------------------
// 9. TIMELINE — urutan/fase simulasi (opsional)
// ----------------------------------------------------------------------------

export interface TimelineDef {
  totalDurationMs?: number;
  loop: boolean;
  keyframes: TimelineKeyframe[];
}

export interface TimelineKeyframe {
  timeMs: number;
  label?: string;
  /** Perubahan state/parameter yang terjadi di titik waktu ini. */
  changes?: Record<string, DynamicValue>;
}

// ----------------------------------------------------------------------------
// 10. LABEL & ANNOTATION
// ----------------------------------------------------------------------------

export interface Label {
  id: string;
  text: string;
  /** Titik yang ditunjuk: posisi absolut atau merujuk entity tertentu. */
  anchor: { entityId: string } | { position: Vector3 };
  /** Offset posisi teks relatif terhadap anchor, biar tidak menutupi objek. */
  offset?: Vector2;
  style?: 'callout' | 'inline' | 'badge';
  color?: string;
}

// ----------------------------------------------------------------------------
// 11. LAYER — cutaway / cross-section / exploded view / toggle visibility
// ----------------------------------------------------------------------------

export interface Layer {
  id: string;
  name: string;
  entityIds: string[];
  visibleByDefault: boolean;
  /** Buat cross-section: bidang potong yang menyembunyikan sebagian geometry. */
  clipPlane?: { normal: Vector3; constant: number };
  /** Buat exploded view: offset tambahan saat layer ini di-"explode". */
  explodeOffset?: Vector3;
}

// ----------------------------------------------------------------------------
// 12. INTERACTION & CAMERA — kontrol generik, sama untuk semua simulasi
// ----------------------------------------------------------------------------

export interface InteractionConfig {
  rotate: boolean;
  zoom: boolean;
  pan: boolean;
  selectObject: boolean;
  playPause: boolean;
  reset: boolean;
  /** Layer mana saja yang boleh di-toggle user lewat UI. */
  toggleableLayerIds?: string[];
}

export interface CameraConfig {
  mode: 'orbit' | 'fixed' | 'follow';
  initialPosition: Vector3;
  lookAt: Vector3;
  fov?: number;
}

// ----------------------------------------------------------------------------
// 13. EXPLANATION — narasi buat voice/teks, terpisah dari data visual
// ----------------------------------------------------------------------------

export interface Explanation {
  /** Teks yang dibacakan TTS saat simulasi pertama muncul. */
  narration: string;
  /** Poin-poin tambahan yang bisa ditampilkan di panel info (opsional). */
  keyPoints?: string[];
}

// ----------------------------------------------------------------------------
// 14. PATCH — buat update simulasi yang sedang aktif (bukan generate ulang)
// ----------------------------------------------------------------------------

/**
 * Ketika user minta perubahan ("tambahkan visualisasi aliran"), AI tidak
 * wajib mengirim seluruh SimulationSpec baru — cukup kirim SimulationPatch
 * yang berisi bagian yang berubah/ditambah/dihapus. Runtime & context
 * layer (simulationContext.ts) yang menggabungkannya ke spec aktif.
 */
export interface SimulationPatch {
  targetSpecId: string;
  addEntities?: Entity[];
  removeEntityIds?: string[];
  updateEntities?: Partial<Entity>[]; // masing-masing harus tetap punya `id`
  addRelationships?: Relationship[];
  addFields?: Field[];
  addBehaviors?: Behavior[];
  addLabels?: Label[];
  updateParameters?: Pick<Parameter, 'id' | 'value'>[];
  updateExplanation?: Partial<Explanation>;
}
