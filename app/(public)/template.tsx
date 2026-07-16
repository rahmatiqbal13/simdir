'use client'

/**
 * Next.js App Router Template untuk public routes
 */

export default function PublicTemplate({ children }) {
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
