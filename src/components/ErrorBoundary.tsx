import React from 'react';
import { clearCachesAndReload, isChunkError, isDebugMode, reloadOnceForChunkError } from '../lib/errorGuard';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

// Kalau ada tampilan yang crash saat dirender, pengguna melihat layar ramah ini
// (bukan layar putih kosong atau teks error). Detail teknis cuma muncul di mode debug (?debug=1).
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Cylen] Tampilan crash:', error, info.componentStack);
    if (isChunkError(error)) reloadOnceForChunkError();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const debug = isDebugMode();

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: 'var(--bg, #0a0a0a)',
          color: 'var(--text, #ffffff)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>Ups, ada kendala</div>
        <div style={{ fontSize: 14, opacity: 0.65, maxWidth: 300, lineHeight: 1.5 }}>
          Aplikasi lagi bermasalah sebentar. Coba muat ulang, biasanya langsung normal.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'var(--ac, #ffffff)',
            color: 'var(--at, #000000)',
            border: 'none',
            borderRadius: 14,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Muat ulang
        </button>
        <button
          onClick={() => { clearCachesAndReload(); }}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            opacity: 0.5,
            fontSize: 13,
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Masih bermasalah? Bersihkan cache
        </button>
        {debug && (
          <pre
            style={{
              marginTop: 8,
              maxWidth: '92vw',
              maxHeight: '30vh',
              overflow: 'auto',
              textAlign: 'left',
              fontSize: 11,
              opacity: 0.7,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {String(error.message)}
            {'\n'}
            {(error.stack || '').split('\n').slice(0, 6).join('\n')}
          </pre>
        )}
      </div>
    );
  }
}
