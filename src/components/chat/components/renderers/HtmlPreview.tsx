// ─────────────────────────────────────────────
// HTML PREVIEW — src/components/chat/components/renderers/HtmlPreview.tsx
// Tap card → fullscreen iframe preview
// ─────────────────────────────────────────────
import React, { memo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, Code, Copy, Check, Download, MoreVertical } from 'lucide-react';

export const HtmlPreview = memo(({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => { setCopied(false); setShowMenu(false); }, 1800);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'simulasi.html';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  if (!expanded) return (
    <div onClick={() => setExpanded(true)} style={{
      margin: '10px 0', display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', background: 'var(--sf,#f7f5f1)',
      border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, cursor: 'pointer',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'var(--bg,#f2f0eb)', border: '1px solid var(--bd,#e0ddd7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mu,#909090)',
      }}><Code size={18} /></div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text,#141414)' }}>Simulasi Visual</div>
        <div style={{ fontSize: 11.5, color: 'var(--mu,#909090)', marginTop: 2 }}>HTML · Ketuk untuk buka</div>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'var(--bg,#f2f0eb)', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 12px', height: 56, background: 'var(--bg,#f2f0eb)',
        borderBottom: '1.5px solid var(--bd,#e0ddd7)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setExpanded(false)} style={{ padding: 8, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--mu,#909090)', display: 'flex' }}>
            <ChevronLeft size={22} />
          </button>
          <span style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text,#141414)' }}>Simulasi Visual</span>
        </div>
        <div style={{ position: 'relative', display: 'flex' }}>
          <button onClick={() => setShowMenu(!showMenu)} style={{ padding: 8, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--mu,#909090)', display: 'flex' }}>
            <MoreVertical size={18} />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 410 }} onClick={() => setShowMenu(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.94, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: -8 }} transition={{ duration: 0.12 }}
                  style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 420, width: 160, background: 'var(--sf,#f7f5f1)', border: '1.5px solid var(--bd,#e0ddd7)', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden', padding: 4 }}>
                  <button onClick={handleCopy} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text,#141414)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10, fontWeight: 500 }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Tersalin!' : 'Salin Kode'}
                  </button>
                  <div style={{ height: 1, background: 'var(--bd,#e0ddd7)', margin: '2px 8px' }} />
                  <button onClick={handleDownload} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', fontSize: 13, color: 'var(--text,#141414)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10, fontWeight: 500 }}>
                    <Download size={14} /> Unduh HTML
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div style={{ flex: 1, background: '#fff', position: 'relative' }}>
        <iframe srcDoc={content} title="Preview" style={{ width: '100%', height: '100%', border: 'none' }} sandbox="allow-scripts allow-same-origin allow-forms" />
      </div>
    </motion.div>
  );
});
