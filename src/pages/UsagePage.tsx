import React from 'react';
import { ArrowLeft, MessageCircle, Calendar, Flame, TrendingUp, Clock, BarChart2 } from 'lucide-react';
import { useProfile } from '../hooks/useProfile';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// ── FUNGSI INI DIPANGGIL DARI useChat.ts SAAT NGIRIM PESAN ──
export async function trackMessageSent() {
  if (!auth.currentUser) return;
  const today = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
  const docRef = doc(db, 'users', auth.currentUser.uid, 'profile', 'data');
  
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      let usage = data.usage || { total: 0, daily: [], firstUsed: new Date().toISOString() };
      
      usage.total += 1;
      
      const dayIndex = usage.daily.findIndex((d: any) => d.date === today);
      if (dayIndex !== -1) {
        usage.daily[dayIndex].count += 1;
      } else {
        usage.daily.push({ date: today, count: 1 });
      }
      
      // Batasin maksimal 90 hari aja biar dokumen Firestore ga kepenuhan
      usage.daily = usage.daily.slice(-90);
      
      await updateDoc(docRef, { usage });
    }
  } catch (e) {
    console.error("Gagal track usage ke Firestore", e);
  }
}

// ─────────────────────────────────────────────
// KOMPONEN UTAMA USAGE PAGE
// ─────────────────────────────────────────────
export const UsagePage = ({ onBack }: { onBack: () => void }) => {
  const { profile } = useProfile();
  
  // Tarik data usage dari Firestore via hook
  const usage = profile.usage || { total: 0, daily: [], firstUsed: new Date().toISOString() };

  // --- HELPERS KALKULASI BERDASARKAN DATA FIRESTORE ---
  const todayKey = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
  const monthKey = todayKey.substring(0, 7); // "YYYY-MM"

  const todayCount = usage.daily.find(d => d.date === todayKey)?.count || 0;
  const monthCount = usage.daily.filter(d => d.date.startsWith(monthKey)).reduce((sum, d) => sum + d.count, 0);

  const getStreak = () => {
    let streak = 0;
    let d = new Date();
    while (true) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (usage.daily.find(x => x.date === key && x.count > 0)) { streak++; d.setDate(d.getDate() - 1); } 
      else break;
    }
    return streak;
  };

  const getDaysSinceFirst = () => {
    const first = new Date(usage.firstUsed);
    const now = new Date();
    return Math.max(1, Math.floor((now.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getLast7Days = () => {
    const result = [];
    const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const found = usage.daily.find(x => x.date === key);
      result.push({ label: i === 0 ? 'Hari ini' : DAYS[d.getDay()], date: key, count: found ? found.count : 0 });
    }
    return result;
  };

  const getLast30Days = () => {
    const result = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const found = usage.daily.find(x => x.date === key);
      result.push({ date: key, count: found ? found.count : 0 });
    }
    return result;
  };

  const formatNumber = (n: number) => n.toLocaleString('id-ID');

  const streak = getStreak();
  const daysSince = getDaysSinceFirst();
  const last7 = getLast7Days();
  const last30 = getLast30Days();
  const avgPerDay = daysSince > 0 ? Math.round(usage.total / daysSince) : 0;
  
  const max7 = Math.max(...last7.map(d => d.count), 1);
  const max30 = Math.max(...last30.map(d => d.count), 1);

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] overflow-y-auto pb-20" style={{ scrollbarWidth: 'none' }}>

      <header className="flex items-center px-4 py-4 gap-4 flex-shrink-0 sticky top-0 bg-[var(--bg)] border-b border-[var(--bd)] z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-[var(--text)] hover:bg-[var(--sf)] transition-colors"><ArrowLeft size={22} strokeWidth={2.5} /></button>
        <div>
          <h1 className="font-black text-[18px] text-[var(--text)] tracking-tight leading-none">Penggunaan</h1>
          <p className="text-[11px] text-[var(--mu)] mt-0.5">Statistik interaksi kamu dengan Cylen</p>
        </div>
      </header>

      <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full">
        {/* TOTAL SEMUA WAKTU */}
        <div className="relative bg-[var(--text)] rounded-[28px] p-6 overflow-hidden">
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={16} className="text-[var(--bg)] opacity-70" />
              <span className="text-[11px] font-bold text-[var(--bg)] opacity-70 uppercase tracking-widest">Total Semua Waktu</span>
            </div>
            <div className="text-[52px] font-black text-[var(--bg)] tracking-tighter leading-none">{formatNumber(usage.total)}</div>
            <div className="text-[13px] text-[var(--bg)] opacity-60 mt-2 font-medium">pesan terkirim sejak {daysSince} hari lalu</div>
          </div>
        </div>

        {/* 2x2 GRID */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--sf)] rounded-[22px] p-5 border border-[var(--bd)]">
            <div className="flex items-center gap-1.5 mb-3"><Clock size={14} className="text-[var(--mu)]" /><span className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">Hari Ini</span></div>
            <div className="text-[32px] font-black text-[var(--text)] tracking-tighter leading-none">{formatNumber(todayCount)}</div>
            <div className="text-[11px] text-[var(--mu)] mt-1.5 font-medium">pesan</div>
          </div>
          <div className="bg-[var(--sf)] rounded-[22px] p-5 border border-[var(--bd)]">
            <div className="flex items-center gap-1.5 mb-3"><Calendar size={14} className="text-[var(--mu)]" /><span className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">Bulan Ini</span></div>
            <div className="text-[32px] font-black text-[var(--text)] tracking-tighter leading-none">{formatNumber(monthCount)}</div>
            <div className="text-[11px] text-[var(--mu)] mt-1.5 font-medium">pesan</div>
          </div>
          <div className="bg-[var(--sf)] rounded-[22px] p-5 border border-[var(--bd)]">
            <div className="flex items-center gap-1.5 mb-3"><Flame size={14} className="text-orange-400" /><span className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">Streak</span></div>
            <div className="text-[32px] font-black text-[var(--text)] tracking-tighter leading-none">{streak}</div>
            <div className="text-[11px] text-[var(--mu)] mt-1.5 font-medium">hari berturut-turut</div>
          </div>
          <div className="bg-[var(--sf)] rounded-[22px] p-5 border border-[var(--bd)]">
            <div className="flex items-center gap-1.5 mb-3"><TrendingUp size={14} className="text-[var(--mu)]" /><span className="text-[10px] font-bold text-[var(--mu)] uppercase tracking-widest">Rata-rata</span></div>
            <div className="text-[32px] font-black text-[var(--text)] tracking-tighter leading-none">{formatNumber(avgPerDay)}</div>
            <div className="text-[11px] text-[var(--mu)] mt-1.5 font-medium">pesan / hari</div>
          </div>
        </div>

        {/* 7 DAYS CHART */}
        <div className="bg-[var(--sf)] rounded-[24px] border border-[var(--bd)] p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2"><BarChart2 size={16} className="text-[var(--text)]" /><span className="font-bold text-[13px] text-[var(--text)] uppercase tracking-widest">7 Hari Terakhir</span></div>
              <p className="text-[11px] text-[var(--mu)] mt-0.5 ml-6">Aktivitas harian</p>
            </div>
            <div className="text-right">
              <div className="text-[18px] font-black text-[var(--text)]">{formatNumber(last7.reduce((s, d) => s + d.count, 0))}</div>
              <div className="text-[10px] text-[var(--mu)] font-bold">total minggu ini</div>
            </div>
          </div>
          <div className="flex items-end justify-between gap-2 h-36">
            {last7.map((d, i) => {
              const heightPct = max7 === 0 ? 0 : (d.count / max7) * 100;
              const isToday = i === 6;
              return (
                <div key={d.date} className="flex flex-col items-center gap-1.5 flex-1">
                  {d.count > 0 && <span className="text-[9px] font-bold text-[var(--mu)]">{d.count}</span>}
                  <div className="w-full flex items-end" style={{ height: '100px' }}>
                    <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: `${Math.max(heightPct, d.count > 0 ? 6 : 2)}%`, background: 'var(--text)', opacity: isToday ? 1 : 0.35 + (i / 6) * 0.45 }} />
                  </div>
                  <span className={`text-[9px] font-bold ${isToday ? 'text-[var(--text)]' : 'text-[var(--mu)]'}`}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 30 DAYS SPARKLINE */}
        <div className="bg-[var(--sf)] rounded-[24px] border border-[var(--bd)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2"><TrendingUp size={16} className="text-[var(--text)]" /><span className="font-bold text-[13px] text-[var(--text)] uppercase tracking-widest">30 Hari Terakhir</span></div>
              <p className="text-[11px] text-[var(--mu)] mt-0.5 ml-6">Tren bulanan</p>
            </div>
            <div className="text-right">
              <div className="text-[18px] font-black text-[var(--text)]">{formatNumber(last30.reduce((s, d) => s + d.count, 0))}</div>
              <div className="text-[10px] text-[var(--mu)] font-bold">total bulan ini</div>
            </div>
          </div>
          <div className="flex items-end gap-0.5 h-16">
            {last30.map((d, i) => {
              const heightPct = max30 === 0 ? 0 : (d.count / max30) * 100;
              const isToday = i === 29;
              return <div key={d.date} className="flex-1 rounded-sm transition-all duration-300" style={{ height: `${Math.max(heightPct, d.count > 0 ? 10 : 3)}%`, background: 'var(--text)', opacity: isToday ? 1 : 0.2 + (i / 29) * 0.5 }} />;
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-[var(--mu)] font-bold">30 hari lalu</span>
            <span className="text-[9px] text-[var(--mu)] font-bold">Hari ini</span>
          </div>
        </div>

        {/* INFO CARD (Teks diubah karena sekarang masuk Cloud) */}
        <div className="bg-[var(--sf)] rounded-[20px] border border-[var(--bd)] p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--bd)] flex items-center justify-center flex-shrink-0"><MessageCircle size={16} className="text-[var(--text)]" /></div>
          <div>
            <div className="text-[12px] font-bold text-[var(--text)]">Data tersinkronisasi di Cloud</div>
            <div className="text-[11px] text-[var(--mu)] mt-0.5">Statistik ini terhubung dengan akun Google kamu di semua perangkat.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
