// Bahasa tulis kanan-ke-kiri (ar, he, fa, ur): HANYA arah tulisan yang berubah.
// Tata letak (tombol, ikon, menu, posisi) tetap sama seperti bahasa lain, tidak dicerminkan.
const TEXT_RTL_CSS = `
html[data-text-rtl] :is(p, h1, h2, h3, h4, textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="range"])) {
  direction: rtl;
  unicode-bidi: plaintext;
}
`;

export function applyRtlStyles(on: boolean) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // Tata letak selalu kiri-ke-kanan
  root.dir = 'ltr';
  const id = 'cylen-text-rtl';
  const old = document.getElementById(id);
  if (!on) {
    root.removeAttribute('data-text-rtl');
    old?.remove();
    return;
  }
  root.setAttribute('data-text-rtl', '1');
  if (old) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = TEXT_RTL_CSS;
  document.head.appendChild(el);
}
