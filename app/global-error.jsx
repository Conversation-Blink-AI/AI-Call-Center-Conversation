'use client'

// Force dynamic rendering - error pages should not be statically generated
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function GlobalError({ error, reset }) {
  // In Next.js App Router, global-error MUST include html and body tags
  // Using lowercase tags (not Html/Body components) to avoid detection
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error</title>
      </head>
      <body suppressHydrationWarning>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>
              Something went wrong!
            </h2>
            <p style={{ marginBottom: '1.5rem', opacity: 0.8 }}>
              A global error occurred.
            </p>
            <button
              onClick={reset}
              style={{
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
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6'
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
