// ─────────────────────────────────────────────
// SPECIAL BUBBLE STATES
// src/components/chat/components/ui/SpecialBubbles.tsx
// ActivityBubble · AutoReminderBubble · FileLinkElement
// ─────────────────────────────────────────────
import React from 'react';
import { motion } from 'motion/react';
import { FileText, List, Presentation, Palette, Bookmark, Clock, Download } from 'lucide-react';
import { LoadingDots } from './Primitives';
import { ACTIVITY_MAP } from '../../constants';
import type { ActivityStatus, Message } from '../../types';

// ── Activity short messages per type ──────────
const ACTIVITY_MESSAGES: Record<string, string> = {
  pdf:   'Baik, sedang menyusun PDF untukmu...',
  docs:  'Sedang menyiapkan dokumen...',
  excel: 'Sedang membuat spreadsheet...',
  ppt:   'Sedang merancang presentasi...',
  image: 'Sedang membuat gambar...',
  ebook: 'Sedang menyusun ebook...',
};

// ── Activity Loading Bubble — upgraded ────────
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  pdf:   <FileText size={17} />,
  docs:  <FileText size={17} />,
  excel: <List size={17} />,
  ppt:   <Presentation size={17} />,
  image: <Palette size={17} />,
  ebook: <Bookmark size={17} />,
};

interface ActivityBubbleProps { msgIndex: number; activityStatus: ActivityStatus; }

export const ActivityBubble = ({ msgIndex, activityStatus }: ActivityBubbleProps) => {
  const shortMsg = ACTIVITY_MESSAGES[activityStatus] || 'Sedang memproses...';
  const icon     = ACTIVITY_ICONS[activityStatus];

  return (
    <div id={`message-${msgIndex}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', gap: 12, margin: '10px 0 4px' }}>
      <style>{`
        @keyframes helix-act-1 {
          0%,100% { transform: translateX(0px) scale(1); opacity: 1; }
          25%      { transform: translateX(12px) scale(0.65); opacity: 0.35; }
          50%      { transform: translateX(0px) scale(0.45); opacity: 0.12; }
          75%      { transform: translateX(-12px) scale(0.65); opacity: 0.35; }
        }
        @keyframes helix-act-2 {
          0%,100% { transform: translateX(0px) scale(0.45); opacity: 0.12; }
          25%      { transform: translateX(-12px) scale(0.65); opacity: 0.35; }
          50%      { transform: translateX(0px) scale(1); opacity: 1; }
          75%      { transform: translateX(12px) scale(0.65); opacity: 0.35; }
        }
        @keyframes shimmer-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pill-fade-in {
          from { opacity: 0; transform: translateY(6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Row 1: helix + teks singkat */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 2 }}>
        {/* Helix dots */}
        <div style={{ position: 'relative', width: 32, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div style={{
            position: 'absolute', width: 7, height: 7, borderRadius: '50%',
            background: 'var(--text,#141414)',
            animation: 'helix-act-1 1.15s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', width: 7, height: 7, borderRadius: '50%',
            background: 'var(--text,#141414)',
            animation: 'helix-act-2 1.15s ease-in-out infinite',
          }} />
        </div>
        {/* Short message */}
        <span style={{
          fontSize: 13, fontWeight: 500, color: 'var(--text,#141414)', opacity: 0.55,
          fontFamily: 'monospace', letterSpacing: '0.01em',
        }}>
          {shortMsg}
        </span>
      </div>

      {/* Row 2: Shimmer card pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 12,
        padding: '13px 18px',
        background: 'var(--sf,#f7f5f1)',
        border: '1.5px solid var(--bd,#e0ddd7)',
        borderRadius: '10px 20px 20px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
        position: 'relative', overflow: 'hidden',
        minWidth: 200,
        animation: 'pill-fade-in 0.3s ease-out both',
        animationDelay: '0.1s',
      }}>
        {/* Shimmer sweep layer */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
          animation: 'shimmer-sweep 1.6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* Icon */}
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--bg,#f2f0eb)',
          border: '1px solid var(--bd,#e0ddd7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--mu,#909090)', flexShrink: 0,
          position: 'relative', zIndex: 1,
        }}>
          {icon}
        </div>

        {/* Skeleton text lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 120, height: 10, borderRadius: 6,
            background: 'var(--bd,#e0ddd7)', opacity: 0.7,
          }} />
          <div style={{
            width: 80, height: 8, borderRadius: 6,
            background: 'var(--bd,#e0ddd7)', opacity: 0.45,
          }} />
        </div>

        {/* LoadingDots */}
        <div style={{ marginLeft: 'auto', position: 'relative', zIndex: 1 }}>
          <LoadingDots />
        </div>
      </div>
    </div>
  );
};

// ── Auto Reminder Bubble ──────────────────────
interface AutoReminderBubbleProps { msg: Message; msgIndex: number; }

export const AutoReminderBubble = ({ msg, msgIndex }: AutoReminderBubbleProps) => (
  <div id={`message-${msgIndex}`} style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'flex-start', margin: '16px 0' }}>
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      style={{ width: '90%', maxWidth: 440, border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 20, padding: 20 }}
    >
      <div style={{ borderLeft: '2.5px solid var(--bd,#e0ddd7)', paddingLeft: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <Clock size={11} color="var(--mu,#909090)" />
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mu,#909090)' }}>Pengingat</span>
        </div>
        <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--mu,#909090)', lineHeight: 1.55, margin: 0 }}>"{msg.quotedText}"</p>
      </div>
      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text,#141414)', lineHeight: 1.65, margin: 0 }}>{msg.content}</p>
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

interface FileLinkElementProps { type: string; fileName: string; fileUrl: string; isUser: boolean; }

export const FileLinkElement = ({ type, fileName, fileUrl, isUser }: FileLinkElementProps) => (
  <div style={{ display: 'flex', marginBottom: 10, justifyContent: isUser ? 'flex-end' : 'flex-start', width: '100%' }}>
    <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, textDecoration: 'none', maxWidth: '85%' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg,#f2f0eb)', border: '1px solid var(--bd,#e0ddd7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {FILE_ICONS[type]}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text,#141414)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170 }}>{fileName}</span>
        <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--mu,#909090)', marginTop: 1 }}>Klik untuk unduh {type}</span>
      </div>
      <Download size={15} color="var(--mu,#909090)" style={{ opacity: 0.6, marginLeft: 'auto' }} />
    </a>
  </div>
);
