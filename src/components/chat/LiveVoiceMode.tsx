import React, { useEffect, useState, useRef } from 'react';
import {
  Camera, CameraOff, Volume2, VolumeX, Mic, MicOff, Settings, X, Code, Map as MapIcon,
  RefreshCw, ArrowLeft, Check, ChevronRight, Plus,
} from 'lucide-react';
import { chatWithGeminiStream } from '../../services/geminiService';
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
type Turn = { id: number; role: 'user' | 'assistant'; text: string };

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
//    Nanti kalau TTS asli sudah ada, cukup ganti fungsi pickBrowserVoice / makeUtterance.
const PITCHES = [1.1, 1.25, 0.85, 1.0, 1.05, 1.2, 1.15, 0.8];
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
    simFailText: 'Simulasi gagal dibuat.',
    connLost: 'Koneksi terputus.',
    connLostSpeech: 'Maaf, saya kehilangan koneksi internet.',
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
    speakNow: 'Silakan bicara...',
    send: 'Kirim',
    toVoice: 'Kembali ke mode suara',
    stopSpeak: 'Hentikan suara AI',
    back: 'Kembali',
    sTitle: 'Pengaturan suara',
    sVoice: 'Suara',
    sLib: 'Pustaka suara',
    sPersona: 'Personaliti',
    sCustom: 'Kustomisasi Cylen',
    sAddPersona: 'Kustomisasi lanjutan',
    sSpeed: 'Kecepatan bicara',
    sListen: 'Cara bicara',
    sAuto: 'Otomatis dengar',
    sPtt: 'Tekan untuk bicara',
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
    simFailText: 'Simulation could not be created.',
    connLost: 'Connection lost.',
    connLostSpeech: 'Sorry, I lost my internet connection.',
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
    speakNow: 'Go ahead, I am listening...',
    send: 'Send',
    toVoice: 'Back to voice mode',
    stopSpeak: 'Stop AI voice',
    back: 'Back',
    sTitle: 'Voice settings',
    sVoice: 'Voice',
    sLib: 'Voice library',
    sPersona: 'Personality',
    sCustom: 'Customize Cylen',
    sAddPersona: 'Advanced customization',
    sSpeed: 'Speaking speed',
    sListen: 'Talk mode',
    sAuto: 'Always listening',
    sPtt: 'Tap to talk',
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

