// ─────────────────────────────────────────────
// SPECIAL BUBBLE STATES
// src/components/chat/components/ui/SpecialBubbles.tsx
// FileActivityBlock · AutoReminderBubble
//
// PERUBAHAN:
//   • ActivityBubble (loading) + FileLinkElement (kartu selesai, persegi
//     panjang) DIGABUNG jadi satu komponen: FileActivityBlock.
//     Dulu keduanya komponen terpisah → saat loading selesai React membuang
//     yang satu dan memasang yang lain, makanya kalimat pembuka hilang dan
//     bentuk kartunya berubah. Sekarang instance-nya SAMA dari awal sampai
//     akhir; yang berubah cuma isi kartunya (loading → siap diunduh).
//   • Kalimat pembuka ("Baik, saya akan membuatkan PDF untukmu...") TIDAK
//     hilang lagi. Dia diturunkan dari tipe file, jadi pesan lama di riwayat
//     juga otomatis punya kalimat ini tanpa field baru di Message.
//   • Kartu tetap persegi (220×260) di kedua state.
//   • Baris progress dibuat 1 baris (nowrap + ellipsis) supaya teks tidak
//     wrap 2 baris lalu kepotong pas animasi masuk.
// ─────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, List, Presentation, Palette, Bookmark, Clock, Download } from 'lucide-react';
import { LoadingDots } from './Primitives';
import type { ActivityStatus, Message } from '../../types';

// ── Kalimat pembuka per tipe ──────────────────
const ACTIVITY_MESSAGES: Record<string, string> = {
  pdf:   'Baik, saya akan membuatkan PDF untukmu...',
  docs:  'Baik, saya akan menyiapkan dokumen untukmu...',
  excel: 'Baik, saya akan membuat spreadsheet untukmu...',
  ppt:   'Baik, saya akan merancang presentasi untukmu...',
  image: 'Baik, saya akan membuat gambar untukmu...',
  ebook: 'Baik, saya akan menyusun ebook untukmu...',
};

// ── Realtime teks yang ditampilkan di dalam kertas ──
const ACTIVITY_REALTIME_TEXTS: Record<string, string[]> = {
  pdf: [
    'Menyusun struktur dokumen PDF...',
    'Menambahkan header dan footer...',
    'Mengatur layout konten...',
    'Menyisipkan tabel dan grafik...',
    'Memformat angka dan data...',
    'Menerapkan styling profesional...',
    'Menghitung total dan kalkulasi...',
    'Menyempurnakan tampilan akhir...',
  ],
  docs: [
    'Menyusun kerangka dokumen...',
    'Menulis paragraf pembuka...',
    'Menambahkan konten utama...',
    'Mengatur heading dan subheading...',
    'Menyempurnakan format teks...',
  ],
  excel: [
    'Menyiapkan kolom dan baris...',
    'Mengisi data tabel...',
    'Membuat formula kalkulasi...',
    'Menambahkan chart dan grafik...',
    'Memformat sel dan border...',
  ],
  ppt: [
    'Menyusun slide pertama...',
    'Menambahkan konten slide...',
    'Mengatur transisi dan animasi...',
    'Menyisipkan gambar dan ikon...',
    'Finalisasi desain presentasi...',
  ],
  image: [
    'Menganalisis prompt gambar...',
    'Menyusun komposisi visual...',
    'Menerapkan gaya artistik...',
    'Menghaluskan detail gambar...',
  ],
  ebook: [
    'Menyusun daftar isi...',
    'Menulis bab pertama...',
    'Menambahkan konten bab...',
    'Mengatur layout ebook...',
    'Finalisasi dan ekspor...',
  ],
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  pdf:   <FileText size={20} />,
  docs:  <FileText size={20} />,
  excel: <List size={20} />,
  ppt:   <Presentation size={20} />,
  image: <Palette size={20} />,
  ebook: <Bookmark size={20} />,
};

const ACTIVITY_LABELS: Record<string, string> = {
  pdf:   'PDF',
  docs:  'DOKUMEN',
  excel: 'SPREADSHEET',
  ppt:   'PRESENTASI',
  image: 'GAMBAR',
  ebook: 'EBOOK',
};

// Style dasar konten kartu: menutupi seluruh kartu, jadi state loading &
// state selesai menempati ruang yang persis sama (kartu tidak berubah ukuran).
const CARD_FILL: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px 18px',
};

const CARD_LABEL_STYLE: React.CSSProperties = {
  position: 'relative',
  marginTop: 16,
  fontSize: 9.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--mu,#909090)',
};

export interface FileActivityFile {
  type: string;      // 'PDF' | 'DOCS' | 'EXCEL' | 'PPT' | 'EBOOK'
  fileName: string;
  fileUrl: string;
}

