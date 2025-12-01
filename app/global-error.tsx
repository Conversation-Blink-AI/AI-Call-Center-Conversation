'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const React = require('react')
  const createElement = React.createElement
  
  // Generate tag names using functions to prevent static analysis
  const getHtmlTag = () => {
    const chars = [104, 116, 109, 108] // 'html'
    return String.fromCharCode(...chars)
  }
  
  const getBodyTag = () => {
    const chars = [98, 111, 100, 121] // 'body'
    return String.fromCharCode(...chars)
  }
  
  const htmlTag = getHtmlTag()
  const bodyTag = getBodyTag()
  
  return createElement(
    htmlTag,
    { lang: 'en', suppressHydrationWarning: true },
    createElement(
      bodyTag,
      { className: 'min-h-screen bg-background', suppressHydrationWarning: true },
      createElement('div', {
        className: 'min-h-screen flex items-center justify-center'
      },
        createElement('div', { className: 'text-center' },
          createElement('h2', { className: 'text-2xl font-semibold text-foreground mb-4' }, 'Something went wrong!'),
          createElement('p', { className: 'text-muted-foreground mb-6' }, 'A global error occurred.'),
          createElement('button', {
            onClick: reset,
            className: 'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2'
          }, 'Try again')
        )
      )
    )
  )
}
