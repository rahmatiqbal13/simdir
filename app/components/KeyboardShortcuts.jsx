'use client'

/**
 * Keyboard Shortcuts System
 * Provides keyboard shortcuts dengan help modal
 * 
 * Shortcuts:
 * ? - Open help modal
 * / - Focus search
 * n - New item
 * esc - Close modals
 * g then h - Go home
 * g then d - Go to dashboard
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

// Hook untuk keyboard shortcuts
export function useKeyboardShortcuts(shortcuts = {}) {
  const keySequence = useRef([])
  const timeoutRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in input/textarea
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        // Allow Escape and shortcuts with modifier keys
        if (e.key !== 'Escape' && !e.ctrlKey && !e.metaKey && !e.altKey) {
          return
        }
      }

      const key = e.key.toLowerCase()

      // Handle sequences (e.g., 'g h' for go home)
      if (keySequence.current.length > 0) {
        clearTimeout(timeoutRef.current)
        keySequence.current.push(key)
        
        const sequence = keySequence.current.join(' ')
        const sequenceHandler = shortcuts[sequence]
        
        if (sequenceHandler) {
          e.preventDefault()
          sequenceHandler(e)
          keySequence.current = []
          return
        }
        
        // Reset sequence after 1 second
        timeoutRef.current = setTimeout(() => {
          keySequence.current = []
        }, 1000)
        
        return
      }

      // Handle single key shortcuts
      const handler = shortcuts[key]
      if (handler) {
        e.preventDefault()
        handler(e)
      }

      // Start sequence for 'g' key
      if (key === 'g' && shortcuts['g h']) {
        keySequence.current = ['g']
        timeoutRef.current = setTimeout(() => {
          keySequence.current = []
        }, 1000)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeoutRef.current)
    }
  }, [shortcuts])
}

// Keyboard Shortcuts Help Modal
export function KeyboardShortcutsHelp({ isOpen, onClose }) {
  const shortcuts = [
    { key: '?', description: 'Tampilkan bantuan shortcut' },
    { key: '/', description: 'Fokus ke pencarian' },
    { key: 'n', description: 'Buat item baru' },
    { key: 'ESC', description: 'Tutup modal / Batalkan' },
    { key: 'g h', description: 'Ke halaman Home' },
    { key: 'g d', description: 'Ke Dashboard' },
    { key: '↑ / ↓', description: 'Navigasi di dropdown' },
    { key: 'Enter', description: 'Pilih item' },
  ]

  if (!isOpen) return null

  return (
    <div 
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '400px' }}
      >
        <div className="modal-head">
          <h2 id="shortcuts-title" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
            Keyboard Shortcuts
          </h2>
          <button onClick={onClose} aria-label="Tutup">✕</button>
        </div>
        
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {shortcuts.map(({ key, description }) => (
              <div 
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <span style={{ color: 'var(--text-2)', fontSize: '0.875rem' }}>
                  {description}
                </span>
                <kbd
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    color: 'var(--text)',
                    minWidth: '40px',
                    textAlign: 'center'
                  }}
                >
                  {key}
                </kbd>
              </div>
            ))}
          </div>
          
          <p style={{ 
            fontSize: '0.75rem', 
            color: 'var(--text-3)', 
            marginTop: '1rem',
            textAlign: 'center'
          }}>
            Tekan ? kapan saja untuk membuka bantuan ini
          </p>
        </div>
      </div>
    </div>
  )
}

// Hook untuk setup shortcuts di dashboard
export function useDashboardShortcuts({
  onSearchFocus,
  onNewItem,
  onCloseModal,
  modalOpen = false
}) {
  const router = useRouter()
  const [showHelp, setShowHelp] = useState(false)

  const shortcuts = {
    '?': () => setShowHelp(true),
    '/': () => {
      if (!modalOpen && onSearchFocus) {
        onSearchFocus()
      }
    },
    'n': () => {
      if (!modalOpen && onNewItem) {
        onNewItem()
      }
    },
    'escape': () => {
      if (modalOpen && onCloseModal) {
        onCloseModal()
      } else if (showHelp) {
        setShowHelp(false)
      }
    },
    'g h': () => router.push('/'),
    'g d': () => router.push('/dashboard'),
  }

  useKeyboardShortcuts(shortcuts)

  return { showHelp, setShowHelp }
}

// Shortcut badge component
export function ShortcutBadge({ shortcut, size = 'sm' }) {
  const sizes = {
    sm: { padding: '0.125rem 0.375rem', fontSize: '0.625rem' },
    md: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
  }

  return (
    <kbd
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        color: 'var(--text-3)',
        ...sizes[size]
      }}
    >
      {shortcut}
    </kbd>
  )
}
