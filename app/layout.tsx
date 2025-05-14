import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { Analytics } from '@vercel/analytics/react';
import '../emergency-timestamp-fix';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Albayrak Demir Çelik',
  description: 'Albayrak Demir Çelik Yönetim Paneli',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-US">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
