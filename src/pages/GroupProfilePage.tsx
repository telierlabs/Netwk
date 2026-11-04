import React, { useState, useRef } from 'react';
import { ArrowLeft, MoreHorizontal, MessageSquare, Share2, UserPlus, Image as ImageIcon, ChevronRight, Download, Trash2, X, Check, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupSession, AiPolicy } from '../types';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { GroupHero } from '../components/group/GroupHero';
import { compressToSquare, compressToCover, readFileAsDataUrl } from '../lib/imageTools';

// Pilihan siapa yang boleh mengelola AI
const AI_POLICY_OPTIONS: { id: AiPolicy; title: string; desc: string }[] = [
  {
    id: 'admin',
    title: 'Hanya admin',
    desc: 'Hanya admin yang bisa menambah atau mengeluarkan AI. Anggota hanya melihat AI yang aktif.',
  },
  {
    id: 'members',
    title: 'Setiap anggota',
    desc: 'Semua anggota bisa menambah dan mengeluarkan AI.',
  },
];

// Gaya tombol bulat yang melayang di atas sampul
const heroBtn =
  'w-10 h-10 rounded-full bg-black/40 text-white backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]';

interface GroupProfilePageProps {
  activeGroup: GroupSession;
  onBack: () => void;
  showToast: (msg: string) => void;
  onLeaveGroup?: (id: string) => Promise<{success: boolean, message?: string}>;
  onDeleteGroup?: (id: string) => Promise<{success: boolean, message?: string}>;
}

