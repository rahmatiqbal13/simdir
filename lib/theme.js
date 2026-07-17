'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'simdir_theme'

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

/**
 * Manual light/dark override on top of the app's OS-driven dark mode.
 * `theme` is 'light' | 'dark' | null (null = follow OS preference).
 * Persisted in localStorage so it survives reloads/navigation.
 */
export function useTheme() {
  const [theme, setThemeState] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      setThemeState(saved)
      applyTheme(saved)
    }
    setMounted(true)
  }, [])

  const setTheme = useCallback((next) => {
    setThemeState(next)
    if (next) localStorage.setItem(STORAGE_KEY, next)
    else localStorage.removeItem(STORAGE_KEY)
    applyTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const current = theme || (prefersDark ? 'dark' : 'light')
    setTheme(current === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  return { theme, mounted, setTheme, toggleTheme }
}
