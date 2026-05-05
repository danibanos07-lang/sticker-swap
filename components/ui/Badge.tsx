import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'gold' | 'info'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: { background: 'var(--border)', color: 'var(--text-muted)' },
    success: { background: '#D1FAE5', color: '#065F46' },
    warning: { background: '#FEF3C7', color: '#92400E' },
    error: { background: '#FEE2E2', color: '#991B1B' },
    gold: { background: 'linear-gradient(135deg, #F5A623, #FFD700)', color: '#1A1A2E' },
    info: { background: '#DBEAFE', color: '#1E40AF' },
  }

  return (
    <span
      className={`pill ${className}`}
      style={variants[variant]}
    >
      {children}
    </span>
  )
}
