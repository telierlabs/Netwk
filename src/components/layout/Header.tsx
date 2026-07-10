import React from 'react';
import { ArrowLeft, SquarePen } from 'lucide-react';
import { View } from '../../types';
import { cn } from '../../lib/utils';

interface HeaderProps {
  view: View | string;
  onMenuClick: () => void;
  onBackClick: () => void;
  onNewChatClick: () => void;
  onNewTempChatClick?: () => void;
  onToggleGhostMode?: () => void;
  onZoomClick?: () => void;
  isCanvasActive?: boolean;
  isEmptyChat?: boolean;
  isTemporary?: boolean;
  activeChatTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  view, onMenuClick, onBackClick, onNewChatClick,
  onToggleGhostMode, isCanvasActive, isEmptyChat, isTemporary,
  activeChatTitle = "Cylen"
}) => {
  if (view === 'group-list' || view === 'group-chat' || view === 'group-profile' || view === 'saved') {
    return null;
  }

  return (
    <header
      style={{
        flexShrink: 0,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        alignItems: 'center',
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: isCanvasActive
          ? 'calc(env(safe-area-inset-top, 0px) + 4px)'
          : 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: isCanvasActive ? 4 : 12,
        zIndex: 50,
        backgroundColor: 'var(--bg)',
        border: 'none',
        borderBottom: 'none',
        boxShadow: 'none',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: isCanvasActive ? 0.8 : 1,
        transition: 'opacity 0.3s ease, padding 0.3s ease',
      }}
    >
      {/* ─── LEFT ─── */}
      <button
        onClick={view === 'chat' ? onMenuClick : onBackClick}
        style={{ padding: 8, marginLeft: -8, borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text)', WebkitTapHighlightColor: 'transparent', outline: 'none' }}
      >
        {view === 'chat' ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M4 9h16M4 15h16"/>
          </svg>
        ) : (
          <ArrowLeft size={24} strokeWidth={2.5} />
        )}
      </button>

      {/* ─── CENTER ─── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {view === 'chat' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '50vw' }}>
            {activeChatTitle === 'Cylen' ? (
              // logo wordmark — PNG solid dipakai sebagai mask, warnanya ngikut var(--text)
              // (putih di dark mode, item di light mode) otomatis tanpa ganti file
              <div
                role="img"
                aria-label="Cylen"
                style={{
                  width: 140,
                  height: isCanvasActive ? 24 : 32,
                  flexShrink: 0,
                  backgroundColor: 'var(--text)',
                  WebkitMaskImage: 'url(/104076-removebg-preview.png)',
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskImage: 'url(/104076-removebg-preview.png)',
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  transition: 'height 0.3s ease',
                }}
              />
            ) : (
              <h1 style={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                fontSize: isCanvasActive ? 14 : 16,
                color: 'var(--text)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                transition: 'font-size 0.3s ease',
              }}>
                {activeChatTitle}
              </h1>
            )}
            {isTemporary && (
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                backgroundColor: 'rgba(var(--text-rgb, 0,0,0), 0.1)',
                color: 'var(--text)',
                opacity: 0.7,
                padding: '2px 8px',
                borderRadius: 999,
                flexShrink: 0,
              }}>
                Mode Hantu
              </span>
            )}
          </div>
        )}
        {view === 'profile' && (
          <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Profil & Pengaturan
          </h1>
        )}
      </div>

      {/* ─── RIGHT ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {view === 'chat' && (
          isEmptyChat ? (
            <button
              onClick={onToggleGhostMode}
              style={{ padding: 8, marginRight: -8, borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text)', WebkitTapHighlightColor: 'transparent', outline: 'none' }}
            >
              {isTemporary ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
                  <path d="M9 10h.01" stroke="var(--bg)" strokeWidth="3"/>
                  <path d="M15 10h.01" stroke="var(--bg)" strokeWidth="3"/>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                  <path d="M9 10h.01"/><path d="M15 10h.01"/>
                  <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/>
                </svg>
              )}
            </button>
          ) : (
            <button
              onClick={onNewChatClick}
              style={{ padding: 8, marginRight: -8, borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text)', WebkitTapHighlightColor: 'transparent', outline: 'none' }}
            >
              <SquarePen size={24} strokeWidth={2.2} />
            </button>
          )
        )}
        {view !== 'chat' && (
          <button
            onClick={onNewChatClick}
            style={{ padding: 8, marginRight: -8, borderRadius: 12, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text)', WebkitTapHighlightColor: 'transparent', outline: 'none' }}
          >
            <SquarePen size={24} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </header>
  );
};
