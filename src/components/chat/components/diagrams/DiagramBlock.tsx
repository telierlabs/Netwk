// ─────────────────────────────────────────────
// DIAGRAM BLOCK — src/components/chat/components/diagrams/DiagramBlock.tsx
// Parses diagram-* code fences → renders correct shape
// Shows spinner while loading, error state on failure
// ─────────────────────────────────────────────
import React, { memo, useEffect, useState } from 'react';
import mermaid from 'mermaid';
import { DiagramLoading, DiagramError } from '../ui/Primitives';
import { DiagramWrapper } from '../ui/DiagramWrapper';
import {
  MindmapDiagram, FlowDiagram, TimelineDiagram,
  RadialDiagram, CompareDiagram, CycleDiagram,
} from './DiagramShapes';

// ── Custom JSON diagram blocks ────────────────
export const DiagramBlock = memo(({ lang, raw }: { lang: string; raw: string }) => {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [node, setNode] = useState<React.ReactNode>(null);
  const type = lang.replace('diagram-', '');

  useEffect(() => {
    setState('loading');
    const t = setTimeout(() => {
      try {
        const data = JSON.parse(raw);
        let rendered: React.ReactNode = null;
        switch (type) {
          case 'mindmap':
            rendered = <DiagramWrapper title={data.title || 'Mind Map'}><MindmapDiagram data={data} /></DiagramWrapper>;
            break;
          case 'flow':
            rendered = <DiagramWrapper title={data.title || 'Flow'}><FlowDiagram data={data} /></DiagramWrapper>;
            break;
          case 'timeline':
            rendered = <DiagramWrapper title={data.title || 'Timeline'}><TimelineDiagram data={data} /></DiagramWrapper>;
            break;
          case 'radial':
            rendered = <DiagramWrapper title={data.title || 'Radial'}><RadialDiagram data={data} /></DiagramWrapper>;
            break;
          case 'compare':
            rendered = <DiagramWrapper title={data.title || 'Perbandingan'}><CompareDiagram data={data} /></DiagramWrapper>;
            break;
          case 'cycle':
            rendered = <DiagramWrapper title={data.title || 'Siklus'}><CycleDiagram data={data} /></DiagramWrapper>;
            break;
          default:
            setState('error');
            return;
        }
        setNode(rendered);
        setState('ok');
      } catch {
        setState('error');
      }
    }, 80);
    return () => clearTimeout(t);
  }, [raw, type]);

  if (state === 'loading') return <DiagramLoading />;
  if (state === 'error')   return <DiagramError />;
  return <>{node}</>;
});

// ── Mermaid diagram ───────────────────────────
export const MermaidDiagram = memo(({ content }: { content: string }) => {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [svgCode, setSvgCode] = useState('');
  const mountedRef = React.useRef(true);
  const isDark = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;

  useEffect(() => {
    mountedRef.current = true;
    setState('loading');
    setSvgCode('');

    const render = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'neutral',
          fontFamily: 'inherit',
          themeVariables: isDark
            ? { primaryColor: '#3a3a3a', primaryTextColor: '#e0e0e0', primaryBorderColor: '#505050', lineColor: '#6b6b6b', secondaryColor: '#2e2e2e', background: '#1e1e1e' }
            : { primaryColor: '#f0efed', primaryTextColor: '#1a1a1a', primaryBorderColor: '#d0cdc8', lineColor: '#a0a0a0', secondaryColor: '#e8e6e2', background: '#ffffff' },
        });
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const clean = content.replace(/```mermaid/gi, '').replace(/```/g, '').trim();
        const { svg } = await mermaid.render(id, clean);
        if (!mountedRef.current) return;
        setSvgCode(svg);
        setState('ok');
      } catch {
        if (mountedRef.current) setState('error');
      }
    };
    render();
    return () => { mountedRef.current = false; };
  }, [content, isDark]);

  if (state === 'loading') return <DiagramLoading />;
  if (state === 'error')   return <DiagramError />;

  return (
    <DiagramWrapper title="Diagram">
      <div dangerouslySetInnerHTML={{ __html: svgCode }} style={{ maxWidth: '100%', overflowX: 'auto' }} />
    </DiagramWrapper>
  );
});
