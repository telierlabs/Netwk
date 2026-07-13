// ─────────────────────────────────────────────
// SPECIAL BUBBLE STATES
// src/components/chat/components/ui/SpecialBubbles.tsx
// ActivityBubble · AutoReminderBubble · FileLinkElement
// ─────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, List, Presentation, Palette, Bookmark, Clock, Download } from 'lucide-react';
import { LoadingDots } from './Primitives';
import type { ActivityStatus, Message } from '../../types';

// ── Activity short messages per type ──────────
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

interface ActivityBubbleProps {
  msgIndex: number;
  activityStatus: ActivityStatus;
}

// ── PHASE 1: 3 titik muter melingkar sendirian (0–700ms)
// ── PHASE 2: titik hilang, kalimat singkat muncul, warna teks NORMAL (700ms–1100ms)
// ── PHASE 3: kalimat tetap, kartu berbentuk KERTAS muncul DI TENGAH di bawahnya,
//             isinya teks progress real-time yang masuk dari bawah lalu geser ke atas
export const ActivityBubble = ({ msgIndex, activityStatus }: ActivityBubbleProps) => {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [lines, setLines] = useState<{ id: number; text: string }[]>([]);
  const lineCounter = React.useRef(0);
  const realtimeIndexRef = React.useRef(0);

  const shortMsg = ACTIVITY_MESSAGES[activityStatus] || 'Baik, sedang memproses...';
  const icon = ACTIVITY_ICONS[activityStatus];
  const label = ACTIVITY_LABELS[activityStatus] || 'FILE';
  const realtimeTexts = ACTIVITY_REALTIME_TEXTS[activityStatus] || ACTIVITY_REALTIME_TEXTS.pdf;

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 700);
    const t2 = setTimeout(() => setPhase(3), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Baris teks muncul dari bawah, geser ke atas, maksimal 3 baris kelihatan
  useEffect(() => {
    if (phase !== 3) return;
    const interval = setInterval(() => {
      const nextText = realtimeTexts[realtimeIndexRef.current % realtimeTexts.length];
      realtimeIndexRef.current += 1;
      lineCounter.current += 1;
      const id = lineCounter.current;
      setLines(prev => [...prev, { id, text: nextText }].slice(-3));
    }, 650);
    return () => clearInterval(interval);
  }, [phase, realtimeTexts]);

  return (
    <div
      id={`message-${msgIndex}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: '100%',
        gap: 0,
        margin: '10px 0 4px',
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
        }
      `}</style>

      {/* ── PHASE 1: 3 titik (LoadingDots lama dari Primitives.tsx), sendirian ── */}
      {phase === 1 && (
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

      {/* ── PHASE 2 & 3: Kalimat singkat, warna teks NORMAL (bukan abu redup) ── */}
      {phase >= 2 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 2,
            marginBottom: phase === 3 ? 16 : 0,
            animation: 'fade-in-up 0.3s ease-out both',
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

      {/* ── PHASE 3: Kartu bentuk kertas, DI TENGAH, ukuran normal (gak kecil) ── */}
      {phase === 3 && (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div
            className="cylen-paper"
            style={{
              width: 220,
              minHeight: 260,
              background: 'var(--sf,#f7f5f1)',
              border: '1.5px solid var(--bd,#e0ddd7)',
              borderRadius: 8,
              boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 18px',
              animation: 'card-wide-in 0.35s cubic-bezier(0.16,1,0.3,1) both',
            }}
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

            {/* Area teks real-time, geser dari bawah ke atas */}
            <div
              style={{
                position: 'relative',
                width: '100%',
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
                      fontSize: 11,
                      textAlign: 'center',
                      color: 'var(--text,#141414)',
                      opacity: 0.65,
                      lineHeight: 1.4,
                      fontFamily: 'monospace',
                    }}
                  >
                    {line.text}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>

            {/* Label bawah */}
            <div
              style={{
                position: 'relative',
                marginTop: 16,
                fontSize: 9.5,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--mu,#909090)',
              }}
            >
              {label} · Sedang dibuat
            </div>

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

// ── File Link Element ─────────────────────────
const FILE_ICONS: Record<string, React.ReactNode> = {
  PDF:   <FileText size={17} color="var(--mu,#909090)" />,
  DOCS:  <FileText size={17} color="var(--mu,#909090)" />,
  EXCEL: <List size={17} color="var(--mu,#909090)" />,
  PPT:   <Presentation size={17} color="var(--mu,#909090)" />,
  EBOOK: <Bookmark size={17} color="var(--mu,#909090)" />,
};

interface FileLinkElementProps {
  type: string;
  fileName: string;
  fileUrl: string;
  isUser: boolean;
}

export const FileLinkElement = ({
  type,
  fileName,
  fileUrl,
  isUser,
}: FileLinkElementProps) => (
  <div
    style={{
      display: 'flex',
      marginBottom: 10,
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      width: '100%',
    }}
  >
    <a
      href={fileUrl}
      download={fileName}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--sf,#f7f5f1)',
        border: '1.5px solid var(--bd,#e0ddd7)',
        borderRadius: 14,
        textDecoration: 'none',
        maxWidth: '85%',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'var(--bg,#f2f0eb)',
          border: '1px solid var(--bd,#e0ddd7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {FILE_ICONS[type]}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--text,#141414)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 170,
          }}
        >
          {fileName}
        </span>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            color: 'var(--mu,#909090)',
            marginTop: 1,
          }}
        >
          Klik untuk unduh {type}
        </span>
      </div>
      <Download
        size={15}
        color="var(--mu,#909090)"
        style={{ opacity: 0.6, marginLeft: 'auto' }}
      />
    </a>
  </div>
);