// ── Custom Confirm Modal ──
interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open, title, message, confirmLabel, onConfirm, onCancel, isDestructive
}) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] bg-black/60 flex items-center justify-center p-5 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 10 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
          className="w-full max-w-[320px] bg-[var(--bg)] rounded-3xl shadow-2xl border border-[var(--bd)]/10 overflow-hidden"
        >
          <div className="flex flex-col items-center pt-8 pb-5 px-6">
            <div className="w-14 h-14 rounded-2xl bg-[var(--sf)] flex items-center justify-center mb-4 border border-[var(--bd)]/10">
              {isDestructive ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text)]">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text)]">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              )}
            </div>
            <h3 className="text-[17px] font-bold text-[var(--text)] text-center mb-2">{title}</h3>
            <p className="text-[13px] text-[var(--text)]/55 text-center leading-relaxed font-medium">{message}</p>
          </div>

          <div className="h-px bg-[var(--bd)]/10 mx-0" />

          <div className="flex">
            <button
              onClick={onCancel}
              className="flex-1 py-4 text-[15px] font-semibold text-[var(--text)]/60 hover:bg-[var(--sf)]/60 transition-colors active:scale-95"
            >
              Batal
            </button>
            <div className="w-px bg-[var(--bd)]/10" />
            <button
              onClick={onConfirm}
              className="flex-1 py-4 text-[15px] font-bold text-[var(--text)] hover:bg-[var(--sf)]/60 transition-colors active:scale-95"
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const GroupProfilePage: React.FC<GroupProfilePageProps> = ({
  activeGroup, onBack, showToast, onLeaveGroup, onDeleteGroup
}) => {
  const [view, setView] = useState<'main' | 'gallery' | 'detail'>('main');
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'ai'>('user');

  // Foto + sampul Collaboration ada di dokumen grup (Firestore) → kelihatan semua anggota
  const groupAvatar: string | null = activeGroup.avatar ?? null;
  const cover: string | null = activeGroup.cover ?? null;
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [showMenu, setShowMenu] = useState(false);           // menu foto profil (tombol kamera)
  const [showCoverMenu, setShowCoverMenu] = useState(false); // menu "..." di kanan atas
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const [showEditInfo, setShowEditInfo] = useState(false);
  const [editTitle, setEditTitle] = useState(activeGroup.title);
  const [editDesc, setEditDesc] = useState(activeGroup.description || '');

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} });

  // ── Anggota ──
  const users = activeGroup.participants.filter(p => !p.isAI);
  const ais = activeGroup.participants.filter(p => p.isAI);

  // ── ambil nama & foto TERBARU tiap anggota dari profil publik (realtime) ──
  // Asumsi: participant.id untuk manusia = uid Firebase mereka.
  const getProfile = usePublicProfiles(users.map(u => u.id));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const constraintsRef = useRef(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewImg(event.target?.result as string);
        setShowMenu(false);
        setShowFullAvatar(false);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveAvatar = async () => {
    if (!previewImg) return;
    try {
      const small = await compressToSquare(previewImg);
      window.dispatchEvent(new CustomEvent('group-avatar-updated', { detail: { id: activeGroup.id, avatar: small } }));
      setPreviewImg(null);
      showToast('Foto Collaboration diperbarui');
    } catch {
      showToast('Gagal memproses foto');
    }
  };

  const handleDeleteAvatar = () => {
    window.dispatchEvent(new CustomEvent('group-avatar-updated', { detail: { id: activeGroup.id, avatar: null } }));
    setShowMenu(false);
    setShowFullAvatar(false);
    showToast('Foto Collaboration dihapus');
  };

  // ── Sampul ──
  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (coverInputRef.current) coverInputRef.current.value = '';
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const small = await compressToCover(dataUrl);
      window.dispatchEvent(new CustomEvent('group-cover-updated', { detail: { id: activeGroup.id, cover: small } }));
      showToast('Sampul diperbarui');
    } catch {
      showToast('Gagal memproses gambar');
    }
  };

  const handleDeleteCover = () => {
    window.dispatchEvent(new CustomEvent('group-cover-updated', { detail: { id: activeGroup.id, cover: null } }));
    setShowCoverMenu(false);
    showToast('Sampul dihapus');
  };

  const openEditInfo = () => {
    // Isi form dengan data terbaru setiap kali dibuka
    setEditTitle(activeGroup.title);
    setEditDesc(activeGroup.description || '');
    setShowEditInfo(true);
  };

  const handleSaveInfo = () => {
    if (!editTitle.trim()) return showToast('Nama Collaboration tidak boleh kosong');
    window.dispatchEvent(new CustomEvent('group-profile-updated', {
      detail: { id: activeGroup.id, title: editTitle.trim(), description: editDesc.trim() }
    }));
    setShowEditInfo(false);
    showToast('Profil Collaboration berhasil diperbarui');
  };

  // Salin link undangan beneran
  const handleShare = async () => {
    const link = `${window.location.origin}/join/${activeGroup.id}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link undangan disalin!');
    } catch {
      showToast('Gagal menyalin link');
    }
  };

  const isAdmin = activeGroup.createdBy === auth.currentUser?.uid;
  const aiPolicy: AiPolicy = activeGroup.aiPolicy === 'members' ? 'members' : 'admin';

  // Admin mengganti aturan pengelolaan AI
  const handleChangePolicy = (next: AiPolicy) => {
    if (!isAdmin || next === aiPolicy) return;
    let settled = false;
    const done = (res: { success: boolean; message?: string }) => {
      if (settled) return;
      settled = true;
      showToast(res.success ? 'Pengelolaan AI diperbarui' : (res.message || 'Gagal memperbarui, coba lagi'));
    };
    window.dispatchEvent(new CustomEvent('group-ai-policy-updated', {
      detail: { id: activeGroup.id, aiPolicy: next, done },
    }));
    setTimeout(() => done({ success: false }), 6000);
  };

  const handleLeaveOrDelete = () => {
    if (isAdmin) {
      setConfirmModal({
        open: true,
        title: 'Hapus Collaboration?',
        message: 'Collaboration ini akan dihapus secara permanen. Semua data dan anggota tidak bisa dipulihkan.',
        confirmLabel: 'Hapus',
        isDestructive: true,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, open: false }));
          if (!onDeleteGroup) return showToast('Fitur hapus belum tersambung');
          const res = await onDeleteGroup(activeGroup.id);
          showToast(res.success ? 'Collaboration berhasil dihapus' : (res.message || 'Gagal menghapus Collaboration'));
        }
      });
    } else {
      setConfirmModal({
        open: true,
        title: 'Keluar dari Collaboration?',
        message: 'Kamu tidak akan bisa melihat pesan Collaboration ini lagi setelah keluar.',
        confirmLabel: 'Keluar',
        isDestructive: false,
        onConfirm: async () => {
          setConfirmModal(prev => ({ ...prev, open: false }));
          if (!onLeaveGroup) return showToast('Fitur keluar belum tersambung');
          const res = await onLeaveGroup(activeGroup.id);
          showToast(res.success ? 'Berhasil keluar dari Collaboration' : (res.message || 'Gagal keluar'));
        }
      });
    }
  };

  const allMedia = (activeGroup.messages || []).reduce((acc: string[], msg: any) => {
    if (msg.images && Array.isArray(msg.images)) acc.push(...msg.images);
    if (msg.image && typeof msg.image === 'string') acc.push(msg.image);
    return acc;
  }, []);

  const handleDownload = () => {
    if (!selectedMedia) return;
    const link = document.createElement('a');
    link.href = selectedMedia;
    link.download = `Cylen_Media_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Gambar berhasil diunduh');
  };

  const menuItemClass =
    'w-full flex items-center gap-3 px-4 py-3 text-[14px] font-medium text-[var(--text)] text-left hover:bg-[var(--sf)] active:bg-[var(--sf)] transition-colors';

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden relative z-50">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      <input type="file" ref={coverInputRef} onChange={handleCoverFile} accept="image/*" className="hidden" />

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        isDestructive={confirmModal.isDestructive}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
      />

      <AnimatePresence mode="wait">
        {view === 'main' && (
          <motion.div key="main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }} className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

            {/* Sampul + foto utama + nama */}
            <GroupHero
              cover={cover}
              avatar={groupAvatar}
              initial={activeGroup.title[0]}
              coverHeight={240}
              onAvatarClick={() => setShowFullAvatar(true)}
              onCameraClick={() => setShowMenu(true)}
              topLeft={
                <button onClick={onBack} aria-label="Kembali" className={heroBtn}>
                  <ArrowLeft size={22} strokeWidth={2.5} />
                </button>
              }
              topRight={
                <button onClick={() => setShowCoverMenu(true)} aria-label="Menu" className={heroBtn}>
                  <MoreHorizontal size={22} strokeWidth={2.5} />
                </button>
              }
            >
              <h1
                onClick={openEditInfo}
                className="mt-4 px-6 max-w-full text-center text-[28px] leading-tight font-bold tracking-tight text-[var(--text)] break-words cursor-pointer"
              >
                {activeGroup.title}
              </h1>
              <p className="mt-1.5 text-[14px] text-[var(--text)]/55 font-medium">
                Collaboration · {users.length} anggota · {ais.length} AI
              </p>

              {activeGroup.description && (
                <p className="mt-2.5 px-10 text-center text-[14px] italic text-[var(--text)]/60 leading-relaxed break-words">
                  {activeGroup.description}
                </p>
              )}
            </GroupHero>

            {/* Tombol aksi */}
            <div className="grid grid-cols-3 gap-3 px-5 mt-7 pb-7 border-b border-[var(--bd)]/10">
              <button onClick={onBack} className="flex flex-col items-center gap-2 group">
                <div className="w-full h-16 rounded-2xl bg-[var(--sf)] border border-[var(--bd)]/40 flex items-center justify-center text-[var(--text)] group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95"><MessageSquare size={22} strokeWidth={1.8} /></div>
                <span className="text-[12px] font-medium text-[var(--text)]/70">Pesan</span>
              </button>
              <button onClick={handleShare} className="flex flex-col items-center gap-2 group">
                <div className="w-full h-16 rounded-2xl bg-[var(--sf)] border border-[var(--bd)]/40 flex items-center justify-center text-[var(--text)] group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95"><Share2 size={22} strokeWidth={1.8} /></div>
                <span className="text-[12px] font-medium text-[var(--text)]/70">Bagikan</span>
              </button>
              <button onClick={() => showToast('Ketuk ikon undang di chat untuk menambah anggota')} className="flex flex-col items-center gap-2 group">
                <div className="w-full h-16 rounded-2xl bg-[var(--sf)] border border-[var(--bd)]/40 flex items-center justify-center text-[var(--text)] group-hover:bg-[var(--text)] group-hover:text-[var(--bg)] transition-all active:scale-95"><UserPlus size={22} strokeWidth={1.8} /></div>
                <span className="text-[12px] font-medium text-[var(--text)]/70">Tambah</span>
              </button>
            </div>

            {/* Media */}
            <div className="py-5 border-b border-[var(--bd)]/10">
              <div className="flex items-center justify-between px-5 mb-3 cursor-pointer group" onClick={() => setView('gallery')}>
                <h3 className="text-[14px] font-semibold text-[var(--text)]/70 group-hover:text-[var(--text)] transition-colors">Media, tautan, dan dok</h3>
                <div className="flex items-center gap-1 text-[var(--text)]/40 group-hover:text-[var(--text)] transition-colors">
                  <span className="text-[13px] font-medium">{allMedia.length}</span>
                  <ChevronRight size={16} />
                </div>
              </div>
              {allMedia.length > 0 ? (
                <div className="flex gap-2.5 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {allMedia.slice(0, 4).map((m, i) => (
                    <div key={i} className="w-20 h-20 rounded-xl bg-[var(--sf)] border border-[var(--bd)]/10 shrink-0 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { setSelectedMedia(m); setView('detail'); }}>
                      <img src={m} alt={`Media ${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mx-5 py-8 flex flex-col items-center justify-center text-[var(--text)]/30 bg-[var(--sf)] border border-[var(--bd)]/40 rounded-[22px]">
                  <ImageIcon size={30} strokeWidth={1.6} className="mb-2 opacity-60" />
                  <span className="text-[12.5px] font-medium">Belum ada media</span>
                </div>
              )}
            </div>

            {/* Pengelolaan AI */}
            <div className="py-5 border-b border-[var(--bd)]/10 px-5">
              <h3 className="text-[14px] font-semibold text-[var(--text)]/70 mb-1">Pengelolaan AI</h3>
              <p className="text-[12.5px] text-[var(--text)]/45 leading-relaxed mb-3">
                {isAdmin
                  ? 'Pilih siapa yang boleh menambah dan mengeluarkan AI.'
                  : 'Aturan ini ditetapkan oleh admin dan hanya admin yang bisa mengubahnya.'}
              </p>
              <div className="flex flex-col gap-2.5">
                {AI_POLICY_OPTIONS.filter(opt => isAdmin || opt.id === aiPolicy).map(opt => {
                  const selected = aiPolicy === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => handleChangePolicy(opt.id)}
                      className={cn(
                        'w-full text-left rounded-2xl border p-4 flex items-start gap-3.5 transition-all [-webkit-tap-highlight-color:transparent]',
                        isAdmin && 'active:scale-[0.99]',
                        selected ? 'border-[var(--text)] bg-[var(--sf)]' : 'border-[var(--bd)] bg-transparent'
                      )}
                    >
                      {isAdmin && (
                        <span
                          className={cn(
                            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                            selected ? 'border-[var(--text)]' : 'border-[var(--text)]/25'
                          )}
                        >
                          {selected && <span className="w-2.5 h-2.5 rounded-full bg-[var(--text)]" />}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold text-[var(--text)]">{opt.title}</span>
                        <span className="block mt-1 text-[13px] leading-relaxed text-[var(--text)]/55">{opt.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daftar anggota */}
            <div className="pt-5 flex flex-col pb-8">
              <h3 className="px-5 text-[14px] font-semibold text-[var(--text)]/70 mb-3">Daftar Anggota</h3>
              <div className="mx-5 mb-4 p-1 bg-[var(--sf)] rounded-xl flex gap-1 border border-[var(--bd)]/10">
                <button onClick={() => setActiveTab('user')} className={cn("flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all", activeTab === 'user' ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text)]/40 hover:text-[var(--text)]/60")}>Manusia ({users.length})</button>
                <button onClick={() => setActiveTab('ai')} className={cn("flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all", activeTab === 'ai' ? "bg-[var(--bg)] text-[var(--text)] shadow-sm" : "text-[var(--text)]/40 hover:text-[var(--text)]/60")}>AI Bot ({ais.length})</button>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'user' ? (
                  <motion.div key="user" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="flex flex-col">
                    {users.map(u => {
                      // Profil publik menang atas data lama yang tersimpan di grup
                      const p = getProfile(u.id);
                      const name = p?.name?.trim() || u.name;
                      const avatar = p && p.avatar !== undefined ? p.avatar : u.avatar;
                      return (
                        <div key={u.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--sf)]/50 transition-colors cursor-pointer">
                          <div className="w-12 h-12 bg-[var(--text)] rounded-full flex items-center justify-center text-[var(--bg)] text-[18px] font-bold shrink-0 overflow-hidden">
                            {avatar
                              ? <img src={avatar} alt={name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                              : (name?.[0] || '?').toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[15px] font-bold text-[var(--text)] truncate">{name}</p>
                              {activeGroup.createdBy === u.id && <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-[var(--ac)] text-[var(--at)]">Admin</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div key="ai" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="flex flex-col">
                    {ais.length === 0 ? (
                      <div className="py-8 text-center text-[13px] font-medium text-[var(--text)]/40">Belum ada AI di Collaboration ini.</div>
                    ) : ais.map(ai => {
                      return (
                        <div key={ai.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--sf)]/50 transition-colors cursor-pointer">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[15px] font-bold text-[var(--text)] truncate">{ai.name}</h4>
                            <p className="text-[13px] text-[var(--text)]/50 mt-0.5 truncate font-medium">{ai.model}</p>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-6 px-5">
                <button
                  onClick={handleLeaveOrDelete}
                  className="w-full flex items-center gap-3 px-5 py-4 bg-[var(--sf)] hover:bg-[var(--bd)]/20 text-[var(--text)] rounded-full font-bold transition-all active:scale-[0.98] justify-center border border-[var(--bd)]/15 shadow-sm"
                >
                  {isAdmin ? (
                    <>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/>
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                      <span>Hapus Collaboration</span>
                    </>
                  ) : (
                    <>
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      <span>Keluar dari Collaboration</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'gallery' && (
          <motion.div key="gallery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col bg-[var(--bg)] absolute inset-0 z-30">
            <div className="px-4 py-3 flex items-center gap-4 border-b border-[var(--bd)]/10 shrink-0 bg-[var(--bg)] sticky top-0 z-10">
              <button onClick={() => setView('main')} className="p-2 -ml-2 rounded-full hover:bg-[var(--sf)] text-[var(--text)] transition-colors"><ArrowLeft size={24} strokeWidth={2.5} /></button>
              <h3 className="text-[18px] font-bold text-[var(--text)]">Media Collaboration</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-1 grid grid-cols-3 gap-1 content-start">
              {allMedia.map((m, i) => (
                <div key={i} className="aspect-square bg-[var(--sf)] overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => { setSelectedMedia(m); setView('detail'); }}>
                  <img src={m} alt={`Media ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {allMedia.length === 0 && <div className="col-span-3 text-center py-20 text-[var(--text)]/40 text-[14px] font-medium">Belum ada media di Collaboration ini.</div>}
            </div>
          </motion.div>
        )}

        {view === 'detail' && (
          <motion.div key="detail" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col bg-black absolute inset-0 z-40">
            <div className="px-4 py-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10">
              <button onClick={() => setView('gallery')} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md"><ArrowLeft size={24} strokeWidth={2.5} /></button>
              <button onClick={handleDownload} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md"><Download size={24} strokeWidth={2.5} /></button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden pt-16 pb-8 px-2">
              {selectedMedia && <img src={selectedMedia} alt="Detail" className="w-full h-full object-contain" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu "..." (sampul + edit profil) */}
      <AnimatePresence>
        {showCoverMenu && (
          <>
            <motion.div
              key="cover-menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              onClick={() => setShowCoverMenu(false)}
              className="fixed inset-0 z-[150]"
            />
            <motion.div
              key="cover-menu"
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.12 }}
              style={{ top: 'calc(max(12px, env(safe-area-inset-top)) + 48px)' }}
              className="fixed right-4 z-[151] w-[230px] bg-[var(--bg)] border border-[var(--bd)] rounded-2xl shadow-2xl py-1.5 overflow-hidden origin-top-right"
            >
              <button
                onClick={() => { setShowCoverMenu(false); coverInputRef.current?.click(); }}
                className={menuItemClass}
              >
                <ImageIcon size={18} strokeWidth={2} /> Ganti sampul
              </button>
              {cover && (
                <button onClick={handleDeleteCover} className={menuItemClass}>
                  <Trash2 size={18} strokeWidth={2} /> Hapus sampul
                </button>
              )}
              <div className="h-px bg-[var(--bd)] my-1" />
              <button
                onClick={() => { setShowCoverMenu(false); openEditInfo(); }}
                className={menuItemClass}
              >
                <Edit2 size={18} strokeWidth={2} /> Edit profil Collaboration
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFullAvatar && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[200] bg-black flex flex-col">
            <div className="px-4 py-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent absolute top-0 w-full z-10">
              <button onClick={() => setShowFullAvatar(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md"><ArrowLeft size={24} strokeWidth={2.5} /></button>
              <button onClick={() => { setShowFullAvatar(false); setShowMenu(true); }} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-white/20 transition-colors backdrop-blur-md"><Edit2 size={20} strokeWidth={2.5} /></button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-hidden pt-16 pb-8 px-2">
              {groupAvatar
                ? <img src={groupAvatar} alt="Foto Collaboration" className="w-full h-auto max-h-full object-contain" />
                : <div className="w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] bg-[#222] rounded-full flex items-center justify-center text-white text-8xl font-bold">{activeGroup.title[0]}</div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEditInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-[340px] bg-[var(--bg)] rounded-3xl p-6 shadow-2xl border border-[var(--bd)]/10">
              <h3 className="text-[19px] font-bold text-[var(--text)] mb-5">Edit Profil Collaboration</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-[12px] font-bold text-[var(--text)]/50 ml-1 uppercase tracking-wider">Nama Collaboration</label>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full mt-1.5 bg-[var(--sf)] px-4 py-3.5 rounded-2xl outline-none text-[15px] font-bold text-[var(--text)] border border-[var(--bd)]/20 focus:border-[var(--text)]/30 transition-colors" />
                </div>
                <div>
                  <label className="text-[12px] font-bold text-[var(--text)]/50 ml-1 uppercase tracking-wider">Deskripsi (Opsional)</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full mt-1.5 bg-[var(--sf)] px-4 py-3.5 rounded-2xl outline-none text-[14px] text-[var(--text)] resize-none h-28 border border-[var(--bd)]/20 focus:border-[var(--text)]/30 transition-colors font-medium leading-relaxed" placeholder="Tambahkan penjelasan tentang Collaboration ini..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowEditInfo(false)} className="px-5 py-3 rounded-2xl font-bold text-[var(--text)]/60 hover:bg-[var(--sf)] transition-colors active:scale-95">Batal</button>
                <button onClick={handleSaveInfo} className="px-6 py-3 rounded-2xl font-bold bg-[var(--text)] text-[var(--bg)] shadow-md active:scale-95 transition-transform">Simpan</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowMenu(false)} className="fixed inset-0 bg-black/60 z-[200]" />
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} transition={{ type: "spring", bounce: 0, duration: 0.3 }} className="fixed bottom-0 left-0 right-0 bg-[var(--bg)] rounded-t-[24px] z-[201] p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-[var(--bd)]/10">
              <div className="w-12 h-1.5 bg-[var(--bd)]/20 rounded-full mx-auto mb-6" />
              <h3 className="text-[18px] font-bold text-[var(--text)] mb-4 px-2">Foto Profil Collaboration</h3>
              <div className="flex flex-col gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-4 px-4 py-3.5 bg-[var(--sf)] hover:bg-[var(--text)] hover:text-[var(--bg)] text-[var(--text)] rounded-2xl transition-colors font-bold text-[15px]">
                  <ImageIcon size={20} /> Ambil dari Galeri
                </button>
                {groupAvatar && (
                  <button onClick={handleDeleteAvatar} className="w-full flex items-center gap-4 px-4 py-3.5 bg-[var(--sf)] hover:bg-[var(--text)] hover:text-[var(--bg)] text-[var(--text)] rounded-2xl transition-colors font-bold text-[15px]">
                    <Trash2 size={20} /> Hapus Foto
                  </button>
                )}
                <button onClick={() => setShowMenu(false)} className="w-full mt-2 py-3.5 text-[var(--text)]/60 font-bold hover:bg-[var(--sf)] rounded-2xl transition-colors text-[15px]">Batal</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewImg && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }} className="fixed inset-0 bg-black z-[300] flex flex-col">
            <div className="px-5 py-4 flex items-center justify-between text-white border-b border-white/10 shrink-0">
              <button onClick={() => setPreviewImg(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"><X size={20} strokeWidth={2.5} /></button>
              <h3 className="text-[16px] font-bold">Edit Rasio</h3>
              <button onClick={handleSaveAvatar} className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-colors"><Check size={20} strokeWidth={3} /></button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
              <p className="text-white/50 text-[13px] mb-8 text-center font-medium">Geser gambar untuk menyesuaikan profil.</p>
              <div className="relative w-[85vw] max-w-[340px] aspect-square rounded-full border-2 border-white/60 border-dashed overflow-hidden flex items-center justify-center shadow-2xl">
                <motion.div ref={constraintsRef} className="absolute inset-[-150%] flex items-center justify-center pointer-events-none"></motion.div>
                <motion.img drag dragConstraints={constraintsRef} src={previewImg} alt="Preview" className="min-w-full min-h-full object-cover cursor-move active:cursor-grabbing hover:opacity-90 transition-opacity" />
              </div>
            </div>
            <div className="p-6 shrink-0">
              <button onClick={handleSaveAvatar} className="w-full py-4 bg-white text-black font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-transform">
                Simpan Profil Custom
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
