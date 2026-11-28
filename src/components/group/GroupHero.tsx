import React from 'react';
import { Camera } from 'lucide-react';
import { usePageText } from '../../lib/i18n';
import { NOTICE_TEXT, NOTICE_NS } from '../../lib/noticeText';

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
  children?: React.ReactNode;      // di KANAN foto (nama, info)
  below?: React.ReactNode;         // di bawah baris foto, lebar penuh (mis. deskripsi)
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
  below,
}) => {
  const tx = usePageText(NOTICE_NS, NOTICE_TEXT);
  return (
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
          <img src={cover} alt={tx.coverAlt} className="w-full h-full object-cover" />
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

    {/* Baris profil: foto di kiri (setengah menimpa sampul), nama + info di kanan */}
    <div className="relative z-10 -mt-12 px-5">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div
            onClick={onAvatarClick}
            className="w-24 h-24 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] text-4xl font-bold shadow-lg overflow-hidden border-4 border-[var(--bg)] cursor-pointer hover:opacity-90 transition-opacity"
          >
            {avatar ? (
              <img src={avatar} alt={tx.photoAlt} className="w-full h-full object-cover" />
            ) : (
              initial
            )}
          </div>
          {onCameraClick && (
            <button
              onClick={(e) => { e.stopPropagation(); onCameraClick(); }}
              aria-label={tx.changePhoto}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--text)] text-[var(--bg)] border-[3px] border-[var(--bg)] rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
            >
              <Camera size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Mulai tepat di bawah tepi sampul, jadi tidak menimpa gambar */}
        <div className="flex-1 min-w-0 pt-[50px]">{children}</div>
      </div>

      {below}
    </div>
  </>
  );
};
