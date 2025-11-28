'use client'

import React from 'react'

// Force dynamic rendering - error pages should not be statically generated
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'
export const runtime = 'nodejs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Use React.createElement to avoid Next.js detecting html tag as Html component during build
  return React.createElement(
    'html',
    { lang: 'en', suppressHydrationWarning: true },
    React.createElement(
      'body',
      { className: 'min-h-screen bg-background', suppressHydrationWarning: true },
      React.createElement(
        'div',
        { className: 'min-h-screen flex items-center justify-center' },
        React.createElement(
          'div',
          { className: 'text-center' },
          React.createElement('h2', { className: 'text-2xl font-semibold text-foreground mb-4' }, 'Something went wrong!'),
          React.createElement('p', { className: 'text-muted-foreground mb-6' }, 'A global error occurred.'),
          React.createElement(
            'button',
            {
              onClick: () => reset(),
              className: 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2',
            },
            'Try again'
          )
        )
      )
    )
  )
}
