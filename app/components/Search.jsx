'use client'

/**
 * Search Component dengan Autocomplete
 * Fitur: Debounced search, recent searches, suggestions, highlight matching
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// Hook untuk debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Hook untuk recent searches (localStorage)
function useRecentSearches(key, maxItems = 5) {
  const [recentSearches, setRecentSearches] = useState([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`search_${key}`)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Error loading recent searches:', e)
    }
  }, [key])

  const addRecentSearch = useCallback((term) => {
    if (!term.trim()) return
    
    setRecentSearches((prev) => {
      const newSearches = [term, ...prev.filter(s => s !== term)].slice(0, maxItems)
      try {
        localStorage.setItem(`search_${key}`, JSON.stringify(newSearches))
      } catch (e) {
        console.error('Error saving recent searches:', e)
      }
      return newSearches
    })
  }, [key, maxItems])

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    try {
      localStorage.removeItem(`search_${key}`)
    } catch (e) {
      console.error('Error clearing recent searches:', e)
    }
  }, [key])

  const removeRecentSearch = useCallback((term) => {
    setRecentSearches((prev) => {
      const newSearches = prev.filter(s => s !== term)
      try {
        localStorage.setItem(`search_${key}`, JSON.stringify(newSearches))
      } catch (e) {
        console.error('Error saving recent searches:', e)
      }
      return newSearches
    })
  }, [key])

  return { recentSearches, addRecentSearch, clearRecentSearches, removeRecentSearch }
}

// Highlight matching text
function HighlightMatch({ text, query }) {
  if (!query) return <>{text}</>
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              // Latar kuning sengaja tetap sama di kedua tema (efek
              // "stabilo"), jadi warna teksnya HARUS ikut tetap gelap juga
              // — 'inherit' sebelumnya ikut var(--text) yang jadi putih di
              // dark mode, hasilnya teks nyaris tak kelihatan di atas kuning.
              background: '#fef08a',
              color: '#1e293b',
              padding: '0 2px',
              borderRadius: '2px',
              fontWeight: 600
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// Main Search Component
export function SearchInput({
  placeholder = 'Cari...',
  value,
  onChange,
  onSearch,
  suggestions = [],
  recentSearchesKey,
  maxRecentSearches = 5,
  debounceMs = 300,
  loading = false,
  disabled = false,
  autoFocus = false,
  className = '',
  showRecentSearches = true,
  showSuggestions = true,
  renderSuggestion,
  getSuggestionValue = (s) => s,
  onSuggestionSelect,
  inputProps = {}
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [localValue, setLocalValue] = useState(value || '')
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  
  const debouncedValue = useDebounce(localValue, debounceMs)
  const { recentSearches, addRecentSearch, clearRecentSearches, removeRecentSearch } = 
    useRecentSearches(recentSearchesKey, maxRecentSearches)

  // Sync with external value
  useEffect(() => {
    if (value !== undefined && value !== localValue) {
      setLocalValue(value)
    }
  }, [value])

  // Call onChange when debounced value changes
  useEffect(() => {
    if (onChange && debouncedValue !== value) {
      onChange(debouncedValue)
    }
  }, [debouncedValue])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  const handleKeyDown = (e) => {
    const items = getVisibleItems()
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        }
        setHighlightedIndex(prev => 
          prev < items.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && items[highlightedIndex]) {
          handleSelect(items[highlightedIndex])
        } else if (localValue.trim()) {
          handleSearch()
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        inputRef.current?.blur()
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  const getVisibleItems = () => {
    const items = []
    
    if (showRecentSearches && recentSearches.length > 0 && !localValue) {
      items.push(...recentSearches.map(term => ({ type: 'recent', value: term })))
    }
    
    if (showSuggestions && suggestions.length > 0 && localValue) {
      items.push(...suggestions.map(s => ({ 
        type: 'suggestion', 
        value: getSuggestionValue(s),
        original: s 
      })))
    }
    
    return items
  }

  const handleSelect = (item) => {
    const value = item.value
    setLocalValue(value)
    setIsOpen(false)
    setHighlightedIndex(-1)
    
    if (item.type === 'suggestion' && onSuggestionSelect) {
      onSuggestionSelect(item.original)
    } else {
      onChange?.(value)
      onSearch?.(value)
    }
    
    if (recentSearchesKey) {
      addRecentSearch(value)
    }
  }

  const handleSearch = () => {
    if (localValue.trim()) {
      onSearch?.(localValue)
      if (recentSearchesKey) {
        addRecentSearch(localValue)
      }
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange?.('')
    inputRef.current?.focus()
  }

  const visibleItems = getVisibleItems()

  return (
    <div 
      ref={containerRef}
      className={`search-container ${className}`}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Input */}
      <div 
        className="filter-group filter-search"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '0 0.75rem',
          width: '100%',
          transition: 'all 0.2s'
        }}
      >
        {/* Search Icon */}
        <svg 
          className="filter-icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ 
            width: '1rem', 
            height: '1rem', 
            color: 'var(--text-3)',
            flexShrink: 0
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>

        {/* Input Field */}
        <input
          ref={inputRef}
          type="search"
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(-1)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck="false"
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          aria-expanded={isOpen}
          aria-activedescendant={highlightedIndex >= 0 ? `search-item-${highlightedIndex}` : undefined}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            padding: '0.625rem 0',
            fontSize: '0.875rem',
            color: 'var(--text)',
            outline: 'none',
            minWidth: 0
          }}
          {...inputProps}
        />

        {/* Loading Spinner */}
        {loading && (
          <div 
            className="spinner"
            style={{ 
              width: '1rem', 
              height: '1rem',
              borderWidth: '2px',
              flexShrink: 0
            }}
            aria-hidden="true"
          />
        )}

        {/* Clear Button */}
        {!loading && localValue && (
          <button
            onClick={handleClear}
            className="filter-clear-btn"
            aria-label="Hapus pencarian"
            style={{
              width: '1.5rem',
              height: '1.5rem',
              border: 'none',
              background: 'var(--surface-3)',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              color: 'var(--text-3)',
              display: 'grid',
              placeItems: 'center',
              transition: 'all 0.2s',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--border)'
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--surface-3)'
              e.currentTarget.style.color = 'var(--text-3)'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && visibleItems.length > 0 && (
        <div
          id="search-suggestions"
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            animation: 'dropdown-slide-in 0.15s ease'
          }}
        >
          {/* Recent Searches Header */}
          {visibleItems.some(i => i.type === 'recent') && (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-3)',
                background: 'var(--surface-2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>Pencarian Terakhir</span>
              <button
                onClick={clearRecentSearches}
                style={{
                  fontSize: '0.625rem',
                  color: 'var(--primary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                Hapus Semua
              </button>
            </div>
          )}

          {/* Items */}
          {visibleItems.map((item, index) => (
            <div
              key={`${item.type}-${index}`}
              id={`search-item-${index}`}
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{
                padding: '0.625rem 0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: index === highlightedIndex ? 'var(--surface-2)' : 'transparent',
                borderBottom: '1px solid var(--border)'
              }}
            >
              {/* Icon */}
              {item.type === 'recent' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: 'var(--text-3)', flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '1rem', height: '1rem', color: 'var(--primary)', flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              )}

              {/* Value */}
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {renderSuggestion ? (
                  renderSuggestion(item.original || item.value, localValue)
                ) : (
                  <HighlightMatch text={item.value} query={localValue} />
                )}
              </span>

              {/* Remove button for recent searches */}
              {item.type === 'recent' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeRecentSearch(item.value)
                  }}
                  aria-label={`Hapus ${item.value} dari riwayat`}
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-3)',
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 'var(--radius)',
                    opacity: index === highlightedIndex ? 1 : 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--danger)'
                    e.currentTarget.style.background = 'var(--danger-bg)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-3)'
                    e.currentTarget.style.background = 'none'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.75rem', height: '0.75rem' }}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes dropdown-slide-in {
          from {
            opacity: 0;
            transform: translateY(-4px);
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

// Simple Search (tanpa autocomplete)
export function SimpleSearch({
  placeholder = 'Cari...',
  value,
  onChange,
  onSearch,
  loading = false,
  disabled = false,
  className = ''
}) {
  const [localValue, setLocalValue] = useState(value || '')
  const debouncedValue = useDebounce(localValue, 300)

  useEffect(() => {
    if (value !== undefined && value !== localValue) {
      setLocalValue(value)
    }
  }, [value])

  useEffect(() => {
    if (onChange && debouncedValue !== value) {
      onChange(debouncedValue)
    }
  }, [debouncedValue])

  const handleClear = () => {
    setLocalValue('')
    onChange?.('')
  }

  return (
    <div className={`filter-group filter-search ${className}`}>
      <svg className="filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      
      <input
        type="search"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        disabled={disabled}
        className="filter-input"
      />
      
      {loading && (
        <div className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} />
      )}
      
      {!loading && localValue && (
        <button className="filter-clear-btn" onClick={handleClear} aria-label="Hapus pencarian">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  )
}
