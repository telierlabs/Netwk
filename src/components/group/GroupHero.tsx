import React from 'react';
import { Camera } from 'lucide-react';

// Sampul memudar ke warna latar lewat mask (bukan lapisan warna),
// jadi tidak ada garis tepi di tema apa pun (dark, light, cream).
const FADE = 'linear-gradient(to bottom, #000 0%, #000 35%, rgba(0,0,0,0) 100%)';

interface GroupHeroProps {
  cover: string | null;
  avatar: string | null;
  initial: React.ReactNode;        // huruf / ikon kalau belum ada foto
  coverHeight?: number;
  topLeft?: React.ReactNode;       // tombol kiri atas (kembali)
  topRight?: React.ReactNode;      // tombol kanan atas
  coverAction?: React.ReactNode;   // tombol di tengah sampul (mis. "Tambah sampul")
  onAvatarClick?: () => void;
  onCameraClick?: () => void;
  children?: React.ReactNode;      // isi di bawah foto (nama, info)
}

export const GroupHero: React.FC<GroupHeroProps> = ({
  cover,
  avatar,
  initial,
  coverHeight = 240,
  topLeft,
  topRight,
  coverAction,
  onAvatarClick,
  onCameraClick,
  children,
}) => (
  <>
    {/* Tombol atas: melayang di atas sampul, tetap menempel saat di-scroll */}
    {(topLeft || topRight) && (
      <div className="sticky top-0 z-30 h-0">
        <div
          className="flex items-center justify-between px-4"
          style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
          <div>{topLeft}</div>
          <div className="flex items-center gap-2">{topRight}</div>
        </div>
      </div>
    )}

    {/* Sampul */}
    <div
      className="relative w-full overflow-hidden"
      style={{ height: coverHeight, background: 'var(--bg)' }}
    >
      <div className="absolute inset-0" style={{ WebkitMaskImage: FADE, maskImage: FADE }}>
        {cover ? (
          <img src={cover} alt="Sampul Collaboration" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: 'radial-gradient(120% 100% at 80% 0%, var(--ib) 0%, var(--sf) 60%, var(--sf) 100%)' }}
          />
        )}
      </div>

      {/* Bayangan tipis di atas supaya tombol putih tetap kebaca */}
      {cover && (
        <div
          className="absolute inset-x-0 top-0 pointer-events-none"
          style={{ height: '45%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0))' }}
        />
      )}

      {coverAction && (
        <div
          className="absolute inset-x-0 top-0 flex items-center justify-center pointer-events-none"
          style={{ height: coverHeight - 64 }}
        >
          {coverAction}
        </div>
      )}
    </div>

    {/* Foto utama (setengah menimpa sampul) */}
    <div className="relative z-10 -mt-16 flex flex-col items-center">
      <div className="relative">
        <div
          onClick={onAvatarClick}
          className="w-32 h-32 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] text-5xl font-bold shadow-lg overflow-hidden border-4 border-[var(--bg)] cursor-pointer hover:opacity-90 transition-opacity"
        >
          {avatar ? (
            <img src={avatar} alt="Foto Collaboration" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
        {onCameraClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onCameraClick(); }}
            aria-label="Ganti foto"
            className="absolute bottom-0.5 right-0.5 w-9 h-9 bg-[var(--text)] text-[var(--bg)] border-[3px] border-[var(--bg)] rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
          >
            <Camera size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {children}
    </div>
  </>
);
