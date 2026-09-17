import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PadhAI — Your Research Assistant',
  description: 'An open-source NotebookLM alternative powered by Groq',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
} 
