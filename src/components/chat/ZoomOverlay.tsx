import React, { useState } from 'react';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, MessageSquare, UserPlus, Bot, LayoutDashboard, ChevronUp, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { GroupParticipant } from '../../types';

interface ZoomOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  participants?: GroupParticipant[]; // 🔥 Menerima data peserta asli
}

export const ZoomOverlay: React.FC<ZoomOverlayProps> = ({ isOpen, onClose, groupName, participants = [] }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  // Fallback kalo array kosong (minimal nampilin diri lu sendiri)
  const activeParticipants = participants.length > 0 ? participants : [
    { id: 'me', name: 'Rivaldy (CEO)', isAI: false }
  ];

  // LOGIKA GRID DINAMIS (Makin banyak makin kebelah)
  const pCount = activeParticipants.length;
  let gridClass = "grid-cols-1 grid-rows-1";
  if (pCount === 2) gridClass = "grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1";
  else if (pCount === 3 || pCount === 4) gridClass = "grid-cols-2 grid-rows-2";
  else if (pCount > 4) gridClass = "grid-cols-2 md:grid-cols-3 auto-rows-fr";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.98 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} // Transisi mulus ala Apple
          className="fixed inset-0 z-[1000] bg-[#050505] flex flex-col font-sans overflow-hidden text-white"
        >
          {/* ── HEADER OVERLAY ── */}
          <div className="absolute top-0 w-full p-6 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent z-50 pointer-events-none">
            <div className="flex flex-col gap-1 pointer-events-auto">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <span className="font-bold text-xs tracking-[0.2em] uppercase text-white/90">{groupName}</span>
              </div>
              <span className="text-[10px] font-mono text-white/40 tracking-widest">{pCount} ACTIVE NODES ENCRYPTED</span>
            </div>
            
            <div className="flex gap-3 pointer-events-auto">
              <button onClick={() => setShowDashboard(!showDashboard)} className={cn("p-3 rounded-2xl border transition-all", showDashboard ? "bg-white text-black border-white" : "bg-black/50 border-white/10 text-white hover:bg-white/10 backdrop-blur-md")}>
                <LayoutDashboard size={18} />
              </button>
              <button onClick={onClose} className="p-3 bg-black/50 border border-white/10 rounded-2xl text-white hover:bg-white/10 backdrop-blur-md transition-all">
                <Maximize2 size={18} />
              </button>
            </div>
          </div>

          {/* ── MAIN VIDEO GRID (DINAMIS) ── */}
          <div className="flex-1 relative w-full h-full p-4 md:p-8 pt-24 pb-32 z-10 flex items-center justify-center">
            <div className={cn("w-full h-full max-w-6xl gap-4 grid transition-all duration-500", gridClass)}>
              {activeParticipants.map((p, idx) => (
                <div key={p.id} className="relative w-full h-full bg-[#111] rounded-[32px] border border-white/5 overflow-hidden shadow-2xl group">
                  
                  {/* Efek Garis Scan ala Cylen */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-[200%] animate-[scan_4s_linear_infinite]" style={{ transform: 'translateY(-50%)' }} />

                  {p.isAI ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 to-[#0a0a0a]">
                      <div className="flex gap-1.5 items-center justify-center mb-6 h-12">
                        {[...Array(6)].map((_, i) => (
                          <motion.div key={i} animate={{ height: [12, 40, 16, 32, 12] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.1 }} className="w-1.5 bg-white/80 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                        ))}
                      </div>
                      <p className="text-white/20 text-[10px] font-mono tracking-[0.3em] uppercase">{p.model || 'SYNTHESIZING...'}</p>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
                      {(!isVideoOn && idx === 0) ? (
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white/30 font-bold text-3xl">{p.name[0]}</div>
                      ) : (
                        <span className="text-white/10 font-mono text-sm tracking-widest">CAMERA ACTIVE</span>
                      )}
                    </div>
                  )}

                  {/* Name Tag Kiri Bawah */}
                  <div className="absolute bottom-4 left-4 p-3 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", p.isAI ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]")} />
                    <span className="text-white font-bold text-xs tracking-wide uppercase">{p.name} {idx === 0 && '(YOU)'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SIDE DASHBOARD PANEL ── */}
          <AnimatePresence>
            {showDashboard && (
              <motion.div initial={{ x: '100%', opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="absolute top-24 right-6 w-80 bottom-32 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-6 z-40 flex flex-col gap-6 shadow-2xl">
                <div className="flex items-center gap-3 text-white/50 border-b border-white/10 pb-4">
                  <Activity size={18} />
                  <span className="text-xs font-bold tracking-widest uppercase">System Telemetry</span>
                </div>
                <div className="flex-1 flex flex-col gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5"><div className="text-[10px] text-white/40 font-mono mb-1">NETWORK LATENCY</div><div className="text-xl font-bold font-mono">12ms <span className="text-green-500 text-sm">●</span></div></div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5"><div className="text-[10px] text-white/40 font-mono mb-1">AI COMPUTE LOAD</div><div className="text-xl font-bold font-mono">24%</div><div className="w-full h-1 bg-white/10 mt-3 rounded-full overflow-hidden"><div className="h-full bg-white w-1/4 rounded-full" /></div></div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5"><div className="text-[10px] text-white/40 font-mono mb-1">ACTIVE CANVAS</div><div className="text-xs font-bold text-white/60 mt-1">No file projected.</div></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── INVITE MENU POPUP ── */}
          <AnimatePresence>
            {showInviteMenu && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-36 left-1/2 -translate-x-1/2 bg-[#111] border border-white/10 rounded-[28px] p-2 flex gap-2 z-50 shadow-2xl backdrop-blur-xl">
                <button onClick={() => { alert('Membuka menu undang manusia...'); setShowInviteMenu(false); }} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/10 rounded-[20px] transition-colors">
                  <div className="bg-white/10 p-2 rounded-xl"><UserPlus size={16} /></div>
                  <span className="text-xs font-bold uppercase tracking-wider">Undang Manusia</span>
                </button>
                <div className="w-[1px] bg-white/10 my-2" />
                <button onClick={() => { alert('Membuka menu daftar AI...'); setShowInviteMenu(false); }} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/10 rounded-[20px] transition-colors">
                  <div className="bg-white text-black p-2 rounded-xl"><Bot size={16} /></div>
                  <span className="text-xs font-bold uppercase tracking-wider">Tambahkan AI</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── BOTTOM CONTROLS (Floating Capsule) ── */}
          <div className="absolute bottom-10 w-full flex justify-center z-50">
            <div className="flex items-center gap-3 p-3 bg-black/60 backdrop-blur-3xl rounded-[40px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              
              <div className="relative">
                <button onClick={() => setShowInviteMenu(!showInviteMenu)} className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all", showInviteMenu ? "bg-white text-black" : "bg-white/5 text-white hover:bg-white/15")}>
                  {showInviteMenu ? <ChevronUp size={22} /> : <UserPlus size={22} />}
                </button>
              </div>

              <div className="w-[1px] h-8 bg-white/10 mx-1" />

              <button onClick={() => setIsMicOn(!isMicOn)} className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all", isMicOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white")}>
                {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
              </button>

              <button onClick={() => setIsVideoOn(!isVideoOn)} className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all", isVideoOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white")}>
                {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
              </button>

              <button className="w-14 h-14 rounded-full bg-white/5 text-white hover:bg-white/15 transition-all flex items-center justify-center">
                <MessageSquare size={22} />
              </button>

              <div className="w-[1px] h-8 bg-white/10 mx-1" />

              <button onClick={onClose} className="w-16 h-16 rounded-[28px] bg-red-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 transition-all">
                <PhoneOff size={24} fill="currentColor" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
