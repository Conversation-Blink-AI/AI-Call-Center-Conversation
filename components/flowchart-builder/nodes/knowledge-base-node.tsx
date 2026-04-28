'use client'

import React from 'react'
import { Handle, Position } from 'reactflow'
import { BookOpen } from 'lucide-react'

interface KnowledgeBaseNodeData {
  name?: string
  prompt?: string
  kb?: string
  kbName?: string
}

export function KnowledgeBaseNode({
  data,
  selected,
}: {
  data: KnowledgeBaseNodeData
  selected?: boolean
}) {
  return (
    <div
      className={`
        group relative bg-gradient-to-br from-indigo-50 via-white to-indigo-50 dark:from-indigo-800 dark:via-indigo-700 dark:to-indigo-800 rounded-lg shadow-lg w-[255px] h-[100px] overflow-visible
        hover:shadow-xl transition-all duration-200 cursor-pointer
        ${selected ? 'ring-2 ring-blue-500' : ''}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="transition-all z-[9999] rounded-full"
        style={{
          background: 'white',
          border: '0.5px solid #3b82f6',
          width: '12px',
          height: '12px',
          transformOrigin: '50% 50%',
        }}
      />

      <div className="bg-gradient-to-r from-indigo-100 to-indigo-50 dark:from-indigo-900 dark:to-indigo-800 text-indigo-800 dark:text-indigo-100 px-1.5 py-0.5 border-b border-indigo-200 dark:border-indigo-700 rounded-t-lg">
        <div className="flex items-center space-x-1">
          <BookOpen className="w-5 h-5 flex-shrink-0" />
          <span className="text-[14px] font-medium">Knowledge Base</span>
        </div>
      </div>

      <div className="p-1.5 flex-1">
        <div className="h-full flex flex-col">
          <div
            className="text-[14px] font-medium text-gray-900 dark:text-gray-100 truncate"
            title={data.name || 'Knowledge Base'}
          >
            {data.name || 'Knowledge Base'}
          </div>

          {data.kbName ? (
            <div className="text-[11px] text-indigo-700 dark:text-indigo-200 mt-0.5 truncate" title={data.kbName}>
              KB: {data.kbName}
            </div>
          ) : null}

          <div
            className="text-[12px] opacity-80 text-gray-700 dark:text-gray-300 mt-0.5 overflow-hidden leading-tight"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            title={data.prompt}
          >
            {data.prompt || 'Configure the knowledge base prompt'}
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="transition-all z-[9999] rounded-full"
        style={{
          background: 'white',
          border: '0.5px solid #3b82f6',
          width: '12px',
          height: '12px',
          transformOrigin: '50% 50%',
          marginTop: '6px',
        }}
      />
    </div>
  )
}
