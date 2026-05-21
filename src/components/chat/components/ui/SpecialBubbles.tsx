// ─────────────────────────────────────────────
// SPECIAL BUBBLE STATES
// src/components/chat/components/ui/SpecialBubbles.tsx
// ActivityBubble · AutoReminderBubble · FileLinkElement
// ─────────────────────────────────────────────
import React from 'react';
import { motion } from 'motion/react';
import { FileText, List, Presentation, Palette, Bookmark, Clock, Pin, Download } from 'lucide-react';
import { LoadingDots } from './Primitives';
import { ACTIVITY_MAP } from '../../constants';
import type { ActivityStatus, Message } from '../../types';

// ── Activity Loading Bubble ───────────────────
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
  const cur = ACTIVITY_MAP[activityStatus as keyof typeof ACTIVITY_MAP];
  return (
    <div id={`message-${msgIndex}`} style={{ display: 'flex', alignItems: 'flex-start', width: '100%', margin: '10px 0 4px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '12px 18px',
        background: 'var(--sf,#f7f5f1)',
        border: '1.5px solid var(--bd,#e0ddd7)',
        borderRadius: '6px 16px 16px 16px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
      }}>
        <span style={{ color: 'var(--mu,#909090)', display: 'flex' }}>
          {ACTIVITY_ICONS[activityStatus]}
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text,#141414)' }}>{cur?.text}</span>
        <LoadingDots />
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
