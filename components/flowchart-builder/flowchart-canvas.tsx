'use client'

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useTheme } from 'next-themes'

import { GreetingNode } from './nodes/greeting-node'
import { QuestionNode } from './nodes/question-node'
import { CustomerResponseNode } from './nodes/customer-response-node'
import { EndCallNode } from './nodes/end-call-node'
import { TransferNode } from './nodes/transfer-node'
import { WebhookNode } from './nodes/webhook-node'
import { FacebookPixelNode } from './nodes/facebook-pixel-node'
import { NodeEditorDrawer } from './node-editor-drawer'
import { CustomEdge } from './edges/custom-edge'
import { EdgeEditorDrawer } from './edge-editor-drawer'
import { NodeToolbar } from './node-toolbar'

import { SavePathwayModal } from './save-pathway-modal'
import { UpdatePathwayModal } from './update-pathway-modal'
import { convertBlandToReactFlow } from '../../services/reactflow-converter'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const edgeTypes = { custom: CustomEdge }

interface FlowchartCanvasProps {
  phoneNumber?: string | null
  pathwayInfo?: any
  initialNodes?: Node[]
  initialEdges?: Edge[]
}

export function FlowchartCanvas({
  phoneNumber,
  pathwayInfo,
  initialNodes = [],
  initialEdges = [],
}: FlowchartCanvasProps = {}) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [isEdgeEditorOpen, setIsEdgeEditorOpen] = useState(false)
  const [isLoadingFlowchart, setIsLoadingFlowchart] = useState(false)
  const [toolbarNode, setToolbarNode] = useState<Node | null>(null)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [nodeToDelete, setNodeToDelete] = useState<string | null>(null)
  const [isMinimapDragging, setIsMinimapDragging] = useState(false)
  const minimapRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  const isDarkMode = mounted && (resolvedTheme === 'dark' || theme === 'dark')

  const nodeTypes = useMemo(
    () => ({
      greetingNode: (props: any) => <GreetingNode {...props} />,
      questionNode: (props: any) => <QuestionNode {...props} />,
      customerResponseNode: (props: any) => <CustomerResponseNode {...props} />,
      webhookNode: (props: any) => <WebhookNode {...props} />,
      facebookPixelNode: (props: any) => <FacebookPixelNode {...props} />,
      transferNode: (props: any) => <TransferNode {...props} />,
      endCallNode: (props: any) => <EndCallNode {...props} />,
      Default: (props: any) => <CustomerResponseNode {...props} />,
      'End Call': (props: any) => <EndCallNode {...props} />,
    }),
    [],
  )

  useEffect(() => {
    if (isLoadingFlowchart) return

    if (initialNodes.length > 0 || initialEdges.length > 0) {
      setNodes(initialNodes)
      setEdges(initialEdges)
      return
    }

    const loadSavedFlowchart = async () => {
      if (!pathwayInfo?.pathway_id && !phoneNumber) return

      setIsLoadingFlowchart(true)
      try {
        let apiUrl = ''
        if (pathwayInfo?.pathway_id) {
          apiUrl = `/api/pathways/load-flowchart?pathwayId=${pathwayInfo.pathway_id}`
        } else if (phoneNumber) {
          apiUrl = `/api/pathways/load-flowchart?phoneNumber=${encodeURIComponent(phoneNumber)}`
        }

        const response = await fetch(apiUrl, { credentials: 'include' })
        const result = await response.json()

        if (result.success && result.pathway && result.pathway.flowchart_data) {
          const flowchartData = result.pathway.flowchart_data
          if (flowchartData && flowchartData.nodes && flowchartData.edges) {
            const reactFlowData = convertBlandToReactFlow(flowchartData)
            setNodes(reactFlowData.nodes)
            setEdges(reactFlowData.edges)
            toast.success(`Loaded saved pathway: ${result.pathway.name}`)
          }
        }
      } catch (error) {
        console.error('[FLOWCHART-CANVAS] Error loading saved flowchart:', error)
        toast.error('Failed to load saved pathway')
      } finally {
        setIsLoadingFlowchart(false)
      }
    }

    loadSavedFlowchart()
  }, [pathwayInfo?.pathway_id, phoneNumber])

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find((node) => node.id === params.source)
      if (sourceNode?.type === 'transferNode') {
        toast.error('Cannot connect after Transfer node. Transfer ends the call flow.')
        return
      }

      const newEdge: Edge = {
        ...params,
        id: `edge_${params.source}_${params.target}_${Date.now()}`,
        type: 'custom',
        animated: true,
        data: { label: 'next' },
        style: { stroke: '#3b82f6', strokeWidth: 1 },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges, nodes],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation()
    setToolbarNode(node)
    setToolbarPosition({ x: node.position.x, y: node.position.y })
    setSelectedEdge(null)
    setIsEdgeEditorOpen(false)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setIsEditorOpen(false)
    setSelectedEdge(null)
    setIsEdgeEditorOpen(false)
    setToolbarNode(null)
  }, [])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation()
    setSelectedEdge(edge)
    setIsEdgeEditorOpen(true)
    setSelectedNode(null)
    setIsEditorOpen(false)
  }, [])

  const onUpdateNode = useCallback(
    (nodeId: string, updates: any) => {
      setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, ...updates } : node)))
      setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, ...updates } : prev))
    },
    [setNodes],
  )

  const onUpdateEdge = useCallback(
    (edgeId: string, updates: any) => {
      setEdges((eds) => eds.map((edge) => (edge.id === edgeId ? { ...edge, ...updates } : edge)))
      setSelectedEdge((prev) => (prev?.id === edgeId ? { ...prev, ...updates } : prev))
    },
    [setEdges],
  )

  const onDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId))
      setSelectedEdge(null)
      setIsEdgeEditorOpen(false)
    },
    [setEdges],
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      if (!reactFlowWrapper.current || !reactFlowInstance) return

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNode: Node = {
        id: type === 'greetingNode' ? '1' : `${type}_${Date.now()}`,
        type: type === 'endCallNode' ? 'End Call' : type,
        position,
        data: getDefaultNodeData(type),
        selected: false,
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowInstance, setNodes],
  )

  // Handle minimap click to pan the canvas (for single clicks)
  const handleMinimapClick = useCallback((event: React.MouseEvent, position: { x: number; y: number }) => {
    if (!reactFlowInstance) return
    
    // Get the ReactFlow pane element to get actual dimensions
    const paneElement = reactFlowWrapper.current?.querySelector('.react-flow__pane') as HTMLElement
    const paneWidth = paneElement?.clientWidth || window.innerWidth || 800
    const paneHeight = paneElement?.clientHeight || window.innerHeight || 600
    
    // Get current viewport
    const viewport = reactFlowInstance.getViewport()
    
    // Calculate new viewport position to center on the clicked point
    // position is already in flow coordinates from ReactFlow
    const newX = -position.x * viewport.zoom + paneWidth / 2
    const newY = -position.y * viewport.zoom + paneHeight / 2
    
    reactFlowInstance.setViewport({ x: newX, y: newY, zoom: viewport.zoom })
  }, [reactFlowInstance, reactFlowWrapper])

  // Attach event listeners directly to minimap DOM element
  useEffect(() => {
    if (!minimapRef.current || !reactFlowInstance) return

    let cleanup: (() => void) | null = null
    let retryTimeout: NodeJS.Timeout | null = null

    const setupMinimapListeners = () => {
      const minimapElement = minimapRef.current?.querySelector('.react-flow__minimap') as HTMLElement
      if (!minimapElement) {
        // Retry after a short delay if minimap isn't ready
        retryTimeout = setTimeout(setupMinimapListeners, 100)
        return
      }

      const minimapSvg = minimapElement.querySelector('svg') as SVGSVGElement
      if (!minimapSvg) {
        retryTimeout = setTimeout(setupMinimapListeners, 100)
        return
      }

      const calculateFlowPosition = (clientX: number, clientY: number) => {
        const svgRect = minimapSvg.getBoundingClientRect()
        const clickX = clientX - svgRect.left
        const clickY = clientY - svgRect.top

        // Get the viewBox from the SVG
        const viewBox = minimapSvg.viewBox.baseVal
        const viewBoxX = viewBox.x
        const viewBoxY = viewBox.y
        const viewBoxWidth = viewBox.width
        const viewBoxHeight = viewBox.height

        // Calculate the position in flow coordinates
        const flowX = viewBoxX + (clickX / svgRect.width) * viewBoxWidth
        const flowY = viewBoxY + (clickY / svgRect.height) * viewBoxHeight

        return { flowX, flowY }
      }

      const panToPosition = (flowX: number, flowY: number) => {
        const paneElement = reactFlowWrapper.current?.querySelector('.react-flow__pane') as HTMLElement
        const paneWidth = paneElement?.clientWidth || window.innerWidth || 800
        const paneHeight = paneElement?.clientHeight || window.innerHeight || 600
        const viewport = reactFlowInstance.getViewport()
        
        const newX = -flowX * viewport.zoom + paneWidth / 2
        const newY = -flowY * viewport.zoom + paneHeight / 2
        
        reactFlowInstance.setViewport({ x: newX, y: newY, zoom: viewport.zoom })
      }

      let isDragging = false

      const handleMouseDown = (e: MouseEvent) => {
        // Allow dragging anywhere on the minimap
        const target = e.target as HTMLElement
        const isMinimapArea = target.closest('.react-flow__minimap') || 
                             target.tagName === 'svg' || 
                             target.tagName === 'rect' ||
                             target.closest('.react-flow__minimap-mask')
        
        if (isMinimapArea) {
          e.preventDefault()
          e.stopPropagation()
          isDragging = true
          setIsMinimapDragging(true)
          
          const { flowX, flowY } = calculateFlowPosition(e.clientX, e.clientY)
          panToPosition(flowX, flowY)
        }
      }

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return
        
        e.preventDefault()
        e.stopPropagation()
        
        const { flowX, flowY } = calculateFlowPosition(e.clientX, e.clientY)
        panToPosition(flowX, flowY)
      }

      const handleMouseUp = () => {
        if (isDragging) {
          isDragging = false
          setIsMinimapDragging(false)
        }
      }

      // Attach listeners to both the minimap element and SVG (capture phase)
      minimapElement.addEventListener('mousedown', handleMouseDown, true)
      minimapSvg.addEventListener('mousedown', handleMouseDown, true)
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)

      cleanup = () => {
        minimapElement.removeEventListener('mousedown', handleMouseDown, true)
        minimapSvg.removeEventListener('mousedown', handleMouseDown, true)
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }

    setupMinimapListeners()

    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout)
      }
      if (cleanup) {
        cleanup()
      }
    }
  }, [reactFlowInstance, reactFlowWrapper, nodes.length])

  const getDefaultNodeData = (nodeType: string) => {
    switch (nodeType) {
      case 'greetingNode':
        return { name: 'Start', text: 'Hey there, how are you doing today?', isStart: true }
      case 'questionNode':
        return { name: 'New Question', text: 'What would you like to know?' }
      case 'customerResponseNode':
        return { name: 'Customer Response', text: 'Waiting for customer response...' }
      case 'webhookNode':
        return {
          name: 'Webhook Request',
          text: 'Please give me a moment as I check our system..',
          url: '',
          method: 'POST',
          body: '',
          extractVars: [],
          responseData: [],
          headers: [],
          authorization: '',
          authType: 'none',
          contentType: 'application/json',
          timeout: 10,
          retryAttempts: 0,
          rerouteServer: false,
        }
      case 'transferNode':
        return {
          name: 'Transfer Call',
          text: 'Transferring the call now. Please hold..',
          transferNumber: '+1234567890',
        }
      case 'endCallNode':
        return { name: 'End Call', prompt: 'Say goodbye to the user' }
      case 'facebookPixelNode':
        return {
          name: 'Facebook Pixel Event',
          pixelId: '',
          accessToken: '',
          eventName: 'Lead',
          actionSource: 'phone_call',
          eventData: {},
        }
      default:
        return { name: 'Unknown Node' }
    }
  }

  return (
    <>
      <div className="w-full h-full relative" ref={reactFlowWrapper}>
        {isLoadingFlowchart && (
          <div className="absolute inset-0 bg-background/75 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              <span className="text-sm text-foreground">Loading saved pathway...</span>
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <SavePathwayModal reactFlowData={{ nodes, edges }} pathwayId={pathwayInfo?.pathway_id} />
          <UpdatePathwayModal reactFlowData={{ nodes, edges }} pathwayId={pathwayInfo?.pathway_id} phoneNumber={phoneNumber} />
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onPaneClick={onPaneClick}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          className="bg-background"
        >
          <Controls />
          <div
            ref={minimapRef}
            style={{ cursor: isMinimapDragging ? 'grabbing' : 'grab', display: 'inline-block', userSelect: 'none' }}
            className="react-flow__minimap-wrapper"
          >
            <MiniMap 
              onClick={handleMinimapClick}
            />
          </div>
          <Background
            variant="dots"
            gap={12}
            size={1.5}
            color={isDarkMode ? '#4a5568' : '#e2e8f0'}
          />
        </ReactFlow>

        {toolbarNode && (
          <NodeToolbar
            nodeId={toolbarNode.id}
            position={toolbarPosition}
            onEdit={() => {
              // Normalize node type to ensure editor drawer recognizes it
              const normalizedNode = {
                ...toolbarNode,
                type: toolbarNode.type === 'Webhook' ? 'webhookNode' : toolbarNode.type
              }
              setSelectedNode(normalizedNode)
              setIsEditorOpen(true)
              setToolbarNode(null)
            }}
            onDelete={() => {
              setNodeToDelete(toolbarNode.id)
              setDeleteDialogOpen(true)
            }}
            onDuplicate={() => {
              const nodeToDuplicate = nodes.find((n) => n.id === toolbarNode.id)
              if (!nodeToDuplicate) return
              const newNode: Node = {
                ...nodeToDuplicate,
                id: `${nodeToDuplicate.type}_${Date.now()}`,
                position: {
                  x: nodeToDuplicate.position.x + 50,
                  y: nodeToDuplicate.position.y + 50,
                },
                selected: false,
                data: {
                  ...nodeToDuplicate.data,
                  name: nodeToDuplicate.data.name
                    ? `${nodeToDuplicate.data.name} (Copy)`
                    : 'Copy',
                },
              }
              setNodes((nds) => [...nds, newNode])
              setToolbarNode(null)
            }}
          />
        )}
      </div>

      <NodeEditorDrawer
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        selectedNode={selectedNode}
        onUpdateNode={onUpdateNode}
      />

      <EdgeEditorDrawer
        isOpen={isEdgeEditorOpen}
        onClose={() => setIsEdgeEditorOpen(false)}
        selectedEdge={selectedEdge}
        onUpdateEdge={onUpdateEdge}
        onDeleteEdge={onDeleteEdge}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open)
          if (!open) {
            setToolbarNode(null)
            setNodeToDelete(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Node</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this node? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (nodeToDelete) {
                  setNodes((nds) => nds.filter((n) => n.id !== nodeToDelete))
                  setEdges((eds) => eds.filter((e) => e.source !== nodeToDelete && e.target !== nodeToDelete))
                  setToolbarNode(null)
                  setNodeToDelete(null)
                }
                setDeleteDialogOpen(false)
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
