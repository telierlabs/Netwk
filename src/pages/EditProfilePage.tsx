import React, { useState, useRef } from 'react';
import { ArrowLeft, Pencil, Calendar, Mail } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useProfile } from '../hooks/useProfile';

interface Props {
  onBack: () => void;
  showToast: (msg: string) => void;
}

// kecilin foto jadi 256px biar ringan disimpan
const resizeImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

export const EditProfilePage: React.FC<Props> = ({ onBack, showToast }) => {
  const { profile, updateProfile } = useProfile();
  const email = auth.currentUser?.email || '';

  const fullName = (profile.name || auth.currentUser?.displayName || '').trim();
  const [first, setFirst] = useState(fullName.split(' ')[0] || '');
  const [last, setLast] = useState(fullName.split(' ').slice(1).join(' '));
  const [birthYear, setBirthYear] = useState<string>(String((profile as any).birthYear || ''));
  const [avatar, setAvatar] = useState<string>(profile.avatar || '');
  const fileRef = useRef<HTMLInputElement>(null);

  const newName = [first.trim(), last.trim()].filter(Boolean).join(' ');
  const yearNum = Number(birthYear);
  const yearValid = birthYear === '' || (yearNum >= 1900 && yearNum <= new Date().getFullYear());
  const changed =
    newName !== fullName ||
    birthYear !== String((profile as any).birthYear || '') ||
    avatar !== (profile.avatar || '');
  const canSave = changed && yearValid && newName.length > 0;

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try { setAvatar(await resizeImage(f)); } catch { showToast('Gagal memuat foto'); }
    e.target.value = '';
  };

  const handleSave = () => {
    if (!canSave) return;
    updateProfile({
      name: newName,
      avatar,
      birthYear: birthYear ? Number(birthYear) : undefined,
    } as any);
    showToast('Profil disimpan');
    onBack();
  };

  // Kolom input = warna permukaan (--sf): putih di Light, abu gelap di Dark, krem terang di For You
  const field = 'w-full bg-[var(--sf)] px-5 py-4 text-[18px] text-[var(--text)] outline-none placeholder:text-[var(--mu)]';

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg)] relative z-50">
      <header
        className="flex items-center gap-3 px-4 pb-3 flex-shrink-0"
        style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 0px))' }}
      >
        <button onClick={onBack} aria-label="Kembali" className="w-11 h-11 -ml-1 rounded-full flex items-center justify-center text-[var(--text)] active:bg-[var(--ib)]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="flex-1 text-[22px] font-semibold tracking-tight text-[var(--text)]">Edit Profile</h1>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={
            'px-5 py-2.5 rounded-full text-[17px] font-medium transition-colors ' +
            (canSave
              ? 'bg-[var(--ac)] text-[var(--at)]'
              : 'bg-[var(--sf)] text-[var(--mu)] border border-[var(--bd)]')
          }
        >
          Save
        </button>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
        <div className="max-w-2xl mx-auto pb-10">
          {/* Avatar */}
          <div className="flex justify-center py-6">
            <button onClick={() => fileRef.current?.click()} className="relative active:scale-95 transition-transform">
              <div className="w-[104px] h-[104px] rounded-full overflow-hidden ring-2 ring-[var(--bd)] bg-blue-700 flex items-center justify-center">
                {avatar
                  ? <img src={avatar} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  : <span className="text-white text-5xl font-medium">{(first[0] || 'U').toUpperCase()}</span>}
              </div>
              <div className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[var(--sf)] ring-2 ring-[var(--bd)] flex items-center justify-center text-[var(--text)]">
                <Pencil size={16} />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePick} />
          </div>

          {/* Name */}
          <div className="px-6 mt-2 mb-2 text-[16px] font-medium text-[var(--mu)]">Name</div>
          <div className="mx-3 flex flex-col gap-[2px]">
            <input value={first} onChange={(e) => setFirst(e.target.value)} placeholder="First name" className={field + ' rounded-t-[28px] rounded-b-[6px]'} />
            <input value={last} onChange={(e) => setLast(e.target.value)} placeholder="Last name" className={field + ' rounded-t-[6px] rounded-b-[28px]'} />
          </div>

          {/* Birth Year */}
          <div className="px-6 mt-7 mb-2 text-[16px] font-medium text-[var(--mu)]">Birth Year</div>
          <div className="mx-3 flex items-center gap-4 bg-[var(--sf)] rounded-[28px] px-5">
            <Calendar size={24} className="text-[var(--mu)] flex-shrink-0" />
            <input
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="2006"
              className="flex-1 bg-transparent py-4 text-[18px] font-semibold text-[var(--text)] outline-none placeholder:text-[var(--mu)]"
            />
          </div>
          {!yearValid && <p className="px-6 mt-2 text-[13px] text-red-500">Tahun lahir tidak valid</p>}

          {/* Account */}
          <div className="px-6 mt-7 mb-2 text-[16px] font-medium text-[var(--mu)]">Account</div>
          <div className="mx-3 flex items-center gap-4 bg-[var(--sf)] rounded-[28px] px-5 py-4">
            <Mail size={24} className="text-[var(--mu)] flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[18px] font-semibold text-[var(--text)]">Email</span>
              <span className="text-[16px] text-[var(--mu)] truncate">{email}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
