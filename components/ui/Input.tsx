'use client'
import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label
            className="text-sm font-semibold"
            style={{ color: 'var(--text-muted)' }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            style={{
              background: 'var(--bg-input)',
              color: 'var(--text)',
              borderColor: error ? '#EF4444' : 'var(--border)',
              ...style
            }}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${icon ? 'pl-10' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = '', style, children, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          style={{
            background: 'var(--bg-input)',
            color: 'var(--text)',
            borderColor: error ? '#EF4444' : 'var(--border)',
            ...style
          }}
          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    )
  }
)
Select.displayName = 'Select'
