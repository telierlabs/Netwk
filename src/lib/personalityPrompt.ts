// Pembuat instruksi kepribadian (dipindah dari pages/AiSettings.tsx supaya bisa dipakai lib/promptBridge.ts tanpa import melingkar).
// AiSettings.tsx tetap meng-export ulang, jadi import lama ke file itu tetap jalan.

export interface PersonalitySettings {
  tone: string;
  warmth: number;
  formality: number;
  enthusiasm: number;
  length: number;
  customPrompt: string;
}

// ── Helper: Bangun personality prompt dari settings (TIDAK diubah, dipakai file lain) ──
export function buildPersonalityPrompt(settings: PersonalitySettings): string {
  const parts: string[] = [];

  const toneMap: Record<string, string> = {
    'Default':      '',
    'Profesional':  'Gunakan nada yang sangat profesional, terstruktur, dan presisi. Hindari bahasa informal.',
    'Ramah':        'Gunakan nada yang sangat ramah, hangat, dan bersahabat seperti teman dekat.',
    'Jujur':        'Selalu jujur dan lugas — sampaikan pendapat apa adanya tanpa basa-basi, tapi tetap sopan.',
    'Nyentrik':     'Tambahkan sentuhan humor segar, analogi unik, dan gaya bahasa yang tidak biasa — tetap informatif.',
    'Efisien':      'Jawab sesingkat dan sepadat mungkin. Tidak perlu basa-basi. Langsung ke inti.',
    'Sinis':        'Gunakan nada sedikit sinis dan kritis, tapi tetap helpful dan tidak menyakiti.',
  };
  if (settings.tone !== 'Default' && toneMap[settings.tone]) parts.push(`**Nada Dasar:** ${toneMap[settings.tone]}`);

  const warmthMap: Record<number, string> = {
    1: 'Bersikap netral dan tidak terlalu hangat — lebih ke fakta dan efisiensi.', 2: '', 3: 'Tunjukkan empati yang dalam, gunakan kata-kata yang menyentuh dan peduli.',
  };
  if (warmthMap[settings.warmth]) parts.push(`**Kehangatan:** ${warmthMap[settings.warmth]}`);

  const formalityMap: Record<number, string> = {
    1: 'Gunakan bahasa gaul dan santai — boleh pakai singkatan, slang Indonesia yang relevan.', 2: '', 3: 'Gunakan bahasa Indonesia yang baku dan formal sesuai KBBI.',
  };
  if (formalityMap[settings.formality]) parts.push(`**Gaya Bahasa:** ${formalityMap[settings.formality]}`);

  const enthusiasmMap: Record<number, string> = {
    1: 'Respons dengan tenang dan datar — minim emoji, minim ekspresi berlebihan.', 2: '', 3: 'Tunjukkan antusiasme tinggi! Gunakan emoji secara ekspresif dan energik.',
  };
  if (enthusiasmMap[settings.enthusiasm]) parts.push(`**Antusiasme:** ${enthusiasmMap[settings.enthusiasm]}`);

  const lengthMap: Record<number, string> = {
    1: 'Selalu jawab sesingkat mungkin — maksimal 3-4 kalimat kecuali ada kebutuhan teknis.', 2: '', 3: 'Berikan jawaban yang sangat lengkap dan detail — jangan ragu untuk panjang.',
  };
  if (lengthMap[settings.length]) parts.push(`**Panjang Jawaban:** ${lengthMap[settings.length]}`);

  if (settings.customPrompt.trim()) parts.push(`**Instruksi Tambahan dari User:** ${settings.customPrompt.trim()}`);

  return parts.join('\n\n');
}
