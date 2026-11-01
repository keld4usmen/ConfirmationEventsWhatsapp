import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/components/AppContext';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EventCenter SaaS — Multi-Tenant Venue Management & Ticketing',
  description: 'Multi-Tenant Event Center Management & Ticketing SaaS platform built with Next.js, React 19, Prisma, SVG seating canvas, and HMAC QR check-in.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen antialiased flex flex-col`}>
        <AppProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
            Multi-Tenant Event Center Management & Ticketing SaaS © 2026. Built according to PRD Specifications.
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
