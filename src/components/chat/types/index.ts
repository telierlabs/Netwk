// ─────────────────────────────────────────────
// TYPES — src/components/chat/types/index.ts
// ─────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  senderName?: string;
  pinned?: boolean;
  image?: string;
  images?: string[];
  pdfs?: { name: string }[];
  isAutoReminder?: boolean;
  quotedText?: string;
}

export interface ChatBubbleProps {
  msg: Message;
  msgIndex: number;
  isLast?: boolean;
  onResend?: (content: string) => void;
  onEdit?: (content: string) => void;
  onSuggest?: (text: string) => void;
  onTogglePin?: (index: number) => void;
  onSaveItem?: (item: any) => void;
  onRegenerate?: (index: number) => void;
  onSwipeToReply?: (msg: Message) => void;
  suggestions?: string[];
  isStreaming?: boolean;
  activityStatus?: ActivityStatus;
}

export type ActivityStatus = 'idle' | 'image' | 'pdf' | 'docs' | 'excel' | 'ppt' | 'ebook';

// ── Diagram Types ──
export interface MindmapBranch { label: string; children: string[]; }
export interface MindmapData { title: string; center: string; branches: MindmapBranch[]; num?: string; }

export interface FlowNode { id: string; label: string; sub?: string; role?: 'start' | 'end'; }
export interface FlowRow { nodes: FlowNode[]; }
export interface FlowData { title: string; rows: FlowRow[]; num?: string; }

export interface TimelineItem { phase: string; title: string; tags: string[]; empty?: boolean; }
export interface TimelineData { title: string; items: TimelineItem[]; num?: string; }

export interface RadialRing { label: string; items: string[]; }
export interface RadialData { title: string; center: string; rings: RadialRing[]; num?: string; }

export interface CompareCol { label: string; items: string[]; }
export interface CompareData { title: string; columns: CompareCol[]; num?: string; }

export interface CycleData { title: string; steps: { label: string; sub?: string }[]; num?: string; }

export interface DiagramWrapperProps { title: string; children: React.ReactNode; }
export interface DiagramLightboxProps {
  open: boolean;
  title: string;
  contentEl: HTMLElement | null;
  onClose: () => void;
}
