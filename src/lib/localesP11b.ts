// Terjemahan statis namespace 'subUi' (SubscriptionModal).
const KEYS = ["t1", "t2", "weekly", "monthly", "weeklyAdj", "monthlyAdj", "perWeek", "perMonth", "flex", "save", "get", "busy", "claim", "aiHead", "moreHead", "tax", "renew", "close", "plans", "payErr", "sysErr", "liteIntro", "liteBig", "liteSub", "plusIntro", "plusBig", "plusSub", "badge", "proIntro", "proBig", "proSub", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "f10", "f11", "f12", "f13", "f14", "f15", "f16", "f17", "f18", "f19", "f20", "f21", "f22", "f23", "f24"];
const mk = (arr: string[]) => {
  if (arr.length !== KEYS.length) throw new Error('subUi locale length ' + arr.length);
  const o: Record<string, string> = {};
  KEYS.forEach((k, i) => { o[k] = arr[i]; });
  return { subUi: o };
};

export const P11B: Record<string, Record<string, any>> = {
  "pl": mk(["Jedna subskrypcja.", "Dostęp do wszystkiego.", "Tygodniowo", "Miesięcznie", "tygodniowo", "miesięcznie", "tydzień", "miesiąc", "Elastycznie, zmieniaj kiedy chcesz", "Taniej niż tygodniowo", "Wybierz {n}", "Przetwarzanie...", "Odbierz ofertę teraz", "Korzyści AI", "Więcej korzyści", "Ceny nie zawierają podatku. Odnawia się automatycznie do anulowania; anuluj co najmniej 24 godziny przed odnowieniem.", "Odnowienie za {p} na {u}, anuluj w dowolnej chwili", "Zamknij", "Plany", "Nie udało się wczytać płatności", "Wystąpił błąd systemu.", "Nasz plan na start:", "Podstawowy", "Wszystkie codzienne potrzeby AI w jednym planie", "Wszystko z Lite, a także:", "Więcej", "użycia niż w Lite", "Najpopularniejszy", "Wszystko z Plus, a także:", "Znacznie więcej", "użycia niż w Plus", "Więcej treści czatu", "Tworzenie i edycja obrazów", "Tworzenie dokumentów", "Generowanie kodu", "Ograniczone tworzenie wideo", "Dostęp do różnych AI", "Rozmowy głosowe z AI", "Analiza plików i danych", "Podstawowe wyszukiwanie", "Panel analityczny", "Zapraszaj znajomych do współpracy", "Automatyzacja zaplanowanych zadań", "Personalizacja Cylen", "Osobista biblioteka", "Więcej tworzenia wideo", "Więcej tworzenia dokumentów", "Dłuższe rozmowy głosowe z AI", "Analiza większych plików i danych", "Szybsze odpowiedzi", "Dostęp do głębokich badań", "Najnowsze modele jako pierwsze", "Priorytetowy dostęp w godzinach szczytu", "Najszybsze odpowiedzi i generowanie", "Więcej miejsca i historii"]),
};
