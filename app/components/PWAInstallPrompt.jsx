'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Sekali ditampilkan (di-install ATAU ditutup), jangan tampilkan lagi
// selamanya — sebelumnya cuma disupres 24 jam lewat 'pwaPromptDismissed',
// makanya muncul lagi terus tiap hari.
const SEEN_KEY = 'pwaPromptSeen'

export default function PWAInstallPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Cek apakah sudah di-install
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      setIsInstalled(true)
      return
    }

    // Sudah pernah ditampilkan sebelumnya (di-install atau ditutup) —
    // jangan tampilkan lagi, tidak peduli sudah berapa lama.
    if (localStorage.getItem(SEEN_KEY)) return

    // Simpan event beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Sebagian browser bisa memicu event ini lebih dari sekali dalam satu
      // sesi (mis. setelah kondisi installability dievaluasi ulang) — cek
      // lagi di sini, bukan cuma sekali saat mount, supaya popup yang baru
      // saja ditutup tidak langsung muncul lagi di sesi yang sama.
      if (localStorage.getItem(SEEN_KEY)) return
      // Stash the event so it can be triggered later
      setDeferredPrompt(e)
      // Update UI to notify the user they can add to home screen
      setIsVisible(true)
    }

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsVisible(false)
      setDeferredPrompt(null)
      localStorage.setItem(SEEN_KEY, '1')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    await deferredPrompt.userChoice

    // Clear the saved prompt since it can't be used again
    setDeferredPrompt(null)
    setIsVisible(false)
    localStorage.setItem(SEEN_KEY, '1')
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(SEEN_KEY, '1')
  }

  // Cuma tampil di dashboard (akses pertama setelah login), dan cuma kalau
  // memang belum pernah ditampilkan/di-dismiss sebelumnya.
  if (isInstalled || !isVisible || pathname !== '/dashboard') return null

  return (
    <div
      className="pwa-install-prompt"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: '#1e293b',
        borderRadius: '14px',
        padding: '14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        border: '1px solid #334155',
        maxWidth: '320px',
        width: 'calc(100vw - 48px)',
        animation: 'pwaSlideIn 0.3s ease',
      }}
    >
      <style>{`@keyframes pwaSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', lineHeight: 1 }}
        aria-label="Tutup"
      >✕</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #f7b500, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>S</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', margin: 0 }}>Install SIMDIR</p>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0', lineHeight: 1.3 }}>Akses lebih cepat &amp; fitur offline</p>
        </div>
      </div>

      <button
        onClick={handleInstallClick}
        style={{ display: 'block', width: '100%', marginTop: '12px', padding: '9px 16px', background: '#f7b500', border: 'none', borderRadius: '8px', color: '#0f172a', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
      >
        Install Sekarang
      </button>
    </div>
  )
}
