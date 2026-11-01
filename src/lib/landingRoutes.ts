export type PageKey =
  | 'home' | 'chat' | 'build' | 'imagine' | 'voice' | 'docs' | 'pricing'
  | 'about' | 'privacy' | 'terms' | 'news-detail' | 'contact';

// Satu tempat untuk semua URL publik landing page
export const PAGE_TO_PATH: Partial<Record<PageKey, string>> = {
  chat: '/chat',
  build: '/build',
  imagine: '/imagine',
  voice: '/voice',
  docs: '/docs',
  pricing: '/pricing',
  about: '/about',
  contact: '/contact',
  privacy: '/privacy-policy',
  terms: '/terms-of-service',
  'news-detail': '/news',
};

export const PATH_TO_PAGE: Record<string, PageKey> = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([page, path]) => [path as string, page as PageKey])
) as Record<string, PageKey>;

export const cleanPath = (p: string) => p.replace(/\/+$/, '') || '/';

export function getPageFromPath(): PageKey {
  return PATH_TO_PAGE[cleanPath(window.location.pathname)] || 'home';
}

// true kalau URL sekarang adalah salah satu halaman publik landing (bukan beranda)
export const isPublicLandingPath = (): boolean => getPageFromPath() !== 'home';

export const HOME_SEO = {
  title: 'Cylen',
  description: 'Cylen adalah asisten AI futuristik yang membantu Anda mencari informasi, mengedit gambar, dan berdiskusi dengan cerdas. Cepat, aman, dan personal.',
};

export const PAGE_SEO: Record<Exclude<PageKey, 'home'>, { title: string; description: string }> = {
  chat:    { title: 'Cylen Chat | Collaborative AI Workspace', description: 'Chat, search, analyze, and collaborate in one place with answers powered by multiple frontier AI models.' },
  build:   { title: 'Cylen Build | AI Coding Assistant', description: 'An AI coding assistant for architecture planning, code generation, and team code review.' },
  imagine: { title: 'Cylen Imagine | AI Vision & Image', description: 'Image understanding today, with image and video generation on the roadmap.' },
  voice:   { title: 'Cylen Voice | Speech to Text', description: 'Dictate prompts with built-in speech to text. Live voice conversations are coming soon.' },
  docs:    { title: 'Documentation | Cylen', description: 'Guides and documentation for using Cylen.' },
  pricing: { title: 'Pricing | Cylen', description: 'Cylen plans and pricing.' },
  about:   { title: 'About Us | Cylen', description: 'Cylen is a unified AI workspace developed by TelierNews, based in Cirebon, Indonesia.' },
  contact: { title: 'Contact Us | Cylen', description: 'Get in touch with the Cylen team for support, business, or partnership inquiries.' },
  privacy: { title: 'Privacy Policy | Cylen', description: 'How Cylen collects, uses, and protects your data.' },
  terms:   { title: 'Terms of Service | Cylen', description: 'The terms that apply when you use Cylen.' },
  'news-detail': { title: 'Latest News | Cylen', description: 'The latest news and updates from Cylen and TelierNews.' },
};
