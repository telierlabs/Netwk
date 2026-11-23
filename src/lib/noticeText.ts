// Teks kartu gagal chat (NoticeErrorCard) dan sampul Collaboration (GroupHero). Namespace: 'noticeUi'.
export const NOTICE_NS = 'noticeUi';

export const NOTICE_TEXT = {
  id: {
    offlineTitle: 'Connection Issue', offlineText: 'Koneksimu lagi putus. Sambungkan internet, lalu tekan Retry.',
    timeoutText: 'Koneksi terlalu lama merespons. Tekan Retry untuk kirim ulang.',
    serverTitle: 'Server AI Sedang Sibuk', serverText: 'Server AI sedang padat, bukan masalah internet kamu. Tekan Retry untuk kirim ulang.',
    emptyTitle: 'Jawaban Kosong', emptyText: 'AI tidak mengeluarkan jawaban kali ini. Tekan Retry untuk kirim ulang.',
    failedTitle: 'Pesan Gagal Diproses', failedText: 'Permintaan tidak bisa diproses. Tekan Retry untuk kirim ulang.',
    limitTitle: 'Limit Habis Sementara', limitText: 'AI lagi kebanyakan permintaan. Tunggu sekitar satu menit, lalu tekan Retry.',
    code: 'Kode', retry: 'Retry', coverAlt: 'Sampul Collaboration', photoAlt: 'Foto Collaboration', changePhoto: 'Ganti foto',
  },
  en: {
    offlineTitle: 'Connection Issue', offlineText: 'Your connection is down. Connect to the internet, then tap Retry.',
    timeoutText: 'The connection took too long to respond. Tap Retry to send again.',
    serverTitle: 'AI Server Is Busy', serverText: 'The AI server is busy, not a problem with your internet. Tap Retry to send again.',
    emptyTitle: 'Empty Response', emptyText: 'The AI gave no answer this time. Tap Retry to send again.',
    failedTitle: 'Message Failed to Process', failedText: 'The request could not be processed. Tap Retry to send again.',
    limitTitle: 'Limit Reached Temporarily', limitText: 'The AI is getting too many requests. Wait about a minute, then tap Retry.',
    code: 'Code', retry: 'Retry', coverAlt: 'Collaboration cover', photoAlt: 'Collaboration photo', changePhoto: 'Change photo',
  },
};