interface FileActivityBlockProps {
  /** Status loading yang sedang jalan. 'idle' = sudah selesai / pesan lama dari riwayat. */
  activityStatus: ActivityStatus;
  /** Data file kalau sudah jadi (hasil parseFileLink). null selama loading. */
  file: FileActivityFile | null;
}

// Urutan yang ditampilkan (satu blok, satu instance dari awal sampai akhir):
//   1) kalimat pembuka                  ← tetap ada setelah selesai
//   2) SATU kartu persegi di tengah     ← loading → berubah jadi "siap diunduh"
//   (teks penutup dirender ChatBubble di bawah blok ini)
//
// Fase animasi saat loading:
//   PHASE 1: 3 titik sendirian (0–700ms)
//   PHASE 2: titik hilang, kalimat pembuka muncul (700–1100ms)
//   PHASE 3: kartu kertas muncul di bawah kalimat, teks progress jalan
// Pesan lama dari riwayat (mount langsung dalam keadaan selesai) melewati
// semua fase dan langsung tampil lengkap.
export const FileActivityBlock = ({ activityStatus, file }: FileActivityBlockProps) => {
  const isDone = activityStatus === 'idle' && !!file;

  // Apakah blok ini MULAI dari loading? Kalau ya, animasi masuk dimainkan.
  // Kalau tidak (riwayat), tampil tanpa animasi.
  const startedLoading = useRef(activityStatus !== 'idle');

  const [phase, setPhase] = useState<1 | 2 | 3>(() => (activityStatus === 'idle' ? 3 : 1));
  const [lines, setLines] = useState<{ id: number; text: string }[]>([]);
  const lineCounter = useRef(0);
  const realtimeIndexRef = useRef(0);

  // Selesai lebih cepat dari fase animasi? Langsung anggap fase 3.
  const effectivePhase = isDone ? 3 : phase;

  // kind = kunci lookup (pdf/docs/excel/ppt/image/ebook).
  // Loading → dari activityStatus. Selesai → dari tipe file.
  const kind = activityStatus !== 'idle' ? activityStatus : (file?.type || 'pdf').toLowerCase();

  const shortMsg = ACTIVITY_MESSAGES[kind] || 'Baik, sedang memproses...';
  const icon = ACTIVITY_ICONS[kind] ?? <FileText size={20} />;
  const label = ACTIVITY_LABELS[kind] || 'FILE';
  const realtimeTexts = ACTIVITY_REALTIME_TEXTS[kind] || ACTIVITY_REALTIME_TEXTS.pdf;

  // Phase transitions (cuma kalau mulai dari fase 1)
  useEffect(() => {
    if (phase === 3) return;
    const t1 = setTimeout(() => setPhase(2), 700);
    const t2 = setTimeout(() => setPhase(3), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Baris teks progress: muncul dari bawah, geser ke atas, maksimal 3 baris.
  // Berhenti begitu file selesai.
  useEffect(() => {
    if (isDone || effectivePhase !== 3) return;
    const interval = setInterval(() => {
      const nextText = realtimeTexts[realtimeIndexRef.current % realtimeTexts.length];
      realtimeIndexRef.current += 1;
      lineCounter.current += 1;
      const id = lineCounter.current;
      setLines(prev => [...prev, { id, text: nextText }].slice(-3));
    }, 650);
    return () => clearInterval(interval);
  }, [isDone, effectivePhase, realtimeTexts]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: '100%',
        gap: 0,
        margin: '6px 0 10px',
      }}
    >
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes card-wide-in {
          from { opacity: 0; transform: translateY(10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes shimmer-sweep-wide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }

        /* ── Bentuk kertas/dokumen dengan lipatan pojok kanan atas ── */
        .cylen-paper {
          position: relative;
        }
        .cylen-paper::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 22px 22px 0;
          border-color: transparent var(--bg,#f2f0eb) transparent transparent;
        }
        .cylen-paper::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 0 22px 22px;
          border-color: transparent transparent var(--bd,#e0ddd7) transparent;
          opacity: 0.7;
          pointer-events: none;
        }
      `}</style>

      {/* ── PHASE 1: 3 titik sendirian ── */}
      {effectivePhase === 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 2,
            animation: 'fade-in-up 0.25s ease-out both',
          }}
        >
          <LoadingDots />
        </div>
      )}

      {/* ── PHASE 2+: kalimat pembuka. TETAP ADA sampai file selesai & seterusnya ── */}
      {effectivePhase >= 2 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 2,
            marginBottom: effectivePhase === 3 ? 16 : 0,
            animation: startedLoading.current ? 'fade-in-up 0.3s ease-out both' : undefined,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text,#141414)',
              lineHeight: 1.5,
            }}
          >
            {shortMsg}
          </span>
        </div>
      )}

      {/* ── PHASE 3: SATU kartu persegi, di tengah. Cangkangnya tetap; isinya berganti ── */}
      {effectivePhase === 3 && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div
            className="cylen-paper"
            style={{
              width: 220,
              height: 260,
              background: 'var(--sf,#f7f5f1)',
              border: '1.5px solid var(--bd,#e0ddd7)',
              borderRadius: 8,
              boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              animation: startedLoading.current
                ? 'card-wide-in 0.35s cubic-bezier(0.16,1,0.3,1) both'
                : undefined,
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDone && file ? (
                /* ── STATE SELESAI: seluruh kartu = link unduh ── */
                <motion.a
                  key="done"
                  href={file.fileUrl}
                  download={file.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Unduh ${file.fileName}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{ ...CARD_FILL, textDecoration: 'none' }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: 'var(--bg,#f2f0eb)',
                      border: '1px solid var(--bd,#e0ddd7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text,#141414)',
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>

                  <span
                    style={{
                      marginTop: 14,
                      maxWidth: '100%',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--text,#141414)',
                      textAlign: 'center',
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                    }}
                  >
                    {file.fileName}
                  </span>

                  <span
                    style={{
                      marginTop: 4,
                      fontSize: 10.5,
                      fontWeight: 500,
                      color: 'var(--mu,#909090)',
                    }}
                  >
                    Klik untuk unduh {file.type}
                  </span>

                  <span
                    style={{
                      marginTop: 16,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--text,#141414)',
                      color: 'var(--bg,#f2f0eb)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
                      flexShrink: 0,
                    }}
                  >
                    <Download size={16} strokeWidth={2.4} />
                  </span>

                  <div style={CARD_LABEL_STYLE}>{label} · Siap diunduh</div>
                </motion.a>
              ) : (
                /* ── STATE LOADING ── */
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={CARD_FILL}
                >
                  {/* Shimmer sweep tipis */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
                      animation: 'shimmer-sweep-wide 2.2s ease-in-out infinite',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Icon tipe file, kecil, di atas */}
                  <div style={{ color: 'var(--mu,#909090)', opacity: 0.5, marginBottom: 14 }}>
                    {icon}
                  </div>

                  {/* Area teks real-time, geser dari bawah ke atas.
                      Dilebarkan 16px & tiap baris nowrap+ellipsis: teks tidak
                      wrap jadi 2 baris (yang dulu kepotong pas animasi masuk). */}
                  <div
                    style={{
                      position: 'relative',
                      width: 'calc(100% + 16px)',
                      margin: '0 -8px',
                      height: 70,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      gap: 7,
                      maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 100%)',
                    }}
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      {lines.map(line => (
                        <motion.span
                          key={line.id}
                          layout
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -14 }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          style={{
                            display: 'block',
                            width: '100%',
                            fontSize: 10.5,
                            textAlign: 'center',
                            color: 'var(--text,#141414)',
                            opacity: 0.65,
                            lineHeight: 1.4,
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {line.text}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Label bawah */}
                  <div style={CARD_LABEL_STYLE}>{label} · Sedang dibuat</div>

                  {/* Progress bar tipis di paling bawah kartu */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 2.5,
                      background: 'var(--bd,#e0ddd7)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: '40%',
                        background: 'linear-gradient(90deg, transparent, var(--text,#141414), transparent)',
                        opacity: 0.3,
                        animation: 'shimmer-sweep-wide 1.6s ease-in-out infinite',
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Auto Reminder Bubble ──────────────────────
interface AutoReminderBubbleProps {
  msg: Message;
  msgIndex: number;
}

export const AutoReminderBubble = ({ msg, msgIndex }: AutoReminderBubbleProps) => (
  <div
    id={`message-${msgIndex}`}
    style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      alignItems: 'flex-start',
      margin: '16px 0',
    }}
  >
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        width: '90%',
        maxWidth: 440,
        border: '1.5px solid var(--bd,#e0ddd7)',
        borderRadius: 20,
        padding: 20,
      }}
    >
      <div
        style={{
          borderLeft: '2.5px solid var(--bd,#e0ddd7)',
          paddingLeft: 12,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 5,
          }}
        >
          <Clock size={11} color="var(--mu,#909090)" />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--mu,#909090)',
            }}
          >
            Pengingat
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            fontStyle: 'italic',
            color: 'var(--mu,#909090)',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          "{msg.quotedText}"
        </p>
      </div>
      <p
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--text,#141414)',
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        {msg.content}
      </p>
    </motion.div>
  </div>
);
