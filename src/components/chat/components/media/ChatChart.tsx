// ─────────────────────────────────────────────
// CHAT CHART — src/components/chat/components/media/ChatChart.tsx
// Grafik garis / batang. Semua warna dari variabel tema (--text, --mu, --bd, --sf, --cd),
// jadi otomatis ikut dark/light dan tidak warna-warni. Sentuh/arahkan untuk lihat nilai.
// ─────────────────────────────────────────────
import React, { memo, useMemo, useState } from 'react';
import { useT, usePageText } from '../../../../lib/i18n';
import { BUBBLE_NS, BUBBLE_TEXT } from '../../../../lib/bubbleText';
import { nativeDigitsLocale } from '../../../../lib/dateFmt';
import type { ChartSpec } from '../../../../lib/chartBlocks';

const W = 560;
const H = 220;
const PAD_T = 14;
const PAD_B = 28;
const PAD_R = 14;
const SERIES_OPACITY = [1, 0.55, 0.3];

// Angka mengikuti bahasa aktif (digit asli bahasanya).
const mkFmt = (lang: string) => {
  const make = (loc: string) => ({
    full: new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }),
    compact: new Intl.NumberFormat(loc, { notation: 'compact', maximumFractionDigits: 1 }),
  });
  let f;
  try { f = make(lang === 'id' ? 'id-ID' : nativeDigitsLocale(lang)); } catch { f = make('id-ID'); }
  return { fmtFull: f.full, fmtTick: (n: number) => (Math.abs(n) >= 1e6 ? f.compact.format(n) : f.full.format(n)) };
};

function niceScale(min: number, max: number, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const rough = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return { lo, hi, ticks };
}

