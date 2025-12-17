'use client'

import React, { useEffect, useRef } from 'react'

interface PerspectiveBackgroundProps {
  color?: string
}

export function PerspectiveBackground({ color = '#fffef7' }: PerspectiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      // Get parent container dimensions
      const parent = canvas.parentElement
      if (!parent) return
      
      const rect = parent.getBoundingClientRect()
      const width = Math.max(rect.width, 5000) // At least 5000px wide
      const height = Math.max(rect.height, 5000) // At least 5000px tall
      
      // Set actual canvas size (device pixel ratio for crisp rendering)
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      
      // Set display size
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      
      // Scale context for device pixel ratio
      ctx.scale(dpr, dpr)

      ctx.clearRect(0, 0, width, height)
      
      // Convert hex to RGB
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)

      const horizonY = height * 0.25 // Horizon position
      const centerX = width / 2
      const baseSpacing = 35 // Base spacing at bottom
      const baseSize = 2.5 // Base dot size at bottom

      // Draw dots with perspective
      for (let y = height; y > -100; y -= 2) {
        const distanceFromHorizon = Math.max(0, y - horizonY)
        const normalizedDistance = distanceFromHorizon / (height - horizonY)
        
        // Scale increases as we go down (closer to viewer)
        const scale = 0.2 + normalizedDistance * 1.8
        const dotSize = baseSize * scale
        const spacing = baseSpacing * scale
        
        // Opacity: more visible at bottom, fade near horizon
        const opacity = Math.min(1, normalizedDistance * 1.5) * 0.6
        
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
        
        // Draw horizontal row of dots
        for (let x = -spacing; x < width + spacing; x += spacing) {
          // Perspective convergence: dots move towards center as they approach horizon
          const offsetFromCenter = x - centerX
          const perspectiveOffset = offsetFromCenter * (1 - normalizedDistance * 0.4)
          const dotX = centerX + perspectiveOffset
          
          ctx.beginPath()
          ctx.arc(dotX, y, dotSize, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    draw()
    
    // Redraw on resize
    const resizeObserver = new ResizeObserver(() => {
      // Only redraw if canvas size actually changed
      draw()
    })
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement)
    }

    return () => resizeObserver.disconnect()
  }, [color])

  return (
    <div className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
      <canvas
        ref={canvasRef}
        className="perspective-background-canvas"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
