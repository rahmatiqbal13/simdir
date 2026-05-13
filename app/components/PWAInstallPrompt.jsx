'use client'

import { useState, useEffect } from 'react'

export default function PWAInstallPrompt() {
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

    // Simpan event beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
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
      console.log('PWA was installed')
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
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the saved prompt since it can't be used again
    setDeferredPrompt(null)
    setIsVisible(false)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    // Simpan ke localStorage agar tidak muncul lagi dalam 24 jam
    localStorage.setItem('pwaPromptDismissed', Date.now().toString())
  }

  // Cek apakah prompt sudah di-dismiss dalam 24 jam terakhir
  useEffect(() => {
    const dismissed = localStorage.getItem('pwaPromptDismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const now = Date.now()
      const hoursPassed = (now - dismissedTime) / (1000 * 60 * 60)
      
      if (hoursPassed < 24) {
        setIsVisible(false)
      }
    }
  }, [])

  // Jangan render jika sudah installed atau tidak ada prompt
  if (isInstalled || !isVisible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#1e293b',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        border: '1px solid #334155',
        maxWidth: '400px',
        width: '90%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a' }}>S</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '4px',
            }}
          >
            Install SIMDIR
          </h3>
          <p
            style={{
              fontSize: '13px',
              color: '#94a3b8',
              lineHeight: 1.4,
            }}
          >
            Install aplikasi untuk akses lebih cepat dan fitur offline
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '16px',
        }}
      >
        <button
          onClick={handleDismiss}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: 'transparent',
            border: '1px solid #475569',
            borderRadius: '8px',
            color: '#94a3b8',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Nanti
        </button>
        <button
          onClick={handleInstallClick}
          style={{
            flex: 1,
            padding: '10px 16px',
            background: '#f59e0b',
            border: 'none',
            borderRadius: '8px',
            color: '#0f172a',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Install
        </button>
      </div>
    </div>
  )
}
