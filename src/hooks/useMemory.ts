import { useState } from 'react';
import { MemoryItem } from '../types';

export function useMemory() {
  // Data dummy buat ngetes biar halamannya ga kosong melompong pas pertama dibuka
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([
    {
      id: '1',
      text: 'Kamu lebih suka dipanggil dengan nama bos.',
      timestamp: 'Sen 24 Mar 2026, 14:20',
      rawDate: Date.now() - 86400000
    },
    {
      id: '2',
      text: 'Kamu sedang membangun startup Cylen AI sendirian menggunakan React dan TypeScript.',
      timestamp: 'Sel 25 Mar 2026, 09:15',
      rawDate: Date.now()
    }
  ]);

  const addMemory = (text: string) => {
    const now = new Date();
    const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const timestamp = `${DAYS[now.getDay()]} ${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setMemoryItems(prev => [{ id: Date.now().toString(), text, timestamp, rawDate: now.getTime() }, ...prev]);
  };

  const deleteMemory = (id: string) => {
    setMemoryItems(prev => prev.filter(item => item.id !== id));
  };

  return { memoryItems, addMemory, deleteMemory };
}
