import React, { useEffect, useState, useRef } from 'react';
import {
  Camera, CameraOff, Volume2, VolumeX, Mic, MicOff, Settings, X, Code, Map as MapIcon,
  RefreshCw, ArrowLeft, Check, ChevronRight, Plus, FileText, Image as ImageIcon,
} from 'lucide-react';
import { chatWithGeminiStream, ConnectionError } from '../../services/geminiService';
import { generateSimulationSpec } from '../../services/simulationDirector';
import type { ValidatedSimulationSpec } from '../../lib/simulationSchema';
import { SimulationCanvas } from '../simulation/SimulationCanvas';
import { GenerateContentResponse } from '@google/genai';
import { useProfile } from '../../hooks/useProfile';
import { usePageText } from '../../lib/i18n';
import { getPermissionState } from '../permissions/PermissionSheet';
import { VOICES, DEFAULT_VOICE } from '../../lib/voices';
import { AiSettings } from '../../pages/AiSettings';

interface LiveVoiceModeProps {
  onClose: () => void;
}

type StageType = 'visual' | 'map' | 'code';
type Status = 'listening' | 'processing' | 'speaking' | 'idle';
type HistoryItem = { role: 'user' | 'assistant'; content: string };
type PdfItem = { data: string; name: string };
type Extras = { images?: string[]; pdfs?: PdfItem[] };
type Turn = { id: number; role: 'user' | 'assistant'; text: string; imgs?: string[]; files?: string[] };
type Attached = { id: string; url: string; type: 'image' | 'pdf' | 'text'; name: string };

// Log teknis HANYA muncul saat development (di laptop kamu waktu coding). Di cylenai.com (produksi) diam total.
const dbg = (...args: any[]) => {
  if (import.meta.env.DEV) console.error(...args);
};

// 🎙️ Simpan riwayat — voice nulis ke riwayat chat lewat CustomEvent (ditangkap useChat).
const saveTurn = (userText: string, assistantText: string) => {
  if (!userText || !userText.trim()) return;
  window.dispatchEvent(new CustomEvent('cylen-voice-turn', {
    detail: { userText, assistantText },
  }));
};

// ───────────────────────── PENGATURAN SUARA (per perangkat) ─────────────────────────
type Preset = 'Pembantu' | 'Pencerita' | 'Santai';
type ListenMode = 'auto' | 'ptt';

interface VoiceSettings {
  rate: number;
  preset: Preset;
  listenMode: ListenMode;
  cameraFacing: 'user' | 'environment';
}

const SETTINGS_KEY = 'cylen_voice_settings_v3';
const PRESETS: Preset[] = ['Pembantu', 'Pencerita', 'Santai'];
const PRESET_RATE: Record<Preset, number> = { Pembantu: 1, Pencerita: 0.95, Santai: 1.05 };
const DEFAULT_SETTINGS: VoiceSettings = { rate: 1, preset: 'Pembantu', listenMode: 'auto', cameraFacing: 'user' };
const MAX_ATTACH = 4;

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = typeof n === 'number' && isFinite(n) ? n : fallback;
  return Math.min(max, Math.max(min, v));
};

const loadSettings = (): VoiceSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const p = JSON.parse(raw);
    return {
      rate: clamp(p.rate, 0.7, 1.5, 1),
      preset: PRESETS.includes(p.preset) ? p.preset : 'Pembantu',
      listenMode: p.listenMode === 'ptt' ? 'ptt' : 'auto',
      cameraFacing: p.cameraFacing === 'environment' ? 'environment' : 'user',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

// Gaya bicara AI (satu baris pendek yang disisipkan ke prompt)
const STYLE_HINT: Record<'id' | 'en', Record<Preset, string>> = {
  id: {
    Pembantu: 'Gaya: asisten yang sigap dan ramah, jelas dan langsung ke inti.',
    Pencerita: 'Gaya: pencerita yang hidup, suka memberi gambaran dan alur, nada hangat.',
    Santai: 'Gaya: teman ngobrol santai, bahasa sehari-hari, boleh bercanda ringan.',
  },
  en: {
    Pembantu: 'Style: a quick, friendly assistant, clear and to the point.',
    Pencerita: 'Style: a vivid storyteller who paints pictures, warm tone.',
    Santai: 'Style: a relaxed friend, everyday language, light humor is fine.',
  },
};

// ── Suara AI (sementara): nama suara dipetakan ke suara bawaan browser + nada berbeda.
const pitchFor = (idx: number) => 0.8 + ((idx * 37) % 50) / 100; // 0.80 – 1.29, tetap untuk tiap suara
const pickBrowserVoice = (all: SpeechSynthesisVoice[], lang: string, idx: number) => {
  const prefix = lang.slice(0, 2).toLowerCase();
  const list = all.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(prefix));
  if (list.length === 0) return null;
  return list[idx % list.length];
};

const readThemeVar = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v && v.startsWith('#') ? v : fallback;
};

const STR = {
  id: {
    unsupported: 'Browser tidak mendukung fitur suara.',
    micDenied: 'Izin mikrofon ditolak. Aktifkan lewat pengaturan situs di browser.',
    simPrep: 'Baik, saya siapkan simulasinya sekarang.',
    simFail: 'Maaf, simulasi gagal dibuat.',
    errBusy: 'Lagi ramai nih, coba lagi sebentar ya.',
    errOffline: 'Sepertinya kamu sedang offline.',
    errFailed: 'Maaf, aku belum bisa jawab sekarang. Coba lagi ya.',
    camUnsupported: 'Browser tidak mendukung kamera.',
    camDenied: 'Izin kamera ditolak. Aktifkan lewat pengaturan situs di browser.',
    camNone: 'Kamera tidak ditemukan di perangkat ini.',
    camFail: 'Gagal membuka kamera.',
    camOn: 'Matikan kamera',
    camOff: 'Nyalakan kamera',
    flip: 'Balik kamera',
    micOn: 'Matikan mikrofon',
    micOffBtn: 'Nyalakan mikrofon',
    micTalk: 'Tekan untuk bicara',
    micStopTalk: 'Berhenti mendengarkan',
    voiceOnBtn: 'Matikan suara AI',
    voiceOffBtn: 'Nyalakan suara AI',
    settings: 'Pengaturan suara',
    stop: 'Stop',
    ph: 'Tanya apa saja...',
    send: 'Kirim',
    toVoice: 'Kembali ke mode suara',
    stopSpeak: 'Hentikan suara AI',
    back: 'Kembali',
    attach: 'Lampirkan',
    attFile: 'Berkas',
    attGallery: 'Galeri',
    attCamera: 'Kamera',
    removeFile: 'Hapus lampiran',
    imgNote: 'Tolong lihat gambar ini.',
    docNote: 'Tolong baca dokumen ini.',
    sTitle: 'Pengaturan suara',
    sVoice: 'Suara',
    sLib: 'Pustaka suara',
    sPersona: 'Personaliti',
    sCustom: 'Kustomisasi Cylen',
    sAddPersona: 'Kustomisasi lanjutan',
    sSpeed: 'Kecepatan bicara',
    slow: 'Lambat',
    normalSp: 'Normal',
    fast: 'Cepat',
    sListen: 'Cara bicara',
    sAuto: 'Otomatis dengar',
    sPtt: 'Tekan untuk bicara',
    hintAuto: 'Mikrofon selalu mendengarkan selama mode suara.',
    hintPtt: 'Ketuk ikon mikrofon setiap kali ingin bicara.',
    p1: 'Pembantu',
    p2: 'Pencerita',
    p3: 'Santai',
    testPhrase: 'Halo, saya Cylen. Begini suara saya.',
    map: 'Menampilkan Lokasi',
    mapDefault: 'Lokasi belum disebutkan',
  },
  en: {
    unsupported: 'This browser does not support voice features.',
    micDenied: 'Microphone permission denied. Enable it in your browser site settings.',
    simPrep: "Okay, I'll prepare the simulation now.",
    simFail: 'Sorry, the simulation could not be created.',
    errBusy: "It's busy right now, please try again in a moment.",
    errOffline: 'It looks like you are offline.',
    errFailed: "Sorry, I can't answer right now. Please try again.",
    camUnsupported: 'This browser does not support the camera.',
    camDenied: 'Camera permission denied. Enable it in your browser site settings.',
    camNone: 'No camera found on this device.',
    camFail: 'Failed to open the camera.',
    camOn: 'Turn camera off',
    camOff: 'Turn camera on',
    flip: 'Flip camera',
    micOn: 'Turn microphone off',
    micOffBtn: 'Turn microphone on',
    micTalk: 'Tap to talk',
    micStopTalk: 'Stop listening',
    voiceOnBtn: 'Turn AI voice off',
    voiceOffBtn: 'Turn AI voice on',
    settings: 'Voice settings',
    stop: 'Stop',
    ph: 'Ask anything...',
    send: 'Send',
    toVoice: 'Back to voice mode',
    stopSpeak: 'Stop AI voice',
    back: 'Back',
    attach: 'Attach',
    attFile: 'File',
    attGallery: 'Gallery',
    attCamera: 'Camera',
    removeFile: 'Remove attachment',
    imgNote: 'Please look at this image.',
    docNote: 'Please read this document.',
    sTitle: 'Voice settings',
    sVoice: 'Voice',
    sLib: 'Voice library',
    sPersona: 'Personality',
    sCustom: 'Customize Cylen',
    sAddPersona: 'Advanced customization',
    sSpeed: 'Speaking speed',
    slow: 'Slow',
    normalSp: 'Normal',
    fast: 'Fast',
    sListen: 'Talk mode',
    sAuto: 'Always listening',
    sPtt: 'Tap to talk',
    hintAuto: 'The microphone keeps listening while in voice mode.',
    hintPtt: 'Tap the microphone icon each time you want to talk.',
    p1: 'Assistant',
    p2: 'Storyteller',
    p3: 'Casual',
    testPhrase: "Hi, I'm Cylen. This is my voice.",
    map: 'Showing Location',
    mapDefault: 'No location mentioned',
  },
} as const;

