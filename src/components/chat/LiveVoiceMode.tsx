import React, { useEffect, useState, useRef } from 'react';
import {
  Camera, CameraOff, Volume2, VolumeX, Mic, MicOff, Settings, X, Code, Map as MapIcon,
  RefreshCw, RotateCcw, Play,
} from 'lucide-react';
import { chatWithGeminiStream } from '../../services/geminiService';
import { generateSimulationSpec } from '../../services/simulationDirector';
import type { ValidatedSimulationSpec } from '../../lib/simulationSchema';
import { SimulationCanvas } from '../simulation/SimulationCanvas';
import { GenerateContentResponse } from '@google/genai';
import { useProfile } from '../../hooks/useProfile';

interface LiveVoiceModeProps {
  onClose: () => void;
}

// Cuma 3 panggung. 'visual' menampung DUA kondisi (idle DAN simulasi aktif)
// lewat SATU komponen yang sama (SimulationCanvas).
type StageType = 'visual' | 'map' | 'code';
type Status = 'listening' | 'processing' | 'speaking' | 'idle';
type HistoryItem = { role: 'user' | 'assistant'; content: string };

// ─────────────────────────────────────────────
// 🎙️ SIMPAN RIWAYAT — voice nulis ke riwayat chat lewat CustomEvent.
// useChat.ts mendengarkan event ini dan memasukkan pesan ke chat yang aktif,
// jadi tampil rapi di sidebar/riwayat persis seperti chat teks biasa.
// ─────────────────────────────────────────────
const saveTurn = (userText: string, assistantText: string) => {
  if (!userText || !userText.trim()) return;
  window.dispatchEvent(new CustomEvent('cylen-voice-turn', {
    detail: { userText, assistantText },
  }));
};

// ─────────────────────────────────────────────
// PENGATURAN SUARA — disimpan di localStorage (per perangkat), karena daftar
// suara TTS memang beda-beda tiap HP/browser, jadi nggak cocok di-sync ke cloud.
// ─────────────────────────────────────────────
type VoiceLang = 'id-ID' | 'en-US';
interface VoiceSettings {
  lang: VoiceLang;                         // bahasa dengar + bicara
  rate: number;                            // kecepatan bicara AI
  pitch: number;                           // nada suara AI
  voiceURI: string;                        // '' = otomatis
  cameraFacing: 'user' | 'environment';    // kamera default: depan / belakang
  showCaptions: boolean;                   // tampilkan teks jawaban AI di layar
}

const SETTINGS_KEY = 'cylen_voice_settings';

const makeDefaultSettings = (appLang: 'id' | 'en'): VoiceSettings => ({
  lang: appLang === 'en' ? 'en-US' : 'id-ID',
  rate: 1.05,
  pitch: 1.1,
  voiceURI: '',
  cameraFacing: 'user',
  showCaptions: true,
});

const clamp = (n: unknown, min: number, max: number, fallback: number) => {
  const v = typeof n === 'number' && isFinite(n) ? n : fallback;
  return Math.min(max, Math.max(min, v));
};

const loadSettings = (appLang: 'id' | 'en'): VoiceSettings => {
  const d = makeDefaultSettings(appLang);
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return d;
    const p = JSON.parse(raw);
    return {
      lang: p.lang === 'en-US' || p.lang === 'id-ID' ? p.lang : d.lang,
      rate: clamp(p.rate, 0.7, 1.5, d.rate),
      pitch: clamp(p.pitch, 0.8, 1.4, d.pitch),
      voiceURI: typeof p.voiceURI === 'string' ? p.voiceURI : '',
      cameraFacing: p.cameraFacing === 'environment' ? 'environment' : 'user',
      showCaptions: typeof p.showCaptions === 'boolean' ? p.showCaptions : d.showCaptions,
    };
  } catch {
    return d;
  }
};

