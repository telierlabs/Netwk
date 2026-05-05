// src/services/newsService.ts

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
  // Ambil API Key dari .env (atau fallback ke key lo langsung kalau env belum ke-load)
  const API_KEY = import.meta.env.VITE_GNEWS_API_KEY || '4066839cb5e746868dfffadd06b8414f';
  
  // Endpoint GNews: Cari berita berbahasa Indonesia (lang=id) di negara Indonesia (country=id), maksimal 5 berita
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=id&country=id&max=5&apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GNews Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("[Sistem] Berhasil narik berita real-time dari GNews!");
    return data.articles || [];
    
  } catch (error) {
    console.error("[Sistem] Gagal narik berita:", error);
    return [];
  }
}
