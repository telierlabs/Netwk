export interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

export async function fetchRealtimeNews(query: string = 'terkini'): Promise<NewsArticle[]> {
  const API_KEY = import.meta.env.VITE_GNEWS_API_KEY || '4066839cb5e746868dfffadd06b8414f';
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=id&country=id&max=6&apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GNews Error: ${response.status}`);
    const data = await response.json();
    
    // Filter: pastikan semua artikel punya URL artikel langsung yang valid
    const articles = (data.articles || []).filter((a: NewsArticle) => {
      if (!a.url || !a.title) return false;
      try {
        const u = new URL(a.url);
        // Buang kalau URL-nya cuma homepage (path terlalu pendek)
        return u.pathname.length > 5;
      } catch { return false; }
    });

    console.log(`[GNews] Berhasil narik ${articles.length} berita untuk query: "${query}"`);
    return articles;
  } catch (error) {
    console.error("[GNews] Gagal narik berita:", error);
    return [];
  }
}
