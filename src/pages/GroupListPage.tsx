import React, { useRef, useState } from 'react';
import { Search, Plus, ArrowLeft, Users, Image as ImageIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupSession, AiPolicy } from '../types';
import { cn } from '../lib/utils';
import { usePublicProfiles } from '../hooks/usePublicProfiles';
import { GroupHero } from '../components/group/GroupHero';
import { GroupAvatar, GroupPreviewCard } from '../components/group/GroupPreviewCard';
import { compressToSquare, compressToCover, readFileAsDataUrl } from '../lib/imageTools';
import { usePageText } from '../lib/i18n';
import { GROUP_TEXT } from '../lib/groupText';

interface GroupListPageProps {
  groups: GroupSession[];
  onSelectGroup: (id: string) => void;
  onCreateGroup: (
    title: string,
    options?: { description?: string; aiPolicy?: AiPolicy }
  ) => Promise<string | null | void> | string | null | void;
  onNavigateProfile?: () => void;
  // BARU: ikon "i" di kartu → buka profil grup itu
  onOpenProfile?: (id: string) => void;
  onBack?: () => void;
}

// Gaya tombol bulat yang melayang di atas sampul
const heroBtn =
  'w-10 h-10 rounded-full bg-black/40 text-white backdrop-blur-md flex items-center justify-center active:scale-95 transition-transform [-webkit-tap-highlight-color:transparent]';

