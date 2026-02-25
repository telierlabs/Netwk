import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Type as TypeIcon, 
  ChevronRight, 
  Check, 
  Shield, 
  Bell, 
  Zap, 
  BarChart3, 
  Download, 
  FileText, 
  Info, 
  LogOut, 
  X,
  Image as ImageIcon,
  User as UserIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { THEMES, FONTS } from '../constants';
import { Theme, Font } from '../types';
import { signInWithGoogle, logout, subscribeToAuthChanges } from '../services/authService';
import { requestNotificationPermission, showLocalNotification } from '../services/notificationService';
import { User } from 'firebase/auth';
import { isConfigured as isFirebaseConfigured } from '../lib/firebase';

interface ProfilePageProps {
  theme: Theme;
  setTheme: (t: Theme) => void;
  font: Font;
  setFont: (f: Font) => void;
  showToast: (msg: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  theme,
  setTheme,
  font,
  setFont,
  showToast
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      showToast('Berhasil masuk dengan Google');
    } catch (e) {
      showToast('Gagal masuk');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Berhasil keluar');
    } catch (e) {
      showToast('Gagal keluar');
    }
  };

  const handleEnableNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      showToast('Notifikasi diaktifkan!');
      showLocalNotification('Cylen AI', 'Notifikasi berhasil diaktifkan!');
    } else {
      showToast('Gagal mengaktifkan notifikasi');
    }
  };

  return (
    <main className="flex-1 overflow-y-auto pb-12">
      <div className="max-w-2xl mx-auto">
        {!isFirebaseConfigured && (
          <div className="m-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3 shadow-sm">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
              <Info size={18} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-amber-900">Firebase Belum Dikonfigurasi</div>
              <p className="text-xs text-amber-700 leading-relaxed mt-1">
                Fitur login dan notifikasi memerlukan API Key Firebase. Silakan masukkan kredensial Anda di dashboard Vercel atau environment variables.
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center py-10 px-6 border-b border-[var(--bd)] gap-4">
          <div className="relative">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-24 h-24 rounded-full border-2 border-[var(--ac)] object-cover" />
            ) : (
              <div className="w-24 h-24 bg-[var(--ac)] text-[var(--at)] rounded-full flex items-center justify-center text-4xl font-bold">
                {user?.displayName?.[0] || 'K'}
              </div>
            )}
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--bg)] border-2 border-[var(--bd)] rounded-full flex items-center justify-center text-[var(--mu)] hover:text-[var(--text)] transition-colors">
              <ImageIcon size={14} />
            </button>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold">{user?.displayName || 'Kamu'}</h2>
            <p className="text-sm text-[var(--mu)]">{user?.email || 'Belum masuk'}</p>
          </div>
          {!user && (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--ac)] text-[var(--at)] rounded-full text-sm font-bold hover:scale-105 transition-all"
            >
              <UserIcon size={16} />
              Masuk dengan Google
            </button>
          )}
          {user && <div className="px-4 py-1.5 bg-[var(--ac)] text-[var(--at)] text-[10px] font-bold uppercase tracking-widest rounded-full">Premium</div>}
        </div>

        {/* Tampilan Section */}
        <div className="p-6">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-4">Tampilan</h3>
          <div className="bg-[var(--cd)] rounded-2xl border border-[var(--bd)] overflow-hidden">
            <button 
              onClick={() => showToast('Pilih tema di bawah')}
              className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors border-b border-[var(--bd)]"
            >
              <div className="w-9 h-9 bg-[var(--ib)] rounded-xl flex items-center justify-center"><Palette size={18} /></div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Tema Warna</div>
                <div className="text-xs text-[var(--mu)]">{THEMES.find(t => t.id === theme)?.name}</div>
              </div>
              <ChevronRight size={16} className="text-[var(--mu)] opacity-30" />
            </button>
            <div className="p-4 grid grid-cols-3 gap-3">
              {THEMES.map((t) => (
                <button 
                  key={t.id}
                  onClick={() => { setTheme(t.id); showToast(`Tema ${t.name} diterapkan`); }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-2 rounded-xl transition-all",
                    theme === t.id ? "ring-2 ring-[var(--ac)]" : "hover:bg-[var(--sf)]"
                  )}
                >
                  <div className="w-full aspect-square rounded-lg border border-[var(--bd)] flex items-center justify-center" style={{ backgroundColor: t.bg }}>
                    <div className="w-1/2 h-1/2 rounded-sm" style={{ backgroundColor: t.accent }} />
                  </div>
                  <span className="text-[10px] font-medium">{t.name}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={() => showToast('Pilih font di bawah')}
              className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors border-t border-[var(--bd)]"
            >
              <div className="w-9 h-9 bg-[var(--ib)] rounded-xl flex items-center justify-center"><TypeIcon size={18} /></div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Gaya Huruf</div>
                <div className="text-xs text-[var(--mu)]">{font}</div>
              </div>
              <ChevronRight size={16} className="text-[var(--mu)] opacity-30" />
            </button>
            <div className="p-4 flex flex-col gap-2 max-h-60 overflow-y-auto">
              {FONTS.map((f) => (
                <button 
                  key={f.id}
                  onClick={() => { setFont(f.id); showToast(`Font ${f.name} diterapkan`); }}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-xl border-1.5 transition-all text-left",
                    font === f.id ? "border-[var(--ac)] bg-[var(--sf)]" : "border-[var(--bd)] bg-[var(--cd)]"
                  )}
                >
                  <div className="text-2xl w-10 flex-shrink-0" style={{ fontFamily: f.family }}>Ag</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{f.name}</div>
                    <div className="text-[10px] text-[var(--mu)]">{f.sub}</div>
                  </div>
                  {font === f.id && <Check size={16} className="text-[var(--ac)]" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Akun Section */}
        <div className="p-6 pt-0">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-4">Akun</h3>
          <div className="bg-[var(--cd)] rounded-2xl border border-[var(--bd)] overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b border-[var(--bd)]">
              <div className="w-9 h-9 bg-[var(--ib)] rounded-xl flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#EA4335" d="M5.26 9.77A7.2 7.2 0 0 1 12 4.8c1.73 0 3.29.62 4.51 1.64l3.37-3.37A12 12 0 0 0 12 0C7.27 0 3.2 2.7 1.16 6.65l4.1 3.12z"/><path fill="#34A853" d="M16.04 18.01A7.18 7.18 0 0 1 12 19.2a7.2 7.2 0 0 1-6.73-4.57l-4.1 3.1A12 12 0 0 0 12 24c2.93 0 5.63-1.06 7.7-2.8l-3.66-3.19z"/><path fill="#4A90D9" d="M19.7 21.2A12 12 0 0 0 24 12c0-.72-.07-1.42-.19-2.1H12v4.46h6.69a5.7 5.7 0 0 1-2.65 3.65l3.66 3.19z"/><path fill="#FBBC05" d="M5.27 14.63A7.3 7.3 0 0 1 4.8 12c0-.91.16-1.78.45-2.59L1.15 6.3A12 12 0 0 0 0 12c0 1.93.46 3.76 1.16 5.42l4.1-3.1z"/></svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Akun Google</div>
                <div className="text-xs text-[var(--mu)]">kamu@gmail.com</div>
              </div>
              <ChevronRight size={16} className="text-[var(--mu)] opacity-30" />
            </div>
            <button className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors border-b border-[var(--bd)]">
              <div className="w-9 h-9 bg-[var(--ib)] rounded-xl flex items-center justify-center"><Shield size={18} /></div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Keamanan</div>
                <div className="text-xs text-[var(--mu)]">Password, 2FA, sesi aktif</div>
              </div>
              <ChevronRight size={16} className="text-[var(--mu)] opacity-30" />
            </button>
            <button 
              onClick={handleEnableNotifications}
              className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors"
            >
              <div className="w-9 h-9 bg-[var(--ib)] rounded-xl flex items-center justify-center"><Bell size={18} /></div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Notifikasi</div>
                <div className="text-xs text-[var(--mu)]">Chat, update & pengumuman</div>
              </div>
              <ChevronRight size={16} className="text-[var(--mu)] opacity-30" />
            </button>
          </div>
        </div>

        {/* Langganan Section */}
        <div className="p-6 pt-0">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-4">Langganan</h3>
          <div className="bg-[var(--cd)] rounded-2xl border border-[var(--bd)] overflow-hidden">
            <div className="flex items-center gap-4 p-4 border-b border-[var(--bd)]">
              <div className="w-9 h-9 bg-[var(--ib)] rounded-xl flex items-center justify-center"><Zap size={18} /></div>
              <div className="flex-1">
                <div className="text-sm font-medium">Plan Premium</div>
                <div className="text-xs text-[var(--mu)]">Diperbarui 24 Maret 2026</div>
              </div>
              <span className="text-xs font-bold text-[var(--ac)]">Kelola</span>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="w-9 h-9 bg-[var(--ib)] rounded-xl flex items-center justify-center"><BarChart3 size={18} /></div>
              <div className="flex-1">
                <div className="text-sm font-medium">Penggunaan</div>
                <div className="text-xs text-[var(--mu)]">843 pesan bulan ini · Unlimited</div>
              </div>
              <ChevronRight size={16} className="text-[var(--mu)] opacity-30" />
            </div>
          </div>
        </div>

        {/* Lainnya Section */}
        <div className="p-6 pt-0">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--mu)] mb-4">Lainnya</h3>
          <div className="bg-[var(--cd)] rounded-2xl border border-[var(--bd)] overflow-hidden">
            <button className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors border-b border-[var(--bd)]">
              <div className="w-9 h-9 bg-[var(--ib)] rounded-xl flex items-center justify-center"><Download size={18} /></div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Ekspor Data</div>
                <div className="text-xs text-[var(--mu)]">Unduh seluruh riwayat chat</div>
              </div>
              <ChevronRight size={16} className="text-[var(--mu)] opacity-30" />
            </button>
            <button className="w-full flex items-center gap-4 p-4 hover:bg-[var(--sf)] transition-colors border-b border-[var(--bd)]">
              <div className="w-9 h-9 bg-[var(--ib)] rounded-xl flex items-center justify-center"><FileText size={18} /></div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Syarat & Privasi</div>
                <div className="text-xs text-[var(--mu)]">Kebijakan penggunaan Cylen</div>
              </div>
              <ChevronRight size={16} className="text-[var(--mu)] opacity-30" />
            </button>
            <div className="flex items-center gap-4 p-4">
              <div className="w-9 h-9 bg-[var(--ib)] rounded-xl flex items-center justify-center"><Info size={18} /></div>
              <div className="flex-1">
                <div className="text-sm font-medium">Tentang Cylen</div>
                <div className="text-xs text-[var(--mu)]">Versi 1.0.0 · Build 2026.02</div>
              </div>
            </div>
          </div>
        </div>

        {/* Logout/Delete Section */}
        <div className="p-6 pt-0 flex flex-col gap-2">
          {user && (
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 p-4 bg-[var(--cd)] border border-[var(--bd)] rounded-2xl hover:bg-red-50 transition-colors group"
            >
              <div className="w-9 h-9 bg-red-100 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-200"><LogOut size={18} /></div>
              <span className="text-sm font-medium text-red-600">Keluar dari Akun</span>
            </button>
          )}
          <button 
            onClick={() => { if(confirm('Hapus akun permanen?')) showToast('Permintaan dikirim'); }}
            className="w-full flex items-center gap-4 p-4 bg-[var(--cd)] border border-[var(--bd)] rounded-2xl hover:bg-red-50 transition-colors group"
          >
            <div className="w-9 h-9 bg-red-100 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-200"><X size={18} /></div>
            <span className="text-sm font-medium text-red-600">Hapus Akun</span>
          </button>
        </div>
      </div>
    </main>
  );
};
