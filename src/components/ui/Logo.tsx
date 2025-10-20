'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const [mounted, setMounted] = useState(false)
  const { theme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-8 w-8 rounded-lg bg-primary animate-pulse" />
        {showText && <span className="text-lg font-semibold animate-pulse">Universal Printing</span>}
      </div>
    )
  }

  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-lg bg-primary flex items-center justify-center overflow-hidden`}>
        <Image
          src={theme === 'dark' ? '/assets/logo/logo-dark.png' : '/assets/logo/logo.png'}
          alt="Universal Printing Press Logo"
          width={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
          height={size === 'sm' ? 24 : size === 'md' ? 32 : 48}
          className="object-contain"
        />
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} font-semibold text-foreground`}>
          Universal Printing Press
        </span>
      )}
    </div>
  )
}