export const GroupListPage: React.FC<GroupListPageProps> = ({
  groups, onSelectGroup, onCreateGroup, onOpenProfile, onBack
}) => {
  const tx = usePageText('group', GROUP_TEXT);
  const AI_POLICY_OPTIONS: { id: AiPolicy; title: string; desc: string }[] = [
    { id: 'admin', title: tx.polAdmin, desc: tx.polAdminDescCreate },
    { id: 'members', title: tx.polMembers, desc: tx.polMembersDesc },
  ];
  const [searchQuery, setSearchQuery] = useState('');

  // ── Halaman buat Collaboration ──
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPolicy, setNewPolicy] = useState<AiPolicy>('admin');
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [newCover, setNewCover] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // ── Kartu pratinjau grup (klik avatar di daftar). Foto penuh baru muncul kalau foto di kartu di-klik. ──
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{ id: string; title: string; avatar: string | null } | null>(null);

  // ── nama terbaru pengirim pesan terakhir tiap Collaboration ──
  const senderIds = groups
    .map(g => (g.messages[g.messages.length - 1] as any)?.senderId as string | undefined)
    .filter(Boolean) as string[];
  const getProfile = usePublicProfiles(senderIds);

  const filteredGroups = groups.filter(g =>
    g.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreate = () => {
    setNewName('');
    setNewDesc('');
    setNewPolicy('admin');
    setNewAvatar(null);
    setNewCover(null);
    setCreateError(null);
    setIsCreating(true);
  };

  const closeCreate = () => {
    if (creating) return;
    setIsCreating(false);
    setCreateError(null);
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (avatarInputRef.current) avatarInputRef.current.value = '';
    if (!file) return;
    try {
      const url = await readFileAsDataUrl(file);
      setNewAvatar(await compressToSquare(url));
    } catch {
      setCreateError(tx.photoErr);
    }
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (coverInputRef.current) coverInputRef.current.value = '';
    if (!file) return;
    try {
      const url = await readFileAsDataUrl(file);
      setNewCover(await compressToCover(url));
    } catch {
      setCreateError(tx.imgErr);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const id = await onCreateGroup(newName.trim(), {
        description: newDesc.trim(),
        aiPolicy: newPolicy,
      });
      if (!id) {
        setCreateError(tx.maxErr);
        return;
      }
      // Foto dan sampul dikirim lewat event yang sama dengan halaman profil
      if (newAvatar) {
        window.dispatchEvent(new CustomEvent('group-avatar-updated', { detail: { id, avatar: newAvatar } }));
      }
      if (newCover) {
        window.dispatchEvent(new CustomEvent('group-cover-updated', { detail: { id, cover: newCover } }));
      }
      setIsCreating(false);
    } catch {
      setCreateError(tx.genErr);
    } finally {
      setCreating(false);
    }
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
          <h1 className="text-[18px] font-bold text-[var(--text)] tracking-tight">{tx.collab}</h1>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text)]/40" strokeWidth={2.5} />
          <input
            type="text"
            placeholder={tx.searchPh}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[var(--sf)] rounded-[16px] text-[15px] outline-none placeholder:text-[var(--text)]/40 text-[var(--text)] border border-transparent focus:border-[var(--text)]/20 transition-all font-medium"
          />
        </div>
      </div>

      {/* ─── DAFTAR COLLABORATION ─── */}
      <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 px-6 text-center">
            <div className="w-20 h-20 bg-[var(--sf)] rounded-full flex items-center justify-center text-[var(--text)]/20 mb-5">
              <Users size={32} strokeWidth={2} />
            </div>
            <h3 className="text-[17px] font-bold text-[var(--text)]/60 mb-1.5">{tx.emptyTitle}</h3>
            <p className="text-[14px] text-[var(--text)]/40 max-w-[240px] leading-relaxed font-medium">
              {tx.emptyDesc}
            </p>
          </div>
        ) : (
          filteredGroups.map((group, idx) => {
            const lastMsg = group.messages[group.messages.length - 1];
            const aiCount = group.participants.filter(p => p.isAI).length;
            const isSystemLast = lastMsg?.role === 'system';

            // foto Collaboration dari dokumen grup (Firestore)
            const groupAvatar: string | null = group.avatar ?? null;

            // nama pengirim terbaru dari profil publik
            const senderId = (lastMsg as any)?.senderId as string | undefined;
            const senderName = isSystemLast
              ? undefined
              : ((senderId && getProfile(senderId)?.name?.trim()) || lastMsg?.senderName);

            // Pesan sistem tampil sebagai teks singkat, bukan teks panjang bawaan
            const previewText = isSystemLast ? tx.systemPreview : (lastMsg?.content || tx.startChat);

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--sf)]/50 transition-colors border-b border-[var(--bd)]/10 cursor-pointer"
              >
                {/* Klik avatar → kartu pratinjau (bukan foto penuh) */}
                <button
                  type="button"
                  aria-label={group.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewData({ id: group.id, title: group.title, avatar: groupAvatar });
                    setPreviewOpen(true);
                  }}
                  className="shrink-0 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all z-10 [-webkit-tap-highlight-color:transparent]"
                >
                  <GroupAvatar avatar={groupAvatar} size={56} />
                </button>

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
                      {senderName && (
                        <span className="text-[var(--text)]/70 shrink-0">{senderName}:</span>
                      )}
                      <span className="truncate">{previewText}</span>
                    </div>
                    {aiCount > 0 && (
                      <div className="shrink-0 px-2.5 py-1 rounded-full bg-[var(--sf)] border border-[var(--bd)]/20">
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

      {/* FAB BUAT COLLABORATION */}
      <div className="fixed bottom-6 right-6 z-30">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={openCreate}
          className="w-14 h-14 bg-[var(--text)] text-[var(--bg)] rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex items-center justify-center hover:scale-105 transition-all"
        >
          <Plus size={24} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* ─── HALAMAN BUAT COLLABORATION ─── */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            key="create-page"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[200] bg-[var(--bg)] flex flex-col"
          >
            <input type="file" ref={avatarInputRef} onChange={handleAvatarFile} accept="image/*" className="hidden" />
            <input type="file" ref={coverInputRef} onChange={handleCoverFile} accept="image/*" className="hidden" />

            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
              {/* Sampul + foto utama */}
              <GroupHero
                cover={newCover}
                avatar={newAvatar}
                coverHeight={210}
                onAvatarClick={() => avatarInputRef.current?.click()}
                onCameraClick={() => avatarInputRef.current?.click()}
                topLeft={
                  <button onClick={closeCreate} aria-label={tx.back} className={heroBtn}>
                    <ArrowLeft size={22} strokeWidth={2.5} />
                  </button>
                }
                topRight={
                  <>
                    {newCover && (
                      <button onClick={() => setNewCover(null)} aria-label={tx.delCover} className={heroBtn}>
                        <Trash2 size={18} strokeWidth={2.2} />
                      </button>
                    )}
                    <button onClick={() => coverInputRef.current?.click()} aria-label={tx.pickCover} className={heroBtn}>
                      <ImageIcon size={18} strokeWidth={2.2} />
                    </button>
                  </>
                }
                coverAction={
                  !newCover ? (
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 text-white backdrop-blur-md text-[13px] font-medium active:scale-95 transition-transform"
                    >
                      <ImageIcon size={16} strokeWidth={2.2} /> {tx.addCover}
                    </button>
                  ) : undefined
                }
              >
                <p className="text-[18px] font-bold text-[var(--text)] truncate">{newName.trim() || tx.newCollab}</p>
                {newAvatar && (
                  <button
                    onClick={() => setNewAvatar(null)}
                    className="mt-1 text-[13px] font-medium text-[var(--text)]/45 active:opacity-60"
                  >
                    {tx.delPhoto}
                  </button>
                )}
              </GroupHero>

              {/* Form */}
              <div className="px-5 pt-7 pb-8 max-w-[420px] mx-auto flex flex-col">
                <label className="text-[12px] font-bold text-[var(--text)]/50 ml-1 uppercase tracking-wider">{tx.nameLabel}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={60}
                  placeholder={tx.namePh}
                  className="w-full mt-1.5 bg-[var(--sf)] px-4 py-3.5 rounded-2xl outline-none text-[15px] font-semibold text-[var(--text)] placeholder:text-[var(--text)]/30 border border-[var(--bd)]/20 focus:border-[var(--text)]/30 transition-colors"
                />

                <label className="mt-5 text-[12px] font-bold text-[var(--text)]/50 ml-1 uppercase tracking-wider">{tx.descLabel}</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  maxLength={300}
                  placeholder={tx.descPh}
                  className="w-full mt-1.5 bg-[var(--sf)] px-4 py-3.5 rounded-2xl outline-none text-[14px] font-medium text-[var(--text)] placeholder:text-[var(--text)]/30 resize-none h-24 leading-relaxed border border-[var(--bd)]/20 focus:border-[var(--text)]/30 transition-colors"
                />

                <label className="mt-7 text-[12px] font-bold text-[var(--text)]/50 ml-1 uppercase tracking-wider">{tx.aiMgmt}</label>
                <p className="mt-1 ml-1 text-[12.5px] text-[var(--text)]/45 leading-relaxed">
                  {tx.aiMgmtHint}
                </p>
                <div className="mt-3 flex flex-col gap-2.5">
                  {AI_POLICY_OPTIONS.map(opt => {
                    const selected = newPolicy === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setNewPolicy(opt.id)}
                        className={cn(
                          'w-full text-left rounded-2xl border p-4 flex items-start gap-3.5 active:scale-[0.99] transition-all [-webkit-tap-highlight-color:transparent]',
                          selected ? 'border-[var(--text)] bg-[var(--sf)]' : 'border-[var(--bd)] bg-transparent'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                            selected ? 'border-[var(--text)]' : 'border-[var(--text)]/25'
                          )}
                        >
                          {selected && <span className="w-2.5 h-2.5 rounded-full bg-[var(--text)]" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold text-[var(--text)]">{opt.title}</span>
                          <span className="block mt-1 text-[13px] leading-relaxed text-[var(--text)]/55">{opt.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tombol buat */}
            <div className="shrink-0 px-5 pt-3 border-t border-[var(--bd)]/15" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
              <div className="max-w-[420px] mx-auto">
                {createError && (
                  <p className="mb-2 text-[13px] text-[var(--text)]/70 text-center">{createError}</p>
                )}
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="w-full h-12 rounded-2xl bg-[var(--ac)] text-[var(--at)] text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
                >
                  {creating
                    ? <span className="inline-block w-4 h-4 rounded-full border-2 border-[var(--at)]/30 border-t-[var(--at)] animate-spin" />
                    : tx.createBtn}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KARTU PRATINJAU GRUP: nama, foto, ikon chat, ikon i. Foto penuh hanya setelah foto di kartu di-klik. */}
      <GroupPreviewCard
        open={previewOpen}
        title={previewData?.title ?? ''}
        avatar={previewData?.avatar ?? null}
        onClose={() => setPreviewOpen(false)}
        onChat={() => { if (previewData) onSelectGroup(previewData.id); }}
        onInfo={() => { if (previewData) onOpenProfile?.(previewData.id); }}
      />

    </main>
  );
};
