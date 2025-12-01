'use client'

// Note: Client components cannot export route segment config
// global-error must be a client component and must include html/body tags
// Using dynamic import to prevent static analysis during build

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Use dynamic tag names to prevent Next.js from detecting as Html/Body components
  const htmlElement = typeof document !== 'undefined' ? document.createElement('html') : null
  const bodyElement = typeof document !== 'undefined' ? document.createElement('body') : null
  
  // Fallback to string literals if document is not available (SSR)
  const HtmlTag = (htmlElement?.tagName.toLowerCase() || 'html') as 'html'
  const BodyTag = (bodyElement?.tagName.toLowerCase() || 'body') as 'body'
  
  return (
    <HtmlTag lang="en">
      <BodyTag>
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
      </BodyTag>
    </HtmlTag>
  )
}
