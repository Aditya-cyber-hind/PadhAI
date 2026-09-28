import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { NeonAuthUIProvider } from '@neondatabase/auth-ui';
import { authClient } from '@/lib/auth/client';

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

export const metadata: Metadata = {
  title: 'PadhAI — Your Research Assistant',
  description: 'An open-source NotebookLM alternative powered by Groq',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${fraunces.variable}`}
      style={{ width: '100%', maxWidth: '100%' }}
    >
      <body
        className="antialiased font-sans"
        style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}
      >
        <NeonAuthUIProvider authClient={authClient} social={{ providers: ['google'] }}>
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}