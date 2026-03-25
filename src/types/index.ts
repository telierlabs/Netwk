export type Theme = 't-light' | 't-dark' | 't-cream' | 't-dusk' | 't-forest' | 't-slate';
export type Font = 'Modern' | 'Friendly' | 'Techy' | 'Minimal' | 'Bold' | 'Elegant' | 'Serif' | 'Literary' | 'Editorial' | 'Mono';
export type View = 'chat' | 'profile' | 'group-list' | 'group-chat' | 'saved' | 'search';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: { title: string; url: string }[];
  image?: string;
  images?: string[];
  senderName?: string;
  senderAvatar?: string;
  aiModel?: string;
  suggestions?: string[];
  pinned?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  date: string;
}

export interface GroupParticipant {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isAI: boolean;
  model?: string;
}

export interface GroupSession {
  id: string;
  title: string;
  participants: GroupParticipant[];
  messages: Message[];
  date: string;
}

export interface ThemeConfig {
  id: Theme;
  name: string;
  bg: string;
  accent: string;
}

export interface FontConfig {
  id: Font;
  name: string;
  family: string;
  sub: string;
}

export type SavedItemType = 'teks' | 'kode' | 'gambar' | 'video' | 'dokumen';

export interface SavedItem {
  id: string;
  type: SavedItemType;
  title: string;
  preview: string;
  content: string;
  language?: string;
  timestamp: string;
  rawDate: number;
  image?: string;
}

export interface MemoryItem {
  id: string;
  text: string;
  timestamp: string;
  rawDate: number;
}
