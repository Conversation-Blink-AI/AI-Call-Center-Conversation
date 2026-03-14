'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

const MIN_HEIGHT_PX = 80
const MAX_HEIGHT_PX = 400

interface AutoResizeTextareaProps extends React.ComponentProps<'textarea'> {
  /** Minimum height in pixels (default: 80) */
  minHeight?: number
  /** Maximum height in pixels; beyond this, inner scroll appears (default: 400) */
  maxHeight?: number
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, value, onChange, minHeight = MIN_HEIGHT_PX, maxHeight = MAX_HEIGHT_PX, ...props }, ref) => {
    const internalRef = React.useRef<HTMLTextAreaElement | null>(null)
    const mergedRef = (el: HTMLTextAreaElement | null) => {
      internalRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
    }

    const adjustHeight = React.useCallback(() => {
      const el = internalRef.current
      if (!el) return
      el.style.height = 'auto'
      const next = Math.min(maxHeight, Math.max(minHeight, el.scrollHeight))
      el.style.height = `${next}px`
    }, [minHeight, maxHeight])

    React.useLayoutEffect(() => {
      adjustHeight()
    }, [value, adjustHeight])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e)
      // Height is updated in useLayoutEffect from new value
    }

    return (
      <textarea
        className={cn(
          'flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm overflow-y-auto',
          className
        )}
        ref={mergedRef}
        value={value}
        onChange={handleChange}
        style={{ minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
        {...props}
      />
    )
  }
)
AutoResizeTextarea.displayName = 'AutoResizeTextarea'

export { AutoResizeTextarea }
