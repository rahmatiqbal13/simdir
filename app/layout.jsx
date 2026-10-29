import './globals.css'
import { AgendaProvider } from '@/context/AgendaContext'
import { ToastProvider } from './components/Toast'
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration'
import PWAInstallPrompt from './components/PWAInstallPrompt'

export const viewport = {
  themeColor: '#f59e0b',
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
      { url: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192x192.png', sizes: '192x192' },
    ],
    shortcut: [{ url: '/icons/icon-192x192.png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'SIMDIR',
    'msapplication-TileColor': '#f59e0b',
    'msapplication-TileImage': '/icons/icon-144x144.png',
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
        <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* PWA Meta Tags */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f59e0b" />
        <meta name="application-name" content="SIMDIR" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SIMDIR" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#f59e0b" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        
        {/* Icons */}
        <link rel="icon" type="image/png" sizes="72x72" href="/icons/icon-72x72.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/icons/icon-96x96.png" />
        <link rel="icon" type="image/png" sizes="128x128" href="/icons/icon-128x128.png" />
        <link rel="icon" type="image/png" sizes="144x144" href="/icons/icon-144x144.png" />
        <link rel="icon" type="image/png" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="384x384" href="/icons/icon-384x384.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        
        {/* Splash Screen untuk iOS */}
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
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
