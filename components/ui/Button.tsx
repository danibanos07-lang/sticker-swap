'use client'
import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 select-none'

    const variants = {
      primary: 'shadow-md hover:shadow-lg',
      secondary: 'shadow-md hover:shadow-lg',
      outline: 'border-2 bg-transparent hover:bg-opacity-10',
      ghost: 'bg-transparent',
      gold: 'shadow-md hover:shadow-lg',
    }

    const sizes = {
      sm: 'px-3 py-2 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-base gap-2',
      lg: 'px-6 py-3.5 text-lg gap-2',
    }

    const inlineStyles: React.CSSProperties = {
      ...(variant === 'primary' && { background: 'var(--primary)', color: '#ffffff' }),
      ...(variant === 'secondary' && { background: 'var(--green)', color: '#ffffff' }),
      ...(variant === 'outline' && { borderColor: 'var(--primary)', color: 'var(--primary)' }),
      ...(variant === 'ghost' && { color: 'var(--text-muted)' }),
      ...(variant === 'gold' && { background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#ffffff' }),
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={inlineStyles}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
