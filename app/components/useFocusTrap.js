'use client'

import { useEffect, useRef } from 'react'

/**
 * Custom hook untuk menangkap focus di dalam modal/overlay.
 * Saat modal terbuka:
 * - Focus pertama kali diarahkan ke elemen pertama yang bisa difocus
 * - Tab cycle hanya berputar di dalam modal (tidak keluar ke background)
 * - Escape key bisa digunakan untuk menutup modal (opsional)
 *
 * Usage:
 *   const ref = useFocusTrap(isOpen, onClose)
 *   <div ref={ref}>...</div>
 */
export function useFocusTrap(isOpen, onClose) {
  const ref = useRef(null)
  const previouslyFocused = useRef(null)
  // onClose disimpan lewat ref, bukan dependency effect di bawah — kalau
  // tidak, tiap kali parent re-render dengan inline arrow function baru
  // (pola paling umum dipakai di semua caller hook ini), seluruh effect
  // restart: scroll lock dipasang ulang, "elemen sebelumnya" ditulis ulang
  // ke document.activeElement SAAT ITU (bisa jadi elemen di dalam modal
  // yang sedang difocus user), dan timer autofocus 50ms diulang dari nol.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    // Lock body scroll
    const originalOverflow = document.body.style.overflow
    const originalTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    document.body.classList.add('modal-open')

    // Simpan elemen yang sedang difocus sebelum modal terbuka
    previouslyFocused.current = document.activeElement

    const container = ref.current
    if (!container) return

    // Daftar selector elemen yang bisa difocus
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ')

    const getFocusable = () =>
      Array.from(container.querySelectorAll(focusableSelector)).filter(
        (el) => el.offsetParent !== null // hanya elemen visible
      )

    // Focus ke elemen pertama setelah modal terbuka (dengan delay supaya transition selesai)
    const focusTimer = setTimeout(() => {
      const focusable = getFocusable()
      if (focusable.length > 0) {
        // Prioritaskan tombol close, input pertama, atau button submit
        const closeBtn = container.querySelector('[data-autofocus], [aria-label="Tutup"]')
        if (closeBtn && focusable.includes(closeBtn)) {
          closeBtn.focus()
        } else {
          focusable[0].focus()
        }
      }
    }, 50)

    // Handle Tab key untuk cycle focus
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') {
        // Handle Escape untuk menutup modal
        if (e.key === 'Escape' && onCloseRef.current) {
          e.preventDefault()
          onCloseRef.current()
        }
        return
      }

      const focusable = getFocusable()
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      // Restore body scroll
      document.body.style.overflow = originalOverflow
      document.body.style.touchAction = originalTouchAction
      document.body.classList.remove('modal-open')
      // Kembalikan focus ke elemen sebelumnya saat modal tertutup
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
        previouslyFocused.current.focus()
      }
    }
  }, [isOpen])

  return ref
}
