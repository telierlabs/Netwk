export type Theme = 't-light' | 't-dark' | 't-cream' | 't-dusk' | 't-forest' | 't-slate';
export type Font = 'Modern' | 'Friendly' | 'Techy' | 'Minimal' | 'Bold' | 'Elegant' | 'Serif' | 'Literary' | 'Editorial' | 'Mono';
export type View = 'chat' | 'profile' | 'group-list' | 'group-chat' | 'saved';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: { title: string; url: string }[];
  image?: string;
  senderName?: string;
  senderAvatar?: string;
  aiModel?: string;
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
  language?: string; // untuk kode: 'typescript', 'javascript', dll
  timestamp: string; // format: "Sen 23 Mar 2026, 10:24"
  rawDate: number;   // Date.now() untuk sorting
  image?: string;    // untuk gambar
}
