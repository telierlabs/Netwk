// ─────────────────────────────────────────────
// DAFTAR SUARA — 30 suara bawaan Gemini TTS (nama = voiceName di API Gemini)
// Pilihan user disimpan di profile.voice → pakai sebagai:
//   speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: profile.voice } } }
// ─────────────────────────────────────────────
export interface VoiceInfo {
  id: string;   // dipakai langsung sebagai voiceName
  en: string;   // karakter suara (dari dokumentasi Gemini)
  idn: string;  // deskripsi bahasa Indonesia
}

export const DEFAULT_VOICE = 'Zephyr';

export const VOICES: VoiceInfo[] = [
  { id: 'Zephyr', en: 'Bright', idn: 'Cerah dan segar.' },
  { id: 'Puck', en: 'Upbeat', idn: 'Ceria dan penuh semangat.' },
  { id: 'Charon', en: 'Informative', idn: 'Informatif dan tenang.' },
  { id: 'Kore', en: 'Firm', idn: 'Tegas dan percaya diri.' },
  { id: 'Fenrir', en: 'Excitable', idn: 'Antusias dan ekspresif.' },
  { id: 'Leda', en: 'Youthful', idn: 'Muda dan bersemangat.' },
  { id: 'Orus', en: 'Firm', idn: 'Tegas dan mantap.' },
  { id: 'Aoede', en: 'Breezy', idn: 'Santai dan ringan.' },
  { id: 'Callirrhoe', en: 'Easy-going', idn: 'Santai dan enak didengar.' },
  { id: 'Autonoe', en: 'Bright', idn: 'Cerah dan hangat.' },
  { id: 'Enceladus', en: 'Breathy', idn: 'Lembut dan berbisik.' },
  { id: 'Iapetus', en: 'Clear', idn: 'Jernih dan lugas.' },
  { id: 'Umbriel', en: 'Easy-going', idn: 'Santai dan bersahabat.' },
  { id: 'Algieba', en: 'Smooth', idn: 'Halus dan mengalir.' },
  { id: 'Despina', en: 'Smooth', idn: 'Halus dan menenangkan.' },
  { id: 'Erinome', en: 'Clear', idn: 'Jernih dan rapi.' },
  { id: 'Algenib', en: 'Gravelly', idn: 'Berat dan sedikit serak.' },
  { id: 'Rasalgethi', en: 'Informative', idn: 'Informatif dan jelas.' },
  { id: 'Laomedeia', en: 'Upbeat', idn: 'Ceria dan dinamis.' },
  { id: 'Achernar', en: 'Soft', idn: 'Lembut dan pelan.' },
  { id: 'Alnilam', en: 'Firm', idn: 'Tegas dan stabil.' },
  { id: 'Schedar', en: 'Even', idn: 'Stabil dan seimbang.' },
  { id: 'Gacrux', en: 'Mature', idn: 'Dewasa dan matang.' },
  { id: 'Pulcherrima', en: 'Forward', idn: 'Lugas dan percaya diri.' },
  { id: 'Achird', en: 'Friendly', idn: 'Ramah dan akrab.' },
  { id: 'Zubenelgenubi', en: 'Casual', idn: 'Kasual dan santai.' },
  { id: 'Vindemiatrix', en: 'Gentle', idn: 'Lembut dan sabar.' },
  { id: 'Sadachbia', en: 'Lively', idn: 'Hidup dan penuh energi.' },
  { id: 'Sadaltager', en: 'Knowledgeable', idn: 'Berwawasan dan meyakinkan.' },
  { id: 'Sulafat', en: 'Warm', idn: 'Hangat dan bersahabat.' },
];

export const getVoice = (id?: string) => VOICES.find((v) => v.id === id) || VOICES[0];
