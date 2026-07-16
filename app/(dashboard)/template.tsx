'use client'

/**
 * Next.js App Router Template
 * Template selalu remount saat navigasi antar route dalam group layout.
 * Cocok untuk page transitions / animations.
 */

export default function DashboardTemplate({ children }) {
  return (
    <div
      style={{
        animation: 'pageEnter 0.25s ease-out',
      }}
    >
      {children}
    </div>
  )
}
