'use client'

// Note: Client components cannot export route segment config
// global-error must be a client component and must include html/body tags
// According to Next.js docs: https://nextjs.org/docs/messages/no-document-import-in-page
// We must use standard HTML tags, not Html/Body components from next/document

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Use standard lowercase html/body tags as required by Next.js
  // This component is client-only and will never be statically generated
  return (
    <html lang="en">
      <body>
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
