import { useState, useEffect } from 'react';
import { MemoryItem } from '../types';

export function useMemory() {
  // 1. Inisialisasi: Cek localStorage, kalau kosong baru bikin array kosong [] (Bye dummy data!)
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>(() => {
    const saved = localStorage.getItem('cylen_memory_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Gagal load memory:", e);
      }
    }
    return []; // Bersih total pas pertama kali buka
  });

  // 2. Auto-Save: Tiap kali memoryItems berubah, langsung simpen ke HP/Browser
  useEffect(() => {
    localStorage.setItem('cylen_memory_items', JSON.stringify(memoryItems));
  }, [memoryItems]);

  const addMemory = (text: string) => {
    const now = new Date();
    const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const timestamp = `${DAYS[now.getDay()]} ${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]} ${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setMemoryItems(prev => [{ id: `mem-${Date.now()}`, text, timestamp, rawDate: now.getTime() }, ...prev]);
  };

  const deleteMemory = (id: string) => {
    setMemoryItems(prev => prev.filter(item => item.id !== id));
  };

  const clearMemory = () => {
    setMemoryItems([]);
    localStorage.removeItem('cylen_memory_items');
  };

  return { memoryItems, addMemory, deleteMemory, clearMemory };
}
