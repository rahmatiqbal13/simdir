'use client'

/**
 * Form Validation System
 * Provides real-time validation with visual feedback
 */

import { useState, useCallback, useEffect } from 'react'

// Validation rule types
export const validators = {
  required: (value) => {
    if (value === null || value === undefined || value === '') {
      return 'Field ini wajib diisi'
    }
    return null
  },
  
  email: (value) => {
    if (!value) return null
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      return 'Format email tidak valid'
    }
    return null
  },
  
  minLength: (min) => (value) => {
    if (!value) return null
    if (value.length < min) {
      return `Minimal ${min} karakter`
    }
    return null
  },
  
  maxLength: (max) => (value) => {
    if (!value) return null
    if (value.length > max) {
      return `Maksimal ${max} karakter`
    }
    return null
  },
  
  min: (minValue) => (value) => {
    if (!value && value !== 0) return null
    const num = Number(value)
    if (isNaN(num) || num < minValue) {
      return `Minimal ${minValue}`
    }
    return null
  },
  
  max: (maxValue) => (value) => {
    if (!value && value !== 0) return null
    const num = Number(value)
    if (isNaN(num) || num > maxValue) {
      return `Maksimal ${maxValue}`
    }
    return null
  },
  
  dateRange: (minDate, maxDate) => (value) => {
    if (!value) return null
    const date = new Date(value)
    if (minDate && date < new Date(minDate)) {
      return `Tanggal minimal ${minDate}`
    }
    if (maxDate && date > new Date(maxDate)) {
      return `Tanggal maksimal ${maxDate}`
    }
    return null
  },
  
  match: (fieldToMatch, fieldName) => (value, allValues) => {
    if (!value) return null
    if (value !== allValues[fieldToMatch]) {
      return `Harus sama dengan ${fieldName}`
    }
    return null
  },
  
  pattern: (regex, message) => (value) => {
    if (!value) return null
    if (!regex.test(value)) {
      return message || 'Format tidak valid'
    }
    return null
  },
  
  url: (value) => {
    if (!value) return null
    try {
      new URL(value)
      return null
    } catch {
      return 'Format URL tidak valid'
    }
  },
  
  phone: (value) => {
    if (!value) return null
    const phoneRegex = /^[\d\s\-+()]+$/
    if (!phoneRegex.test(value)) {
      return 'Format nomor telepon tidak valid'
    }
    return null
  },
  
  dateOrder: (startDateField, endDateField) => (value, allValues) => {
    const startDate = allValues[startDateField]
    const endDate = allValues[endDateField]
    
    if (!startDate || !endDate) return null
    
    if (new Date(startDate) > new Date(endDate)) {
      return 'Tanggal mulai tidak boleh lebih besar dari tanggal selesai'
    }
    return null
  }
}

// Hook untuk form validation
export function useFormValidation(initialValues = {}, validationRules = {}, options = {}) {
  const { validateOnChange = true, validateOnBlur = true } = options
  
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isValid, setIsValid] = useState(false)

  // Validate a single field
  const validateField = useCallback((name, value, allValues = values) => {
    const rules = validationRules[name]
    if (!rules) return null

    const rulesArray = Array.isArray(rules) ? rules : [rules]
    
    for (const rule of rulesArray) {
      const error = rule(value, allValues)
      if (error) return error
    }
    
    return null
  }, [validationRules, values])

  // Validate all fields
  const validateAll = useCallback(() => {
    const newErrors = {}
    let hasError = false

    Object.keys(validationRules).forEach((field) => {
      const error = validateField(field, values[field], values)
      if (error) {
        newErrors[field] = error
        hasError = true
      }
    })

    setErrors(newErrors)
    setIsValid(!hasError)
    return !hasError
  }, [validateField, validationRules, values])

  // Handle field change
  const handleChange = useCallback((name) => (e) => {
    const value = e.target ? e.target.value : e
    
    setValues((prev) => {
      const newValues = { ...prev, [name]: value }
      
      if (validateOnChange && touched[name]) {
        const error = validateField(name, value, newValues)
        setErrors((prevErrors) => ({
          ...prevErrors,
          [name]: error
        }))
      }
      
      return newValues
    })
  }, [validateOnChange, touched, validateField])

  // Handle field blur
  const handleBlur = useCallback((name) => () => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    
    if (validateOnBlur) {
      const error = validateField(name, values[name], values)
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: error
      }))
    }
  }, [validateOnBlur, validateField, values])

  // Set field value programmatically
  const setValue = useCallback((name, value) => {
    setValues((prev) => {
      const newValues = { ...prev, [name]: value }
      
      if (touched[name]) {
        const error = validateField(name, value, newValues)
        setErrors((prevErrors) => ({
          ...prevErrors,
          [name]: error
        }))
      }
      
      return newValues
    })
  }, [touched, validateField])

  // Set multiple values
  const setMultipleValues = useCallback((newValues) => {
    setValues((prev) => {
      const mergedValues = { ...prev, ...newValues }
      
      // Validate all touched fields
      const newErrors = {}
      Object.keys(newValues).forEach((field) => {
        if (touched[field]) {
          const error = validateField(field, newValues[field], mergedValues)
          if (error) newErrors[field] = error
        }
      })
      
      if (Object.keys(newErrors).length > 0) {
        setErrors((prevErrors) => ({ ...prevErrors, ...newErrors }))
      }
      
      return mergedValues
    })
  }, [touched, validateField])

  // Reset form
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues)
    setErrors({})
    setTouched({})
    setIsValid(false)
  }, [initialValues])

  // Clear error for a field
  const clearError = useCallback((name) => {
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[name]
      return newErrors
    })
  }, [])

  // Validate form on values change
  useEffect(() => {
    const newErrors = {}
    let hasError = false

    Object.keys(validationRules).forEach((field) => {
      if (touched[field]) {
        const error = validateField(field, values[field], values)
        if (error) {
          newErrors[field] = error
          hasError = true
        }
      }
    })

    setErrors(newErrors)
    setIsValid(!hasError && Object.keys(touched).length > 0)
  }, [values, touched, validateField, validationRules])

  return {
    values,
    errors,
    touched,
    isValid,
    handleChange,
    handleBlur,
    setValue,
    setMultipleValues,
    validateAll,
    reset,
    clearError
  }
}

