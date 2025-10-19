'use client'

import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'

export function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      setDarkMode(true)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = darkMode ? 'light' : 'dark'
    document.documentElement.classList.toggle('dark', !darkMode)
    localStorage.setItem('theme', newTheme)
    setDarkMode(!darkMode)
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center space-x-2 px-3 py-2 border border-border rounded-lg hover:bg-accent/20 transition-colors"
    >
      {darkMode ? (
        <>
          <SunIcon className="h-5 w-5 text-yellow-400" />
          <span className="text-sm text-foreground">Light Mode</span>
        </>
      ) : (
        <>
          <MoonIcon className="h-5 w-5 text-blue-500" />
          <span className="text-sm text-foreground">Dark Mode</span>
        </>
      )}
    </button>
  )
}
