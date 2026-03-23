import { useState } from 'react';
import { SavedItem, SavedItemType } from '../types';

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatSavedTimestamp(date = new Date()): string {
  const d = DAYS[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const mon = MONTHS[date.getMonth()];
  const yr = date.getFullYear();
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${day} ${mon} ${yr}, ${h}:${m}`;
}

export function useSaved() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);

  const saveItem = (item: Omit<SavedItem, 'id' | 'timestamp' | 'rawDate'>) => {
    const now = new Date();
    const newItem: SavedItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: formatSavedTimestamp(now),
      rawDate: now.getTime(),
    };
    setSavedItems(prev => [newItem, ...prev]);
  };

  const deleteItem = (id: string) => {
    setSavedItems(prev => prev.filter(item => item.id !== id));
  };

  return { savedItems, saveItem, deleteItem };
}