// Form Input Component dengan validation
export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  disabled = false,
  helpText,
  icon,
  className = '',
  inputProps = {}
}) {
  const hasError = error && touched
  const isValid = !error && touched && value

  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label htmlFor={name} style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{ 
            position: 'absolute', 
            left: '0.75rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: hasError ? 'var(--danger)' : isValid ? 'var(--success)' : 'var(--text-3)',
            pointerEvents: 'none'
          }}>
            {icon}
          </div>
        )}
        
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={helpText ? `${name}-help` : error ? `${name}-error` : undefined}
          style={{
            width: '100%',
            padding: icon ? '0.75rem 0.875rem 0.75rem 2.5rem' : '0.75rem 2.5rem 0.75rem 0.875rem',
            border: `1px solid ${hasError ? 'var(--danger)' : isValid ? 'var(--success)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            transition: 'all 0.2s',
            background: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
            paddingRight: hasError || isValid ? '2.5rem' : undefined
          }}
          {...inputProps}
        />
        
        {/* Validation Icon */}
        {(hasError || isValid) && (
          <div style={{ 
            position: 'absolute', 
            right: '0.75rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            pointerEvents: 'none'
          }}>
            {hasError ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        )}
      </div>
      
      {/* Help Text */}
      {helpText && !hasError && (
        <p 
          id={`${name}-help`}
          style={{ 
            fontSize: '0.6875rem', 
            color: 'var(--text-3)', 
            marginTop: '0.25rem',
            marginBottom: 0
          }}
        >
          {helpText}
        </p>
      )}
      
      {/* Error Message */}
      {hasError && (
        <p 
          id={`${name}-error`}
          role="alert"
          style={{ 
            fontSize: '0.75rem', 
            color: 'var(--danger)', 
            marginTop: '0.25rem',
            marginBottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '0.875rem', height: '0.875rem' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

// Form Select Component dengan validation
export function FormSelect({
  label,
  name,
  options = [],
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  disabled = false,
  helpText,
  placeholder = '-- Pilih --',
  className = ''
}) {
  const hasError = error && touched

  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label htmlFor={name} style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={helpText ? `${name}-help` : error ? `${name}-error` : undefined}
        style={{
          width: '100%',
          padding: '0.75rem 2rem 0.75rem 0.875rem',
          border: `1px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
          background: 'var(--surface)',
          color: 'var(--text)',
          outline: 'none',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.5rem center',
          backgroundSize: '1rem'
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      
      {helpText && !hasError && (
        <p id={`${name}-help`} style={{ fontSize: '0.6875rem', color: 'var(--text-3)', marginTop: '0.25rem', marginBottom: 0 }}>
          {helpText}
        </p>
      )}
      
      {hasError && (
        <p id={`${name}-error`} role="alert" style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', marginBottom: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}

// Form Textarea Component dengan validation
export function FormTextarea({
  label,
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  disabled = false,
  helpText,
  rows = 3,
  maxLength,
  className = ''
}) {
  const hasError = error && touched
  const currentLength = value?.length || 0

  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label htmlFor={name} style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', display: 'block' }}>
          {label}
          {required && <span style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>*</span>}
        </label>
      )}
      
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={helpText ? `${name}-help` : error ? `${name}-error` : maxLength ? `${name}-count` : undefined}
        style={{
          width: '100%',
          padding: '0.75rem 0.875rem',
          border: `1px solid ${hasError ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
          background: 'var(--surface)',
          color: 'var(--text)',
          outline: 'none',
          resize: 'vertical',
          minHeight: '80px'
        }}
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        {helpText && !hasError && (
          <p id={`${name}-help`} style={{ fontSize: '0.6875rem', color: 'var(--text-3)', margin: 0 }}>
            {helpText}
          </p>
        )}
        
        {hasError && (
          <p id={`${name}-error`} role="alert" style={{ fontSize: '0.75rem', color: 'var(--danger)', margin: 0 }}>
            {error}
          </p>
        )}
        
        {maxLength && (
          <p id={`${name}-count`} style={{ 
            fontSize: '0.6875rem', 
            color: currentLength > maxLength * 0.9 ? 'var(--warning)' : 'var(--text-3)',
            margin: 0,
            marginLeft: 'auto'
          }}>
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}

// Form Error Summary
export function FormErrorSummary({ errors, visible }) {
  if (!visible || Object.keys(errors).length === 0) return null

  return (
    <div
      role="alert"
      style={{
        padding: '1rem',
        background: 'var(--danger-bg)',
        border: '1px solid var(--danger)',
        borderRadius: 'var(--radius)',
        marginBottom: '1rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" style={{ width: '1.25rem', height: '1.25rem' }}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <strong style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>
          Terdapat {Object.keys(errors).length} kesalahan:
        </strong>
      </div>
      <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--danger)', fontSize: '0.8125rem' }}>
        {Object.entries(errors).map(([field, error]) => (
          <li key={field}>{error}</li>
        ))}
      </ul>
    </div>
  )
}