// ─────────────────────────────────────────────
// TEKS UI (ikut bahasa aplikasi di Profil → Bahasa)
// ─────────────────────────────────────────────
const STR = {
  id: {
    listening: 'Mendengarkan...',
    micOffHint: 'Mikrofon mati — ketuk ikon mikrofon untuk menyalakan',
    unsupported: 'Browser tidak mendukung fitur suara.',
    micDenied: 'Izin mikrofon ditolak. Aktifkan lewat pengaturan situs di browser.',
    analyzing: 'Menganalisis permintaan...',
    building: 'Menyusun simulasi...',
    simPrep: 'Baik, saya siapkan simulasinya sekarang.',
    simFail: 'Maaf, simulasi gagal dibuat.',
    simFailText: 'Simulasi gagal dibuat.',
    connLost: 'Koneksi terputus.',
    connLostSpeech: 'Maaf, saya kehilangan koneksi internet.',
    camHint: 'Kamera aktif — tanyakan apa yang kamu lihat',
    camUnsupported: 'Browser tidak mendukung kamera.',
    camDenied: 'Izin kamera ditolak. Aktifkan lewat pengaturan situs di browser.',
    camNone: 'Kamera tidak ditemukan di perangkat ini.',
    camFail: 'Gagal membuka kamera.',
    camOn: 'Matikan kamera',
    camOff: 'Nyalakan kamera',
    flip: 'Balik kamera',
    micOn: 'Matikan mikrofon',
    micOffBtn: 'Nyalakan mikrofon',
    voiceOnBtn: 'Matikan suara AI',
    voiceOffBtn: 'Nyalakan suara AI',
    settings: 'Pengaturan',
    sTitle: 'Pengaturan Suara',
    sLang: 'Bahasa suara',
    sLangId: 'Indonesia',
    sLangEn: 'English',
    sRate: 'Kecepatan bicara',
    sPitch: 'Nada suara',
    sVoice: 'Suara AI',
    sVoiceAuto: 'Otomatis',
    sVoiceNone: 'Tidak ada suara khusus untuk bahasa ini di perangkatmu.',
    sCamera: 'Kamera default',
    sFront: 'Depan',
    sBack: 'Belakang',
    sCaptions: 'Tampilkan teks jawaban',
    sCaptionsHint: 'Selalu aktif otomatis saat suara AI dimatikan',
    sTest: 'Coba suara',
    sReset: 'Reset',
    sDone: 'Selesai',
    testPhrase: 'Halo, saya Cylen. Begini suara saya sekarang.',
    langName: 'Indonesia',
    statusListening: 'Listening...',
    statusProcessing: 'Processing...',
    statusSpeaking: 'Speaking...',
    statusPaused: 'Paused',
    statusMicOff: 'Mic off',
    map: 'Menampilkan Lokasi',
    mapDefault: 'Lokasi belum disebutkan',
  },
  en: {
    listening: 'Listening...',
    micOffHint: 'Microphone is off — tap the mic icon to turn it on',
    unsupported: 'This browser does not support voice features.',
    micDenied: 'Microphone permission denied. Enable it in your browser site settings.',
    analyzing: 'Analyzing your request...',
    building: 'Building the simulation...',
    simPrep: "Okay, I'll prepare the simulation now.",
    simFail: 'Sorry, the simulation could not be created.',
    simFailText: 'Simulation could not be created.',
    connLost: 'Connection lost.',
    connLostSpeech: 'Sorry, I lost my internet connection.',
    camHint: 'Camera is on — ask about what you see',
    camUnsupported: 'This browser does not support the camera.',
    camDenied: 'Camera permission denied. Enable it in your browser site settings.',
    camNone: 'No camera found on this device.',
    camFail: 'Failed to open the camera.',
    camOn: 'Turn camera off',
    camOff: 'Turn camera on',
    flip: 'Flip camera',
    micOn: 'Turn microphone off',
    micOffBtn: 'Turn microphone on',
    voiceOnBtn: 'Turn AI voice off',
    voiceOffBtn: 'Turn AI voice on',
    settings: 'Settings',
    sTitle: 'Voice Settings',
    sLang: 'Voice language',
    sLangId: 'Indonesia',
    sLangEn: 'English',
    sRate: 'Speaking speed',
    sPitch: 'Voice pitch',
    sVoice: 'AI voice',
    sVoiceAuto: 'Automatic',
    sVoiceNone: 'No dedicated voice for this language on your device.',
    sCamera: 'Default camera',
    sFront: 'Front',
    sBack: 'Back',
    sCaptions: 'Show reply text',
    sCaptionsHint: 'Always on automatically when AI voice is off',
    sTest: 'Test voice',
    sReset: 'Reset',
    sDone: 'Done',
    testPhrase: "Hi, I'm Cylen. This is how I sound right now.",
    langName: 'English',
    statusListening: 'Listening...',
    statusProcessing: 'Processing...',
    statusSpeaking: 'Speaking...',
    statusPaused: 'Paused',
    statusMicOff: 'Mic off',
    map: 'Showing Location',
    mapDefault: 'No location mentioned',
  },
} as const;

