/**
 * Safe localStorage wrapper
 * Prevents SSR / Node.js errors when localStorage is not available.
 * All app code should use this instead of window.localStorage directly.
 */

function isAvailable() {
  return typeof window !== 'undefined' && window.localStorage != null
}

export const safeLocalStorage = {
  getItem(key) {
    if (!isAvailable()) return null
    try {
      return window.localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem(key, value) {
    if (!isAvailable()) return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Ignore quota exceeded / private mode errors
    }
  },

  removeItem(key) {
    if (!isAvailable()) return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Ignore
    }
  },
}