export const ChatChart = memo(({ spec }: { spec: ChartSpec }) => {
  const { lang } = useT();
  const bx = usePageText(BUBBLE_NS, BUBBLE_TEXT);
  const { fmtFull, fmtTick } = useMemo(() => mkFmt(lang), [lang]);
  const gid = useMemo(() => 'cy-cc-' + Math.random().toString(36).slice(2, 8), []);
  const [hover, setHover] = useState<number | null>(null);

  const isBar = false; // grafik batang dihapus: semua grafik tampil sebagai garis
  const n = spec.labels.length;
  const all = spec.series.flatMap(s => s.values);
  const dataMin = Math.min(...all);
  const dataMax = Math.max(...all);
  // Batang selalu mulai dari 0; garis boleh mulai dari kisaran datanya
  const { lo, hi, ticks } = niceScale(isBar ? Math.min(0, dataMin) : dataMin, isBar ? Math.max(0, dataMax) : dataMax);

  const tickLabels = ticks.map(fmtTick);
  const PAD_L = Math.max(...tickLabels.map(t => t.length)) * 6.4 + 14;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const y = (v: number) => PAD_T + innerH - ((v - lo) / (hi - lo)) * innerH;
  const slot = innerW / n;
  const xLine = (i: number) => PAD_L + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const xBar = (i: number) => PAD_L + slot * i + slot / 2;
  const xAt = isBar ? xBar : xLine;

  const labelEvery = Math.ceil(n / 7);
  const multi = spec.series.length > 1;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let idx: number;
    if (isBar) idx = Math.floor((px - PAD_L) / slot);
    else idx = Math.round(((px - PAD_L) / innerW) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, idx)));
  };

  const fmtVal = (v: number) => `${spec.unit && spec.unit.length <= 3 ? spec.unit + ' ' : ''}${fmtFull.format(v)}${spec.unit && spec.unit.length > 3 ? ' ' + spec.unit : ''}`;

  return (
    <div
      style={{
        width: '100%', maxWidth: 560, boxSizing: 'border-box', margin: '10px 0 4px', padding: '14px 14px 10px',
        background: 'var(--cd)', border: '1px solid var(--bd)', borderRadius: 16,
      }}
    >
      <style>{`
        @keyframes cy-cc-draw { to { stroke-dashoffset: 0; } }
        @keyframes cy-cc-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cy-cc-grow { from { transform: scaleY(0) } to { transform: scaleY(1) } }
        @keyframes cy-cc-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        /* garis + area NAIK dari dasar ke posisi akhir satu kali, lalu diam */
        .cy-cc-rise { transform-box: view-box; animation: cy-cc-rise 0.85s cubic-bezier(.22,.8,.28,1) both; }
        .cy-cc-bar { transform-box: fill-box; transform-origin: bottom; animation: cy-cc-grow 0.5s ease both; }
        @media (prefers-reduced-motion: reduce) { .cy-cc-rise, .cy-cc-bar { animation: none; } }
      `}</style>

      {spec.title && (
        <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{spec.title}</p>
      )}
      {multi && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, margin: '4px 0 2px' }}>
          {spec.series.map((s, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mu)' }}>
              <svg width="18" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="18" y2="4" stroke="var(--text)" strokeOpacity={SERIES_OPACITY[i]} strokeWidth="2" />
              </svg>
              {s.name}
            </span>
          ))}
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={spec.title || bx.chart}
        style={{ display: 'block', touchAction: 'pan-y' }}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--text)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="var(--text)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="var(--text)" strokeOpacity="0.08" />
            <text x={PAD_L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--mu)">{tickLabels[i]}</text>
          </g>
        ))}

        {spec.labels.map((l, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={i} x={xAt(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--mu)">{l}</text>
          ) : null,
        )}

        {isBar
          ? spec.series.map((s, si) => {
              const groupW = Math.min(slot * 0.7, 56);
              const bw = groupW / spec.series.length;
              return s.values.map((v, i) => {
                const x0 = xBar(i) - groupW / 2 + bw * si;
                const top = Math.min(y(v), y(0));
                const h = Math.abs(y(v) - y(0));
                return (
                  <rect
                    key={`${si}-${i}`} className="cy-cc-bar"
                    x={x0 + 1} y={top} width={Math.max(bw - 2, 2)} height={Math.max(h, 1)} rx={3}
                    fill="var(--text)" fillOpacity={(hover === null || hover === i ? 1 : 0.35) * SERIES_OPACITY[si]}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                );
              });
            })
          : spec.series.map((s, si) => {
              const pts = s.values.map((v, i) => [xLine(i), y(v)] as const);
              const d = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
              const area = `${d} L${pts[pts.length - 1][0].toFixed(1)} ${y(lo).toFixed(1)} L${pts[0][0].toFixed(1)} ${y(lo).toFixed(1)} Z`;
              return (
                <g key={si} className="cy-cc-rise" style={{ transformOrigin: `0px ${y(lo).toFixed(1)}px` }}>
                  {si === 0 && <path d={area} fill={`url(#${gid})`} />}
                  <path
                    d={d} fill="none" stroke="var(--text)" strokeOpacity={SERIES_OPACITY[si]} strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}

        {hover !== null && (
          <g pointerEvents="none">
            {!isBar && <line x1={xLine(hover)} x2={xLine(hover)} y1={PAD_T} y2={PAD_T + innerH} stroke="var(--text)" strokeOpacity="0.25" />}
            {!isBar && spec.series.map((s, si) => (
              <circle key={si} cx={xLine(hover)} cy={y(s.values[hover])} r="4" fill="var(--cd)" stroke="var(--text)" strokeOpacity={SERIES_OPACITY[si]} strokeWidth="2" />
            ))}
          </g>
        )}
      </svg>

      <div style={{ minHeight: 20, marginTop: 2, fontSize: 12, color: 'var(--text)', display: 'flex', flexWrap: 'wrap', gap: '2px 12px' }}>
        {hover !== null ? (
          <>
            <span style={{ color: 'var(--mu)' }}>{spec.labels[hover]}</span>
            {spec.series.map((s, i) => (
              <span key={i} style={{ fontWeight: 600 }}>
                {multi ? `${s.name}: ` : ''}{fmtVal(s.values[hover])}
              </span>
            ))}
          </>
        ) : (
          <span style={{ color: 'var(--mu)' }}>{bx.touchChart}</span>
        )}
      </div>
    </div>
  );
});
ChatChart.displayName = 'ChatChart';
