// ─────────────────────────────────────────────
// DIAGRAM SHAPES — src/components/chat/components/diagrams/DiagramShapes.tsx
// MindmapDiagram · FlowDiagram · TimelineDiagram
// RadialDiagram  · CompareDiagram · CycleDiagram
// ─────────────────────────────────────────────
import React from 'react';
import type {
  MindmapData, FlowData, TimelineData,
  RadialData, CompareData, CycleData,
} from '../../types';

// ── MINDMAP ───────────────────────────────────
export const MindmapDiagram = ({ data }: { data: MindmapData }) => {
  const cols = Math.min(data.branches.length, 3);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <div style={{
        background: 'var(--text, #141414)', color: 'var(--bg, #f2f0eb)',
        padding: '10px 24px', borderRadius: 32,
        fontSize: 13.5, fontWeight: 700, letterSpacing: '0.01em',
        boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      }}>{data.center}</div>

      <svg width="100%" height="24" style={{ overflow: 'visible', flexShrink: 0 }}>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--bd,#e0ddd7)" strokeWidth="1.5" />
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, width: '100%' }}>
        {data.branches.map((b, bi) => (
          <div key={bi} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
            <div style={{
              background: 'var(--text, #141414)', color: 'var(--bg, #f2f0eb)',
              padding: '7px 10px', borderRadius: 10,
              fontSize: 12, fontWeight: 700, textAlign: 'center',
            }}>{b.label}</div>
            {b.children.map((c, ci) => (
              <div key={ci} style={{
                background: 'var(--bg, #f2f0eb)', color: 'var(--text, #141414)',
                border: '1.5px solid var(--bd, #e0ddd7)',
                padding: '7px 10px', borderRadius: 9,
                fontSize: 11.5, textAlign: 'center', lineHeight: 1.4,
                wordBreak: 'break-word',
              }}>{c}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── FLOW ──────────────────────────────────────
export const FlowDiagram = ({ data }: { data: FlowData }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
    {data.rows.map((row, ri) => (
      <React.Fragment key={ri}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: row.nodes.length === 1 ? '1fr' : `repeat(${row.nodes.length}, 1fr)`,
          gap: 8, width: '100%',
        }}>
          {row.nodes.map((node, ni) => {
            const isDark = node.role === 'start' || node.role === 'end';
            return (
              <div key={ni} style={{
                background: isDark ? 'var(--text, #141414)' : 'var(--bg, #f2f0eb)',
                color: isDark ? 'var(--bg, #f2f0eb)' : 'var(--text, #141414)',
                border: isDark ? 'none' : '1.5px solid var(--bd, #e0ddd7)',
                borderRadius: 11, padding: '10px 12px', textAlign: 'center',
                boxShadow: isDark ? '0 3px 12px rgba(0,0,0,0.18)' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 650, lineHeight: 1.35, wordBreak: 'break-word' }}>{node.label}</div>
                {node.sub && (
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 3, lineHeight: 1.35, wordBreak: 'break-word' }}>{node.sub}</div>
                )}
              </div>
            );
          })}
        </div>
        {ri < data.rows.length - 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28, flexShrink: 0 }}>
            <svg width="14" height="20" viewBox="0 0 14 20">
              <line x1="7" y1="0" x2="7" y2="13" stroke="var(--bd,#d0cdc8)" strokeWidth="1.5" />
              <polygon points="7,20 2,12 12,12" fill="var(--bd,#d0cdc8)" />
            </svg>
          </div>
        )}
      </React.Fragment>
    ))}
  </div>
);

