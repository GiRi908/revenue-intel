import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/lib/store';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Revenue Intel — Activity Inbox',
  description: 'Revenue intelligence inbox and analytics for sales leadership',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="min-h-screen bg-[#EEF1EF] text-[#14201A] antialiased p-4">
        <StoreProvider>
          {/* Main App Container */}
          <div className="flex flex-col lg:flex-row gap-4 max-w-[1440px] mx-auto min-h-[calc(100vh-32px)] items-start">
            {/* Sidebar Floating Panel */}
            <Suspense
              fallback={
                <aside className="w-full lg:w-[240px] bg-white rounded-[20px] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] h-[600px] shrink-0" />
              }
            >
              <Sidebar />
            </Suspense>

            {/* Right Column: Top Bar + Content Panel */}
            <div className="flex-1 flex flex-col w-full min-w-0">
              <TopBar />
              <main className="w-full">
                {children}
              </main>
            </div>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
