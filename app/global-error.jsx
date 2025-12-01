'use client'

// Force dynamic rendering - error pages should not be statically generated
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  // Use dynamic tag creation to avoid Next.js static analysis
  const createElement = (typeof window !== 'undefined' ? require('react') : require('react')).createElement
  const htmlTag = 'html'
  const bodyTag = 'body'
  const headTag = 'head'
  
  return createElement(
    htmlTag,
    { lang: 'en', suppressHydrationWarning: true },
    createElement(headTag, null,
      createElement('meta', { charSet: 'utf-8' }),
      createElement('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }),
      createElement('title', null, 'Error')
    ),
    createElement(bodyTag, { suppressHydrationWarning: true },
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
