// ─────────────────────────────────────────────
// CHAT BUBBLE — src/components/chat/ChatBubble.tsx
// Main orchestrator — imports all sub-components
// ─────────────────────────────────────────────
import React, { memo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Pin, FileText } from 'lucide-react';

// Types & utils
import type { ChatBubbleProps } from './types';
import { parseFileLink } from './utils';

// UI primitives
import { LoadingDots } from './components/ui/Primitives';
import { CollapsibleUserBubble } from './components/ui/CollapsibleUserBubble';
import { UserBubble } from './components/ui/UserBubble';
import { ActionBar } from './components/ui/ActionBar';
import { SuggestionsRow } from './components/ui/SuggestionsRow';
import {
  ActivityBubble,
  AutoReminderBubble,
  FileLinkElement,
} from './components/ui/SpecialBubbles';

// Media
import { SmartImageGallery } from './components/media/SmartImageGallery';

// Renderers
import { MarkdownRenderer, StreamingText } from './components/renderers/MarkdownRenderer';

// ─────────────────────────────────────────────
const ChatBubbleComponent: React.FC<ChatBubbleProps> = ({
  msg, msgIndex, isLast, onResend, onEdit, onSuggest,
  onTogglePin, onSaveItem, onRegenerate, onSwipeToReply,
  suggestions, isStreaming = false, activityStatus = 'idle',
}) => {
  const isUser = msg.role === 'user';
  
  // State memantau menu UserBubble
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // UPDATE CRITICAL STATE: Memantau penyelesaian rendering teks chunking asli di layar
  const [isAnimationDone, setIsAnimationDone] = useState(!isStreaming);

  // Reset state jika pesan baru masuk (menghindari cache state pada komponen yang di-reuse)
  useEffect(() => {
    setIsAnimationDone(!isStreaming);
  }, [isStreaming, msg.content]);

  // ── Activity state ──────────────────────────
  if (!isUser && isLast && activityStatus !== 'idle') {
    return <ActivityBubble msgIndex={msgIndex} activityStatus={activityStatus} />;
  }

  // ── Auto reminder ───────────────────────────
  if (!isUser && msg.isAutoReminder) {
    return <AutoReminderBubble msg={msg} msgIndex={msgIndex} />;
  }

  // ── Parse file link prefix ──────────────────
  const { fileLinkData, rest: displayContent } = parseFileLink(msg.content || '');

  // ── Empty streaming (loading dots) ──────────
  if (!isUser && isStreaming && (!displayContent || displayContent.trim() === '')) {
    return (
      <div id={`message-${msgIndex}`} style={{ display: 'flex', alignItems: 'flex-start', width: '100%', margin: '4px 0' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '12px 18px', background: 'var(--sf,#f7f5f1)',
          border: '1.5px solid var(--bd,#e0ddd7)',
          borderRadius: '6px 16px 16px 16px',
        }}>
          <LoadingDots />
        </div>
      </div>
    );
  }

  return (
    <div
      id={`message-${msgIndex}`}
      style={{
        display: 'flex', flexDirection: 'column', width: '100%',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        position: 'relative', 
        zIndex: isMenuOpen ? 50 : 10,
        gap: 4,
      }}
    >
      {/* Timestamp + sender */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        {msg.senderName && (
          <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text,#141414)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {msg.senderName}
          </span>
        )}
        <span style={{ fontSize: 9.5, fontFamily: 'monospace', color: 'var(--mu,#909090)', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>
          {msg.timestamp}
        </span>
        {msg.pinned && <Pin size={10} color="var(--mu,#909090)" style={{ opacity: 0.7 }} />}
      </div>

      {/* File link card */}
      {fileLinkData && (
        <FileLinkElement
          type={fileLinkData.type}
          fileName={fileLinkData.fileName}
          fileUrl={fileLinkData.fileUrl}
          isUser={isUser}
        />
      )}

      {/* Images */}
      {((msg.images && msg.images.length > 0) || msg.image) && (
        <SmartImageGallery
          images={msg.images?.length ? msg.images : [msg.image!]}
          isUser={isUser}
        />
      )}

      {/* PDF attachments */}
      {msg.pdfs && msg.pdfs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8, width: '100%', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
          {msg.pdfs.map((pdf, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, maxWidth: '85%' }}>
              <FileText size={17} color="var(--mu,#909090)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text,#141414)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                {pdf.name || 'Dokumen Terlampir'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Message content */}
      {displayContent && (
        isUser ? (
          <UserBubble
            msg={msg}
            displayContent={displayContent}
            onResend={onResend}
            onEdit={onEdit}
            onSwipeToReply={onSwipeToReply}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
          />
        ) : (
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={(_e: any, info: any) => { if (info.offset.x > 55) onSwipeToReply?.(msg); }}
            style={{ width: '100%' }}
          >
            {isStreaming
              ? <StreamingText 
                  content={displayContent} 
                  isStreaming={isStreaming} 
                  onComplete={() => setIsAnimationDone(true)} // <-- Callback dipanggil pas huruf terakhir beres ketik
                />
              : <MarkdownRenderer content={displayContent} />
            }
          </motion.div>
        )
      )}

      {/* UPDATE FIX: Action bar dikunci total selama text belum beres ngetik di layar */}
      {!isUser && isAnimationDone && (
        <ActionBar
          content={msg.content}
          msgIndex={msgIndex}
          isPinned={!!msg.pinned}
          onTogglePin={onTogglePin}
          onRegenerate={onRegenerate}
          visible={true}
        />
      )}

      {/* Suggestion chips dikunci total selama text belum beres ngetik di layar */}
      {!isUser && isLast && suggestions && suggestions.length > 0 && isAnimationDone && (
        <SuggestionsRow suggestions={suggestions} onSuggest={onSuggest} />
      )}
    </div>
  );
};

export const ChatPage = memo(ChatBubbleComponent, (prev, next) =>
  prev.msg.content === next.msg.content &&
  prev.msg.pinned === next.msg.pinned &&
  prev.isLast === next.isLast &&
  prev.isStreaming === next.isStreaming &&
  prev.activityStatus === next.activityStatus
);
