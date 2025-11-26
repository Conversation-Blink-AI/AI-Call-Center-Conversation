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
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'

// Import custom nodes
import { GreetingNode } from './nodes/greeting-node'
import { QuestionNode } from './nodes/question-node'
import { CustomerResponseNode } from './nodes/customer-response-node'
import { EndCallNode } from './nodes/end-call-node'
import { TransferNode } from './nodes/transfer-node'
import { WebhookNode } from './nodes/webhook-node'
import { FacebookPixelNode } from './nodes/facebook-pixel-node' // Import FacebookPixelNode
import { NodeEditorDrawer } from './node-editor-drawer'
import { CustomEdge } from './edges/custom-edge'
import { EdgeEditorDrawer } from './edge-editor-drawer'
import { NodeToolbar } from './node-toolbar'

import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { ScrollArea } from '../ui/scroll-area'
import { toast } from 'sonner'
import { convertReactFlowToBland, convertBlandToReactFlow } from '../../services/reactflow-converter'
import { UpdatePathwayModal } from './update-pathway-modal'
import { SavePathwayModal } from './save-pathway-modal'

// Custom edge types
const edgeTypes = {
  custom: CustomEdge,
}

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
  initialEdges = []
}: FlowchartCanvasProps = {}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [isEdgeEditorOpen, setIsEdgeEditorOpen] = useState(false)
  const [isJsonPreviewOpen, setIsJsonPreviewOpen] = useState(false)
  const [isConvertedJsonOpen, setIsConvertedJsonOpen] = useState(false)
  const [isLoadingFlowchart, setIsLoadingFlowchart] = useState(false)
  const [toolbarNode, setToolbarNode] = useState<Node | null>(null)
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 })

  const onEditNode = useCallback((node: Node) => {
    setSelectedNode(node)
    setIsEditorOpen(true)
  }, [])

  const onDuplicateNode = useCallback((nodeId: string) => {
    const nodeToDuplicate = nodes.find(node => node.id === nodeId)
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
        name: nodeToDuplicate.data.name ? `${nodeToDuplicate.data.name} (Copy)` : 'Copy',
      }
    }

    setNodes((nds) => [...nds, newNode])
    setToolbarNode(null) // Hide toolbar after duplication
  }, [nodes, setNodes])

  const onDeleteNode = useCallback((nodeId: string) => {
    // Remove the node
    setNodes((nds) => nds.filter((node) => node.id !== nodeId))

    // Remove all connected edges
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))

    // Close any open editors if this node was selected
    setSelectedNode((prevSelected) =>
      prevSelected?.id === nodeId ? null : prevSelected
    )
    if (selectedNode?.id === nodeId) {
      setIsEditorOpen(false)
    }
  }, [setNodes, setEdges, selectedNode])

  const nodeTypes = useMemo(() => ({
    greetingNode: (props: any) => <GreetingNode {...props} />,
    questionNode: (props: any) => <QuestionNode {...props} />,
    customerResponseNode: (props: any) => <CustomerResponseNode {...props} />,
    webhookNode: (props: any) => <WebhookNode {...props} />,
    facebookPixelNode: (props: any) => <FacebookPixelNode {...props} />, // Add FacebookPixelNode
    transferNode: (props: any) => <TransferNode {...props} />,
    endCallNode: (props: any) => <EndCallNode {...props} />,
    Default: (props: any) => <CustomerResponseNode {...props} />,
    'End Call': (props: any) => <EndCallNode {...props} />,
  }), [])

  // Load saved flowchart data when component mounts OR set initial data
  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (isLoadingFlowchart) return

    // If initial data is provided, use it immediately
    if (initialNodes.length > 0 || initialEdges.length > 0) {
      console.log('[FLOWCHART-CANVAS] Setting initial data:', { nodes: initialNodes.length, edges: initialEdges.length })
      setNodes(initialNodes)
      setEdges(initialEdges)
      return
    }

    // Otherwise load saved flowchart data
    const loadSavedFlowchart = async () => {
      if (!pathwayInfo?.pathway_id) return

      console.log('[FLOWCHART-CANVAS] Loading pathway:', pathwayInfo.pathway_id)
      setIsLoadingFlowchart(true)
      try {
        const response = await fetch(`/api/pathways/load-flowchart?pathwayId=${pathwayInfo.pathway_id}`, {
          credentials: 'include'
        })
        const result = await response.json()

        console.log('[FLOWCHART-CANVAS] Load response:', result)

        if (result.success && result.pathway && result.pathway.flowchart_data) {
          const flowchartData = result.pathway.flowchart_data

          // Convert Bland format back to ReactFlow format
          if (flowchartData.nodes && flowchartData.edges) {
            const reactFlowData = convertBlandToReactFlow(flowchartData)
            setNodes(reactFlowData.nodes)
            setEdges(reactFlowData.edges)

            toast.success(`Loaded saved pathway: ${result.pathway.name}`)
          } else {
            console.log('[FLOWCHART-CANVAS] No flowchart data found, starting with empty canvas')
          }
        } else {
          console.log('[FLOWCHART-CANVAS] No pathway data found or failed to load')
        }
      } catch (error) {
        console.error('[FLOWCHART-CANVAS] Error loading saved flowchart:', error)
        toast.error('Failed to load saved pathway')
      } finally {
        setIsLoadingFlowchart(false)
      }
    }

    loadSavedFlowchart()
  }, [pathwayInfo?.pathway_id]) // Removed unstable dependencies

  const onConnect = useCallback(
    (params: Connection) => {
      // Check if the source node is a Transfer node
      const sourceNode = nodes.find(node => node.id === params.source)
      
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
        style: { stroke: '#3b82f6', strokeWidth: 2 },
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

    // Set the toolbar node and position
    setToolbarNode(node)
    setToolbarPosition({
      x: node.position.x,
      y: node.position.y
    })

    // Clear edge selection
    setSelectedEdge(null)
    setIsEdgeEditorOpen(false)
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setIsEditorOpen(false)
    setSelectedEdge(null)
    setIsEdgeEditorOpen(false)
    setToolbarNode(null) // Hide toolbar when clicking on canvas
  }, [])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation()
    setSelectedEdge(edge)
    setIsEdgeEditorOpen(true)
    setSelectedNode(null)
    setIsEditorOpen(false)
  }, [])

  const onUpdateNode = useCallback((nodeId: string, updates: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, ...updates }
          : node
      )
    )

    // Update selectedNode if it's the one being edited
    setSelectedNode((prevSelected) =>
      prevSelected?.id === nodeId
        ? { ...prevSelected, ...updates }
        : prevSelected
    )
  }, [setNodes])

  const onUpdateEdge = useCallback((edgeId: string, updates: any) => {
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === edgeId
          ? { ...edge, ...updates }
          : edge
      )
    )

    // Update selectedEdge if it's the one being edited
    setSelectedEdge((prevSelected) =>
      prevSelected?.id === edgeId
        ? { ...prevSelected, ...updates }
        : prevSelected
    )
  }, [setEdges])

  const onDeleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId))
    setSelectedEdge(null)
    setIsEdgeEditorOpen(false)
  }, [setEdges])

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

  const getDefaultNodeData = (nodeType: string) => {
    switch (nodeType) {
      case 'greetingNode':
        return {
          name: 'Start',
          text: 'Hey there, how are you doing today?',
          isStart: true,
        }
      case 'questionNode':
        return {
          name: 'New Question',
          text: 'What would you like to know?',
        }
      case 'customerResponseNode':
        return {
          name: 'Customer Response',
          text: 'Waiting for customer response...',
        }
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
        return {
          name: 'End Call',
          prompt: 'Say goodbye to the user',
        }
      case 'facebookPixelNode': // Default data for Facebook Pixel Node
        return {
          name: 'Facebook Pixel Event',
          pixelId: '',
          accessToken: '',
          eventName: 'Lead',
          actionSource: 'phone_call', // Default to phone_call
          eventData: {}, // For custom_data and other fields
        }
      default:
        return { name: 'Unknown Node' }
    }
  }

  const handleJsonPreview = useCallback(() => {
    setIsJsonPreviewOpen(true)
  }, [])

  const handleConvertedJsonPreview = useCallback(() => {
    setIsConvertedJsonOpen(true)
  }, [])

  return (
    <>
      <div className="w-full h-full relative" ref={reactFlowWrapper}>
        {isLoadingFlowchart && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              <span className="text-sm text-gray-600">Loading saved pathway...</span>
            </div>
          </div>
        )}
        {/* Floating Buttons */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <SavePathwayModal
              reactFlowData={{ nodes, edges }}
              pathwayId={pathwayInfo?.pathway_id}
            />
        <UpdatePathwayModal reactFlowData={{ nodes, edges }} />
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
          fitView
          className="bg-gray-50"
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>

        {/* Node Toolbar */}
        {toolbarNode && (
          <NodeToolbar
            nodeId={toolbarNode.id}
            position={toolbarPosition}
            onEdit={() => {
              onEditNode(toolbarNode)
              setToolbarNode(null)
            }}
            onDelete={() => {
              if (window.confirm('Are you sure you want to delete this node?')) {
                onDeleteNode(toolbarNode.id)
                setToolbarNode(null)
              }
            }}
            onDuplicate={() => onDuplicateNode(toolbarNode.id)}
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
    </>
  )
}