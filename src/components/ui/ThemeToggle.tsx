'use client'

import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'

export function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      setDarkMode(true)
    }
  }, [])

  const toggleTheme = () => {
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 500)
    
    const newTheme = darkMode ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', !darkMode)
    localStorage.setItem('theme', newTheme)
    setDarkMode(!darkMode)
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 sm:p-2.5 rounded-full border border-border hover:bg-accent/50 
                 transition-all duration-300 hover:scale-110 active:scale-95 
                 hover:shadow-lg hover:border-primary/50 group"
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5 sm:w-6 sm:h-6">
        {/* Sun Icon */}
        <SunIcon 
          className={`absolute inset-0 h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 transition-all duration-500 
                     ${darkMode 
                       ? 'rotate-90 scale-0 opacity-0' 
                       : 'rotate-0 scale-100 opacity-100'
                     }
                     ${isAnimating ? 'animate-spin' : ''}`}
        />
        
        {/* Moon Icon */}
        <MoonIcon 
          className={`absolute inset-0 h-5 w-5 sm:h-6 sm:w-6 text-blue-400 transition-all duration-500
                     ${darkMode 
                       ? 'rotate-0 scale-100 opacity-100' 
                       : '-rotate-90 scale-0 opacity-0'
                     }
                     ${isAnimating ? 'animate-pulse' : ''}`}
        />
      </div>
      
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-full blur transition-opacity duration-300 
                      ${darkMode ? 'bg-blue-400/20' : 'bg-yellow-400/20'} 
                      opacity-0 group-hover:opacity-100`} 
      />
    </button>
  )
}
