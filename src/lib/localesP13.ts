// Terjemahan statis tambahan namespace 'appUi' (sidebar & tooltip desktop).
const KEYS = ["startChat", "expand", "collapse", "exitGhost", "ghostMode", "newName", "aiDiscussion", "profileSettings"];
const mk = (arr: string[]) => {
  if (arr.length !== KEYS.length) throw new Error('appUi2 locale length ' + arr.length);
  const o: Record<string, string> = {};
  KEYS.forEach((k, i) => { o[k] = arr[i]; });
  return { appUi: o };
};

export const P13: Record<string, Record<string, any>> = {
  "ms": mk(["Memulakan sembang...", "Kembangkan", "Kuncupkan", "Keluar Mod Hantu", "Mod Hantu", "Nama baharu:", "Perbincangan AI", "Profil & Tetapan"]),
  "es": mk(["Iniciando chat...", "Expandir", "Contraer", "Salir del modo fantasma", "Modo fantasma", "Nuevo nombre:", "Debate con IA", "Perfil y ajustes"]),
  "pt": mk(["Iniciando chat...", "Expandir", "Recolher", "Sair do modo fantasma", "Modo fantasma", "Novo nome:", "Discussão com IA", "Perfil e configurações"]),
  "fr": mk(["Démarrage de la discussion...", "Développer", "Réduire", "Quitter le mode fantôme", "Mode fantôme", "Nouveau nom :", "Discussion IA", "Profil et paramètres"]),
  "de": mk(["Chat wird gestartet...", "Erweitern", "Einklappen", "Geistermodus beenden", "Geistermodus", "Neuer Name:", "KI-Diskussion", "Profil & Einstellungen"]),
  "ja": mk(["チャットを開始中...", "展開", "折りたたむ", "ゴーストモードを終了", "ゴーストモード", "新しい名前：", "AI ディスカッション", "プロフィールと設定"]),
  "ko": mk(["채팅 시작 중...", "펼치기", "접기", "고스트 모드 종료", "고스트 모드", "새 이름:", "AI 토론", "프로필 및 설정"]),
  "zh-CN": mk(["正在开始聊天...", "展开", "收起", "退出幽灵模式", "幽灵模式", "新名称：", "AI 讨论", "个人资料和设置"]),
  "ar": mk(["جارٍ بدء المحادثة...", "توسيع", "طي", "الخروج من وضع الشبح", "وضع الشبح", "الاسم الجديد:", "نقاش مع الذكاء الاصطناعي", "الملف الشخصي والإعدادات"]),
  "ru": mk(["Начинаем чат...", "Развернуть", "Свернуть", "Выйти из режима призрака", "Режим призрака", "Новое имя:", "Обсуждение с ИИ", "Профиль и настройки"]),
  "hi": mk(["चैट शुरू हो रही है...", "बड़ा करें", "छोटा करें", "घोस्ट मोड से बाहर निकलें", "घोस्ट मोड", "नया नाम:", "AI चर्चा", "प्रोफ़ाइल और सेटिंग"]),
  "tr": mk(["Sohbet başlatılıyor...", "Genişlet", "Daralt", "Hayalet modundan çık", "Hayalet modu", "Yeni ad:", "Yapay zekâ tartışması", "Profil ve ayarlar"]),
  "vi": mk(["Đang bắt đầu trò chuyện...", "Mở rộng", "Thu gọn", "Thoát chế độ ma", "Chế độ ma", "Tên mới:", "Thảo luận với AI", "Hồ sơ & cài đặt"]),
  "th": mk(["กำลังเริ่มแชต...", "ขยาย", "ย่อ", "ออกจากโหมดผี", "โหมดผี", "ชื่อใหม่:", "สนทนากับ AI", "โปรไฟล์และการตั้งค่า"]),
  "it": mk(["Avvio della chat...", "Espandi", "Comprimi", "Esci dalla modalità fantasma", "Modalità fantasma", "Nuovo nome:", "Discussione con l’IA", "Profilo e impostazioni"]),
  "nl": mk(["Chat starten...", "Uitklappen", "Inklappen", "Spookmodus verlaten", "Spookmodus", "Nieuwe naam:", "AI-discussie", "Profiel en instellingen"]),
  "pl": mk(["Rozpoczynanie czatu...", "Rozwiń", "Zwiń", "Wyjdź z trybu ducha", "Tryb ducha", "Nowa nazwa:", "Dyskusja z AI", "Profil i ustawienia"]),
  "uk": mk(["Починаємо чат...", "Розгорнути", "Згорнути", "Вийти з режиму привида", "Режим привида", "Нова назва:", "Обговорення зі ШІ", "Профіль і налаштування"]),
  "jv": mk(["Miwiti obrolan...", "Jembarake", "Ciutake", "Metu saka Mode Hantu", "Mode Hantu", "Jeneng anyar:", "Diskusi AI", "Profil & Pangaturan"]),
  "su": mk(["Ngamimitian obrolan...", "Legakeun", "Ciutkeun", "Kaluar tina Mode Hantu", "Mode Hantu", "Ngaran anyar:", "Diskusi AI", "Profil & Setélan"]),
  "fil": mk(["Sinisimulan ang chat...", "Palawakin", "Paliitin", "Lumabas sa Ghost Mode", "Ghost Mode", "Bagong pangalan:", "Talakayan sa AI", "Profile at mga setting"]),
  "zh-TW": mk(["正在開始聊天...", "展開", "收合", "退出幽靈模式", "幽靈模式", "新名稱：", "AI 討論", "個人檔案與設定"]),
  "bn": mk(["চ্যাট শুরু হচ্ছে...", "বড় করুন", "ছোট করুন", "ঘোস্ট মোড থেকে বের হন", "ঘোস্ট মোড", "নতুন নাম:", "AI আলোচনা", "প্রোফাইল ও সেটিংস"]),
  "ur": mk(["چیٹ شروع ہو رہی ہے...", "پھیلائیں", "سمیٹیں", "گھوسٹ موڈ سے باہر نکلیں", "گھوسٹ موڈ", "نیا نام:", "AI گفتگو", "پروفائل اور ترتیبات"]),
  "fa": mk(["در حال شروع گفتگو...", "باز کردن", "بستن", "خروج از حالت روح", "حالت روح", "نام جدید:", "گفتگو با هوش مصنوعی", "نمایه و تنظیمات"]),
  "he": mk(["מתחיל צ׳אט...", "הרחבה", "כיווץ", "יציאה ממצב רוח רפאים", "מצב רוח רפאים", "שם חדש:", "דיון עם AI", "פרופיל והגדרות"]),
  "ta": mk(["அரட்டை தொடங்குகிறது...", "விரிவாக்கு", "சுருக்கு", "கோஸ்ட் பயன்முறையிலிருந்து வெளியேறு", "கோஸ்ட் பயன்முறை", "புதிய பெயர்:", "AI விவாதம்", "சுயவிவரம் & அமைப்புகள்"]),
  "te": mk(["చాట్ ప్రారంభమవుతోంది...", "విస్తరించు", "కుదించు", "ఘోస్ట్ మోడ్ నుండి బయటకు", "ఘోస్ట్ మోడ్", "కొత్త పేరు:", "AI చర్చ", "ప్రొఫైల్ & సెట్టింగ్‌లు"]),
  "mr": mk(["चॅट सुरू होत आहे...", "विस्तृत करा", "आकुंचन करा", "घोस्ट मोडमधून बाहेर पडा", "घोस्ट मोड", "नवीन नाव:", "AI चर्चा", "प्रोफाइल आणि सेटिंग्ज"]),
  "ca": mk(["Iniciant xat...", "Amplia", "Redueix", "Surt del mode fantasma", "Mode fantasma", "Nom nou:", "Debat amb IA", "Perfil i configuració"]),
  "sv": mk(["Startar chatt...", "Expandera", "Fäll ihop", "Avsluta spökläge", "Spökläge", "Nytt namn:", "AI-diskussion", "Profil och inställningar"]),
  "no": mk(["Starter chat...", "Utvid", "Skjul", "Avslutt spøkelsesmodus", "Spøkelsesmodus", "Nytt navn:", "AI-diskusjon", "Profil og innstillinger"]),
  "da": mk(["Starter chat...", "Udvid", "Skjul", "Afslut spøgelsestilstand", "Spøgelsestilstand", "Nyt navn:", "AI-diskussion", "Profil og indstillinger"]),
  "fi": mk(["Aloitetaan chattia...", "Laajenna", "Tiivistä", "Poistu aavetilasta", "Aavetila", "Uusi nimi:", "Tekoälykeskustelu", "Profiili ja asetukset"]),
};
