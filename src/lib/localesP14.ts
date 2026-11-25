// Terjemahan statis tambahan namespace 'appUi' (kartu promo desktop).
const KEYS = ["promoTitle", "promoSub", "promoCta", "promoAria", "close"];
const mk = (arr: string[]) => {
  if (arr.length !== KEYS.length) throw new Error('appUi3 locale length ' + arr.length);
  const o: Record<string, string> = {};
  KEYS.forEach((k, i) => { o[k] = arr[i]; });
  return { appUi: o };
};

export const P14: Record<string, Record<string, any>> = {
  "ms": mk(["Cuba Cylen Pro", "Buka keupayaan yang lebih luas", "Lihat pelan", "Tawaran Cylen Pro", "Tutup"]),
  "es": mk(["Prueba Cylen Pro", "Desbloquea más capacidades", "Ver planes", "Oferta de Cylen Pro", "Cerrar"]),
  "pt": mk(["Experimente o Cylen Pro", "Desbloqueie mais recursos", "Ver planos", "Oferta do Cylen Pro", "Fechar"]),
  "fr": mk(["Essayez Cylen Pro", "Débloquez plus de possibilités", "Voir les forfaits", "Offre Cylen Pro", "Fermer"]),
  "de": mk(["Cylen Pro testen", "Schalte mehr Möglichkeiten frei", "Tarife ansehen", "Cylen-Pro-Angebot", "Schließen"]),
  "ja": mk(["Cylen Pro を試す", "より多くの機能を解放", "プランを見る", "Cylen Pro のご案内", "閉じる"]),
  "ko": mk(["Cylen Pro 체험하기", "더 넓은 기능을 열어보세요", "요금제 보기", "Cylen Pro 혜택", "닫기"]),
  "zh-CN": mk(["试试 Cylen Pro", "解锁更多功能", "查看套餐", "Cylen Pro 优惠", "关闭"]),
  "ar": mk(["جرّب Cylen Pro", "افتح قدرات أوسع", "عرض الباقات", "عرض Cylen Pro", "إغلاق"]),
  "ru": mk(["Попробуйте Cylen Pro", "Откройте больше возможностей", "Смотреть тарифы", "Предложение Cylen Pro", "Закрыть"]),
  "hi": mk(["Cylen Pro आज़माएँ", "और ज़्यादा क्षमताएँ खोलें", "प्लान देखें", "Cylen Pro ऑफ़र", "बंद करें"]),
  "tr": mk(["Cylen Pro’yu dene", "Daha geniş yeteneklerin kilidini aç", "Paketleri gör", "Cylen Pro teklifi", "Kapat"]),
  "vi": mk(["Dùng thử Cylen Pro", "Mở khóa nhiều khả năng hơn", "Xem các gói", "Ưu đãi Cylen Pro", "Đóng"]),
  "th": mk(["ลอง Cylen Pro", "ปลดล็อกความสามารถที่มากขึ้น", "ดูแพ็กเกจ", "ข้อเสนอ Cylen Pro", "ปิด"]),
  "it": mk(["Prova Cylen Pro", "Sblocca più funzionalità", "Vedi i piani", "Offerta Cylen Pro", "Chiudi"]),
  "nl": mk(["Probeer Cylen Pro", "Ontgrendel meer mogelijkheden", "Bekijk abonnementen", "Aanbieding Cylen Pro", "Sluiten"]),
  "pl": mk(["Wypróbuj Cylen Pro", "Odblokuj więcej możliwości", "Zobacz plany", "Oferta Cylen Pro", "Zamknij"]),
  "uk": mk(["Спробуйте Cylen Pro", "Відкрийте більше можливостей", "Переглянути тарифи", "Пропозиція Cylen Pro", "Закрити"]),
  "jv": mk(["Cobanen Cylen Pro", "Bukak kemampuan sing luwih jembar", "Deleng paket", "Tawaran Cylen Pro", "Tutup"]),
  "su": mk(["Cobian Cylen Pro", "Buka kamampuh nu leuwih lega", "Tingali paket", "Tawaran Cylen Pro", "Tutup"]),
  "fil": mk(["Subukan ang Cylen Pro", "I-unlock ang mas malawak na kakayahan", "Tingnan ang mga plano", "Alok ng Cylen Pro", "Isara"]),
  "zh-TW": mk(["試試 Cylen Pro", "解鎖更多功能", "查看方案", "Cylen Pro 優惠", "關閉"]),
  "bn": mk(["Cylen Pro ব্যবহার করে দেখুন", "আরও বেশি সক্ষমতা আনলক করুন", "প্ল্যান দেখুন", "Cylen Pro অফার", "বন্ধ করুন"]),
  "ur": mk(["Cylen Pro آزمائیں", "مزید صلاحیتیں کھولیں", "پلانز دیکھیں", "Cylen Pro آفر", "بند کریں"]),
  "fa": mk(["Cylen Pro را امتحان کنید", "قابلیت‌های بیشتری را باز کنید", "مشاهده طرح‌ها", "پیشنهاد Cylen Pro", "بستن"]),
  "he": mk(["נסו את Cylen Pro", "פתחו יכולות רחבות יותר", "צפייה בתוכניות", "ההצעה של Cylen Pro", "סגירה"]),
  "ta": mk(["Cylen Pro-வை முயலுங்கள்", "பரந்த திறன்களைத் திறங்கள்", "திட்டங்களைப் பார்", "Cylen Pro சலுகை", "மூடு"]),
  "te": mk(["Cylen Pro ప్రయత్నించండి", "మరిన్ని సామర్థ్యాలను అన్‌లాక్ చేయండి", "ప్లాన్‌లను చూడండి", "Cylen Pro ఆఫర్", "మూసివేయి"]),
  "mr": mk(["Cylen Pro वापरून पहा", "अधिक क्षमता अनलॉक करा", "प्लॅन पहा", "Cylen Pro ऑफर", "बंद करा"]),
  "ca": mk(["Prova Cylen Pro", "Desbloqueja més capacitats", "Veure els plans", "Oferta de Cylen Pro", "Tanca"]),
  "sv": mk(["Prova Cylen Pro", "Lås upp fler möjligheter", "Se planer", "Erbjudande från Cylen Pro", "Stäng"]),
  "no": mk(["Prøv Cylen Pro", "Lås opp flere muligheter", "Se planer", "Tilbud fra Cylen Pro", "Lukk"]),
  "da": mk(["Prøv Cylen Pro", "Lås op for flere muligheder", "Se planer", "Tilbud fra Cylen Pro", "Luk"]),
  "fi": mk(["Kokeile Cylen Prota", "Avaa laajemmat ominaisuudet", "Katso paketit", "Cylen Pro -tarjous", "Sulje"]),
};
