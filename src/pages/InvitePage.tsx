import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { signInWithGoogle } from '../services/authService';
import { GroupSession } from '../types';

interface InvitePageProps {
  groupId: string;
  user: User | null;
  onJoin: (groupId: string) => Promise<{ success: boolean; message?: string; alreadyMember?: boolean }>;
  onDismiss: () => void;
}

type Info = { title: string; creatorName: string; description: string; avatar: string | null };

const Spinner = () => (
  <span className="inline-block w-4 h-4 rounded-full border-2 border-[var(--at)]/30 border-t-[var(--at)] animate-spin" />
);

// Foto profil Collaboration: pakai foto kalau ada, kalau nggak pakai huruf pertama nama
const GroupAvatar: React.FC<{ src?: string | null; name: string; size: number }> = ({ src, name, size }) => (
  <div
    className="bg-[var(--sf)] border border-[var(--bd)] flex items-center justify-center font-bold overflow-hidden flex-shrink-0"
    style={{ width: size, height: size, borderRadius: size * 0.31, fontSize: size * 0.38 }}
  >
    {src ? (
      <img src={src} alt={name} className="w-full h-full object-cover" />
    ) : (
      <span>{name[0]?.toUpperCase()}</span>
    )}
  </div>
);

export const InvitePage: React.FC<InvitePageProps> = ({ groupId, user, onJoin, onDismiss }) => {
  const [step, setStep] = useState<'invite' | 'confirm'>('invite');
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [info, setInfo] = useState<Info | null>(null);
  const [group, setGroup] = useState<GroupSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Muat data: belum login → info publik (groupInvites), sudah login → dokumen lengkap
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus('loading');
      try {
        if (!db) throw new Error('no-db');
        if (user) {
          const snap = await getDoc(doc(db, 'groups', groupId));
          if (cancelled) return;
          if (!snap.exists()) { setStatus('missing'); return; }
          const g = snap.data() as GroupSession;
          const gx = g as any;
          const creator = g.participants?.find(p => p.id === g.createdBy);
          setGroup(g);
          setInfo({
            title: g.title,
            creatorName: creator?.name || 'Seseorang',
            description: gx.description || '',
            avatar: gx.avatar || null,
          });
          setStatus('ready');
        } else {
          const snap = await getDoc(doc(db, 'groupInvites', groupId));
          if (cancelled) return;
          if (snap.exists()) {
            const d = snap.data() as any;
            setInfo({
              title: d.title,
              creatorName: d.creatorName,
              description: d.description || '',
              avatar: d.avatar || null,
            });
          }
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus(user ? 'missing' : 'ready');
      }
    })();
    return () => { cancelled = true; };
  }, [groupId, user?.uid]);

  const handleAccept = async () => {
    setErr(null);
    if (!user) {
      setBusy(true);
      try {
        await signInWithGoogle();
        setStep('confirm');
      } catch (e: any) {
        if (e?.code !== 'auth/popup-closed-by-user') setErr('Login gagal, coba lagi.');
      } finally {
        setBusy(false);
      }
      return;
    }
    setStep('confirm');
  };

  const handleJoin = async () => {
    setBusy(true);
    setErr(null);
    const res = await onJoin(groupId);
    if (!res.success) {
      setErr(res.message || 'Gagal bergabung, coba lagi.');
      setBusy(false);
    }
  };

  const title = info?.title || 'Collaboration';
  const humans = group?.participants?.filter(p => !p.isAI) || [];
  const ais = group?.participants?.filter(p => p.isAI) || [];
  const alreadyMember = !!(user && group?.memberIds?.includes(user.uid));
  const isFull = !alreadyMember && (group?.memberIds?.length ?? 0) >= 11;

  const primaryBtn =
    'w-full h-12 rounded-2xl bg-[var(--ac)] text-[var(--at)] text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40';
  const ghostBtn =
    'w-full h-11 rounded-2xl text-[14px] font-medium text-[var(--mu)] active:opacity-60 transition-opacity';

  return (
    <div className="w-full overflow-y-auto bg-[var(--bg)] text-[var(--text)]" style={{ height: '100dvh' }}>
      <div className="min-h-full flex items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-[360px] flex flex-col items-center text-center"
        >
          {/* Logo */}
          <img src="/82374-removebg-preview.png" alt="Cylen" style={{ width: 44, height: 44, objectFit: 'contain' }} />

          {status === 'loading' && (
            <div className="mt-16 mb-16 w-6 h-6 rounded-full border-2 border-[var(--bd)] border-t-[var(--text)] animate-spin" />
          )}

          {status === 'missing' && (
            <>
              <h1 className="mt-8 text-[22px] font-bold tracking-tight">Undangan tidak valid</h1>
              <p className="mt-2 text-[14px] text-[var(--mu)] leading-relaxed">
                Link ini sudah tidak berlaku atau Collaboration-nya sudah dihapus.
              </p>
              <div className="w-full mt-8">
                <button onClick={onDismiss} className={primaryBtn}>Tutup</button>
              </div>
            </>
          )}

          {status === 'ready' && step === 'invite' && (
            <>
              <p className="mt-8 text-[14px] text-[var(--mu)]">Kamu diundang bergabung ke Collaboration</p>

              <div className="mt-6">
                <GroupAvatar src={info?.avatar} name={title} size={84} />
              </div>

              <h1 className="mt-5 text-[26px] font-bold tracking-tight leading-tight break-words max-w-full">{title}</h1>
              {info?.creatorName && (
                <p className="mt-2 text-[14px] text-[var(--mu)]">
                  Dibuat oleh <span className="text-[var(--text)] font-medium">{info.creatorName}</span>
                </p>
              )}
              {info?.description && (
                <p className="mt-4 text-[14px] text-[var(--text)]/70 leading-relaxed break-words max-w-full">
                  {info.description}
                </p>
              )}

              <div className="w-full mt-10 flex flex-col gap-1">
                <button onClick={handleAccept} disabled={busy} className={primaryBtn}>
                  {busy ? <Spinner /> : 'Terima Undangan'}
                </button>
                {!user && (
                  <p className="mt-2 text-[12px] text-[var(--mu)]">Kamu akan diminta masuk dengan Google.</p>
                )}
                {err && <p className="mt-2 text-[13px] text-[var(--text)]/70">{err}</p>}
                <button onClick={onDismiss} className={ghostBtn}>Nanti saja</button>
              </div>
            </>
          )}

          {status === 'ready' && step === 'confirm' && (
            <>
              <h1 className="mt-8 text-[22px] font-bold tracking-tight">Gabung ke Collaboration ini?</h1>

              <div className="w-full mt-6 rounded-[22px] bg-[var(--sf)] border border-[var(--bd)] p-5 text-left">
                <div className="flex items-center gap-3.5">
                  <GroupAvatar src={info?.avatar} name={title} size={52} />
                  <div className="min-w-0">
                    <div className="text-[17px] font-semibold break-words leading-tight">{title}</div>
                    <div className="mt-1 text-[13px] text-[var(--mu)]">
                      Dibuat oleh {info?.creatorName || 'Seseorang'}
                    </div>
                  </div>
                </div>

                {info?.description && (
                  <p className="mt-4 text-[13px] text-[var(--text)]/70 leading-relaxed break-words">
                    {info.description}
                  </p>
                )}

                <div className="mt-5 h-px bg-[var(--bd)]" />

                <div className="mt-4 text-[12px] font-medium text-[var(--mu)]">
                  Anggota · {humans.length}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {humans.map(p => (
                    <span key={p.id} className="px-3 py-1.5 rounded-full bg-[var(--bg)] border border-[var(--bd)] text-[13px] font-medium">
                      {p.name}
                    </span>
                  ))}
                </div>

                {ais.length > 0 && (
                  <>
                    <div className="mt-4 text-[12px] font-medium text-[var(--mu)]">AI aktif · {ais.length}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ais.map(p => (
                        <span key={p.id} className="px-3 py-1.5 rounded-full bg-[var(--text)]/10 text-[13px] font-medium">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="w-full mt-8 flex flex-col gap-1">
                {isFull ? (
                  <p className="text-[14px] text-[var(--mu)] mb-2">Collaboration ini sudah penuh (maks 11 anggota).</p>
                ) : (
                  <button onClick={handleJoin} disabled={busy} className={primaryBtn}>
                    {busy ? <Spinner /> : alreadyMember ? 'Buka Collaboration' : 'Gabung ke Collaboration'}
                  </button>
                )}
                {err && <p className="mt-2 text-[13px] text-[var(--text)]/70">{err}</p>}
                <button onClick={onDismiss} className={ghostBtn}>Batal</button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};
