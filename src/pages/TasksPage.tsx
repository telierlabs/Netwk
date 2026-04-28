import React from 'react';
import { X, Plus, AlarmClock } from 'lucide-react';

interface TasksPageProps {
  onClose: () => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ onClose }) => {
  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg)] text-[var(--text)] font-sans absolute inset-0 z-[200]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--bd)] border-opacity-30">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-[var(--sf)] rounded-full transition-colors active:scale-95">
            <X className="w-6 h-6 text-[var(--text)]" />
          </button>
          <h1 className="text-[20px] font-bold text-[var(--text)]">Tasks</h1>
        </div>
        <button className="p-2 hover:bg-[var(--sf)] rounded-full transition-colors active:scale-95">
          <Plus className="w-6 h-6 text-[var(--text)]" />
        </button>
      </div>

      {/* Empty State Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 relative flex items-center justify-center">
          <AlarmClock className="w-12 h-12 text-[var(--text)]" strokeWidth={1.5} />
          {/* Icon plus kecil di pojok bawah */}
          <div className="absolute -bottom-1 -right-1 bg-[var(--bg)] rounded-full p-0.5">
            <Plus className="w-4 h-4 text-[var(--text)]" strokeWidth={3} />
          </div>
        </div>
        
        <h2 className="text-xl font-bold mb-2 text-[var(--text)]">Get started by adding a task</h2>
        
        <p className="text-[var(--mu)] mb-8 max-w-sm text-[15px] leading-relaxed">
          Schedule a task to automate actions and get reminders when they complete.
        </p>
        
        <button className="flex items-center gap-2 bg-[var(--text)] text-[var(--bg)] px-6 py-3 rounded-full font-bold hover:opacity-80 transition-colors active:scale-95">
          <Plus className="w-5 h-5" strokeWidth={2.5} />
          Create task
        </button>
      </div>
    </div>
  );
};
