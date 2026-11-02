import './globals.css'
import { AgendaProvider } from '@/context/AgendaContext'
import { ToastProvider } from './components/Toast'
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration'
import PWAInstallPrompt from './components/PWAInstallPrompt'

export const viewport = {
  themeColor: '#2b3990',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export const metadata = {
  title: "SIMDIR - Sistem Informasi Manajemen Direktorat",
  description: "Sistem Informasi Manajemen Direktorat Unesa Science Center",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SIMDIR',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/simdir-icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/simdir-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/simdir-icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/simdir-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/simdir-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/simdir-icon-180.png', sizes: '180x180' }],
    shortcut: [{ url: '/icons/simdir-icon-32.png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'SIMDIR',
    'msapplication-TileColor': '#2b3990',
    'msapplication-TileImage': '/icons/simdir-icon-256.png',
    'msapplication-config': '/browserconfig.xml',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="id" dir="ltr" suppressHydrationWarning>
      <head>
        {/* Terapkan override tema tersimpan sebelum paint pertama, agar tidak flash
            dan berlaku di halaman manapun tanpa menunggu ThemeToggle mount */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('simdir_theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}`,
          }}
        />
        {/* Font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;500;600&family=Atkinson+Hyperlegible+Next:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="SIMDIR" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SIMDIR" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2b3990" />
        <meta name="msapplication-tap-highlight" content="no" />

      </head>
      <body>
        <ToastProvider>
          <AgendaProvider>
            {children}
          </AgendaProvider>
        </ToastProvider>
        
        {/* PWA Components */}
        <ServiceWorkerRegistration />
        <PWAInstallPrompt />
      </body>
    </html>
  )
}
