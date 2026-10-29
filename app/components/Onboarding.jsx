'use client'

/**
 * Onboarding Flow Component
 * Guided tour untuk user baru
 */

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'

// Onboarding steps untuk setiap page
const ONBOARDING_STEPS = {
  dashboard: [
    {
      target: '.welcome-card',
      title: 'Selamat Datang!',
      content: 'Ini adalah dashboard SIMDIR. Anda dapat melihat ringkasan statistik dan aktivitas terbaru di sini.',
      position: 'bottom'
    },
    {
      target: '.stats-grid',
      title: 'Statistik',
      content: 'Lihat ringkasan agenda, anggaran, dan aktivitas sistem secara real-time.',
      position: 'bottom'
    },
    {
      target: '.quick-actions-grid',
      title: 'Akses Cepat',
      content: 'Navigasi cepat ke fitur-fitur yang sering digunakan.',
      position: 'top'
    },
    {
      target: '.sidebar-nav',
      title: 'Menu Navigasi',
      content: 'Gunakan menu di sebelah kiri untuk mengakses semua fitur SIMDIR.',
      position: 'right'
    }
  ],
  'kelola-agenda': [
    {
      target: '.toolbar',
      title: 'Kelola Agenda',
      content: 'Kelola semua agenda kegiatan USC di sini. Tambah, edit, atau hapus agenda.',
      position: 'bottom'
    },
    {
      target: '.filter-search',
      title: 'Pencarian',
      content: 'Gunakan pencarian untuk menemukan agenda dengan cepat.',
      position: 'bottom'
    },
    {
      target: '.agenda-cards-container, .agenda-table-view-desktop',
      title: 'Daftar Agenda',
      content: 'Lihat semua agenda dalam bentuk kartu atau tabel.',
      position: 'top'
    }
  ],
  'laporan': [
    {
      target: '.toolbar',
      title: 'Laporan',
      content: 'Filter laporan berdasarkan periode, triwulan, atau rentang tanggal.',
      position: 'bottom'
    }
  ]
}

// Spotlight component
function Spotlight({ target, isActive }) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!isActive || !target) return

    const element = document.querySelector(target)
    if (element) {
      const updateRect = () => {
        const newRect = element.getBoundingClientRect()
        setRect({
          top: newRect.top - 8,
          left: newRect.left - 8,
          width: newRect.width + 16,
          height: newRect.height + 16
        })
      }

      updateRect()
      window.addEventListener('resize', updateRect)
      window.addEventListener('scroll', updateRect)

      return () => {
        window.removeEventListener('resize', updateRect)
        window.removeEventListener('scroll', updateRect)
      }
    }
  }, [target, isActive])

  if (!isActive || !rect) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        zIndex: 9998
      }}
    >
      {/* Overlay dengan hole */}
      <div
        style={{
          position: 'absolute',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: '8px',
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
          transition: 'all 0.3s ease'
        }}
      />
    </div>
  )
}

