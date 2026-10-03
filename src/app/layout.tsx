import type { Metadata } from 'next';
import { Inter, Fraunces, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { NeonAuthUIProvider } from '@neondatabase/auth-ui';
import { authClient } from '@/lib/auth/client';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://padh-aiaditya.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'PadhAI — Turn any document into a study workspace',
    template: '%s · PadhAI',
  },
  description:
    'Upload a PDF, drop in a YouTube video, paste a web article, or write your own notes. Ask questions, generate quizzes, build flashcards, and share it with your class — every answer grounded in your sources with real citations.',
  applicationName: 'PadhAI',
  authors: [{ name: 'Aditya Choudhary', url: 'https://github.com/Aditya-cyber-hind' }],
  creator: 'Aditya Choudhary',
  keywords: [
    'PadhAI',
    'study workspace',
    'AI study tool',
    'NotebookLM alternative',
    'flashcards',
    'quiz generator',
    'PDF chat',
    'YouTube transcript',
    'open source',
    'RAG',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'PadhAI',
    title: 'PadhAI — Turn any document into a study workspace',
    description:
      'An open-source, AI-powered study workspace. Chat with your sources, generate quizzes and flashcards, build concept maps, and share notebooks with your class.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PadhAI — Turn any document into a study workspace',
    description:
      'An open-source, AI-powered study workspace. Chat with your sources, generate quizzes and flashcards, build concept maps, and share notebooks with your class.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon.svg',
  },
};

/**
 * Inline script that runs before React hydrates. Reads the saved
 * theme from localStorage and sets `data-theme` on <html> so the
 * page never flashes the wrong theme on load.
 *
 * Keep this as a string — it must run synchronously in the <head>.
 */
const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('padhai:theme');
    if (t === 'warm' || t === 'cool' || t === 'dark' || t === 'paper') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      document.documentElement.setAttribute('data-theme', 'warm');
    }
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'warm');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="warm"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
      style={{ width: '100%', maxWidth: '100%' }}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className="antialiased font-sans"
        style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}
      >
        <ThemeProvider>
          <NeonAuthUIProvider authClient={authClient} social={{ providers: ['google'] }}>
            {children}
          </NeonAuthUIProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}