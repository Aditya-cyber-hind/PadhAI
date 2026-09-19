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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <NeonAuthUIProvider authClient={authClient} social={{ providers: ['google'] }}>
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  );
}