// ── Ikon kecil (SVG sendiri, supaya tidak tergantung versi lucide) ──
const WaveIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="10" x2="3" y2="14" /><line x1="7.5" y1="6" x2="7.5" y2="18" /><line x1="12" y1="3" x2="12" y2="21" /><line x1="16.5" y1="6" x2="16.5" y2="18" /><line x1="21" y1="10" x2="21" y2="14" />
  </svg>
);
const ArrowUpIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const StopSquareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="3" /></svg>
);

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const { profile, updateProfile } = useProfile();
  const uiLang: 'id' | 'en' = profile.lang === 'en' ? 'en' : 'id';
  const langCode = uiLang === 'en' ? 'en-US' : 'id-ID';
  const T = usePageText('voice', STR);

  // ── STATE ──
  const [status, setStatus] = useState<Status>('idle');
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

  const [cameraOn, setCameraOn] = useState(false);
  const [facing, setFacing] = useState<'user' | 'environment'>(settings.cameraFacing);
  const [flash, setFlash] = useState(false);

  // mode chat (setelah kolom ketik diklik)
  const [chatMode, setChatMode] = useState(false);
  const [draft, setDraft] = useState('');
  const [interim, setInterim] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, startY: 0, startPct: 100, h: 1, lastY: 0, lastT: 0, vel: 0, pct: 100 });

  const latest = useRef<{
    startListening: (manual?: boolean) => void;
    resumeListening: () => void;
    handleAIResponse: (t: string) => void;
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

  // pesan error otomatis hilang
  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(id);
  }, [notice]);

  // transkrip selalu scroll ke bawah
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [turns, status, chatMode]);

  const addTurn = (role: 'user' | 'assistant', text: string) => {
    if (!text || !text.trim()) return;
    setTurns(p => [...p, { id: ++turnIdRef.current, role, text: text.trim() }]);
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
      setInterim(transcript);
      const last = results[results.length - 1];
      if (last?.isFinal && !handled) {
        handled = true;
        setInterim('');
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
      setInterim('');
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
    setInterim('');
  };

  // Kembali ke keadaan "siap": mode suara + otomatis → mendengar; selain itu diam menunggu.
  const resumeListening = () => {
    if (isClosingRef.current) return;
    if (chatModeRef.current || settingsRef.current.listenMode === 'ptt' || !micOnRef.current) { setSt('idle'); return; }
    setSt('listening');
    startListening();
  };

  // Dengar satu kali (tombol mic di "Tekan untuk bicara", atau mic di kolom ketik mode chat)
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
    u.pitch = PITCHES[idx % PITCHES.length];
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
  const handleAIResponse = async (userText: string) => {
    const inChat = chatModeRef.current;
    setSt('processing');
    addTurn('user', userText);

    const image = !inChat && cameraOnRef.current ? captureFrame() : null;
    if (image) { setFlash(true); window.setTimeout(() => setFlash(false), 160); }

    try {
      const langName = langRef.current === 'en-US' ? 'Inggris' : 'Indonesia';
      const styleLine = STYLE_HINT[uiLang][settingsRef.current.preset];
      const camNote = image
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
      const stream = await chatWithGeminiStream(messages, false, undefined, image ? [image] : undefined);

      let fullResponse = '';
      for await (const chunk of stream) fullResponse += (chunk as GenerateContentResponse).text || '';
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
          console.error('[Cylen] Simulasi gagal:', result.errorDetail);
          finishTurn(userText, T.simFail);
          setNotice(T.simFailText);
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
    } catch (error) {
      if (isClosingRef.current) return;
      console.error('[Cylen] Voice error:', error);
      finishTurn(userText, T.connLostSpeech);
      setNotice(T.connLost);
      speakText(T.connLostSpeech);
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
    chatModeRef.current = false;
    setChatMode(false);
    if (statusRef.current === 'idle') resumeListening();
  };

  const stopSpeaking = () => {
    speakTokenRef.current++;
    synthRef.current.cancel();
    resumeListening();
  };

  const sendDraft = () => {
    const t = draft.trim();
    if (!t || statusRef.current === 'processing') return;
    setDraft('');
    speakTokenRef.current++;
    synthRef.current.cancel();
    abortListening();
    latest.current.handleAIResponse(t);
  };

  const onChatAction = () => {
    if (draft.trim()) sendDraft();
    else if (statusRef.current === 'speaking') stopSpeaking();
    else exitChat();
  };

  const onChatMic = () => {
    if (statusRef.current === 'listening') { abortListening(); setSt('idle'); }
    else listenOnce();
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
    updateProfile({ voice: id });
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

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex flex-col bg-[var(--bg)] text-[var(--text)] overflow-hidden font-sans pointer-events-auto ${chatMode ? '' : 'select-none'}`}
      style={{ bottom: 'var(--kb, 0px)', opacity: isClosing ? 0 : 1, transition: 'opacity 0.2s ease' }}
    >
      <style>{`
        @keyframes cylen-orb-beat {
          0%, 100% { transform: scale(1); }
          15% { transform: scale(1.08); }
          30% { transform: scale(1); }
          45% { transform: scale(1.05); }
          60% { transform: scale(1); }
        }
        .cylen-orb-beat { animation: cylen-orb-beat 1.1s ease-in-out infinite; transform-origin: center; }
        @media (prefers-reduced-motion: reduce) { .cylen-orb-beat { animation: none; } }
      `}</style>

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
                <div key={t.id} className="self-end max-w-[82%] bg-[var(--sf)] border border-[var(--bd)] rounded-[24px] rounded-br-lg px-4 py-2.5 text-[16px] leading-snug text-[var(--text)] break-words">
                  {t.text}
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

      {/* ── DOCK BAWAH: ikon (mode suara) + kolom ketik + tombol aksi ── */}
      <div
        className="flex-shrink-0 px-4 flex flex-col gap-2.5 max-w-2xl mx-auto w-full pointer-events-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        {notice && <p className="text-red-400 text-[12px] text-center font-medium px-2">{notice}</p>}

        {!chatMode && (
          <div className="flex gap-2.5">
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

        <div className="flex items-center gap-2.5">
          <label className="flex-1 min-w-0 h-14 flex items-center gap-1 rounded-full bg-[var(--sf)] border border-[var(--bd)] pl-5 pr-1.5 focus-within:border-[var(--mu)] transition-colors">
            <input
              ref={inputRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onFocus={enterChat}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendDraft(); } }}
              placeholder={chatMode ? (interim || (status === 'listening' ? T.speakNow : T.ph)) : T.ph}
              enterKeyHint="send"
              autoComplete="off"
              className="flex-1 min-w-0 bg-transparent outline-none border-none text-[16px] text-[var(--text)] placeholder:text-[var(--mu)] select-text"
              style={{ WebkitAppearance: 'none' } as React.CSSProperties}
            />
            {chatMode && !draft.trim() && (
              <button
                type="button"
                onClick={onChatMic}
                aria-label={status === 'listening' ? T.micStopTalk : T.micTalk}
                className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors active:scale-90 [-webkit-tap-highlight-color:transparent] ${status === 'listening' ? 'bg-[var(--ac)] text-[var(--at)]' : 'text-[var(--mu)]'}`}
              >
                <Mic size={20} strokeWidth={2} />
              </button>
            )}
          </label>

          {chatMode ? (
            <button
              onClick={onChatAction}
              onMouseDown={e => { if (draft.trim()) e.preventDefault(); }}
              aria-label={draft.trim() ? T.send : status === 'speaking' ? T.stopSpeak : T.toVoice}
              className="w-14 h-14 rounded-full flex-shrink-0 bg-[var(--ac)] text-[var(--at)] flex items-center justify-center active:scale-90 transition-transform [-webkit-tap-highlight-color:transparent]"
            >
              {draft.trim() ? <ArrowUpIcon /> : status === 'speaking' ? <StopSquareIcon /> : <WaveIcon />}
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="flex-shrink-0 h-14 flex items-center gap-2 bg-[var(--ac)] text-[var(--at)] font-extrabold px-6 rounded-full active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]"
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
                <div className="w-1/2 h-full overflow-y-auto px-4 pb-10 select-text" onScroll={onPanelScroll} style={{ overscrollBehavior: 'contain', scrollbarWidth: 'none' }}>
                  <button
                    onClick={() => openSub('voice')}
                    className="w-full flex items-center justify-between px-5 py-4 rounded-[20px] bg-[var(--sf)] text-[var(--text)] active:bg-[var(--ib)] transition-colors"
                  >
                    <span className="text-[16px] font-semibold">{T.sVoice}</span>
                    <span className="flex items-center gap-1 text-[var(--mu)] text-[15px] font-medium">
                      {voiceSel}
                      <ChevronRight size={18} />
                    </span>
                  </button>

                  <div className="text-[var(--mu)] text-[13px] font-semibold mt-6 mb-2.5 px-1">{T.sPersona}</div>
                  <div className="flex gap-2">
                    {PRESETS.map(p => (
                      <button
                        key={p}
                        onClick={() => updateSettings({ preset: p })}
                        aria-pressed={settings.preset === p}
                        className={`flex-1 h-12 rounded-full text-[14px] font-semibold transition-colors px-1 truncate ${settings.preset === p ? 'bg-[var(--ac)] text-[var(--at)]' : 'bg-[var(--sf)] text-[var(--text)]'}`}
                      >
                        {presetLabel[p]}
                      </button>
                    ))}
                    <button
                      onClick={() => openSub('persona')}
                      aria-label={T.sAddPersona}
                      className="w-12 h-12 rounded-full flex-shrink-0 bg-[var(--sf)] text-[var(--text)] flex items-center justify-center active:bg-[var(--ib)] transition-colors"
                    >
                      <Plus size={20} strokeWidth={2.2} />
                    </button>
                  </div>

                  <div className="text-[var(--mu)] text-[13px] font-semibold mt-6 mb-2.5 px-1">{T.sSpeed}</div>
                  <div className="rounded-[20px] bg-[var(--sf)] px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[15px] font-semibold text-[var(--text)]">{T.sSpeed}</span>
                      <span className="text-[14px] font-bold text-[var(--mu)]">{settings.rate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range" min={0.7} max={1.5} step={0.05} value={settings.rate}
                      onChange={e => updateSettings({ rate: parseFloat(e.target.value) })}
                      className="w-full accent-[var(--ac)]"
                    />
                  </div>

                  <div className="text-[var(--mu)] text-[13px] font-semibold mt-6 mb-2.5 px-1">{T.sListen}</div>
                  <div className="flex gap-2">
                    {([['auto', T.sAuto], ['ptt', T.sPtt]] as [ListenMode, string][]).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => updateSettings({ listenMode: id })}
                        aria-pressed={settings.listenMode === id}
                        className={`flex-1 h-12 rounded-full text-[14px] font-semibold transition-colors px-2 ${settings.listenMode === id ? 'bg-[var(--ac)] text-[var(--at)]' : 'bg-[var(--sf)] text-[var(--text)]'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* PANEL ANAK: Pustaka suara / Kustomisasi (AiSettings) */}
                <div className="w-1/2 h-full overflow-y-auto px-4 pb-10 select-text" onScroll={onPanelScroll} style={{ overscrollBehavior: 'contain', scrollbarWidth: 'none' }}>
                  {subKind === 'voice' && (
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
