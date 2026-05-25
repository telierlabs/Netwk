import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ReportPageProps {
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({ onBack, showToast }) => {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const availableSlots = 5 - images.length;
    if (availableSlots <= 0) {
      showToast('Maksimal 5 foto buat laporan ya.');
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      showToast(`Hanya bisa menambahkan ${availableSlots} foto lagi.`);
    }

    Promise.all(
      filesToAdd.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.readAsDataURL(file);
          })
      )
    ).then((newImages) => {
      setImages((prev) => [...prev, ...newImages]);
    });

    // Reset input biar bisa pilih foto yang sama lagi kalau dihapus
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // ── SINKRONISASI KE FIRESTORE ──
  const handleSubmit = async () => {
    if (!text.trim() && images.length === 0) {
      return showToast('Tolong deskripsikan masalahnya atau lampirkan foto dulu.');
    }
    
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'bug_reports'), {
        uid: auth.currentUser?.uid || 'anonymous',
        email: auth.currentUser?.email || 'Guest',
        name: auth.currentUser?.displayName || 'Guest User',
        description: text.trim(),
        images: images, // Array berisi string base64 gambar
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      showToast('Laporan berhasil dikirim. Terima kasih!');
      setTimeout(() => onBack(), 1500);

    } catch (error) {
      console.error('Gagal ngirim laporan:', error);
      showToast('Gagal mengirim laporan. Coba lagi.');
      setIsSubmitting(false); // Buka kunci tombol kalau gagal
    }
  };

  return (
    <main className="flex-1 bg-[var(--bg)] relative z-[100] flex flex-col min-h-screen">
      
      {/* HIDDEN FILE INPUT UNTUK BUKA GALERI */}
      <input 
        type="file" 
        accept="image/*" 
        multiple 
        ref={fileInputRef} 
        onChange={handleImageChange} 
        className="hidden" 
      />

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg)] sticky top-0 z-10">
        <button onClick={onBack} disabled={isSubmitting} className="p-2 -ml-2 rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors active:scale-95 [-webkit-tap-highlight-color:transparent] disabled:opacity-50">
          <X size={24} strokeWidth={2.5} />
        </button>
        <h1 className="text-[16px] font-bold text-[var(--text)] tracking-tight flex-1 text-center pr-2">Report a Problem</h1>
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="bg-[var(--text)] text-[var(--bg)] px-5 py-2 rounded-full text-[14px] font-bold shadow-sm hover:scale-105 active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent] disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit'}
        </button>
      </div>

      <div className="max-w-2xl w-full mx-auto pb-10 pt-4 px-4 flex flex-col gap-4">
        
        {/* TEXTAREA */}
        <div className="w-full h-[180px] bg-[var(--sf)] border border-[var(--bd)]/50 rounded-[24px] overflow-hidden focus-within:border-[var(--text)]/30 transition-colors shadow-sm relative">
          <textarea 
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSubmitting}
            placeholder="Describe the issue or bug you encountered..."
            className="w-full h-full bg-transparent p-5 outline-none resize-none text-[15px] text-[var(--text)] placeholder:text-[var(--mu)] disabled:opacity-50"
            style={{ boxShadow: 'none' }}
          />
        </div>

        {/* PREVIEW FOTO YANG DIPILIH */}
        {images.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {images.map((src, idx) => (
              <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-[16px] overflow-hidden border border-[var(--bd)]/50 bg-[var(--sf)]">
                <img src={src} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeImage(idx)} 
                  disabled={isSubmitting}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors active:scale-90 disabled:opacity-50"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ATTACH BUTTON */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={images.length >= 5 || isSubmitting}
          className={cn(
            "w-fit flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-medium transition-all active:scale-95 border",
            images.length >= 5 || isSubmitting
              ? "bg-[var(--sf)] text-[var(--mu)] border-[var(--bd)]/30 cursor-not-allowed" 
              : "bg-[var(--sf)] hover:bg-[var(--bd)] text-[var(--text)] border-[var(--bd)]/50 shadow-sm [-webkit-tap-highlight-color:transparent]"
          )}
        >
          <ImageIcon size={18} />
          {images.length >= 5 ? 'Batas maksimal 5 foto' : 'Attach images'}
        </button>

      </div>
    </main>
  );
};
