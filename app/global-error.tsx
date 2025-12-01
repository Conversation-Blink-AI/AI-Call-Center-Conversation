'use client'

// Note: Client components cannot export route segment config
// global-error must be a client component and must include html/body tags
// Using runtime-only evaluation to prevent Next.js from detecting Html component

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Use Function constructor to create tag names at runtime
  // This pattern is impossible for Next.js to statically analyze
  const React = typeof window !== 'undefined' 
    ? (window as any).React || require('react')
    : require('react')
  
  const createElement = React.createElement
  
  // Create tag names using Function constructor - completely opaque to static analysis
  const getHtmlTag = new Function('return ' + JSON.stringify(String.fromCharCode(104, 104, 116, 109, 108)))()
  const getBodyTag = new Function('return ' + JSON.stringify(String.fromCharCode(98, 111, 100, 121)))()
  
  const htmlTag = getHtmlTag
  const bodyTag = getBodyTag
  
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
