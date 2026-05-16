import React, { useState, useEffect } from 'react';
import { Search, MessageSquare, X, Plus, ArrowLeft, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { GroupSession } from '../types';

interface GroupListPageProps {
  groups: GroupSession[];
  onSelectGroup: (id: string) => void;
  onCreateGroup: (title: string) => void;
  onNavigateProfile?: () => void;
  onBack?: () => void;
}

export const GroupListPage: React.FC<GroupListPageProps> = ({
  groups, onSelectGroup, onCreateGroup, onNavigateProfile, onBack
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // ─── STATE SINKRONISASI FOTO & POPUP ───
  const [refreshKey, setRefreshKey] = useState(0);
  const [avatarPopup, setAvatarPopup] = useState<{ isOpen: boolean; url: string | null; fallback: string }>({
    isOpen: false, url: null, fallback: ''
  });

  // Listener buat nge-refresh foto grup kalau ada perubahan dari dalam profil
  useEffect(() => {
    const handleAvatarChange = () => setRefreshKey(prev => prev + 1);
    window.addEventListener('group-avatar-changed', handleAvatarChange);
    return () => window.removeEventListener('group-avatar-changed', handleAvatarChange);
  }, []);

  const filteredGroups = groups.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName);
    setNewGroupName('');
    setIsCreating(false);
  };

  return (
    <main className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden relative">

      {/* ─── HEADER ─── */}
      <div className="px-4 py-3 border-b border-[var(--bd)]/15 bg-[var(--bg)] sticky top-0 z-20">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onBack}
            className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors active:scale-95 shrink-0"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h1 className="text-[18px] font-bold text-[var(--text)] tracking-tight">Grup AI</h1>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text)]/40" strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Cari grup..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[var(--sf)] rounded-[16px] text-[15px] outline-none placeholder:text-[var(--text)]/40 text-[var(--text)] border border-transparent focus:border-[var(--text)]/20 transition-all font-medium"
          />
        </div>
      </div>

      {/* ─── DAFTAR GRUP ─── */}
      <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>

        {/* Form Buat Grup Baru */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 py-4 flex gap-2 border-b border-[var(--bd)]/15 bg-[var(--sf)]/30">
                <input
                  autoFocus
                  type="text"
                  placeholder="Nama grup baru..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="flex-1 px-4 py-3 bg-[var(--bg)] border border-[var(--bd)]/30 rounded-2xl text-[14px] font-medium outline-none text-[var(--text)] placeholder:text-[var(--text)]/40 focus:border-[var(--text)]/40 transition-colors"
                />
                <button
                  onClick={handleCreate}
                  className="px-6 py-3 bg-[var(--text)] text-[var(--bg)] rounded-2xl text-[14px] font-bold active:scale-95 transition-transform"
                >
                  Buat
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="w-12 h-12 flex items-center justify-center text-[var(--text)]/50 hover:text-[var(--text)]/80 rounded-2xl hover:bg-[var(--sf)] transition-colors"
                >
                  <X size={20} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 px-6 text-center">
            <div className="w-20 h-20 bg-[var(--sf)] rounded-full flex items-center justify-center text-[var(--text)]/20 mb-5">
              <Users size={32} strokeWidth={2} />
            </div>
            <h3 className="text-[17px] font-bold text-[var(--text)]/60 mb-1.5">Belum Ada Grup</h3>
            <p className="text-[14px] text-[var(--text)]/40 max-w-[240px] leading-relaxed font-medium">
              Ketuk tombol + di bawah untuk membuat ruang diskusi AI baru.
            </p>
          </div>
        ) : (
          filteredGroups.map((group, idx) => {
            const lastMsg = group.messages[group.messages.length - 1];
            const aiCount = group.participants.filter(p => p.isAI).length;
            
            // Ambil foto dari localStorage
            const groupAvatar = localStorage.getItem(`cylen_group_avatar_${group.id}`);

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--sf)]/50 transition-colors border-b border-[var(--bd)]/10 cursor-pointer"
              >
                {/* 1. AREA FOTO (KLIK UNTUK POPUP) */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation(); // Mencegah masuk ke dalam chat
                    setAvatarPopup({ isOpen: true, url: groupAvatar, fallback: group.title[0] });
                  }}
                  className="w-14 h-14 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] text-[22px] font-bold shrink-0 overflow-hidden shadow-md hover:scale-105 active:scale-95 transition-all z-10"
                >
                  {groupAvatar ? (
                    <img src={groupAvatar} alt="Group" className="w-full h-full object-cover" />
                  ) : (
                    group.title[0]
                  )}
                </div>

                {/* 2. AREA TEKS (KLIK UNTUK MASUK CHAT) */}
                <div 
                  onClick={() => onSelectGroup(group.id)} 
                  className="flex-1 text-left min-w-0 h-full flex flex-col justify-center"
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <h4 className="text-[16px] font-bold text-[var(--text)] truncate pr-3">{group.title}</h4>
                    <span className="text-[11px] font-semibold text-[var(--text)]/40 shrink-0 uppercase tracking-wide">
                      {lastMsg?.timestamp?.split(',')[0] || ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3 text-[14px] text-[var(--text)]/50 font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      {lastMsg?.senderName && (
                        <span className="text-[var(--text)]/70 shrink-0">{lastMsg.senderName}:</span>
                      )}
                      <span className="truncate">{lastMsg?.content || 'Mulai obrolan...'}</span>
                    </div>
                    {aiCount > 0 && (
                      <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--bd)]/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <span className="text-[10px] font-bold text-[var(--text)]/60 tracking-wider">{aiCount} AI</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* FAB BUAT GRUP */}
      <div className="fixed bottom-6 right-6 z-30">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsCreating(true)}
          className="w-14 h-14 bg-[var(--text)] text-[var(--bg)] rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex items-center justify-center hover:scale-105 transition-all"
        >
          <Plus size={24} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* ================= MODAL LIHAT PROFIL DARI LUAR ================= */}
      <AnimatePresence>
        {avatarPopup.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.15 }}
            onClick={() => setAvatarPopup({ ...avatarPopup, isOpen: false })} // Klik layar hitam untuk tutup
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            {/* Header / Tombol Silang */}
            <div className="absolute top-4 left-4 z-10">
              <button 
                onClick={(e) => { e.stopPropagation(); setAvatarPopup({ ...avatarPopup, isOpen: false }); }} 
                className="w-11 h-11 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md active:scale-95"
              >
                <X size={24} strokeWidth={2.5} />
              </button>
            </div>
            
            {/* Area Foto Fullscreen Lega */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 15 }} 
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()} // Biar kalau diklik fotonya nggak ikutan nutup
              className="w-[85vw] max-w-[400px] aspect-square flex items-center justify-center"
            >
              {avatarPopup.url ? (
                <img src={avatarPopup.url} alt="Profile" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center text-white text-[140px] font-bold shadow-2xl">
                  {avatarPopup.fallback}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
};