// ── IDLE SPEC ── bola partikel netral, satu-satunya "default" di seluruh sistem.
const IDLE_SPEC: ValidatedSimulationSpec = {
  schemaVersion: '1.0',
  id: 'idle-sphere',
  meta: { title: 'Idle', summary: 'Menunggu topik dari user.' },
  mode: '3d',
  scene: { background: '#000000', lighting: { ambientIntensity: 0.4, keyLightIntensity: 1, glow: true } },
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
      material: { color: '#ffffff', style: 'glow', opacity: 0.85 },
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
};

const MAX_HISTORY = 8; // 4 giliran terakhir (user + AI)

export const LiveVoiceMode: React.FC<LiveVoiceModeProps> = ({ onClose }) => {
  const { profile } = useProfile();
  const uiLang: 'id' | 'en' = profile.lang === 'en' ? 'en' : 'id';
  const T = STR[uiLang];

  // ── STATE ──
  const [status, setStatus] = useState<Status>('listening');
  const [uiText, setUiText] = useState<string>(T.listening);
  const [caption, setCaption] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const [activeStage, setActiveStage] = useState<StageType>('visual');
  const [stageData, setStageData] = useState<string>('');
  const [activeSpec, setActiveSpec] = useState<ValidatedSimulationSpec>(IDLE_SPEC);

  const [micOn, setMicOn] = useState(true);
  const [voiceOn, setVoiceOn] = useState(true);

  const [settings, setSettings] = useState<VoiceSettings>(() => loadSettings(uiLang));
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>(settings.cameraFacing);
  const [flash, setFlash] = useState(false);

  // ── REF (nilai terbaru yang dibaca dari callback async / event SpeechRecognition) ──
  const statusRef = useRef<Status>('listening');
  const isClosingRef = useRef(false);
  const micOnRef = useRef(true);
  const voiceOnRef = useRef(true);
  const cameraOnRef = useRef(false);
  const settingsRef = useRef<VoiceSettings>(settings);
  const activeSpecRef = useRef<ValidatedSimulationSpec | null>(null);
  const historyRef = useRef<HistoryItem[]>([]);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const restartTimerRef = useRef<number | undefined>(undefined);
  const speakTokenRef = useRef(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Fungsi-fungsi di bawah dibuat ulang tiap render. Handler SpeechRecognition /
  // timer yang hidup lama selalu lewat `latest.current` supaya memakai versi
  // TERBARU (teks bahasa, pengaturan, dll), bukan versi basi dari render pertama.
  const latest = useRef<{
    startListening: () => void;
    resumeListening: () => void;
    handleAIResponse: (t: string) => void;
  }>({ startListening: () => {}, resumeListening: () => {}, handleAIResponse: () => {} });

  const setSt = (s: Status) => { statusRef.current = s; setStatus(s); };

  useEffect(() => {
    activeSpecRef.current = activeSpec.id === IDLE_SPEC.id ? null : activeSpec;
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

  // Daftar suara TTS (di Android/Chrome baru terisi setelah event 'voiceschanged')
  useEffect(() => {
    const synth = synthRef.current;
    const load = () => setVoices(synth.getVoices());
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => synth.removeEventListener?.('voiceschanged', load);
  }, []);

  // ───────────────────────── KAMERA ─────────────────────────
  const stopStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startCamera = async (mode: 'user' | 'environment') => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError(T.camUnsupported); return false; }
    try {
      stopStream();
      // audio:false → TIDAK rebutan mikrofon dengan SpeechRecognition
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (isClosingRef.current) { stream.getTracks().forEach(t => t.stop()); return false; }
      streamRef.current = stream;
      cameraOnRef.current = true;
      // Pasang langsung ke <video> yang sudah ada (kasus balik kamera: cameraOn
      // sudah true jadi nggak ada re-render yang bakal masang stream barunya).
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
      return true;
    } catch (err: any) {
      const n = err?.name;
      setCameraError(
        n === 'NotAllowedError' || n === 'SecurityError' ? T.camDenied
        : n === 'NotFoundError' || n === 'OverconstrainedError' ? T.camNone
        : T.camFail
      );
      cameraOnRef.current = false;
      setCameraOn(false);
      return false;
    }
  };

  const closeCamera = () => {
    stopStream();
    cameraOnRef.current = false;
    setCameraOn(false);
    setCameraError(null);
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

  // Ambil 1 frame dari kamera (diperkecil biar ringan dikirim ke AI)
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
    ctx.drawImage(v, 0, 0, c.width, c.height); // frame asli (tidak dicermin)
    return c.toDataURL('image/jpeg', 0.7);
  };

  // ───────────────────────── MIKROFON (DENGAR) ─────────────────────────
  const scheduleRestart = (ms: number) => {
    window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      if (!isClosingRef.current && statusRef.current === 'listening') latest.current.startListening();
    }, ms);
  };

  const startListening = () => {
    if (isClosingRef.current || !micOnRef.current) return;
    if (statusRef.current !== 'listening') return;
    if (recognitionRef.current) return; // sudah ada sesi dengar yang aktif — jangan dobel

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setUiText(T.unsupported); return; }

    const rec = new SR();
    rec.lang = settingsRef.current.lang;
    rec.continuous = false;
    rec.interimResults = true;

    let handled = false;
    let errored = false;

    rec.onstart = () => { setUiText(T.listening); };

    rec.onresult = (e: any) => {
      const results = Array.from(e.results) as any[];
      const transcript = results.map(r => r[0].transcript).join('');
      setUiText(`"${transcript}"`);
      const last = results[results.length - 1];
      if (last?.isFinal && !handled) {
        handled = true;
        try { rec.stop(); } catch { /* abaikan */ }
        const text = transcript.trim();
        if (text) latest.current.handleAIResponse(text);
        else scheduleRestart(300);
      }
    };

    rec.onerror = (e: any) => {
      errored = true;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        micOnRef.current = false;
        setMicOn(false);
        if (statusRef.current === 'listening') setSt('idle');
        setUiText(T.micDenied);
      }
    };

    rec.onend = () => {
      if (recognitionRef.current === rec) recognitionRef.current = null;
      if (!handled) scheduleRestart(errored ? 1000 : 300);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      recognitionRef.current = null;
      scheduleRestart(800);
    }
  };

  const abortListening = () => {
    window.clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.abort(); } catch { /* abaikan */ }
  };

  const resumeListening = () => {
    if (isClosingRef.current) return;
    if (!micOnRef.current) { setSt('idle'); setUiText(T.micOffHint); return; }
    setSt('listening');
    setUiText(T.listening);
    startListening();
  };

  // ───────────────────────── SUARA AI (BICARA) ─────────────────────────
  const speakText = (text: string, opts: { resume?: boolean; holdMs?: number; display?: string } = {}) => {
    if (isClosingRef.current) return;
    const { resume = true, holdMs = 0, display } = opts;
    const clean = text.trim();

    setCaption(clean);
    setUiText(display ?? (clean.length > 80 ? clean.slice(0, 80) + '...' : clean));

    // token: event end/error dari ucapan LAMA (yang di-cancel) diabaikan
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

    // Suara AI dimatikan (atau teks kosong): jangan bicara, langsung lanjut.
    if (!voiceOnRef.current || !clean) { done(); return; }

    setSt('speaking');
    const s = settingsRef.current;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = s.lang; u.rate = s.rate; u.pitch = s.pitch;
    if (s.voiceURI) {
      const v = synthRef.current.getVoices().find(x => x.voiceURI === s.voiceURI);
      if (v) u.voice = v;
    }
    u.onend = done;
    u.onerror = done;
    synthRef.current.speak(u);
  };

  // ───────────────────────── OTAK AI ─────────────────────────
  const handleAIResponse = async (userText: string) => {
    setSt('processing');
    setUiText(T.analyzing);

    // Kalau kamera nyala: ambil frame SEKARANG (saat user selesai ngomong)
    const image = cameraOnRef.current ? captureFrame() : null;
    if (image) { setFlash(true); window.setTimeout(() => setFlash(false), 160); }

    try {
      const langName = settingsRef.current.lang === 'en-US' ? 'Inggris' : 'Indonesia';
      const camNote = image
        ? `\n\nKamera user sedang aktif. Gambar terlampir adalah apa yang dilihat kamera SAAT INI. Kalau pertanyaan user berkaitan dengan apa yang terlihat, jawab berdasarkan gambar itu dengan [STAGE: CHAT].`
        : '';

      const directorPrompt = `User berkata: "${userText}".

Sebagai Cylen AI, tentukan panggung visual yang tepat. Balas HANYA dengan SATU tag di awal jawaban, lalu penjelasan lisan singkat (maks 2 kalimat) setelahnya:

1. [STAGE: MAP | Alamat] -> kalau user bertanya lokasi/jalan/tempat.
2. [STAGE: CODE | Bahasa] -> kalau user minta koding/script dibuatkan.
3. [STAGE: SIMULATION] -> kalau user minta simulasi/visualisasi/model 3D-2D dari
   APAPUN — organ tubuh, mesin, denah/tata ruang, planet, jaringan, molekul,
   proses, dst — atau minta ubah/tambah pada simulasi yang sedang tampil.
   Ini SATU-SATUNYA panggung untuk semua permintaan visual/simulasi.
4. [STAGE: CHAT] -> percakapan lain yang tidak butuh visual simulasi.

Untuk tag SIMULATION, penjelasan lisan cukup kalimat pendek penanda kamu akan
segera menyiapkannya — penjelasan detail menyusul setelah simulasi selesai.

Jawab dalam bahasa ${langName}.${camNote}`;

      // Riwayat singkat supaya pertanyaan lanjutan ("yang tadi gimana?") nyambung.
      // Jawaban AI disimpan LENGKAP dengan tag-nya biar format [STAGE: ...] tetap ditiru.
      const messages: HistoryItem[] = [...historyRef.current, { role: 'user', content: directorPrompt }];
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
      const stageType = stageMatch ? stageMatch[1].trim().toUpperCase() : 'CHAT';
      const stageArg = stageMatch?.[2]?.trim() ?? '';
      const spokenText = fullResponse.replace(/\[STAGE:.*?\]/i, '').trim().replace(/[*_#]/g, '');

      // Panggung peta/kode/simulasi menang atas kamera → tutup kamera biar kelihatan.
      if (stageType === 'MAP') {
        saveTurn(userText, spokenText); // 🎙️ simpan ke riwayat chat
        closeCamera(); setActiveStage('map'); setStageData(stageArg.toLowerCase()); speakText(spokenText); return;
      }
      if (stageType === 'CODE') {
        saveTurn(userText, spokenText); // 🎙️ simpan ke riwayat chat
        closeCamera(); setActiveStage('code'); setStageData(stageArg.toLowerCase()); speakText(spokenText); return;
      }

      if (stageType === 'SIMULATION') {
        closeCamera();
        setActiveStage('visual');
        // resume:false → jangan mulai dengar lagi selagi simulasi disusun
        speakText(spokenText || T.simPrep, { resume: false });
        setUiText(T.building);

        const result = await generateSimulationSpec(
          userText,
          activeSpecRef.current ?? undefined,
          () => setUiText(T.building)
        );
        if (isClosingRef.current) return;

        if (result.usedFallback) {
          // activeSpec TIDAK diganti. Alasan teknis asli ditampilkan beberapa detik
          // (buat di-screenshot untuk debugging), suara tetap generik.
          console.error('[Cylen] Simulasi gagal:', result.errorDetail);
          saveTurn(userText, T.simFail); // 🎙️ simpan ke riwayat chat
          speakText(T.simFail, {
            holdMs: 4000,
            display: result.errorDetail ? `Debug: ${result.errorDetail}`.slice(0, 300) : T.simFailText,
          });
          return;
        }

        setActiveSpec(result.spec);
        // 🎙️ simpan ke riwayat chat
        saveTurn(userText, result.spec.explanation.narration || spokenText || T.simPrep);
        speakText(result.spec.explanation.narration);
        return;
      }

      // CHAT
      saveTurn(userText, spokenText); // 🎙️ simpan ke riwayat chat
      setActiveStage('visual');
      speakText(spokenText);
    } catch (error) {
      if (isClosingRef.current) return;
      console.error('[Cylen] Voice error:', error);
      saveTurn(userText, T.connLostSpeech); // 🎙️ simpan ke riwayat chat
      speakText(T.connLostSpeech, { display: T.connLost });
    }
  };

  // Selalu simpan versi terbaru fungsi-fungsi di atas
  latest.current = { startListening, resumeListening, handleAIResponse };

  // ───────────────────────── TOMBOL ─────────────────────────
  const toggleMic = () => {
    if (isClosingRef.current) return;
    if (micOnRef.current) {
      micOnRef.current = false;
      setMicOn(false);
      abortListening();
      if (statusRef.current === 'listening') { setSt('idle'); setUiText(T.micOffHint); }
    } else {
      micOnRef.current = true;
      setMicOn(true);
      if (statusRef.current === 'speaking') {
        // ketuk mic saat AI bicara = potong AI & langsung dengerin
        speakTokenRef.current++;
        synthRef.current.cancel();
        resumeListening();
      } else if (statusRef.current === 'idle') {
        resumeListening();
      }
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

  const openSettings = () => {
    // Jeda dengar selagi pengaturan terbuka (biar tes suara nggak ikut "terdengar")
    if (statusRef.current === 'listening') {
      abortListening();
      setSt('idle');
    }
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
    if (statusRef.current === 'idle') resumeListening();
  };

  const testVoice = () => {
    const s = settingsRef.current;
    const u = new SpeechSynthesisUtterance(T.testPhrase);
    u.lang = s.lang; u.rate = s.rate; u.pitch = s.pitch;
    if (s.voiceURI) {
      const v = synthRef.current.getVoices().find(x => x.voiceURI === s.voiceURI);
      if (v) u.voice = v;
    }
    synthRef.current.cancel();
    synthRef.current.speak(u);
  };

  const resetSettings = () => {
    const d = makeDefaultSettings(uiLang);
    settingsRef.current = d;
    setSettings(d);
    setFacing(d.cameraFacing);
  };

  const handleClose = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    abortListening();
    synthRef.current.cancel();
    stopStream();
    window.setTimeout(() => onClose(), 200);
  };

  // Mulai dengar saat dibuka; bersihkan semuanya (mic, suara, kamera, timer) saat ditutup
  useEffect(() => {
    isClosingRef.current = false; // aman buat React StrictMode (mount → cleanup → mount)
    window.dispatchEvent(new CustomEvent('cylen-voice-start')); // 🎙️ awal sesi voice
    latest.current.startListening();
    return () => {
      window.dispatchEvent(new CustomEvent('cylen-voice-end')); // 🎙️ akhir sesi voice
      isClosingRef.current = true;
      window.clearTimeout(restartTimerRef.current);
      try { recognitionRef.current?.abort(); } catch { /* abaikan */ }
      synthRef.current.cancel();
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────────────────────── TAMPILAN ─────────────────────────
  const captionsOn = settings.showCaptions || !voiceOn;
  const langPrefix = settings.lang.slice(0, 2).toLowerCase();
  const langVoices = voices.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(langPrefix));

  const statusLabel =
    status === 'speaking' ? T.statusSpeaking
    : status === 'processing' ? T.statusProcessing
    : status === 'listening' ? T.statusListening
    : micOn ? T.statusPaused : T.statusMicOff;

  const dotClass =
    status === 'speaking'   ? 'bg-white animate-pulse'
    : status === 'processing' ? 'bg-white/60 animate-bounce'
    : status === 'listening'  ? 'bg-white/40 animate-pulse'
    : micOn ? 'bg-white/30' : 'bg-red-400/80';

  const mapSrc = stageData
    ? `https://maps.google.com/maps?q=${encodeURIComponent(stageData)}&output=embed`
    : `https://www.openstreetmap.org/export/embed.html?bbox=108.53,-6.74,108.57,-6.70&layer=mapnik`;

  const btn = 'relative w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 [-webkit-tap-highlight-color:transparent]';

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-[#000000] overflow-hidden font-sans touch-none select-none pointer-events-auto"
      style={{ opacity: isClosing ? 0 : 1, transition: 'opacity 0.2s ease', height: '100dvh', width: '100vw' }}
    >
      <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 18px)', left: 20, zIndex: 20, pointerEvents: 'none' }}>
        <div
          role="img" aria-label="Cylen"
          style={{
            width: 210, height: 50, backgroundColor: '#ffffff', opacity: 0.92,
            WebkitMaskImage: 'url(/104076-removebg-preview.png)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'left center',
            maskImage: 'url(/104076-removebg-preview.png)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'left center',
          }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center relative w-full h-full">
        {/* 'visual' SELALU render komponen yang SAMA. Saat kamera menutupi layar,
            partikel di-pause (playing=false) biar GPU nggak kerja dua kali. */}
        {activeStage === 'visual' && (
          <div className="w-full h-full">
            <SimulationCanvas spec={activeSpec} playing={!cameraOn} />
          </div>
        )}

        {activeStage === 'map' && (
          <div className="w-full h-full p-4 flex flex-col animate-in fade-in zoom-in duration-500 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3 text-sky-400">
              <MapIcon size={20} />
              <span className="font-bold tracking-widest uppercase text-sm">{T.map}: {stageData || T.mapDefault}</span>
            </div>
            <div className="flex-1 rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(56,189,248,0.2)] pointer-events-auto">
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
          <div className="w-full h-[60%] px-6 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-500 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 mb-3 text-green-400">
              <Code size={20} />
              <span className="font-bold tracking-widest uppercase text-sm">Terminal Sandbox</span>
            </div>
            <div className="flex-1 bg-[#0a0a0a] rounded-3xl border border-[#222] p-5 shadow-[0_0_30px_rgba(74,222,128,0.1)] flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-3">
                <div className="w-3 h-3 rounded-full bg-red-500"/>
                <div className="w-3 h-3 rounded-full bg-yellow-500"/>
                <div className="w-3 h-3 rounded-full bg-green-500"/>
                <span className="ml-2 text-xs text-white/50 font-mono">cylen-sandbox ~ {stageData}</span>
              </div>
              <div className="flex-1 overflow-auto text-green-400/80 font-mono text-xs leading-relaxed">
                {`> Inisialisasi environment...\n> Menjalankan kompilasi ${stageData}...\n> Merender hasil eksekusi...\n\n[Sistem] Kode telah diverifikasi. Tinjau kembali di layar Chat.`}
              </div>
            </div>
          </div>
        )}

        {/* ── KAMERA LIVE — menutupi panggung selama aktif ── */}
        {cameraOn && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center px-4 pb-2 bg-black animate-in fade-in duration-200"
            style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 76px)' }}
          >
            <div className="relative w-full max-w-2xl h-full rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0a]">
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
              <div className="absolute bottom-3 inset-x-3 text-center text-[12px] font-medium text-white/85 bg-black/45 rounded-full px-3 py-1.5 backdrop-blur-md">
                {T.camHint}
              </div>
            </div>
          </div>
        )}
      </div>

      {(cameraError || (captionsOn && caption)) && (
        <div className="px-6 pb-2 max-w-2xl mx-auto w-full flex flex-col gap-1">
          {cameraError && <p className="text-red-300 text-[12px] text-center font-medium">{cameraError}</p>}
          {captionsOn && caption && (
            <p className="text-white/80 text-[14px] leading-snug text-center max-h-[76px] overflow-y-auto" style={{ touchAction: 'pan-y' }}>
              {caption}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 pb-5 px-6 max-w-2xl mx-auto w-full">
        <div className="text-white font-bold text-[20px] tracking-tight text-center flex items-center justify-center gap-2">
          Cylen Voice <span className="bg-white/10 text-white/80 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-white/20">Beta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${dotClass}`} />
          <span className="text-white/50 text-[13px] font-medium">{statusLabel}</span>
        </div>
      </div>

      <div className="px-4 pb-8 flex flex-col gap-3 pointer-events-auto max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-around bg-white/[0.07] rounded-[28px] px-4 py-2.5 border border-white/10">
          <button
            onClick={toggleCamera}
            aria-label={cameraOn ? T.camOn : T.camOff}
            aria-pressed={cameraOn}
            className={`${btn} ${cameraOn ? 'bg-white text-black' : 'text-white/70 active:text-white'}`}
          >
            {cameraOn ? <CameraOff size={22} strokeWidth={1.8} /> : <Camera size={22} strokeWidth={1.8} />}
          </button>
          <button
            onClick={toggleVoice}
            aria-label={voiceOn ? T.voiceOnBtn : T.voiceOffBtn}
            aria-pressed={!voiceOn}
            className={`${btn} ${voiceOn ? 'text-white/70 active:text-white' : 'text-red-400'}`}
          >
            {voiceOn ? <Volume2 size={22} strokeWidth={1.8} /> : <VolumeX size={22} strokeWidth={1.8} />}
          </button>
          <button
            onClick={toggleMic}
            aria-label={micOn ? T.micOn : T.micOffBtn}
            aria-pressed={!micOn}
            className={`${btn} ${micOn ? (status === 'listening' ? 'text-white' : 'text-white/70') : 'text-red-400'}`}
          >
            {micOn ? <Mic size={22} strokeWidth={1.8} /> : <MicOff size={22} strokeWidth={1.8} />}
          </button>
          <button
            onClick={openSettings}
            aria-label={T.settings}
            className={`${btn} text-white/70 active:text-white`}
          >
            <Settings size={22} strokeWidth={1.8} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 bg-white/[0.07] rounded-[28px] px-5 py-3 border border-white/10">
          <span className="text-white/30 text-[14px] font-medium truncate min-w-0">{uiText}</span>
          <button
            onClick={handleClose}
            className="flex-shrink-0 flex items-center gap-2 bg-white text-black font-extrabold px-5 py-2.5 rounded-full active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.15)] [-webkit-tap-highlight-color:transparent]"
          >
            <X size={16} strokeWidth={3} />
            <span className="text-[14px]">Stop</span>
          </button>
        </div>
      </div>

      {/* ── PENGATURAN ── */}
      {showSettings && (
        <div className="absolute inset-0 z-50 pointer-events-auto">
          <div className="absolute inset-0 bg-black/70" onClick={closeSettings} />
          <div
            className="absolute bottom-0 left-0 right-0 max-w-2xl mx-auto bg-[#111111] rounded-t-[28px] border-t border-white/10 px-5 pt-3 overflow-y-auto animate-in slide-in-from-bottom duration-200 select-text"
            style={{ maxHeight: '82dvh', touchAction: 'pan-y', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
          >
            <div className="w-12 h-1.5 bg-white/15 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white text-[18px] font-bold tracking-tight">{T.sTitle}</h3>
              <button
                onClick={resetSettings}
                className="flex items-center gap-1.5 text-white/50 text-[13px] font-semibold px-3 py-1.5 rounded-full bg-white/5 active:scale-95 transition-transform"
              >
                <RotateCcw size={13} /> {T.sReset}
              </button>
            </div>

            {/* Bahasa */}
            <div className="mb-5">
              <div className="text-white/50 text-[12px] font-semibold uppercase tracking-wider mb-2">{T.sLang}</div>
              <div className="flex gap-2">
                {([['id-ID', T.sLangId], ['en-US', T.sLangEn]] as [VoiceLang, string][]).map(([code, label]) => (
                  <button
                    key={code}
                    onClick={() => updateSettings({ lang: code, voiceURI: '' })}
                    className={`flex-1 py-3 rounded-2xl text-[14px] font-bold transition-colors ${settings.lang === code ? 'bg-white text-black' : 'bg-white/[0.07] text-white/70'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kecepatan */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-[12px] font-semibold uppercase tracking-wider">{T.sRate}</span>
                <span className="text-white/80 text-[13px] font-bold">{settings.rate.toFixed(2)}x</span>
              </div>
              <input
                type="range" min={0.7} max={1.5} step={0.05} value={settings.rate}
                onChange={e => updateSettings({ rate: parseFloat(e.target.value) })}
                className="w-full accent-white"
              />
            </div>

            {/* Nada */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-[12px] font-semibold uppercase tracking-wider">{T.sPitch}</span>
                <span className="text-white/80 text-[13px] font-bold">{settings.pitch.toFixed(2)}</span>
              </div>
              <input
                type="range" min={0.8} max={1.4} step={0.05} value={settings.pitch}
                onChange={e => updateSettings({ pitch: parseFloat(e.target.value) })}
                className="w-full accent-white"
              />
            </div>

            {/* Pilih suara */}
            <div className="mb-5">
              <div className="text-white/50 text-[12px] font-semibold uppercase tracking-wider mb-2">{T.sVoice}</div>
              {langVoices.length > 0 ? (
                <select
                  value={settings.voiceURI}
                  onChange={e => updateSettings({ voiceURI: e.target.value })}
                  className="w-full bg-white/[0.07] text-white rounded-2xl px-4 py-3 text-[14px] font-semibold border border-white/10 outline-none"
                >
                  <option value="" className="bg-[#111111]">{T.sVoiceAuto}</option>
                  {langVoices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI} className="bg-[#111111]">{v.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-white/40 text-[13px]">{T.sVoiceNone}</p>
              )}
              <button
                onClick={testVoice}
                className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[0.07] text-white text-[14px] font-bold active:scale-[0.98] transition-transform"
              >
                <Play size={15} fill="currentColor" /> {T.sTest}
              </button>
            </div>

            {/* Kamera default */}
            <div className="mb-5">
              <div className="text-white/50 text-[12px] font-semibold uppercase tracking-wider mb-2">{T.sCamera}</div>
              <div className="flex gap-2">
                {([['user', T.sFront], ['environment', T.sBack]] as ['user' | 'environment', string][]).map(([code, label]) => (
                  <button
                    key={code}
                    onClick={() => { updateSettings({ cameraFacing: code }); if (!cameraOnRef.current) setFacing(code); }}
                    className={`flex-1 py-3 rounded-2xl text-[14px] font-bold transition-colors ${settings.cameraFacing === code ? 'bg-white text-black' : 'bg-white/[0.07] text-white/70'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Teks jawaban */}
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-white text-[14px] font-semibold">{T.sCaptions}</div>
                <div className="text-white/40 text-[12px] mt-0.5">{T.sCaptionsHint}</div>
              </div>
              <button
                role="switch"
                aria-checked={settings.showCaptions}
                onClick={() => updateSettings({ showCaptions: !settings.showCaptions })}
                className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors ${settings.showCaptions ? 'bg-white' : 'bg-white/15'}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full transition-all ${settings.showCaptions ? 'left-[22px] bg-black' : 'left-0.5 bg-white/70'}`} />
              </button>
            </div>

            <button
              onClick={closeSettings}
              className="w-full py-3.5 rounded-full bg-white text-black font-extrabold text-[15px] active:scale-[0.98] transition-transform"
            >
              {T.sDone}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
