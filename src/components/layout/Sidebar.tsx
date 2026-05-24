import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, User, Settings, Bookmark, Users, ChevronsRight, ChevronsLeft, MessageSquare, PenSquare, MoreHorizontal, Edit2, Pin, Trash2, SquarePen, Clock, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ChatSession } from '../../types';
import { useProfile } from '../../hooks/useProfile'; // <-- Hook sumber kebenaran

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  chatSessions: ChatSession[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  onViewProfile: () => void;
  onViewGroup: () => void;
  onViewSaved: () => void;
  onViewSearch: () => void;
  onNewChat: () => void;
  onViewTasks: () => void;
  onRenameChat?: (id: string, newTitle: string) => void;
  onPinChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
}

const formatSessionDate = (dateString?: string | Date | number) => {
  if (!dateString) return "BARU SAJA";
  if (typeof dateString === 'string') return dateString;
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? "BARU SAJA" : d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
};

const getSmartTitle = (session: any) => {
  if (!session) return "Cylen";
  if (session.title && session.title !== "New Chat" && session.title !== "Chat Baru" && session.title !== "New Conversation") return session.title;
  const firstUserMsg = session.messages?.find((m: any) => m.role === 'user')?.content;
  return firstUserMsg ? firstUserMsg.split(' ').slice(0, 4).join(' ') : (session.title || "Chat Baru");
};

const SidebarContent: React.FC<any> = ({
  collapsed, chatSessions, activeChatId, profile,
  onSelectChat, onViewProfile, onViewGroup, onViewSaved, onViewSearch, onNewChat,
  onToggleCollapse, onRequestRename, onPinChat, onRequestDelete, onViewTasks
}) => {
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = chatSessions
    .filter(s => (getSmartTitle(s) || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => ((b as any).isPinned ? 1 : 0) - ((a as any).isPinned ? 1 : 0));

  return (
    <div className="flex flex-col h-full relative bg-transparent">
      {/* HEADER SIDEBAR */}
      <div className={cn("flex items-center px-3 py-4 gap-2", collapsed ? "justify-center flex-col" : "justify-between")}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[var(--ac)] rounded-xl flex items-center justify-center"><span className="text-[var(--at)] font-bold">C</span></div>
          {!collapsed && <span className="font-bold text-[15px] text-[var(--text)]">Cylen AI</span>}
        </div>
        <button onClick={onToggleCollapse} className="p-1.5 rounded-lg text-[var(--mu)] hover:bg-[var(--text)]/10">{collapsed ? <ChevronsRight size={18}/> : <ChevronsLeft size={18}/>}</button>
      </div>

      <div className="px-3 mb-2"><button onClick={onNewChat} className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 bg-[var(--ac)] text-[var(--at)] rounded-xl transition-all", collapsed && "justify-center px-2")}><PenSquare size={16}/></button></div>

      <div className="px-2 flex flex-col gap-0.5">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--sf)]" onClick={onViewSearch}><Search size={16}/>{!collapsed && <span>Cari</span>}</button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--sf)]" onClick={onViewTasks}><Clock size={16}/>{!collapsed && <span>Tasks</span>}</button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--sf)]" onClick={onViewGroup}><Users size={16}/>{!collapsed && <span>Grup AI</span>}</button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1 min-h-0 pb-4 mt-4">
        <div className="text-[10px] font-bold uppercase text-[var(--mu)] px-1">Riwayat</div>
        {filtered.map((session) => (
          <div key={session.id} className="relative group">
            <button onClick={() => onSelectChat(session.id)} className={cn("w-full px-3 py-2.5 rounded-xl text-left", activeChatId === session.id ? "bg-[var(--sf)]" : "hover:bg-[var(--sf)]")}>
               <p className="text-[13px] font-bold truncate">{getSmartTitle(session)}</p>
               <p className="text-[10px] text-[var(--mu)]">{formatSessionDate(session.date)}</p>
            </button>
            <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === session.id ? null : session.id); }} className="absolute right-2 top-2 p-1.5 hover:bg-[var(--text)]/10 rounded-lg"><MoreHorizontal size={14} /></button>
          </div>
        ))}
      </div>

      {/* FOOTER PROFIL - Langsung Pake profile.name & profile.avatar */}
      <div className="px-3 pb-4 pt-2 border-t border-[var(--bd)]/50">
        <button onClick={onViewProfile} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bd)]">
          <div className="w-8 h-8 rounded-full bg-[var(--ac)] flex items-center justify-center overflow-hidden">
            {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : <User size={15} className="text-[var(--at)]"/>}
          </div>
          {!collapsed && <div className="text-[13px] font-bold truncate">{profile.name}</div>}
        </button>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = (props) => {
  const { profile } = useProfile(); // Panggil hook di sini
  const [collapsed, setCollapsed] = useState(false);
  
  return (
    <aside className="hidden md:flex flex-col border-r border-[var(--text)]/10 bg-[var(--bg)]/40 backdrop-blur-2xl transition-all" style={{ width: collapsed ? 64 : 280 }}>
      <SidebarContent {...props} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} profile={profile} />
    </aside>
  );
};
