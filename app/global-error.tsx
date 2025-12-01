'use client'

import React from 'react'

// Note: Client components cannot export route segment config
// global-error must be a client component and must include html/body tags

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Use React.createElement with string literals to avoid Next.js detecting as Html/Body components
  const htmlTag = 'html'
  const bodyTag = 'body'
  
  return React.createElement(
    htmlTag,
    { lang: 'en', suppressHydrationWarning: true },
    React.createElement(
      bodyTag,
      { suppressHydrationWarning: true },
      React.createElement('div', {
        style: {
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif'
        }
      },
        React.createElement('div', { style: { textAlign: 'center', padding: '2rem' } },
          React.createElement('h2', { style: { fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' } }, 'Something went wrong!'),
          React.createElement('p', { style: { marginBottom: '1.5rem', opacity: 0.8 } }, 'A global error occurred.'),
          React.createElement('button', {
            onClick: reset,
            style: {
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            },
            onMouseOver: (e: any) => {
              e.currentTarget.style.backgroundColor = '#2563eb'
            },
            onMouseOut: (e: any) => {
              e.currentTarget.style.backgroundColor = '#3b82f6'
            }
          }, 'Try again')
        )
      )
    )
  )
}