// ── IDLE SPEC ── bola partikel netral.
const buildIdleSpec = (bg: string, fg: string): ValidatedSimulationSpec => ({
  schemaVersion: '1.0',
  id: 'idle-sphere',
  meta: { title: 'Idle', summary: 'Menunggu topik dari user.' },
  mode: '3d',
  scene: { background: bg, lighting: { ambientIntensity: 0.4, keyLightIntensity: 1, glow: true } },
  entities: [
    {
      id: 'idle-particles',
      geometry: {
        kind: 'particleSystem',
        count: 2600,
        particleRadius: 0.02,
        distribution: { kind: 'sphereSurface', radius: 0.9 },
      },
      transform: { position: { x: 0, y: 0, z: 0 } },
      material: { color: fg, style: 'glow', opacity: 0.85 },
      behaviorRefs: ['idle-rotate'],
    },
  ],
  relationships: [],
  fields: [],
  equations: [],
  parameters: [],
  state: {},
  behaviors: [{ id: 'idle-rotate', kind: 'rotate', targetIds: ['idle-particles'], params: { speed: 0.15 } }],
  labels: [],
  layers: [],
  interactions: { rotate: true, zoom: true, pan: true, selectObject: false, playPause: false, reset: false },
  camera: { mode: 'orbit', initialPosition: { x: 0, y: 0, z: 4 }, lookAt: { x: 0, y: 0, z: 0 }, fov: 50 },
  explanation: { narration: '' },
});

const IDLE_ID = 'idle-sphere';
const MAX_HISTORY = 8;

const SHEET_TRANS = 'transform .3s cubic-bezier(.32,.72,0,1)';
const PANEL_TRANS = 'transform .3s cubic-bezier(.32,.72,0,1)';
const SNAP_HALF = 42; // % dari tinggi popup yang masih tertutup saat posisi setengah
const MAX_TEXTAREA_HEIGHT = 120;

// ── CSS khusus layar voice: slider bergaris + bola pustaka suara + animasi bola idle ──
const VOICE_CSS = `
.cv-range{-webkit-appearance:none;appearance:none;width:100%;height:28px;background:transparent;outline:none;margin:0;touch-action:pan-x}
.cv-range::-webkit-slider-runnable-track{height:6px;border-radius:999px;background:linear-gradient(to right,var(--ac) var(--p,50%),var(--ib) var(--p,50%))}
.cv-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;box-sizing:border-box;width:24px;height:24px;margin-top:-9px;border-radius:50%;background:var(--ac);border:3px solid var(--sf);box-shadow:0 1px 6px rgba(0,0,0,.35)}
.cv-range::-moz-range-track{height:6px;border-radius:999px;background:var(--ib)}
.cv-range::-moz-range-progress{height:6px;border-radius:999px;background:var(--ac)}
.cv-range::-moz-range-thumb{box-sizing:border-box;width:24px;height:24px;border-radius:50%;background:var(--ac);border:3px solid var(--sf)}

.cv-orb{position:relative;width:170px;height:170px;margin:6px auto 22px;border-radius:9999px;overflow:hidden;
  background:radial-gradient(circle at 38% 28%,#2d2a45 0%,#13101f 42%,#06050b 78%,#000 100%);
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.14),inset 0 0 44px rgba(130,110,255,.3),inset -16px -20px 54px rgba(255,90,140,.2),0 0 60px rgba(120,100,255,.14);
  animation:cv-breathe 6s ease-in-out infinite;will-change:transform}
.cv-orb.pop{animation:cv-pop .55s cubic-bezier(.2,.8,.2,1),cv-breathe 6s ease-in-out .55s infinite}
.cv-orb-stars{position:absolute;inset:0;opacity:.9;
  background-image:radial-gradient(1.5px 1.5px at 18% 34%,#fff,transparent),radial-gradient(1px 1px at 72% 22%,#fff,transparent),radial-gradient(1.2px 1.2px at 55% 48%,#d4ccff,transparent),radial-gradient(1px 1px at 30% 66%,#fff,transparent),radial-gradient(1.5px 1.5px at 80% 70%,#ffd0e2,transparent),radial-gradient(1px 1px at 44% 82%,#fff,transparent),radial-gradient(1px 1px at 63% 12%,#fff,transparent),radial-gradient(1.2px 1.2px at 12% 58%,#cfeaff,transparent),radial-gradient(1px 1px at 88% 40%,#fff,transparent)}
.cv-orb-streak{position:absolute;left:18%;right:18%;top:-8%;height:62%;border-radius:9999px;filter:blur(10px);
  background:linear-gradient(180deg,rgba(210,195,255,.95),rgba(150,130,255,.45) 55%,transparent);
  animation:cv-drift 7s ease-in-out infinite;will-change:transform}
.cv-orb-streak.b{left:46%;right:12%;top:-4%;height:52%;opacity:.7;background:linear-gradient(180deg,rgba(255,170,210,.9),rgba(255,120,170,.35) 55%,transparent);animation-delay:-3s}
.cv-orb-gloss{position:absolute;inset:0;background:radial-gradient(circle at 30% 22%,rgba(255,255,255,.22),transparent 38%)}
@keyframes cv-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.025)}}
@keyframes cv-pop{0%{transform:scale(1)}40%{transform:scale(1.07)}100%{transform:scale(1)}}
@keyframes cv-drift{0%,100%{transform:translate3d(-6px,0,0) scaleY(1)}50%{transform:translate3d(8px,8px,0) scaleY(1.08)}}

@keyframes cylen-orb-beat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.08); }
  30% { transform: scale(1); }
  45% { transform: scale(1.05); }
  60% { transform: scale(1); }
}
.cylen-orb-beat { animation: cylen-orb-beat 1.1s ease-in-out infinite; transform-origin: center; }
@media (prefers-reduced-motion: reduce) { .cv-orb,.cv-orb-streak,.cylen-orb-beat{animation:none!important} }
`;

