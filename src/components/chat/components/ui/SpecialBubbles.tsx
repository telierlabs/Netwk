// ─────────────────────────────────────────────
// SPECIAL BUBBLE STATES
// src/components/chat/components/ui/SpecialBubbles.tsx
// ActivityBubble · AutoReminderBubble · FileLinkElement
// ─────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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

// ── Realtime teks yang ditampilkan di dalam kartu pill ──
const ACTIVITY_REALTIME_TEXTS: Record<string, string[]> = {
  pdf: [
    'Menyusun struktur dokumen PDF...',
    'Menambahkan header dan footer...',
    'Mengatur layout konten keuangan...',
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
  pdf:   <FileText size={18} />,
  docs:  <FileText size={18} />,
  excel: <List size={18} />,
  ppt:   <Presentation size={18} />,
  image: <Palette size={18} />,
  ebook: <Bookmark size={18} />,
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

// ── PHASE 1: Helix sendirian (0–800ms)
// ── PHASE 2: Helix hilang, teks singkat muncul (800ms–1800ms)
// ── PHASE 3: Teks singkat tetap, kartu pill lebar muncul di bawah (1800ms+)
export const ActivityBubble = ({ msgIndex, activityStatus }: ActivityBubbleProps) => {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [realtimeTextIndex, setRealtimeTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [charIndex, setCharIndex] = useState(0);

  const shortMsg = ACTIVITY_MESSAGES[activityStatus] || 'Baik, sedang memproses...';
  const icon = ACTIVITY_ICONS[activityStatus];
  const label = ACTIVITY_LABELS[activityStatus] || 'FILE';
  const realtimeTexts = ACTIVITY_REALTIME_TEXTS[activityStatus] || ACTIVITY_REALTIME_TEXTS.pdf;

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 800);
    const t2 = setTimeout(() => setPhase(3), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Animasi karakter demi karakter untuk teks realtime di dalam kartu
  useEffect(() => {
    if (phase !== 3) return;
    const currentText = realtimeTexts[realtimeTextIndex];
    if (charIndex < currentText.length) {
      const t = setTimeout(() => {
        setDisplayedText(currentText.slice(0, charIndex + 1));
        setCharIndex(c => c + 1);
      }, 28);
      return () => clearTimeout(t);
    } else {
      // Setelah selesai, tunggu lalu pindah ke teks berikutnya
      const t = setTimeout(() => {
        const next = (realtimeTextIndex + 1) % realtimeTexts.length;
        setRealtimeTextIndex(next);
        setDisplayedText('');
        setCharIndex(0);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [phase, charIndex, realtimeTextIndex, realtimeTexts]);

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
        @keyframes helix-act-1 {
          0%, 100% { transform: translateX(0px) scale(1); opacity: 1; }
          25%       { transform: translateX(12px) scale(0.65); opacity: 0.35; }
          50%       { transform: translateX(0px) scale(0.45); opacity: 0.12; }
          75%       { transform: translateX(-12px) scale(0.65); opacity: 0.35; }
        }
        @keyframes helix-act-2 {
          0%, 100% { transform: translateX(0px) scale(0.45); opacity: 0.12; }
          25%       { transform: translateX(-12px) scale(0.65); opacity: 0.35; }
          50%       { transform: translateX(0px) scale(1); opacity: 1; }
          75%       { transform: translateX(12px) scale(0.65); opacity: 0.35; }
        }
        @keyframes shimmer-sweep-wide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes card-wide-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>

      {/* ── PHASE 1: Helix saja ── */}
      {phase === 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 2,
            animation: 'fade-in-up 0.25s ease-out both',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: 32,
              height: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--text,#141414)',
                animation: 'helix-act-1 1.15s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--text,#141414)',
                animation: 'helix-act-2 1.15s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      )}

      {/* ── PHASE 2 & 3: Teks singkat (helix hilang) ── */}
      {phase >= 2 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 2,
            marginBottom: phase === 3 ? 14 : 0,
            animation: 'fade-in-up 0.3s ease-out both',
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text,#141414)',
              opacity: 0.55,
              fontFamily: 'monospace',
              letterSpacing: '0.01em',
            }}
          >
            {shortMsg}
          </span>
        </div>
      )}

      {/* ── PHASE 3: Kartu pill lebar dengan realtime teks ── */}
      {phase === 3 && (
        <div
          style={{
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '12px 20px 20px 20px',
            border: '1.5px solid var(--bd,#e0ddd7)',
            background: 'var(--sf,#f7f5f1)',
            boxShadow: '0 2px 14px rgba(0,0,0,0.07)',
            animation: 'card-wide-in 0.35s cubic-bezier(0.16,1,0.3,1) both',
            animationDelay: '0.05s',
          }}
        >
          {/* Shimmer sweep */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.22) 50%, transparent 80%)',
              animation: 'shimmer-sweep-wide 2s ease-in-out infinite',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Inner content */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Icon box */}
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'var(--bg,#f2f0eb)',
                border: '1px solid var(--bd,#e0ddd7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--mu,#909090)',
                flexShrink: 0,
              }}
            >
              {icon}
            </div>

            {/* Teks area */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Label kecil */}
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--mu,#909090)',
                  marginBottom: 6,
                }}
              >
                {label} · Sedang dibuat
              </div>

              {/* Realtime teks karakter per karakter */}
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: 'var(--text,#141414)',
                  lineHeight: 1.5,
                  minHeight: 20,
                  fontFamily: 'monospace',
                  letterSpacing: '0.005em',
                }}
              >
                {displayedText}
                <span
                  style={{
                    display: 'inline-block',
                    width: 2,
                    height: '1em',
                    background: 'var(--text,#141414)',
                    opacity: 0.6,
                    marginLeft: 1,
                    verticalAlign: 'middle',
                    animation: 'cursor-blink 0.9s ease-in-out infinite',
                  }}
                />
              </div>
            </div>

            {/* Loading dots kanan */}
            <div style={{ flexShrink: 0 }}>
              <LoadingDots />
            </div>
          </div>

          {/* Progress bar bawah */}
          <div
            style={{
              height: 2,
              background: 'var(--bd,#e0ddd7)',
              position: 'relative',
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
                background:
                  'linear-gradient(90deg, transparent, var(--text,#141414), transparent)',
                opacity: 0.25,
                animation: 'shimmer-sweep-wide 1.8s ease-in-out infinite',
              }}
            />
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
