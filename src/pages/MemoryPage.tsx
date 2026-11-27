import React from 'react';
import { MemoryItem } from '../types';
import { Trash2 } from 'lucide-react';
import { usePageText } from '../lib/i18n';

const TEXT = {
  id: {
    title: 'Memori',
    desc: 'Hal-hal yang Cylen ingat dari obrolanmu. Hapus kapan saja.',
    saved: 'Tersimpan',
    loading: 'Memuat memori...',
    empty: 'Belum ada memori. Cylen akan mencatatnya saat kamu ngobrol.',
    del: 'Hapus',
  },
  en: {
    title: 'Memory',
    desc: 'Things Cylen remembers from your chats. Delete any of them anytime.',
    saved: 'Saved',
    loading: 'Loading memories...',
    empty: 'No memories yet. Cylen will note them as you chat.',
    del: 'Delete',
  },
};

interface MemoryPageProps {
  memoryItems: MemoryItem[];
  onDelete: (id: string) => void;
  loading?: boolean;
  onBack?: () => void; // dikirim App.tsx, header bawaan yang mengurus tombol kembali
}

// Sama dengan blok menu di Pengaturan
const blockRadius = (i: number, n: number) =>
  n === 1 ? 'rounded-[28px]'
  : i === 0 ? 'rounded-t-[28px] rounded-b-[6px]'
  : i === n - 1 ? 'rounded-t-[6px] rounded-b-[28px]'
  : 'rounded-[6px]';

export const MemoryPage: React.FC<MemoryPageProps> = ({ memoryItems, onDelete, loading = false }) => {
  const tx = usePageText('memory', TEXT);
  const n = memoryItems.length;

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg)] overflow-hidden" style={{ minHeight: 0 }}>
      <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none', overscrollBehavior: 'contain' }}>
        <div className="max-w-2xl mx-auto pt-2">

          <div className="px-6">
            <h2 className="text-[28px] font-semibold tracking-tight text-[var(--text)]">{tx.title}</h2>
            <p className="text-[15px] text-[var(--mu)] mt-1 leading-relaxed">{tx.desc}</p>
          </div>

          <div className="px-6 mt-7 mb-2 flex items-center justify-between text-[16px] font-medium text-[var(--mu)]">
            <span>{tx.saved}</span>
            <span>{loading ? '…' : n}</span>
          </div>

          {loading || n === 0 ? (
            <div className="mx-3 rounded-[28px] bg-[var(--sf)] px-5 py-8 text-center text-[15px] text-[var(--mu)]">
              {loading ? tx.loading : tx.empty}
            </div>
          ) : (
            <div className="mx-3 flex flex-col gap-[2px]">
              {memoryItems.map((item, i) => (
                <div key={item.id} className={`flex items-start gap-3 bg-[var(--sf)] pl-5 pr-3 py-4 ${blockRadius(i, n)}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] leading-snug text-[var(--text)]">{item.text}</p>
                    <span className="block mt-1.5 text-[13px] text-[var(--mu)]">{item.timestamp}</span>
                  </div>
                  <button
                    onClick={() => onDelete(item.id)}
                    aria-label={tx.del}
                    title={tx.del}
                    className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-[var(--mu)] active:bg-[var(--ib)] active:text-red-500 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
