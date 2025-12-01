'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Client component to prevent static generation
// Use dynamic rendering to ensure it's never statically generated
export default function NotFound() {
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    // Use multiple state updates to ensure it's truly dynamic
    setMounted(true)
    // Delay rendering to prevent static analysis
    const timer = setTimeout(() => {
      setShouldRender(true)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  // Return null during SSR and initial render to prevent static generation
  if (!mounted || !shouldRender) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-foreground mb-4">Not Found</h2>
        <p className="text-muted-foreground mb-6">Could not find requested resource</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}