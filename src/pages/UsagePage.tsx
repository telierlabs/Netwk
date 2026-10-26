import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Calendar, Flame, TrendingUp, Clock, BarChart2, Trophy, Sun } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useProfile } from '../hooks/useProfile';
import { dateKey } from '../lib/usageTracker';

// Re-export biar import lama (`from '../pages/UsagePage'`) tetap jalan kalau masih ada yang pakai.
export { trackMessageSent } from '../lib/usageTracker';

// ─────────────────────────────────────────────
// KONSTANTA & HELPER
// ─────────────────────────────────────────────
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
const BAR_W = 36; // lebar kolom bar (px)
const MIN_DAYS = 14; // minimal hari yang ditampilkan di grafik

const parseKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const diffDays = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 86400000);

const formatNumber = (n: number, digits = 0) =>
  n.toLocaleString('id-ID', { maximumFractionDigits: digits });

const formatLongDate = (key: string) => {
  const d = parseKey(key);
  return `${DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

interface DayRecord {
  count: number;
  hours: Record<string, number>;
}

const scrollStyle: React.CSSProperties = {
  scrollbarWidth: 'none',
  WebkitOverflowScrolling: 'touch',
  touchAction: 'pan-x pan-y',
  overscrollBehaviorX: 'contain',
};

// ─────────────────────────────────────────────
// KOMPONEN UTAMA
// ─────────────────────────────────────────────
export const UsagePage = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useProfile();

  const [days, setDays] = useState<Record<string, DayRecord>>({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<string>(dateKey());

  const dayScrollRef = useRef<HTMLDivElement>(null);
  const hourScrollRef = useRef<HTMLDivElement>(null);

  // ── Realtime listener ke users/{uid}/usage ──
  useEffect(() => {
    let unsubSnap: (() => void) | undefined;

    const unsubAuth = auth.onAuthStateChanged(user => {
      if (unsubSnap) { unsubSnap(); unsubSnap = undefined; }
      if (!user) { setDays({}); setLoaded(true); return; }

      unsubSnap = onSnapshot(
        collection(db, 'users', user.uid, 'usage'),
        snap => {
          const next: Record<string, DayRecord> = {};
          snap.forEach(d => {
            const data = d.data() as any;
            const key: string = data.date || d.id;
            next[key] = {
              count: Number(data.count) || 0,
              hours: (data.hours && typeof data.hours === 'object') ? data.hours : {},
            };
          });
          setDays(next);
          setLoadError(false);
          setLoaded(true);
        },
        err => {
          console.error('Gagal baca usage dari Firestore', err);
          setLoadError(true);
          setLoaded(true);
        }
      );
    });

    return () => { unsubAuth(); if (unsubSnap) unsubSnap(); };
  }, []);

  // ── Gabung data lama (profile.usage.daily) + data baru ──
  // Data lama sudah gak diupdate lagi, jadi aman dijumlahkan (gak bakal dobel).
  const merged = useMemo(() => {
    const map: Record<string, { count: number; hours: Record<string, number> }> = {};

    const legacyDaily: { date: string; count: number }[] =
      Array.isArray((profile as any)?.usage?.daily) ? (profile as any).usage.daily : [];
    legacyDaily.forEach(d => {
      if (!d?.date) return;
      map[d.date] = { count: Number(d.count) || 0, hours: {} };
    });

    Object.entries(days).forEach(([key, rec]) => {
      const prev = map[key];
      map[key] = {
        count: (prev?.count || 0) + rec.count,
        hours: rec.hours,
      };
    });

    return map;
  }, [days, profile]);

  // ── Kalkulasi statistik ──
  const stats = useMemo(() => {
    const todayDate = parseKey(dateKey());
    const todayKey = dateKey(todayDate);
    const monthKey = todayKey.substring(0, 7);

    const entries = Object.entries(merged).filter(([, v]) => v.count > 0);
    const total = entries.reduce((s, [, v]) => s + v.count, 0);
    const activeDays = entries.length;

    const todayCount = merged[todayKey]?.count || 0;
    const monthCount = entries
      .filter(([k]) => k.startsWith(monthKey))
      .reduce((s, [, v]) => s + v.count, 0);

    // Streak: kalau hari ini belum kirim, mulai hitung dari kemarin (streak belum putus).
    let streak = 0;
    let cursor = todayCount > 0 ? todayDate : addDays(todayDate, -1);
    while ((merged[dateKey(cursor)]?.count || 0) > 0) {
      streak++;
      cursor = addDays(cursor, -1);
    }

    // Hari paling awal yang punya catatan
    const sortedKeys = entries.map(([k]) => k).sort();
    const firstKey = sortedKeys[0];
    const daysSince = firstKey ? Math.max(1, diffDays(parseKey(firstKey), todayDate) + 1) : 0;

    // Rata-rata per hari AKTIF (bukan dibagi semua hari sejak install) biar gak 0 terus
    const avgPerActiveDay = activeDays > 0 ? total / activeDays : 0;

    // Hari terbaik
    let bestKey = '';
    let bestCount = 0;
    entries.forEach(([k, v]) => { if (v.count > bestCount) { bestCount = v.count; bestKey = k; } });

    // Jam: total per jam 0-23
    const hourTotals = Array.from({ length: 24 }, () => 0);
    Object.values(merged).forEach(v => {
      Object.entries(v.hours || {}).forEach(([h, c]) => {
        const idx = Number(h);
        if (idx >= 0 && idx < 24) hourTotals[idx] += Number(c) || 0;
      });
    });
    const maxHour = Math.max(...hourTotals);
    const busiestHour = maxHour > 0 ? hourTotals.indexOf(maxHour) : -1;

    // Deret harian dari hari pertama sampai hari ini (minimal MIN_DAYS hari)
    const startDate = firstKey
      ? parseKey(firstKey)
      : addDays(todayDate, -(MIN_DAYS - 1));
    const minStart = addDays(todayDate, -(MIN_DAYS - 1));
    const rangeStart = startDate < minStart ? startDate : minStart;
    const totalDays = diffDays(rangeStart, todayDate) + 1;

    const series = Array.from({ length: totalDays }, (_, i) => {
      const d = addDays(rangeStart, i);
      const key = dateKey(d);
      return {
        key,
        day: d.getDate(),
        month: d.getMonth(),
        weekday: d.getDay(),
        count: merged[key]?.count || 0,
      };
    });

    const maxDaily = Math.max(...series.map(s => s.count), 1);

    const history = entries
      .map(([k, v]) => ({ key: k, count: v.count }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));

    return {
      todayKey, total, activeDays, todayCount, monthCount, streak, daysSince,
      avgPerActiveDay, bestKey, bestCount, hourTotals, maxHour, busiestHour,
      series, maxDaily, history,
    };
  }, [merged]);

  // Auto-scroll grafik harian ke kanan (hari ini) setelah data siap
  useEffect(() => {
    if (!loaded) return;
    const el = dayScrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [loaded, stats.series.length]);

  // Auto-scroll grafik jam ke jam sibuk / jam sekarang
  useEffect(() => {
    if (!loaded) return;
    const el = hourScrollRef.current;
    if (!el) return;
    const target = stats.busiestHour >= 0 ? stats.busiestHour : new Date().getHours();
    el.scrollLeft = Math.max(0, target * BAR_W - el.clientWidth / 2 + BAR_W / 2);
  }, [loaded, stats.busiestHour]);

  const selectedCount = merged[selected]?.count || 0;

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-20" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
      <style>{`.usage-scroll::-webkit-scrollbar{display:none}`}</style>

      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)] z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={22} strokeWidth={2.5} /></button>
        <div>
          <h1 className="font-black text-[18px] text-[var(--text)] tracking-tight leading-none">Penggunaan</h1>
          <p className="text-[11px] text-[var(--mu)] mt-0.5">Statistik interaksi kamu dengan Cylen</p>
        </div>
      </header>

      <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">

        {loadError && (
          <div className="rounded-[18px] border border-red-500/40 bg-red-500/10 p-4 text-[12px] text-red-400 font-medium">
            Gagal membaca data penggunaan dari Firestore. Cek Firestore Rules — pastikan user boleh baca/tulis di <span className="font-bold">users/{'{uid}'}/usage</span>.
          </div>
        )}

        {/* TOTAL SEMUA WAKTU */}
        <div className="relative bg-[var(--text)] rounded-[28px] p-6 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={16} className="text-[var(--bg)] opacity-70" />
              <span className="text-[11px] font-bold text-[var(--bg)] opacity-70 uppercase tracking-widest">Total Semua Waktu</span>
            </div>
            <div className="text-[52px] font-black text-[var(--bg)] tracking-tighter leading-none">{formatNumber(stats.total)}</div>
            <div className="text-[13px] text-[var(--bg)] opacity-60 mt-2 font-medium">
              {stats.daysSince > 0
                ? `pesan terkirim dalam ${formatNumber(stats.activeDays)} hari aktif · tercatat sejak ${formatNumber(stats.daysSince)} hari lalu`
                : 'belum ada pesan tercatat'}
            </div>
          </div>
        </div>

        {/* GRID STATISTIK */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Clock size={14} className="text-[var(--mu)]" />} label="Hari Ini" value={formatNumber(stats.todayCount)} sub="pesan" />
          <StatCard icon={<Calendar size={14} className="text-[var(--mu)]" />} label="Bulan Ini" value={formatNumber(stats.monthCount)} sub="pesan" />
          <StatCard icon={<Flame size={14} className="text-orange-400" />} label="Streak" value={formatNumber(stats.streak)} sub="hari berturut-turut" />
          <StatCard icon={<TrendingUp size={14} className="text-[var(--mu)]" />} label="Rata-rata" value={formatNumber(stats.avgPerActiveDay, 1)} sub="pesan / hari aktif" />
          <StatCard
            icon={<Trophy size={14} className="text-yellow-400" />}
            label="Rekor Harian"
            value={formatNumber(stats.bestCount)}
            sub={stats.bestKey ? formatLongDate(stats.bestKey) : 'belum ada'}
          />
          <StatCard
            icon={<Sun size={14} className="text-[var(--mu)]" />}
            label="Jam Tersibuk"
            value={stats.busiestHour >= 0 ? `${String(stats.busiestHour).padStart(2, '0')}:00` : '–'}
            sub={stats.busiestHour >= 0 ? `${formatNumber(stats.maxHour)} pesan` : 'belum ada data'}
          />
        </div>

        {/* GRAFIK HARIAN — SEMUA RIWAYAT, GESER KIRI/KANAN */}
        <div className="bg-[var(--sf)] rounded-[24px] border border-[var(--bd)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2"><BarChart2 size={16} className="text-[var(--text)]" /><span className="font-bold text-[13px] text-[var(--text)] uppercase tracking-widest">Riwayat Harian</span></div>
              <p className="text-[11px] text-[var(--mu)] mt-0.5 ml-6">Geser grafik ke kiri / kanan · ketuk batang buat detail</p>
            </div>
            <div className="text-right">
              <div className="text-[18px] font-black text-[var(--text)]">{formatNumber(stats.series.length)}</div>
              <div className="text-[10px] text-[var(--mu)] font-bold">hari tercatat</div>
            </div>
          </div>

          <div ref={dayScrollRef} className="usage-scroll overflow-x-auto overflow-y-hidden -mx-1" style={scrollStyle}>
            <div className="flex items-end w-max px-1" style={{ gap: 0 }}>
              {stats.series.map((d, i) => {
                const isToday = d.key === stats.todayKey;
                const isSel = d.key === selected;
                const heightPct = d.count > 0 ? Math.max((d.count / stats.maxDaily) * 100, 6) : 0;
                const showMonth = i === 0 || d.day === 1;
                return (
                  <button
                    key={d.key}
                    onClick={() => setSelected(d.key)}
                    className="flex flex-col items-center flex-shrink-0 outline-none"
                    style={{ width: BAR_W }}
                  >
                    <span className="text-[9px] font-bold text-[var(--mu)] h-3 leading-3">{d.count > 0 ? d.count : ''}</span>
                    <div className="w-full flex items-end justify-center mt-1" style={{ height: 120 }}>
                      {d.count > 0 ? (
                        <div
                          className="rounded-t-lg transition-all duration-300"
                          style={{
                            width: BAR_W - 12,
                            height: `${heightPct}%`,
                            background: 'var(--text)',
                            opacity: isSel || isToday ? 1 : 0.45,
                          }}
                        />
                      ) : (
                        <div className="rounded-full" style={{ width: BAR_W - 12, height: 2, background: 'var(--bd)' }} />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold mt-1.5 ${isSel || isToday ? 'text-[var(--text)]' : 'text-[var(--mu)]'}`}>{d.day}</span>
                    <span className="text-[8px] text-[var(--mu)] font-medium h-3 leading-3 whitespace-nowrap">{showMonth ? MONTHS_SHORT[d.month] : DAYS_SHORT[d.weekday]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[var(--bd)] flex items-center justify-between">
            <span className="text-[12px] font-bold text-[var(--text)]">{formatLongDate(selected)}</span>
            <span className="text-[12px] text-[var(--mu)] font-medium"><span className="font-black text-[var(--text)] text-[15px]">{formatNumber(selectedCount)}</span> pesan</span>
          </div>
        </div>

        {/* GRAFIK JAM — GESER KIRI/KANAN */}
        <div className="bg-[var(--sf)] rounded-[24px] border border-[var(--bd)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2"><Clock size={16} className="text-[var(--text)]" /><span className="font-bold text-[13px] text-[var(--text)] uppercase tracking-widest">Pola Jam</span></div>
              <p className="text-[11px] text-[var(--mu)] mt-0.5 ml-6">Kamu paling sering chat jam berapa</p>
            </div>
          </div>
          <div ref={hourScrollRef} className="usage-scroll overflow-x-auto overflow-y-hidden -mx-1" style={scrollStyle}>
            <div className="flex items-end w-max px-1">
              {stats.hourTotals.map((c, h) => {
                const heightPct = c > 0 ? Math.max((c / Math.max(stats.maxHour, 1)) * 100, 6) : 0;
                const isTop = h === stats.busiestHour;
                return (
                  <div key={h} className="flex flex-col items-center flex-shrink-0" style={{ width: BAR_W }}>
                    <span className="text-[9px] font-bold text-[var(--mu)] h-3 leading-3">{c > 0 ? c : ''}</span>
                    <div className="w-full flex items-end justify-center mt-1" style={{ height: 80 }}>
                      {c > 0 ? (
                        <div className="rounded-t-md" style={{ width: BAR_W - 14, height: `${heightPct}%`, background: 'var(--text)', opacity: isTop ? 1 : 0.4 }} />
                      ) : (
                        <div className="rounded-full" style={{ width: BAR_W - 14, height: 2, background: 'var(--bd)' }} />
                      )}
                    </div>
                    <span className={`text-[10px] font-bold mt-1.5 ${isTop ? 'text-[var(--text)]' : 'text-[var(--mu)]'}`}>{String(h).padStart(2, '0')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DAFTAR RIWAYAT — NAIK/TURUN LEWAT SCROLL HALAMAN */}
        <div className="bg-[var(--sf)] rounded-[24px] border border-[var(--bd)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-[var(--text)]" />
            <span className="font-bold text-[13px] text-[var(--text)] uppercase tracking-widest">Catatan per Hari</span>
          </div>
          {stats.history.length === 0 ? (
            <p className="text-[12px] text-[var(--mu)]">Belum ada pesan tercatat. Kirim pesan dulu, nanti muncul di sini.</p>
          ) : (
            <div className="flex flex-col">
              {stats.history.map(h => {
                const pct = Math.max((h.count / stats.maxDaily) * 100, 4);
                return (
                  <button
                    key={h.key}
                    onClick={() => { setSelected(h.key); }}
                    className="flex items-center gap-3 py-2.5 border-b border-[var(--bd)] last:border-b-0 text-left"
                  >
                    <span className="text-[12px] font-bold text-[var(--text)] w-[118px] flex-shrink-0">{formatLongDate(h.key)}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--bd)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--text)' }} />
                    </div>
                    <span className="text-[12px] font-black text-[var(--text)] w-8 text-right flex-shrink-0">{formatNumber(h.count)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// KARTU STATISTIK KECIL
// ─────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) => (
  <div className="bg-[var(--sf)] rounded-[22px] p-5 border border-[var(--bd)] min-w-0">
    <div className="flex items-center gap-1.5 mb-3">{icon}<span className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">{label}</span></div>
    <div className="text-[32px] font-black text-[var(--text)] tracking-tighter leading-none">{value}</div>
    <div className="text-[11px] text-[var(--mu)] mt-1.5 font-medium truncate">{sub}</div>
  </div>
);