// ── TIMELINE ──────────────────────────────────
export const TimelineDiagram = ({ data }: { data: TimelineData }) => (
  <div style={{ position: 'relative', paddingLeft: 28 }}>
    <div style={{
      position: 'absolute', left: 9, top: 8, bottom: 8,
      width: 2, background: 'var(--bd, #e0ddd7)', borderRadius: 2,
    }} />
    {data.items.map((item, i) => (
      <div key={i} style={{ position: 'relative', paddingBottom: i < data.items.length - 1 ? 20 : 0 }}>
        <div style={{
          position: 'absolute', left: -21, top: 4,
          width: 16, height: 16, borderRadius: '50%', boxSizing: 'border-box',
          background: item.empty ? 'var(--sf, #f7f5f1)' : 'var(--text, #141414)',
          border: item.empty ? '2px solid var(--bd, #e0ddd7)' : '3px solid var(--sf, #f7f5f1)',
          boxShadow: item.empty ? 'none' : '0 0 0 1.5px var(--text,#141414)',
        }} />
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--mu, #909090)',
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3,
        }}>{item.phase}</div>
        <div style={{
          fontSize: 14, fontWeight: 650, color: 'var(--text, #141414)', marginBottom: 6, lineHeight: 1.3,
        }}>{item.title}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {item.tags.map((tag, ti) => (
            <span key={ti} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              border: '1px solid var(--bd, #e0ddd7)',
              color: 'var(--mu, #909090)', background: 'var(--bg, #f2f0eb)',
            }}>{tag}</span>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ── RADIAL ────────────────────────────────────
export const RadialDiagram = ({ data }: { data: RadialData }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: 80, height: 80, borderRadius: '50%',
      background: 'var(--text, #141414)', color: 'var(--bg, #f2f0eb)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, textAlign: 'center',
      boxShadow: '0 6px 24px rgba(0,0,0,0.25)', flexShrink: 0,
    }}>{data.center}</div>
    {data.rings.map((ring, ri) => (
      <div key={ri} style={{ width: '100%' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: 'var(--mu, #909090)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          textAlign: 'center', marginBottom: 6,
        }}>{ri + 1}. {ring.label}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
          {ring.items.map((item, ii) => (
            <div key={ii} style={{
              background: ri === 0 ? 'var(--text, #141414)' : 'var(--bg, #f2f0eb)',
              color: ri === 0 ? 'var(--bg, #f2f0eb)' : 'var(--text, #141414)',
              border: ri === 0 ? 'none' : '1.5px solid var(--bd, #e0ddd7)',
              borderRadius: 9, padding: '7px 13px',
              fontSize: 12, fontWeight: 550,
              wordBreak: 'break-word', textAlign: 'center',
            }}>{item}</div>
          ))}
        </div>
        {ri < data.rings.length - 1 && (
          <div style={{ height: 1, background: 'var(--bd, #e0ddd7)', margin: '10px 0 0', opacity: 0.5 }} />
        )}
      </div>
    ))}
  </div>
);

// ── COMPARE ───────────────────────────────────
export const CompareDiagram = ({ data }: { data: CompareData }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(data.columns.length, 2)}, 1fr)`, gap: 10 }}>
    {data.columns.map((col, ci) => (
      <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          background: ci === 0 ? 'var(--text, #141414)' : 'var(--bg, #f2f0eb)',
          color: ci === 0 ? 'var(--bg, #f2f0eb)' : 'var(--text, #141414)',
          border: ci === 0 ? 'none' : '1.5px solid var(--bd, #e0ddd7)',
          padding: '8px 12px', borderRadius: 10,
          fontSize: 12.5, fontWeight: 700, textAlign: 'center',
        }}>{col.label}</div>
        {col.items.map((item, ii) => (
          <div key={ii} style={{
            background: 'var(--bg, #f2f0eb)', color: 'var(--text, #141414)',
            border: '1.5px solid var(--bd, #e0ddd7)',
            padding: '7px 10px', borderRadius: 9,
            fontSize: 12, lineHeight: 1.4, wordBreak: 'break-word',
          }}>{item}</div>
        ))}
      </div>
    ))}
  </div>
);

// ── CYCLE ─────────────────────────────────────
export const CycleDiagram = ({ data }: { data: CycleData }) => {
  const n = data.steps.length;
  const angleStep = (2 * Math.PI) / n;
  const cx = 120, cy = 120, r = 80;
  return (
    <div style={{ position: 'relative', width: '100%', paddingBottom: '60%', minHeight: 200 }}>
      <svg
        viewBox="0 0 240 240"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bd,#e0ddd7)" strokeWidth="1.5" strokeDasharray="6 4" />
        <circle cx={cx} cy={cy} r={22} fill="var(--text,#141414)" />
        <text x={cx} y={cy + 4} textAnchor="middle" fill="white" fontSize="9" fontWeight="700">CYCLE</text>

        {data.steps.map((step, i) => {
          const angle = angleStep * i - Math.PI / 2;
          const nx = cx + r * Math.cos(angle), ny = cy + r * Math.sin(angle);
          const lx = cx + (r + 36) * Math.cos(angle), ly = cy + (r + 36) * Math.sin(angle);
          return (
            <g key={i}>
              <circle cx={nx} cy={ny} r={5} fill="var(--text,#141414)" />
              <foreignObject x={lx - 32} y={ly - 16} width={64} height={36}>
                <div style={{
                  background: 'var(--bg, #f2f0eb)',
                  border: '1.5px solid var(--bd, #e0ddd7)',
                  borderRadius: 8, padding: '4px 6px',
                  fontSize: 10, fontWeight: 650, textAlign: 'center',
                  lineHeight: 1.3, wordBreak: 'break-word', color: 'var(--text, #141414)',
                }}>{step.label}</div>
              </foreignObject>
            </g>
          );
        })}

        {data.steps.map((_, i) => {
          const a1 = angleStep * i - Math.PI / 2 + 0.25;
          const a2 = angleStep * (i + 1) - Math.PI / 2 - 0.25;
          const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
          const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
          const mx = cx + r * Math.cos((a1 + a2) / 2), my = cy + r * Math.sin((a1 + a2) / 2);
          return (
            <path key={i} d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
              fill="none" stroke="var(--bd,#d0cdc8)" strokeWidth="1.2" markerEnd="url(#arr)" />
          );
        })}
        <defs>
          <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <polygon points="0,0 6,3 0,6" fill="var(--bd,#d0cdc8)" />
          </marker>
        </defs>
      </svg>
    </div>
  );
};