// Tooltip component
function Tooltip({ step, currentStep, totalSteps, onNext, onPrev, onSkip, onComplete }) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [tooltipRef, setTooltipRef] = useState(null)

  useEffect(() => {
    if (!step.target) return

    const element = document.querySelector(step.target)
    if (element && tooltipRef) {
      const rect = element.getBoundingClientRect()
      const tooltipRect = tooltipRef.getBoundingClientRect()
      
      let top = rect.top
      let left = rect.left + rect.width / 2 - tooltipRect.width / 2

      // Adjust position based on step.position
      switch (step.position) {
        case 'bottom':
          top = rect.bottom + 16
          break
        case 'top':
          top = rect.top - tooltipRect.height - 16
          break
        case 'left':
          left = rect.left - tooltipRect.width - 16
          top = rect.top + rect.height / 2 - tooltipRect.height / 2
          break
        case 'right':
          left = rect.right + 16
          top = rect.top + rect.height / 2 - tooltipRect.height / 2
          break
      }

      // Keep within viewport
      const padding = 16
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipRect.width - padding))
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipRect.height - padding))

      setPosition({ top, left })
    }
  }, [step, tooltipRef])

  return (
    <div
      ref={setTooltipRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        padding: '1.5rem',
        maxWidth: '320px',
        zIndex: 9999,
        animation: 'tooltip-fade-in 0.3s ease'
      }}
    >
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentStep ? '1.5rem' : '0.5rem',
              height: '0.5rem',
              borderRadius: '9999px',
              background: i === currentStep ? 'var(--primary)' : 'var(--border)',
              transition: 'all 0.2s'
            }}
          />
        ))}
      </div>

      {/* Content */}
      <h3 style={{ 
        fontSize: '1.125rem', 
        fontWeight: 600, 
        marginBottom: '0.5rem',
        color: 'var(--text)'
      }}>
        {step.title}
      </h3>
      <p style={{ 
        fontSize: '0.875rem', 
        color: 'var(--text-2)', 
        marginBottom: '1.5rem',
        lineHeight: 1.5
      }}>
        {step.content}
      </p>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-3)',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            padding: '0.5rem'
          }}
        >
          Lewati
        </button>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {currentStep > 0 && (
            <button
              onClick={onPrev}
              style={{
                padding: '0.5rem 1rem',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                color: 'var(--text)'
              }}
            >
              Sebelumnya
            </button>
          )}
          
          <button
            onClick={currentStep === totalSteps - 1 ? onComplete : onNext}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--primary-solid)',
              border: 'none',
              borderRadius: 'var(--radius)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
              color: 'white',
              fontWeight: 500
            }}
          >
            {currentStep === totalSteps - 1 ? 'Selesai' : 'Selanjutnya'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes tooltip-fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}

// Main Onboarding Component
export function OnboardingFlow({ pageKey, isOpen, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const pathname = usePathname()

  const steps = ONBOARDING_STEPS[pageKey] || []

  useEffect(() => {
    if (isOpen && steps.length > 0) {
      // Delay untuk memastikan DOM sudah ready
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isOpen, steps.length])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setIsVisible(false)
    onSkip?.()
  }

  const handleComplete = () => {
    setIsVisible(false)
    onComplete?.()
  }

  if (!isOpen || !isVisible || steps.length === 0) return null

  const step = steps[currentStep]

  return (
    <>
      <Spotlight target={step.target} isActive={true} />
      <Tooltip
        step={step}
        currentStep={currentStep}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
        onComplete={handleComplete}
      />
    </>
  )
}

// Hook untuk mengelola onboarding state
export function useOnboarding(pageKey) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)

  useEffect(() => {
    // Check if user has completed onboarding for this page
    const completedPages = JSON.parse(localStorage.getItem('onboarding_completed') || '{}')
    if (!completedPages[pageKey]) {
      // Delay untuk memastikan page sudah fully loaded
      const timer = setTimeout(() => {
        setShowOnboarding(true)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      setHasCompleted(true)
    }
  }, [pageKey])

  const completeOnboarding = useCallback(() => {
    const completedPages = JSON.parse(localStorage.getItem('onboarding_completed') || '{}')
    completedPages[pageKey] = true
    localStorage.setItem('onboarding_completed', JSON.stringify(completedPages))
    setShowOnboarding(false)
    setHasCompleted(true)
  }, [pageKey])

  const resetOnboarding = useCallback(() => {
    const completedPages = JSON.parse(localStorage.getItem('onboarding_completed') || '{}')
    delete completedPages[pageKey]
    localStorage.setItem('onboarding_completed', JSON.stringify(completedPages))
    setHasCompleted(false)
    setShowOnboarding(true)
  }, [pageKey])

  const skipOnboarding = useCallback(() => {
    setShowOnboarding(false)
  }, [])

  return {
    showOnboarding,
    hasCompleted,
    completeOnboarding,
    resetOnboarding,
    skipOnboarding
  }
}

// Button untuk restart onboarding
export function RestartOnboardingButton({ onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.5rem 1rem',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        fontSize: '0.8125rem',
        cursor: 'pointer',
        color: 'var(--text-2)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        ...style
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem' }}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      Lihat Panduan
    </button>
  )
}
