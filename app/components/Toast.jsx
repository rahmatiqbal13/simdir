'use client'

/**
 * Toast Notification System
 * Menyediakan notifikasi toast yang stackable dan auto-dismiss
 * 
 * Usage:
 * const { showToast, success, error, warning, info } = useToast()
 * success('Data berhasil disimpan')
 * error('Gagal menyimpan data')
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'

// Toast Context
const ToastContext = createContext(null)

// Toast Types Configuration
const TOAST_CONFIG = {
  success: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    bg: 'var(--success-bg)',
    border: 'var(--success)',
    color: 'var(--success)'
  },
  error: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
    bg: 'var(--danger-bg)',
    border: 'var(--danger)',
    color: 'var(--danger)'
  },
  warning: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    bg: 'var(--warning-bg)',
    border: 'var(--warning)',
    color: 'var(--warning)'
  },
  info: {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
    bg: 'var(--primary-bg)',
    border: 'var(--primary)',
    color: 'var(--primary)'
  }
}

// Individual Toast Component
function Toast({ id, message, type, duration, onClose, progress }) {
  const config = TOAST_CONFIG[type]
  const [isPaused, setIsPaused] = useState(false)
  
  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        background: config.bg,
        borderLeft: `4px solid ${config.border}`,
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem',
        marginBottom: '0.75rem',
        minWidth: '300px',
        maxWidth: '500px',
        animation: 'toast-slide-in 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Progress Bar */}
      {duration > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            background: config.border,
            width: `${progress}%`,
            transition: isPaused ? 'none' : 'width 0.1s linear'
          }}
        />
      )}
      
      {/* Icon */}
      <div style={{ color: config.color, flexShrink: 0, marginTop: '0.125rem' }}>
        {config.icon}
      </div>
      
      {/* Message */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ 
          margin: 0, 
          color: 'var(--text)',
          fontSize: '0.875rem',
          lineHeight: 1.5,
          wordWrap: 'break-word'
        }}>
          {message}
        </p>
      </div>
      
      {/* Close Button */}
      <button
        onClick={() => onClose(id)}
        aria-label="Tutup notifikasi"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          padding: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius)',
          minWidth: '28px',
          minHeight: '28px',
          flexShrink: 0,
          marginTop: '-0.25rem',
          marginRight: '-0.25rem'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text)'
          e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-3)'
          e.currentTarget.style.background = 'none'
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

// Toast Container Component
function ToastContainer({ toasts, removeToast }) {
  return (
    <div
      role="region"
      aria-label="Notifikasi"
      className="toast-container"
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <Toast
            {...toast}
            onClose={removeToast}
          />
        </div>
      ))}
      
      <style jsx global>{`
        @keyframes toast-slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes toast-slide-out {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}

// Toast Provider
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [toastProgress, setToastProgress] = useState({})

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    setToastProgress((prev) => {
      const newProgress = { ...prev }
      delete newProgress[id]
      return newProgress
    })
  }, [])

  const showToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random()
    const newToast = { id, message, type, duration }
    
    setToasts((prev) => [...prev, newToast])
    
    if (duration > 0) {
      // Initialize progress
      setToastProgress((prev) => ({ ...prev, [id]: 100 }))
      
      // Start countdown
      const interval = setInterval(() => {
        setToastProgress((prev) => {
          const current = prev[id] || 0
          if (current <= 0) {
            clearInterval(interval)
            return prev
          }
          return { ...prev, [id]: Math.max(0, current - (100 / (duration / 100))) }
        })
      }, 100)
      
      // Remove after duration
      setTimeout(() => {
        clearInterval(interval)
        removeToast(id)
      }, duration)
    }
    
    return id
  }, [removeToast])

  // Shorthand methods
  const success = useCallback((message, duration) => showToast(message, 'success', duration), [showToast])
  const error = useCallback((message, duration) => showToast(message, 'error', duration), [showToast])
  const warning = useCallback((message, duration) => showToast(message, 'warning', duration), [showToast])
  const info = useCallback((message, duration) => showToast(message, 'info', duration), [showToast])

  // Remove all toasts
  const clearAll = useCallback(() => {
    setToasts([])
    setToastProgress({})
  }, [])

  const value = {
    showToast,
    success,
    error,
    warning,
    info,
    clearAll,
    removeToast
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer 
        toasts={toasts.map(t => ({ ...t, progress: toastProgress[t.id] || 0 }))} 
        removeToast={removeToast} 
      />
    </ToastContext.Provider>
  )
}

// Hook untuk menggunakan toast
export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast harus digunakan dalam ToastProvider')
  }
  return context
}

// Utility untuk menampilkan toast di luar React component
let toastInstance = null

export function setToastInstance(instance) {
  toastInstance = instance
}

export const toast = {
  success: (message, duration) => toastInstance?.success(message, duration),
  error: (message, duration) => toastInstance?.error(message, duration),
  warning: (message, duration) => toastInstance?.warning(message, duration),
  info: (message, duration) => toastInstance?.info(message, duration),
  show: (message, type, duration) => toastInstance?.showToast(message, type, duration)
}
