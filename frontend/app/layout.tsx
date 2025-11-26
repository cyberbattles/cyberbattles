import type {Metadata} from 'next';
import React, {Suspense} from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import {AuthProvider} from '@/components/Auth';

export const metadata: Metadata = {
  title: 'CyberBattles',
  description: 'An educational attack and defence CTF platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          type="image/png"
          href="/favicon/favicon-96x96.png"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
        <link rel="shortcut icon" href="/favicon/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <meta name="apple-mobile-web-app-title" content="CyberBattl.es" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </head>
      <body className={'overflow-x-hidden antialiased'}>
        <AuthProvider>
          <Navbar />
          <Suspense
            fallback={
              <canvas
                className="pointer-events-none fixed top-0 left-0 -z-10 h-full
                  w-full"
                style={{background: 'black', filter: 'blur(5px)'}}
              />
            }
          >
            {children}
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