const VoiceOrb = ({ pulse }: { pulse: number }) => (
  <div key={pulse} className={`cv-orb ${pulse > 0 ? 'pop' : ''}`} aria-hidden="true">
    <div className="cv-orb-stars" />
    <div className="cv-orb-streak" />
    <div className="cv-orb-streak b" />
    <div className="cv-orb-gloss" />
  </div>
);

// ── Ikon kecil (SVG sendiri) ──
const WaveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="10" x2="3" y2="14" /><line x1="7.5" y1="6" x2="7.5" y2="18" /><line x1="12" y1="2" x2="12" y2="22" /><line x1="16.5" y1="6" x2="16.5" y2="18" /><line x1="21" y1="10" x2="21" y2="14" />
  </svg>
);
const ArrowUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const StopSquareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3" /></svg>
);

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result || ''));
    r.readAsDataURL(file);
  });

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const { profile, updateProfile } = useProfile();
  const uiLang: 'id' | 'en' = profile.lang === 'en' ? 'en' : 'id';
  const langCode = uiLang === 'en' ? 'en-US' : 'id-ID';
  const T = usePageText('voice', STR);

  // ── STATE ──
  const [status, setStatus] = useState<Status>('idle');
  // notice HANYA untuk masalah izin / perangkat yang bisa dibereskan user (mikrofon, kamera). Bukan untuk error AI.
  const [notice, setNotice] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const [activeStage, setActiveStage] = useState<StageType>('visual');
  const [stageData, setStageData] = useState<string>('');
  const [idleSpec] = useState<ValidatedSimulationSpec>(() =>
    buildIdleSpec(readThemeVar('--bg', '#000000'), readThemeVar('--text', '#ffffff'))
  );
  const [activeSpec, setActiveSpec] = useState<ValidatedSimulationSpec>(idleSpec);

  const [micOn, setMicOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);
  const [settings, setSettings] = useState<VoiceSettings>(() => loadSettings());
  const [voiceSel, setVoiceSel] = useState<string>(profile.voice || DEFAULT_VOICE);
  const [orbPulse, setOrbPulse] = useState(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>(settings.cameraFacing);
  const [flash, setFlash] = useState(false);

  // mode chat (setelah kolom ketik diklik)
  const [chatMode, setChatMode] = useState(false);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [attached, setAttached] = useState<Attached[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);

  // popup pengaturan
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetPct, setSheetPct] = useState(100);
  const [subOpen, setSubOpen] = useState(false);
  const [subKind, setSubKind] = useState<'voice' | 'persona'>('voice');

  // ── REF ──
  const statusRef = useRef<Status>('idle');
  const isClosingRef = useRef(false);
  const micOnRef = useRef(true);
  const voiceOnRef = useRef(true);
  const cameraOnRef = useRef(false);
  const camStartingRef = useRef(false);
  const chatModeRef = useRef(false);
  const settingsRef = useRef<VoiceSettings>(settings);
  const voiceIdRef = useRef<string>(voiceSel);
  const langRef = useRef<string>(langCode);
  const activeSpecRef = useRef<ValidatedSimulationSpec | null>(null);
  const historyRef = useRef<HistoryItem[]>([]);
  const turnIdRef = useRef(0);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const restartTimerRef = useRef<number | undefined>(undefined);
  const closeSheetTimerRef = useRef<number | undefined>(undefined);
  const speakTokenRef = useRef(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, startY: 0, startPct: 100, h: 1, lastY: 0, lastT: 0, vel: 0, pct: 100 });

  const latest = useRef<{
    startListening: (manual?: boolean) => void;
    resumeListening: () => void;
    handleAIResponse: (t: string, extras?: Extras) => void;
  }>({ startListening: () => {}, resumeListening: () => {}, handleAIResponse: () => {} });

  voiceIdRef.current = voiceSel;
  langRef.current = langCode;

  const setSt = (s: Status) => { statusRef.current = s; setStatus(s); };

  useEffect(() => {
    activeSpecRef.current = activeSpec.id === IDLE_ID ? null : activeSpec;
  }, [activeSpec]);

  const updateSettings = (patch: Partial<VoiceSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      settingsRef.current = next;
      return next;
    });
  };
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* abaikan */ }
  }, [settings]);

  useEffect(() => { if (profile.voice) setVoiceSel(profile.voice); }, [profile.voice]);

  // pemanasan daftar suara browser
  useEffect(() => {
    const synth = synthRef.current;
    const load = () => { synth.getVoices(); };
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => synth.removeEventListener?.('voiceschanged', load);
  }, []);

  // pesan izin otomatis hilang
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(id);
  }, [notice]);

  // transkrip selalu scroll ke bawah
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [turns, status, chatMode]);

  // tinggi kolom ketik menyesuaikan isi (maks ±5 baris)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
  }, [draft]);

  const addTurn = (role: 'user' | 'assistant', text: string, extra?: { imgs?: string[]; files?: string[] }) => {
    if (!text || !text.trim()) return;
    setTurns(p => [...p, { id: ++turnIdRef.current, role, text: text.trim(), ...(extra || {}) }]);
  };
  const finishTurn = (userText: string, assistantText: string) => {
    saveTurn(userText, assistantText);
    addTurn('assistant', assistantText);
  };

  // ───────────────────────── KAMERA ─────────────────────────
  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startCamera = async (mode: 'user' | 'environment') => {
    if (camStartingRef.current) return false;
    camStartingRef.current = true;
    setNotice(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) { setNotice(T.camUnsupported); return false; }
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (isClosingRef.current) { stream.getTracks().forEach(t => t.stop()); return false; }
      streamRef.current = stream;
      cameraOnRef.current = true;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
      return true;
    } catch (err: any) {
      const n = err?.name;
      if (n === 'NotFoundError' || n === 'OverconstrainedError' || n === 'DevicesNotFoundError') {
        setNotice(T.camNone);
      } else if (n === 'NotAllowedError') {
        if ((await getPermissionState('camera')) === 'denied') setNotice(T.camDenied);
      } else {
        setNotice(T.camFail);
      }
      cameraOnRef.current = false;
      setCameraOn(false);
      return false;
    } finally {
      camStartingRef.current = false;
    }
  };

  const closeCamera = () => {
    stopStream();
    cameraOnRef.current = false;
    setCameraOn(false);
  };

  const toggleCamera = () => {
    if (isClosingRef.current) return;
    if (cameraOnRef.current) closeCamera();
    else startCamera(facing);
  };

  const flipCamera = async () => {
    const next = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    await startCamera(next);
  };

  const captureFrame = (): string | null => {
    const v = videoRef.current;
    if (!v || !v.videoWidth || !v.videoHeight) return null;
    const max = 768;
    const s = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * s);
    c.height = Math.round(v.videoHeight * s);
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.7);
  };

  // ───────────────────────── MIKROFON (DENGAR) ─────────────────────────
  // Mendengar otomatis hanya di mode suara + cara bicara "Otomatis dengar".
  const autoAllowed = () => !chatModeRef.current && settingsRef.current.listenMode === 'auto';

  const scheduleRestart = (ms: number) => {
    window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      if (!isClosingRef.current && statusRef.current === 'listening' && autoAllowed()) latest.current.startListening();
    }, ms);
  };

  const startListening = (manual = false) => {
    if (isClosingRef.current || !micOnRef.current) return;
    if (statusRef.current !== 'listening') return;
    if (recognitionRef.current) return;
    if (!manual && !autoAllowed()) return;

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setNotice(T.unsupported); setSt('idle'); return; }

    const rec = new SR();
    rec.lang = langRef.current;
    rec.continuous = false;
    rec.interimResults = true;

    let handled = false;
    let errored = false;

    rec.onresult = (e: any) => {
      if (rec._dead) return;
      const results = Array.from(e.results) as any[];
      const transcript = results.map(r => r[0].transcript).join('');
      const last = results[results.length - 1];
      if (last?.isFinal && !handled) {
        handled = true;
        try { rec.stop(); } catch { /* abaikan */ }
        const text = transcript.trim();
        if (text) latest.current.handleAIResponse(text);
        else if (manual) { if (statusRef.current === 'listening') setSt('idle'); }
        else scheduleRestart(300);
      }
    };

    rec.onerror = (e: any) => {
      if (rec._dead) return;
      errored = true;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        micOnRef.current = false;
        setMicOn(false);
        if (statusRef.current === 'listening') setSt('idle');
        setNotice(T.micDenied);
      }
    };

    rec.onend = () => {
      if (rec._dead) return;
      if (recognitionRef.current === rec) recognitionRef.current = null;
      if (handled) return;
      if (manual) { if (statusRef.current === 'listening') setSt('idle'); }
      else scheduleRestart(errored ? 1000 : 300);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
      if (manual) { if (statusRef.current === 'listening') setSt('idle'); }
      else scheduleRestart(800);
    }
  };

  const abortListening = () => {
    window.clearTimeout(restartTimerRef.current);
    const r = recognitionRef.current;
    recognitionRef.current = null;
    if (r) { r._dead = true; try { r.abort(); } catch { /* abaikan */ } }
  };

  // Kembali ke keadaan "siap": mode suara + otomatis → mendengar; selain itu diam menunggu.
  const resumeListening = () => {
    if (isClosingRef.current) return;
    if (chatModeRef.current || settingsRef.current.listenMode === 'ptt' || !micOnRef.current) { setSt('idle'); return; }
    setSt('listening');
    startListening();
  };

  // Dengar satu kali (tombol mic di "Tekan untuk bicara")
  const listenOnce = () => {
    if (isClosingRef.current) return;
    if (statusRef.current === 'processing') return;
    if (statusRef.current === 'speaking') { speakTokenRef.current++; synthRef.current.cancel(); }
    abortListening();
    micOnRef.current = true;
    setMicOn(true);
    setSt('listening');
    startListening(true);
  };

  // ───────────────────────── SUARA AI (BICARA) ─────────────────────────
  const makeUtterance = (text: string, voiceId?: string) => {
    const s = settingsRef.current;
    const idx = Math.max(0, VOICES.findIndex(v => v.id === (voiceId || voiceIdRef.current)));
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langRef.current;
    u.rate = clamp(s.rate * PRESET_RATE[s.preset], 0.6, 1.8, 1);
    u.pitch = pitchFor(idx);
    const v = pickBrowserVoice(synthRef.current.getVoices(), langRef.current, idx);
    if (v) u.voice = v;
    return u;
  };

  const previewVoice = (id: string) => {
    synthRef.current.cancel();
    synthRef.current.speak(makeUtterance(T.testPhrase, id));
  };

  const speakText = (text: string, opts: { resume?: boolean; holdMs?: number } = {}) => {
    if (isClosingRef.current) return;
    const { resume = true, holdMs = 0 } = opts;
    const clean = text.trim();

    const token = ++speakTokenRef.current;
    const done = () => {
      if (token !== speakTokenRef.current || isClosingRef.current) return;
      if (!resume) { setSt('processing'); return; }
      if (holdMs > 0) {
        window.setTimeout(() => {
          if (token === speakTokenRef.current && !isClosingRef.current) latest.current.resumeListening();
        }, holdMs);
      } else {
        latest.current.resumeListening();
      }
    };

    synthRef.current.cancel();
    if (!voiceOnRef.current || !clean) { done(); return; }

    setSt('speaking');
    const u = makeUtterance(clean);
    u.onend = done;
    u.onerror = done;
    synthRef.current.speak(u);
  };

  // ───────────────────────── OTAK AI ─────────────────────────
  const handleAIResponse = async (userText: string, extras: Extras = {}) => {
    const inChat = chatModeRef.current;
    const attImages = extras.images || [];
    const attPdfs = extras.pdfs || [];
    setSt('processing');
    addTurn('user', userText, {
      imgs: attImages.length ? attImages : undefined,
      files: attPdfs.length ? attPdfs.map(p => p.name) : undefined,
    });

    const frame = !inChat && attImages.length === 0 && cameraOnRef.current ? captureFrame() : null;
    if (frame) { setFlash(true); window.setTimeout(() => setFlash(false), 160); }
    const images = attImages.length ? attImages : frame ? [frame] : [];

    try {
      const langName = langRef.current === 'en-US' ? 'Inggris' : 'Indonesia';
      const styleLine = STYLE_HINT[uiLang][settingsRef.current.preset];
      const camNote = frame
        ? `\n\nKamera user sedang aktif. Gambar terlampir adalah apa yang dilihat kamera SAAT INI. Kalau pertanyaan user berkaitan dengan apa yang terlihat, jawab berdasarkan gambar itu dengan [STAGE: CHAT].`
        : '';

      const directorPrompt = `User berkata: "${userText}".

${styleLine}
Bicaralah natural seperti ngobrol langsung, bukan seperti artikel: kalimat mengalir, tanpa daftar, tanpa markdown, tanpa emoji. Panjang menyesuaikan pertanyaan (umumnya 1-4 kalimat).

Tentukan panggung visual yang tepat. Awali jawaban dengan SATU tag, lalu ucapanmu:

1. [STAGE: MAP | Alamat] -> kalau user bertanya lokasi/jalan/tempat.
2. [STAGE: CODE | Bahasa] -> kalau user minta koding/script dibuatkan.
3. [STAGE: SIMULATION] -> kalau user minta simulasi/visualisasi/model 3D-2D dari
   APAPUN (organ tubuh, mesin, denah/tata ruang, planet, jaringan, molekul,
   proses, dst) atau minta ubah/tambah pada simulasi yang sedang tampil.
   Ini SATU-SATUNYA panggung untuk semua permintaan visual/simulasi.
4. [STAGE: CHAT] -> percakapan lain yang tidak butuh visual simulasi.

Untuk tag SIMULATION, ucapanmu cukup satu kalimat pendek penanda kamu akan
segera menyiapkannya; penjelasan detail menyusul setelah simulasi selesai.

Jawab dalam bahasa ${langName}.${camNote}`;

      const chatPrompt = `User berkata: "${userText}".

${styleLine}
Jawab natural seperti ngobrol, tanpa markdown berat, tanpa emoji, dan tanpa tag apa pun. Panjang menyesuaikan pertanyaan.

Jawab dalam bahasa ${langName}.`;

      const messages: HistoryItem[] = [...historyRef.current, { role: 'user', content: inChat ? chatPrompt : directorPrompt }];

      const runStream = async (): Promise<string> => {
        const stream = await chatWithGeminiStream(
          messages,
          false,
          undefined,
          images.length > 0 ? images : undefined,
          attPdfs.length > 0 ? attPdfs : undefined,
        );
        let full = '';
        for await (const chunk of stream) full += (chunk as GenerateContentResponse).text || '';
        if (!full.trim()) throw new Error('empty-response');
        return full;
      };

      // Satu kali coba ulang diam-diam untuk gangguan sesaat (bukan untuk batas pemakaian / offline)
      let fullResponse = '';
      try {
        fullResponse = await runStream();
      } catch (e1: any) {
        const t = e1?.type;
        if (t === 'limit' || t === 'offline' || isClosingRef.current) throw e1;
        await new Promise(r => window.setTimeout(r, 1200));
        if (isClosingRef.current) return;
        fullResponse = await runStream();
      }
      if (isClosingRef.current) return;

      if (fullResponse.trim()) {
        historyRef.current = [
          ...historyRef.current,
          { role: 'user' as const, content: userText },
          { role: 'assistant' as const, content: fullResponse },
        ].slice(-MAX_HISTORY);
      }

      const stageMatch = fullResponse.match(/\[STAGE:\s*(.*?)\s*(?:\|\s*(.*?))?\]/i);
      const stageType = inChat ? 'CHAT' : (stageMatch ? stageMatch[1].trim().toUpperCase() : 'CHAT');
      const stageArg = stageMatch?.[2]?.trim() ?? '';
      const spokenText = fullResponse.replace(/\[STAGE:[^\]]*\]/gi, '').trim().replace(/[*_#`]/g, '');

      if (stageType === 'MAP') {
        finishTurn(userText, spokenText);
        closeCamera(); setActiveStage('map'); setStageData(stageArg.toLowerCase()); speakText(spokenText); return;
      }
      if (stageType === 'CODE') {
        finishTurn(userText, spokenText);
        closeCamera(); setActiveStage('code'); setStageData(stageArg.toLowerCase()); speakText(spokenText); return;
      }

      if (stageType === 'SIMULATION') {
        closeCamera();
        setActiveStage('visual');
        speakText(spokenText || T.simPrep, { resume: false });

        const result = await generateSimulationSpec(
          userText,
          activeSpecRef.current ?? undefined,
          () => {}
        );
        if (isClosingRef.current) return;

        if (result.usedFallback) {
          dbg('[Cylen] Simulasi gagal:', result.errorDetail);
          saveTurn(userText, '');
          // tanpa teks di layar: cukup diucapkan
          speakText(T.simFail, { holdMs: 3000 });
          return;
        }

        setActiveSpec(result.spec);
        const narration = result.spec.explanation.narration || spokenText || T.simPrep;
        finishTurn(userText, narration);
        speakText(result.spec.explanation.narration);
        return;
      }

      finishTurn(userText, spokenText);
      if (!inChat) setActiveStage('visual');
      speakText(spokenText);
    } catch (error: any) {
      if (isClosingRef.current) return;
      // Detail teknis hanya muncul di console saat development. User tidak pernah melihat kode / teks error teknis.
      dbg('[Cylen] Voice error:', error);
      const type: string = error instanceof ConnectionError ? (error as any).type : (!navigator.onLine ? 'offline' : 'failed');
      const msg =
        type === 'limit' || type === 'server' || type === 'timeout' ? T.errBusy
        : type === 'offline' ? T.errOffline
        : T.errFailed;
      saveTurn(userText, '');          // pertanyaan user tetap tersimpan, pesan error tidak
      if (inChat) addTurn('assistant', msg); // mode chat: jawaban lembut di transkrip. Mode suara: cukup diucapkan, tanpa teks di layar
      speakText(msg);
    }
  };

  latest.current = { startListening, resumeListening, handleAIResponse };

  // ───────────────────────── TOMBOL ─────────────────────────
  const toggleMic = () => {
    if (isClosingRef.current) return;
    if (micOnRef.current) {
      micOnRef.current = false;
      setMicOn(false);
      abortListening();
      if (statusRef.current === 'listening') setSt('idle');
    } else {
      micOnRef.current = true;
      setMicOn(true);
      if (statusRef.current === 'speaking') {
        speakTokenRef.current++;
        synthRef.current.cancel();
        resumeListening();
      } else if (statusRef.current === 'idle') {
        resumeListening();
      }
    }
  };

  const onMicButton = () => {
    if (isClosingRef.current) return;
    if (settingsRef.current.listenMode === 'ptt') {
      if (statusRef.current === 'listening') { abortListening(); setSt('idle'); }
      else listenOnce();
    } else {
      toggleMic();
    }
  };

  const toggleVoice = () => {
    if (isClosingRef.current) return;
    const next = !voiceOnRef.current;
    voiceOnRef.current = next;
    setVoiceOn(next);
    if (!next && statusRef.current === 'speaking') {
      speakTokenRef.current++;
      synthRef.current.cancel();
      resumeListening();
    }
  };

  // ── Mode chat ──
  const enterChat = () => {
    if (chatModeRef.current || isClosingRef.current) return;
    chatModeRef.current = true;
    setChatMode(true);
    closeCamera();
    abortListening();
    if (statusRef.current === 'listening') setSt('idle');
  };

  const exitChat = () => {
    inputRef.current?.blur();
    setAttachOpen(false);
    chatModeRef.current = false;
    setChatMode(false);
    if (statusRef.current === 'idle') resumeListening();
  };

  const stopSpeaking = () => {
    speakTokenRef.current++;
    synthRef.current.cancel();
    resumeListening();
  };

  const hasContent = draft.trim().length > 0 || attached.length > 0;

  const sendDraft = () => {
    const text = draft.trim();
    if ((!text && attached.length === 0) || statusRef.current === 'processing') return;
    const imgs = attached.filter(f => f.type === 'image').map(f => f.url);
    const pdfs: PdfItem[] = attached.filter(f => f.type !== 'image').map(f => ({ data: f.url.split(',')[1] || '', name: f.name }));
    const finalText = text || (imgs.length > 0 ? T.imgNote : T.docNote);
    setDraft('');
    setAttached([]);
    setAttachOpen(false);
    speakTokenRef.current++;
    synthRef.current.cancel();
    abortListening();
    latest.current.handleAIResponse(finalText, { images: imgs, pdfs });
  };

  const onChatAction = () => {
    if (hasContent) sendDraft();
    else if (statusRef.current === 'speaking') stopSpeaking();
    else exitChat();
  };

  // ── Lampiran (+) ──
  const openAttach = () => {
    if (isClosingRef.current) return;
    enterChat();
    setAttachOpen(o => !o);
  };

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setAttachOpen(false);
    if (files.length === 0) return;
    const room = MAX_ATTACH - attached.length;
    const picked = files.slice(0, Math.max(0, room));
    const items: Attached[] = [];
    for (const f of picked) {
      const url = await readAsDataUrl(f);
      const type: Attached['type'] = f.type === 'application/pdf' ? 'pdf' : f.type.startsWith('image') ? 'image' : 'text';
      items.push({ id: `${Date.now()}-${Math.random()}`, url, type, name: f.name });
    }
    setAttached(prev => [...prev, ...items].slice(0, MAX_ATTACH));
  };

  // ── Popup pengaturan ──
  const snapTo = (pct: number) => {
    const el = sheetRef.current;
    if (el) {
      el.style.transition = SHEET_TRANS;
      el.style.transform = `translateY(${pct}%)`;
    }
    setSheetPct(pct);
  };

  const openSettings = () => {
    if (isClosingRef.current) return;
    window.clearTimeout(closeSheetTimerRef.current);
    if (statusRef.current === 'listening') { abortListening(); setSt('idle'); }
    setSubOpen(false);
    setSheetMounted(true);
    setSheetPct(100);
    requestAnimationFrame(() => requestAnimationFrame(() => snapTo(SNAP_HALF)));
  };

  const closeSheet = () => {
    snapTo(100);
    window.clearTimeout(closeSheetTimerRef.current);
    closeSheetTimerRef.current = window.setTimeout(() => {
      setSheetMounted(false);
      setSubOpen(false);
    }, 320);
    if (statusRef.current === 'idle' && !chatModeRef.current && settingsRef.current.listenMode === 'auto' && micOnRef.current) {
      resumeListening();
    }
  };

  const openSub = (kind: 'voice' | 'persona') => {
    setSubKind(kind);
    setSubOpen(true);
    if (sheetPct > 0) snapTo(0);
  };

  const onGrabDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = sheetRef.current;
    if (!el) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const m = /translateY\(([-\d.]+)%\)/.exec(el.style.transform);
    const startPct = m ? parseFloat(m[1]) : sheetPct;
    el.style.transition = 'none';
    dragRef.current = { active: true, startY: e.clientY, startPct, h: el.offsetHeight || 1, lastY: e.clientY, lastT: performance.now(), vel: 0, pct: startPct };
  };
  const onGrabMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const el = sheetRef.current;
    if (!d.active || !el) return;
    const now = performance.now();
    d.vel = (e.clientY - d.lastY) / Math.max(1, now - d.lastT);
    d.lastY = e.clientY;
    d.lastT = now;
    d.pct = Math.min(100, Math.max(0, d.startPct + ((e.clientY - d.startY) / d.h) * 100));
    el.style.transform = `translateY(${d.pct}%)`;
  };
  const onGrabUp = () => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    let target: number;
    if (d.vel > 0.6) target = d.startPct < 20 ? SNAP_HALF : 100;
    else if (d.vel < -0.6) target = 0;
    else {
      const opts = [0, SNAP_HALF, 100];
      target = opts.sort((a, b) => Math.abs(a - d.pct) - Math.abs(b - d.pct))[0];
    }
    if (target === 100) closeSheet(); else snapTo(target);
  };

  const onPanelScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (sheetPct === SNAP_HALF && e.currentTarget.scrollTop > 8) snapTo(0);
  };

  const pickVoiceId = (id: string) => {
    setVoiceSel(id);
    voiceIdRef.current = id;
    setOrbPulse(p => p + 1);
    if (id !== profile.voice) updateProfile({ voice: id });
    previewVoice(id);
  };

  // cara bicara berubah → hentikan dengar yang sedang jalan (dilanjutkan lagi saat popup ditutup)
  const firstModeRun = useRef(true);
  useEffect(() => {
    if (firstModeRun.current) { firstModeRun.current = false; return; }
    abortListening();
    if (!chatModeRef.current && statusRef.current === 'listening') setSt('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.listenMode]);

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    abortListening();
    synthRef.current.cancel();
    stopStream();
    window.setTimeout(() => onClose(), 200);
  };

  useEffect(() => {
    isClosingRef.current = false;
    window.dispatchEvent(new CustomEvent('cylen-voice-start'));
    latest.current.resumeListening();
    return () => {
      window.dispatchEvent(new CustomEvent('cylen-voice-end'));
      isClosingRef.current = true;
      window.clearTimeout(restartTimerRef.current);
      window.clearTimeout(closeSheetTimerRef.current);
      const r = recognitionRef.current;
      if (r) { r._dead = true; try { r.abort(); } catch { /* abaikan */ } }
      synthRef.current.cancel();
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────────────────────── TAMPILAN ─────────────────────────
  const orbBeat = (status === 'speaking' || status === 'processing') && activeSpec.id === IDLE_ID && !cameraOn;
  const presetLabel: Record<Preset, string> = { Pembantu: T.p1, Pencerita: T.p2, Santai: T.p3 };

  const mapSrc = stageData
    ? `https://maps.google.com/maps?q=${encodeURIComponent(stageData)}&output=embed`
    : `https://www.openstreetmap.org/export/embed.html?bbox=108.53,-6.74,108.57,-6.70&layer=mapnik`;

  const pill = 'relative flex-1 h-[54px] rounded-full border flex items-center justify-center transition-all active:scale-95 [-webkit-tap-highlight-color:transparent]';
  const pillOff = 'bg-[var(--sf)] border-[var(--bd)] text-[var(--mu)]';
  const pillOn = 'bg-[var(--ac)] border-transparent text-[var(--at)]';

  const pttMode = settings.listenMode === 'ptt';
  const micIsActive = pttMode && status === 'listening';
  const micClass = micIsActive ? pillOn : (!pttMode && !micOn) ? `${pillOff} !text-red-400` : `${pillOff} !text-[var(--text)]`;

  const subTitle = subKind === 'voice' ? T.sLib : T.sCustom;
  const ratePct = ((settings.rate - 0.7) / (1.5 - 0.7)) * 100;

  const menuItem = 'relative w-full flex items-center gap-3 px-3 py-[11px] rounded-[16px] text-[14.5px] font-semibold text-[var(--text)] cursor-pointer active:bg-[var(--text)]/8 [-webkit-tap-highlight-color:transparent]';
  const fileInput = 'absolute inset-0 w-full h-full opacity-0 cursor-pointer';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex flex-col bg-[var(--bg)] text-[var(--text)] overflow-hidden font-sans pointer-events-auto ${chatMode ? '' : 'select-none'}`}
      style={{ bottom: 'var(--kb, 0px)', opacity: isClosing ? 0 : 1, transition: 'opacity 0.2s ease' }}
    >
      <style>{VOICE_CSS}</style>

      {!chatMode && (
        <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 18px)', left: 20, zIndex: 20, pointerEvents: 'none' }}>
          <div
            role="img" aria-label="Cylen"
            style={{
              width: 210, height: 50, backgroundColor: 'var(--text)', opacity: 0.92,
              WebkitMaskImage: 'url(/104076-removebg-preview.png)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'left center',
              maskImage: 'url(/104076-removebg-preview.png)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'left center',
            }}
          />
        </div>
      )}

      {/* ── AREA ATAS: bola/panggung (mode suara) atau transkrip (mode chat) ── */}
      <div className="flex-1 min-h-0 overflow-hidden flex items-center justify-center relative w-full">
        {chatMode ? (
          <div
            ref={feedRef}
            className="absolute inset-0 overflow-y-auto px-4 flex flex-col gap-4 select-text max-w-2xl mx-auto w-full"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)', paddingBottom: 16, scrollbarWidth: 'none', overscrollBehavior: 'contain', touchAction: 'pan-y' }}
          >
            {turns.map(t => (
              t.role === 'user' ? (
                <div key={t.id} className="self-end max-w-[82%] flex flex-col items-end gap-2">
                  {t.imgs && t.imgs.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {t.imgs.map((src, i) => (
                        <img key={i} src={src} alt="" className="h-24 rounded-2xl object-cover border border-[var(--bd)]" />
                      ))}
                    </div>
                  )}
                  {t.files && t.files.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {t.files.map((n, i) => (
                        <span key={i} className="flex items-center gap-1.5 bg-[var(--sf)] border border-[var(--bd)] rounded-full px-3 py-1.5 text-[12.5px] font-medium max-w-[200px]">
                          <FileText size={14} className="flex-shrink-0" />
                          <span className="truncate">{n}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="bg-[var(--sf)] border border-[var(--bd)] rounded-[24px] rounded-br-lg px-4 py-2.5 text-[16px] leading-snug text-[var(--text)] break-words">
                    {t.text}
                  </div>
                </div>
              ) : (
                <div key={t.id} className="self-start max-w-[94%] text-[16px] leading-relaxed text-[var(--text)] whitespace-pre-wrap break-words">
                  {t.text}
                </div>
              )
            ))}
            {status === 'processing' && (
              <div className="self-start flex gap-1.5 py-2" aria-hidden="true">
                <span className="w-2 h-2 rounded-full bg-[var(--text)] opacity-40 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-[var(--text)] opacity-40 animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[var(--text)] opacity-40 animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </div>
        ) : (
          <>
            {activeStage === 'visual' && (
              <div className={`w-full h-full ${orbBeat ? 'cylen-orb-beat' : ''}`}>
                <SimulationCanvas spec={activeSpec} playing={!cameraOn} />
              </div>
            )}

            {activeStage === 'map' && (
              <div className="w-full h-full p-4 flex flex-col max-w-2xl mx-auto" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 76px)' }}>
                <div className="flex items-center gap-2 mb-3 text-sky-500">
                  <MapIcon size={20} />
                  <span className="font-bold tracking-widest uppercase text-sm">{T.map}: {stageData || T.mapDefault}</span>
                </div>
                <div className="flex-1 rounded-3xl overflow-hidden border border-[var(--bd)] pointer-events-auto">
                  <iframe
                    title="map"
                    width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight={0} marginWidth={0}
                    src={mapSrc}
                    style={{ filter: 'invert(90%) hue-rotate(180deg) contrast(150%)' }}
                  />
                </div>
              </div>
            )}

            {activeStage === 'code' && (
              <div className="w-full h-[60%] px-6 flex flex-col max-w-2xl mx-auto">
                <div className="flex items-center gap-2 mb-3 text-green-500">
                  <Code size={20} />
                  <span className="font-bold tracking-widest uppercase text-sm">Terminal Sandbox</span>
                </div>
                <div className="flex-1 bg-[var(--cd)] rounded-3xl border border-[var(--bd)] p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-4 border-b border-[var(--bd)] pb-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="ml-2 text-xs text-[var(--mu)] font-mono">cylen-sandbox ~ {stageData}</span>
                  </div>
                  <div className="flex-1 overflow-auto text-green-500 font-mono text-xs leading-relaxed">
                    {`> Inisialisasi environment...\n> Menjalankan kompilasi ${stageData}...\n> Merender hasil eksekusi...\n\n[Sistem] Kode telah diverifikasi. Tinjau kembali di layar Chat.`}
                  </div>
                </div>
              </div>
            )}

            {cameraOn && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center px-4 pb-2 bg-black"
                style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 76px)' }}
              >
                <div className="relative w-full max-w-2xl h-full rounded-3xl overflow-hidden border border-[var(--bd)] bg-[#0a0a0a]">
                  <video
                    ref={el => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay playsInline muted
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }}
                  />
                  {flash && <div className="absolute inset-0 bg-white/70" />}
                  <button
                    onClick={flipCamera}
                    aria-label={T.flip}
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md active:scale-90 transition-transform [-webkit-tap-highlight-color:transparent]"
                  >
                    <RefreshCw size={18} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── DOCK BAWAH: ikon (mode suara) + lampiran + kolom ketik gaya ChatInput ── */}
      <div
        className="flex-shrink-0 px-2 flex flex-col gap-2.5 max-w-4xl mx-auto w-full pointer-events-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        {notice && <p className="text-[var(--mu)] text-[12.5px] text-center font-medium px-4">{notice}</p>}

        {!chatMode && (
          <div className="flex gap-2.5 px-2">
            <button
              onClick={toggleCamera}
              aria-label={cameraOn ? T.camOn : T.camOff}
              aria-pressed={cameraOn}
              className={`${pill} ${cameraOn ? pillOn : pillOff}`}
            >
              {cameraOn ? <CameraOff size={22} strokeWidth={1.8} /> : <Camera size={22} strokeWidth={1.8} />}
            </button>
            <button
              onClick={toggleVoice}
              aria-label={voiceOn ? T.voiceOnBtn : T.voiceOffBtn}
              aria-pressed={!voiceOn}
              className={`${pill} ${voiceOn ? `${pillOff} !text-[var(--text)]` : `${pillOff} !text-red-400`}`}
            >
              {voiceOn ? <Volume2 size={22} strokeWidth={1.8} /> : <VolumeX size={22} strokeWidth={1.8} />}
            </button>
            <button
              onClick={onMicButton}
              aria-label={pttMode ? (micIsActive ? T.micStopTalk : T.micTalk) : (micOn ? T.micOn : T.micOffBtn)}
              aria-pressed={pttMode ? micIsActive : !micOn}
              className={`${pill} ${micClass}`}
            >
              {(pttMode || micOn) ? <Mic size={22} strokeWidth={1.8} /> : <MicOff size={22} strokeWidth={1.8} />}
            </button>
            <button
              onClick={openSettings}
              aria-label={T.settings}
              className={`${pill} ${pillOff} !text-[var(--text)]`}
            >
              <Settings size={22} strokeWidth={1.8} />
            </button>
          </div>
        )}

        {attached.length > 0 && (
          <div className="px-3 flex gap-2 overflow-x-auto items-center" style={{ scrollbarWidth: 'none' }}>
            {attached.map(f => (
              f.type === 'image' ? (
                <div key={f.id} className="relative flex-shrink-0 h-11 w-[104px] rounded-full overflow-hidden bg-[var(--text)]/7 shadow-sm">
                  <img src={f.url} alt="" className="w-full h-full object-cover block" />
                  <button
                    onClick={() => setAttached(p => p.filter(x => x.id !== f.id))}
                    aria-label={T.removeFile}
                    className="absolute top-[3px] right-[3px] w-5 h-5 bg-black/65 text-white rounded-full flex items-center justify-center [-webkit-tap-highlight-color:transparent]"
                  >
                    <X size={11} strokeWidth={3} />
                  </button>
                </div>
              ) : (
                <div key={f.id} className={`relative flex-shrink-0 flex items-center gap-2 h-11 pl-1 pr-2 rounded-full max-w-[190px] ${f.type === 'pdf' ? 'bg-red-500/10' : 'bg-blue-500/10'}`}>
                  <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${f.type === 'pdf' ? 'bg-red-500/18 text-red-500' : 'bg-blue-500/18 text-blue-500'}`}>
                    <FileText size={16} strokeWidth={2} />
                  </span>
                  <span className="text-[12.5px] font-semibold truncate text-[var(--text)] max-w-[100px] leading-tight">{f.name}</span>
                  <button
                    onClick={() => setAttached(p => p.filter(x => x.id !== f.id))}
                    aria-label={T.removeFile}
                    className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--text)]/10 flex items-center justify-center text-[var(--text)] [-webkit-tap-highlight-color:transparent]"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              )
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            {attachOpen && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setAttachOpen(false)} />
                <div className="absolute left-1.5 bottom-full mb-3 z-[100] w-[240px] rounded-[26px] p-2 bg-[var(--bg)]/95 border border-[var(--text)]/10 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.5)]">
                  <label className={menuItem}>
                    <input type="file" accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain" multiple onChange={onPickFiles} className={fileInput} />
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><FileText size={19} strokeWidth={2} /></span>
                    {T.attFile}
                  </label>
                  <label className={menuItem}>
                    <input type="file" accept="image/*" multiple onChange={onPickFiles} className={fileInput} />
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><ImageIcon size={19} strokeWidth={2} /></span>
                    {T.attGallery}
                  </label>
                  <label className={menuItem}>
                    <input type="file" accept="image/*" capture="environment" onChange={onPickFiles} className={fileInput} />
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-85"><Camera size={19} strokeWidth={2} /></span>
                    {T.attCamera}
                  </label>
                </div>
              </>
            )}

            <div className="rounded-[26px] flex items-center px-2 py-1 relative overflow-hidden bg-[var(--bg)]/70 border border-[var(--text)]/10 backdrop-blur-md" style={{ WebkitTapHighlightColor: 'transparent' }}>
              <button
                onClick={openAttach}
                aria-label={T.attach}
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors z-[105] [-webkit-tap-highlight-color:transparent] ${attachOpen ? 'bg-[var(--text)]/12 text-[var(--text)]' : 'bg-[var(--text)]/6 text-[var(--text)]'}`}
              >
                <Plus size={21} strokeWidth={2.4} />
              </button>

              {/* textarea (bukan input) + atribut anti isi-otomatis: bar sandi / pembayaran / alamat di atas keyboard tidak muncul */}
              <textarea
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onFocus={enterChat}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDraft(); } }}
                placeholder={T.ph}
                rows={1}
                name="cylen-voice-message"
                enterKeyHint="send"
                autoComplete="off"
                aria-autocomplete="none"
                data-lpignore="true"
                data-form-type="other"
                data-1p-ignore="true"
                className="flex-1 min-w-0 bg-transparent border-none outline-none resize-none break-words text-[15.5px] leading-relaxed py-[9px] pl-3 pr-2 min-h-[24px] placeholder:text-[var(--mu)] text-[var(--text)] select-text focus:ring-0 focus:outline-none"
                style={{ outline: 'none', border: 'none', boxShadow: 'none', WebkitAppearance: 'none', overflowY: 'hidden' } as React.CSSProperties}
              />

              {chatMode && (
                <button
                  onClick={onChatAction}
                  onMouseDown={e => { if (hasContent) e.preventDefault(); }}
                  aria-label={hasContent ? T.send : status === 'speaking' ? T.stopSpeak : T.toVoice}
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent] ${hasContent ? 'bg-[var(--text)] text-[var(--bg)] shadow-[0_2px_10px_rgba(0,0,0,0.3)]' : 'bg-[var(--text)]/6 text-[var(--text)]'}`}
                >
                  {hasContent ? <ArrowUpIcon /> : status === 'speaking' ? <StopSquareIcon /> : <WaveIcon />}
                </button>
              )}
            </div>
          </div>

          {!chatMode && (
            <button
              onClick={handleClose}
              className="flex-shrink-0 h-[54px] flex items-center gap-2 bg-[var(--ac)] text-[var(--at)] font-extrabold px-6 rounded-full active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]"
            >
              <X size={16} strokeWidth={3} />
              <span className="text-[14px]">{T.stop}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── POPUP PENGATURAN (bisa ditarik / discroll) ── */}
      {sheetMounted && (
        <>
          <div
            className="absolute inset-0 z-[55] bg-black"
            style={{ opacity: sheetPct < 100 ? 0.5 : 0, transition: 'opacity .3s ease', pointerEvents: sheetPct < 100 ? 'auto' : 'none' }}
            onClick={closeSheet}
          />
          <div
            ref={sheetRef}
            className="absolute left-0 right-0 bottom-0 mx-auto max-w-2xl z-[60] bg-[var(--cd)] rounded-t-[28px] border-t border-[var(--bd)] flex flex-col overflow-hidden select-none"
            style={{ height: '86%', transform: `translateY(${sheetPct}%)`, transition: SHEET_TRANS, willChange: 'transform' }}
          >
            <div
              className="px-5 pt-2.5 pb-1 flex-shrink-0 touch-none cursor-grab"
              onPointerDown={onGrabDown}
              onPointerMove={onGrabMove}
              onPointerUp={onGrabUp}
              onPointerCancel={onGrabUp}
            >
              <div className="w-12 h-1.5 bg-[var(--bd)] rounded-full mx-auto mb-3" />
              <div className="relative h-11 flex items-center justify-center">
                {subOpen && (
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => setSubOpen(false)}
                    aria-label={T.back}
                    className="absolute left-0 w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--ib)]"
                  >
                    <ArrowLeft size={22} />
                  </button>
                )}
                <h3 className="text-[18px] font-bold tracking-tight text-[var(--text)]">{subOpen ? subTitle : T.sTitle}</h3>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="flex h-full" style={{ width: '200%', transform: `translateX(${subOpen ? -50 : 0}%)`, transition: PANEL_TRANS }}>
                {/* PANEL UTAMA */}
                <div className="w-1/2 h-full overflow-y-auto px-4 pt-2 pb-10 select-text flex flex-col gap-3" onScroll={onPanelScroll} style={{ overscrollBehavior: 'contain', scrollbarWidth: 'none' }}>
                  <button
                    onClick={() => openSub('voice')}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-[24px] bg-[var(--sf)] text-[var(--text)] active:bg-[var(--ib)] transition-colors"
                  >
                    <span className="text-[16px] font-semibold">{T.sVoice}</span>
                    <span className="flex items-center gap-1 text-[var(--mu)] text-[15px] font-medium">
                      {voiceSel}
                      <ChevronRight size={18} />
                    </span>
                  </button>

                  {/* PERSONALITI */}
                  <div className="rounded-[24px] bg-[var(--sf)] p-5">
                    <div className="text-[15px] font-semibold text-[var(--text)] mb-3 ml-1">{T.sPersona}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 min-w-0 bg-[var(--ib)] p-1 rounded-full">
                        {PRESETS.map(p => (
                          <button
                            key={p}
                            onClick={() => updateSettings({ preset: p })}
                            aria-pressed={settings.preset === p}
                            className={`flex-1 py-2.5 text-[13px] rounded-full transition-colors duration-200 truncate px-1 ${settings.preset === p ? 'bg-[var(--ac)] text-[var(--at)] font-semibold' : 'text-[var(--mu)] font-medium'}`}
                          >
                            {presetLabel[p]}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => openSub('persona')}
                        aria-label={T.sAddPersona}
                        className="w-11 h-11 rounded-full flex-shrink-0 bg-[var(--ib)] text-[var(--text)] flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Plus size={20} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>

                  {/* KECEPATAN BICARA */}
                  <div className="rounded-[24px] bg-[var(--sf)] p-5">
                    <div className="flex items-center justify-between mb-2 ml-1">
                      <span className="text-[15px] font-semibold text-[var(--text)]">{T.sSpeed}</span>
                      <span className="text-[14px] font-bold text-[var(--mu)]">{settings.rate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range" min={0.7} max={1.5} step={0.05} value={settings.rate}
                      onChange={e => updateSettings({ rate: parseFloat(e.target.value) })}
                      aria-label={T.sSpeed}
                      className="cv-range"
                      style={{ ['--p' as any]: `${ratePct}%` }}
                    />
                    <div className="flex justify-between text-[12px] text-[var(--mu)] font-medium px-1 mt-1">
                      <span>{T.slow}</span><span>{T.normalSp}</span><span>{T.fast}</span>
                    </div>
                  </div>

                  {/* CARA BICARA */}
                  <div className="rounded-[24px] bg-[var(--sf)] p-5">
                    <div className="text-[15px] font-semibold text-[var(--text)] mb-3 ml-1">{T.sListen}</div>
                    <div className="flex bg-[var(--ib)] p-1 rounded-full">
                      {([['auto', T.sAuto], ['ptt', T.sPtt]] as [ListenMode, string][]).map(([id, label]) => (
                        <button
                          key={id}
                          onClick={() => updateSettings({ listenMode: id })}
                          aria-pressed={settings.listenMode === id}
                          className={`flex-1 py-2.5 text-[13px] rounded-full transition-colors duration-200 px-2 ${settings.listenMode === id ? 'bg-[var(--ac)] text-[var(--at)] font-semibold' : 'text-[var(--mu)] font-medium'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[13px] text-[var(--mu)] mt-3 ml-1 leading-snug">
                      {settings.listenMode === 'auto' ? T.hintAuto : T.hintPtt}
                    </p>
                  </div>
                </div>

                {/* PANEL ANAK: Pustaka suara / Kustomisasi (AiSettings) */}
                <div className="w-1/2 h-full overflow-y-auto px-4 pb-10 select-text" onScroll={onPanelScroll} style={{ overscrollBehavior: 'contain', scrollbarWidth: 'none' }}>
                  {subKind === 'voice' && (
                    <>
                      <VoiceOrb pulse={orbPulse} />
                      <div className="flex flex-col gap-[2px]">
                        {VOICES.map(v => (
                          <button
                            key={v.id}
                            onClick={() => pickVoiceId(v.id)}
                            className="w-full flex items-center gap-4 px-5 py-4 text-left text-[var(--text)] bg-[var(--sf)] rounded-[18px] active:scale-[0.985] active:bg-[var(--ib)] transition-[transform,background-color]"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-[17px] font-semibold leading-tight">{v.id}</div>
                              <div className="text-[14px] text-[var(--mu)] mt-0.5">{uiLang === 'en' ? `${v.en}.` : v.idn}</div>
                            </div>
                            {voiceSel === v.id && <Check size={22} strokeWidth={2.5} className="flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {subKind === 'persona' && (
                    <AiSettings embedded onBack={() => setSubOpen(false)} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
