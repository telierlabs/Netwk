import React from 'react';
import { X, Mic, MicOff, Video, VideoOff, PhoneOff, Maximize2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils'; // 🔥 TAMBAHIN INI

interface ZoomOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
}

export const ZoomOverlay: React.FC<ZoomOverlayProps> = ({ isOpen, onClose, groupName }) => {
  const [isMicOn, setIsMicOn] = React.useState(true);
  const [isVideoOn, setIsVideoOn] = React.useState(true);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[1000] bg-black flex flex-col font-sans overflow-hidden"
        >
          {/* HEADER: Info Grup */}
          <div className="absolute top-0 w-full p-6 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white/90 font-bold text-sm tracking-widest uppercase">{groupName} • LIVE</span>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white backdrop-blur-md">
              <Maximize2 size={18} />
            </button>
          </div>

          {/* MAIN VIEW: Video User/AI */}
          <div className="flex-1 relative flex items-center justify-center p-4">
            <div className="w-full h-full rounded-[40px] bg-[#1a1a1a] overflow-hidden relative border border-white/5 shadow-2xl">
              {!isVideoOn ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-[var(--ac)] rounded-full flex items-center justify-center">
                    <span className="text-4xl font-bold text-[var(--at)]">R</span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                   <p className="text-white/20 text-xs font-mono tracking-widest uppercase italic">Establishing Secure Link...</p>
                </div>
              )}

              <div className="absolute bottom-8 left-8 p-4 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 flex items-center gap-4">
                <div className="flex gap-1 items-end h-4">
                  {[...Array(4)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ height: [4, 16, 8, 14, 4] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                      className="w-1 bg-[var(--ac)] rounded-full"
                    />
                  ))}
                </div>
                <span className="text-[var(--at)] text-xs font-bold uppercase tracking-tighter">Cylen AI Joined</span>
              </div>
            </div>
          </div>

          {/* BOTTOM CONTROLS: Glassmorphism Style */}
          <div className="px-6 pb-12 pt-6 flex flex-col items-center gap-8">
            <div className="flex items-center gap-5 p-3 bg-white/5 backdrop-blur-2xl rounded-[32px] border border-white/10 shadow-2xl">
              <button 
                onClick={() => setIsMicOn(!isMicOn)}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                  isMicOn ? "bg-white/10 text-white" : "bg-red-500 text-white"
                )}
              >
                {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
              </button>

              <button 
                onClick={() => setIsVideoOn(!isVideoOn)}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                  isVideoOn ? "bg-white/10 text-white" : "bg-red-500 text-white"
                )}
              >
                {isVideoOn ? <Video size={22} /> : <VideoOff size={22} />}
              </button>

              <button className="w-14 h-14 rounded-full bg-white/10 text-white flex items-center justify-center">
                <MessageSquare size={22} />
              </button>

              <div className="w-[2px] h-8 bg-white/10 mx-1" />

              <button 
                onClick={onClose}
                className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)] active:scale-90 transition-all"
              >
                <PhoneOff size={26} fill="currentColor" />
              </button>
            </div>
            
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">End-to-End Encrypted Session</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
