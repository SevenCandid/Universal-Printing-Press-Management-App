'use client'

import { useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import Image from 'next/image'

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
    const loadingSizeClasses = {
      xs: 'h-8 w-8',
      sm: 'h-9 w-9',
      md: 'h-12 w-12',
      lg: 'h-16 w-16'
    }
    const loadingTextClasses = {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-xl'
    }
    const loadingSpacing = {
      xs: 'space-x-1.5',
      sm: 'space-x-2',
      md: 'space-x-3',
      lg: 'space-x-4'
    }
    return (
      <div className={`flex items-center ${loadingSpacing[size]} ${className}`}>
        <div className={`${loadingSizeClasses[size]} rounded-lg bg-primary/20 animate-pulse`} />
        {showText && <span className={`${loadingTextClasses[size]} font-bold animate-pulse`}>Universal Printing Press</span>}
      </div>
    )
  }

  const sizeClasses = {
    xs: 'h-8 w-8',
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl'
  }

  const spacingClasses = {
    xs: 'space-x-1.5',
    sm: 'space-x-2',
    md: 'space-x-3',
    lg: 'space-x-4'
  }

  const imageSize = {
    xs: 28,
    sm: 32,
    md: 44,
    lg: 60
  }

  return (
    <div className={`flex items-center ${spacingClasses[size]} ${className}`}>
      <div className={`${sizeClasses[size]} rounded-lg bg-primary/10 p-1 flex items-center justify-center overflow-hidden shadow-sm border border-primary/20`}>
        <Image
          src="/assets/logo/UPPLOGO.png"
          alt="Universal Printing Press Logo"
          width={imageSize[size]}
          height={imageSize[size]}
          className="object-contain"
          priority
          unoptimized
        />
      </div>
      {showText && (
        <span className={`${textSizeClasses[size]} font-bold text-foreground tracking-tight`}>
          Universal Printing Press
        </span>
      )}
    </div>
  )
}



