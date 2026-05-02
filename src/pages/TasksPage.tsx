import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, AlarmClock, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface TasksPageProps {
  onClose: () => void;
}

// Komponen Input spesifik ala Grok (Floating Label)
const GrokInput = ({ label, value, type = "text", placeholder = "", isTextArea = false }: any) => {
  return (
    <div className="relative bg-[var(--text)]/5 rounded-2xl px-4 py-2 pt-6 border border-transparent focus-within:border-[var(--text)]/30 transition-all">
      <label className="absolute top-2.5 left-4 text-[10px] font-bold text-[var(--text)]/50 uppercase tracking-widest">
        {label}
      </label>
      {isTextArea ? (
        <textarea 
          rows={3}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-[16px] text-[var(--text)] font-semibold resize-none placeholder:text-[var(--text)]/20"
          defaultValue={value}
        />
      ) : (
        <input 
          type={type} 
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-[16px] text-[var(--text)] font-semibold placeholder:text-[var(--text)]/20"
          defaultValue={value}
        />
      )}
    </div>
  );
};

// Komponen Toggle iOS/Grok Style
const GrokToggle = ({ label, defaultChecked = false }: any) => {
  const [isOn, setIsOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between py-3 cursor-pointer" onClick={() => setIsOn(!isOn)}>
      <span className="text-[15px] font-bold text-[var(--text)]">{label}</span>
      <div className={cn("w-12 h-7 rounded-full flex items-center p-1 transition-colors duration-300", isOn ? "bg-[var(--text)]" : "bg-[var(--text)]/20")}>
        <div className={cn("w-5 h-5 rounded-full bg-[var(--bg)] transition-transform duration-300 shadow-sm", isOn ? "translate-x-5" : "translate-x-0")} />
      </div>
    </div>
  );
};

export const TasksPage: React.FC<TasksPageProps> = ({ onClose }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg)] text-[var(--text)] font-sans absolute inset-0 z-[150]">
      
      {/* HEADER UTAMA YANG CLEAN */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between border-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="p-2 -ml-2 text-[var(--text)]/60 hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-full transition-all active:scale-90"
          >
            <ArrowLeft size={24} strokeWidth={2.2} />
          </button>
          <h1 className="text-[18px] font-bold text-[var(--text)] tracking-tight">Tasks</h1>
        </div>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="p-2 -mr-2 text-[var(--text)]/60 hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-full transition-all active:scale-90"
        >
          <Plus size={26} strokeWidth={2.2} />
        </button>
      </div>

      {/* EMPTY STATE */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 relative flex items-center justify-center">
          <AlarmClock size={56} className="text-[var(--text)]/80" strokeWidth={1.5} />
          <div className="absolute -bottom-1 -right-1 bg-[var(--bg)] rounded-full p-1 border-[3px] border-[var(--bg)]">
            <Plus size={16} className="text-[var(--text)]/80" strokeWidth={3} />
          </div>
        </div>
        
        <h2 className="text-[20px] font-bold tracking-tight mb-2 text-[var(--text)]">
          Get started by adding a task
        </h2>
        
        <p className="text-[var(--text)]/50 mb-8 max-w-[260px] text-[14px] leading-relaxed font-medium">
          Schedule a task to automate actions and get reminders when they complete.
        </p>
        
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[var(--text)] text-[var(--bg)] px-6 py-3.5 rounded-[20px] font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span className="text-[15px]">Create task</span>
        </button>
      </div>

      {/* POPUP BOTTOM SHEET (CREATE TASK) */}
      <AnimatePresence>
        {isCreateOpen && (
          <>
            {/* BACKDROP BLUR - Ditambahin transisi opacity biar gak ngagetin */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsCreateOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] transform-gpu"
            />
            
            {/* SHEET CONTENT - Ganti ke tween + ease iOS, tambah will-change-transform */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
              className="fixed bottom-0 left-0 right-0 max-h-[90dvh] bg-[var(--bg)] rounded-t-[32px] flex flex-col z-[210] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transform-gpu will-change-transform"
            >
              {/* Drag Indicator */}
              <div className="w-10 h-1.5 bg-[var(--text)]/15 rounded-full mx-auto mt-3 mb-2" />
              
              {/* Popup Header */}
              <div className="flex items-center justify-between px-4 pb-4">
                <button 
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 -ml-2 text-[var(--text)]/60 hover:text-[var(--text)] hover:bg-[var(--text)]/10 rounded-full transition-all active:scale-90"
                >
                  <X size={24} strokeWidth={2.2} />
                </button>
                <h2 className="text-[18px] font-bold text-[var(--text)] tracking-tight">Create Task</h2>
                <button 
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-[var(--text)]/10 hover:bg-[var(--text)]/20 text-[var(--text)] font-bold rounded-full text-[14px] transition-all active:scale-95"
                >
                  Save
                </button>
              </div>

              {/* Form Scrollable Area */}
              <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-3" style={{scrollbarWidth:'none'}}>
                
                <GrokInput label="Title" placeholder="e.g. Morning Briefing" />
                <GrokInput label="Frequency" value="Daily" />
                
                {/* Dummy Time - Pake type="time" asli biar gampang UI-nya, tapi didesain ala Grok */}
                <GrokInput label="Time" type="time" value="16:22" />
                
                <GrokInput label="Prompt" isTextArea={true} placeholder="Enter your prompt here..." />

                <div className="h-[1px] bg-[var(--text)]/10 w-full my-3" />

                <GrokToggle label="Push notifications" defaultChecked={true} />
                <GrokToggle label="Email notifications" defaultChecked={false} />
                
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
