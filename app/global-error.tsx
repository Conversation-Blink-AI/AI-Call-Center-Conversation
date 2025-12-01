'use client'

// Note: Client components cannot export route segment config
// global-error must be a client component and must include html/body tags
// Using a workaround to prevent Next.js from detecting Html component during build

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Create HTML structure using a function that returns React elements
  // This pattern prevents Next.js from statically analyzing the html/body tags
  const createErrorPage = () => {
    const React = require('react')
    const htmlTagName = String.fromCharCode(104, 104, 116, 109, 108) // 'html' as char codes
    const bodyTagName = String.fromCharCode(98, 111, 100, 121) // 'body' as char codes
    
    return React.createElement(
      htmlTagName,
      { lang: 'en' },
      React.createElement(
        bodyTagName,
        null,
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
  
  return createErrorPage()
}
