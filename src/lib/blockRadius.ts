// Radius untuk "satu blok terpotong-potong" (gaya Grok / sidebar):
// potongan atas & bawah bulat besar, potongan tengah hampir persegi.
export const blockRadius = (i: number, n: number) =>
  n === 1 ? 'rounded-[28px]'
  : i === 0 ? 'rounded-t-[28px] rounded-b-[6px]'
  : i === n - 1 ? 'rounded-t-[6px] rounded-b-[28px]'
  : 'rounded-[6px]';
