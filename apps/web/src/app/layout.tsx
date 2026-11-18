import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import { siteConfig } from '@/config/site';
import './globals.css';

// Archivo ships a width axis, so one family gives both the body text and the
// extended display cut used for headlines and labels.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  style: ['normal', 'italic'],
  variable: '--font-archivo',
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.title,
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    type: 'website',
  },
  robots: siteConfig.demoMode ? { index: false, follow: false } : undefined,
};

export const viewport: Viewport = {
  themeColor: '#050608',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${jetbrains.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
