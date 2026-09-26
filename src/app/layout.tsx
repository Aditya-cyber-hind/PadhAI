import type { Metadata } from 'next';
import './globals.css';
import { NeonAuthUIProvider } from '@neondatabase/auth-ui';
import { authClient } from '@/lib/auth/client';

export const metadata: Metadata = {
  title: 'PadhAI — Your Research Assistant',
  description: 'An open-source NotebookLM alternative powered by Groq',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning style={{ width: '100%', maxWidth: '100%' }}>
      <body
        className="antialiased"
        style={{ width: '100%', maxWidth: '100%', margin: 0, padding: 0 }}
      >
        <NeonAuthUIProvider authClient={authClient} social={{ providers: ['google'] }}>
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}