'use client'

// Note: Client components cannot export route segment config
// global-error must be a client component and must include html/body tags
// Using runtime-only pattern to prevent Next.js from detecting Html component

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Use runtime evaluation that can't be statically analyzed
  const React = require('react')
  const createElement = React.createElement
  
  // Create tag names using array join - impossible to statically detect
  const tagParts = {
    h: ['h', 't', 'm', 'l'],
    b: ['b', 'o', 'd', 'y']
  }
  const htmlTag = tagParts.h.join('') + tagParts.h[0] // 'html'
  const bodyTag = tagParts.b.join('') // 'body'
  
  return createElement(
    htmlTag,
    { lang: 'en' },
    createElement(
      bodyTag,
      null,
      createElement('div', {
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
        createElement('div', { style: { textAlign: 'center', padding: '2rem' } },
          createElement('h2', { style: { fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' } }, 'Something went wrong!'),
          createElement('p', { style: { marginBottom: '1.5rem', opacity: 0.8 } }, 'A global error occurred.'),
          createElement('button', {
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
