'use client'

import React from 'react'
import { ReactFlowProvider } from 'reactflow'
import { FlowchartCanvas } from './flowchart-canvas'
import { NodePalette } from './node-palette'

interface FlowchartBuilderProps {
  className?: string
  phoneNumber?: string | null
  pathwayInfo?: any
}

export function FlowchartBuilder({ className, phoneNumber, pathwayInfo }: FlowchartBuilderProps = {}) {
  return (
    <ReactFlowProvider>
      <div className={`flex h-full ${className || ''}`}>
        {/* Node Palette - Left Side */}
        <div className="flex-shrink-0">
          <NodePalette />
        </div>

        {/* Main Canvas - Right Side */}
        <div className="flex-1 relative">
          <FlowchartCanvas phoneNumber={phoneNumber} pathwayInfo={pathwayInfo} />
        </div>
      </div>
    </ReactFlowProvider>
  )
}