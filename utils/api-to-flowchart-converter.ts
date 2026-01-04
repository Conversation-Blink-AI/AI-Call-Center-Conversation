export interface ApiNode {
  id: string
  type: string
  data: any
}

export interface ApiEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface ApiResponse {
  nodes: ApiNode[]
  edges: ApiEdge[]
  name?: string
  description?: string
}

export interface FlowchartData {
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: any
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    type?: string
    animated?: boolean
    data?: { label: string }
    style?: any
  }>
}

export function convertApiResponseToFlowchart(apiResponse: ApiResponse): FlowchartData {
  console.log('🔄 Converting API response to flowchart format...')

  // Convert nodes with positioning
  const nodes = apiResponse.nodes.map((node, index) => ({
    id: node.id,
    type: node.type,
    position: {
      x: 250 + (index % 3) * 300,
      y: 100 + Math.floor(index / 3) * 150
    },
    data: node.data
  }))

  // Convert edges with styling
  const edges = apiResponse.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'custom',
    animated: true,
    data: { label: edge.label || 'next' },
    style: { stroke: '#3b82f6', strokeWidth: 2 }
  }))

  const result = {
    nodes,
    edges
  }

  console.log('✅ Conversion complete:', {
    apiNodes: apiResponse.nodes.length,
    flowchartNodes: nodes.length,
    apiEdges: apiResponse.edges.length,
    flowchartEdges: edges.length
  })

  return result
}
import type { Node, Edge } from 'reactflow'

export interface ApiNode {
  id: string
  type: string
  data: any
  position?: { x: number; y: number }
}

export interface ApiEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface ApiFlowData {
  nodes: ApiNode[]
  edges: ApiEdge[]
}

export interface ReactFlowData {
  nodes: Node[]
  edges: Edge[]
}

/**
 * Converts raw API JSON data (from OpenRouter) to ReactFlow format
 * Adds UI-specific properties and ensures proper node types
 */
export function convertApiToReactFlow(apiData: ApiFlowData): ReactFlowData {
  console.log('🔄 Converting API data to ReactFlow format...')

  // Convert nodes with proper ReactFlow structure
  const reactFlowNodes: Node[] = apiData.nodes.map((node, index) => {
    // Determine proper node type based on API response
    let nodeType = mapApiNodeTypeToReactFlow(node.type)

    // Use provided position if available, otherwise will be set by enhanceFlowchartLayout
    // Don't set default positions here - let the tree layout algorithm handle it
    const position = node.position || {
      x: 0, // Will be calculated by enhanceFlowchartLayout
      y: 0  // Will be calculated by enhanceFlowchartLayout
    }

    // Clean and enhance node data
    const nodeData = {
      ...node.data,
      name: node.data.name || getDefaultNodeName(nodeType),
      text: node.data.text || getDefaultNodeText(nodeType)
    }

    return {
      id: node.id,
      type: nodeType,
      position,
      data: nodeData,
      selected: false
    }
  })

  // Convert edges with proper ReactFlow structure
  const reactFlowEdges: Edge[] = apiData.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'custom',
    animated: true,
    label: edge.label || 'next',
    data: { label: edge.label || 'next' },
    style: { stroke: '#3b82f6', strokeWidth: 2 }
  }))

  const result = {
    nodes: reactFlowNodes,
    edges: reactFlowEdges
  }

  console.log('✅ API to ReactFlow conversion complete:', {
    apiNodes: apiData.nodes.length,
    reactFlowNodes: reactFlowNodes.length,
    apiEdges: apiData.edges.length,
    reactFlowEdges: reactFlowEdges.length
  })

  return result
}

/**
 * Maps API node types to ReactFlow node types
 */
function mapApiNodeTypeToReactFlow(apiType: string): string {
  const typeMap: { [key: string]: string } = {
    'greeting': 'greetingNode',
    'greetingNode': 'greetingNode',
    'question': 'questionNode',
    'questionNode': 'questionNode',
    'response': 'customerResponseNode',
    'AI Response': 'customerResponseNode',
    'customer-response': 'customerResponseNode',
    'customerResponseNode': 'customerResponseNode',
    'webhook': 'webhookNode',
    'webhookNode': 'webhookNode',
    'facebookPixel': 'facebookPixelNode',
    'facebookPixelNode': 'facebookPixelNode',
    'facebook-pixel': 'facebookPixelNode',
    'transfer': 'transferNode',
    'transferNode': 'transferNode',
    'end-call': 'endCallNode',
    'endCallNode': 'endCallNode',
    'End Call': 'endCallNode'
  }

  return typeMap[apiType] || 'customerResponseNode'
}

/**
 * Gets default name for node type
 */
function getDefaultNodeName(nodeType: string): string {
  const nameMap: { [key: string]: string } = {
    'greetingNode': 'Greeting',
    'questionNode': 'Question',
    'customerResponseNode': 'Customer Response',
    'webhookNode': 'Webhook Request',
    'facebookPixelNode': 'Facebook Pixel Event',
    'transferNode': 'Transfer Call',
    'endCallNode': 'End Call'
  }

  return nameMap[nodeType] || 'Node'
}

/**
 * Gets default text for node type
 */
function getDefaultNodeText(nodeType: string): string {
  const textMap: { [key: string]: string } = {
    'greetingNode': 'Hello! How can I help you today?',
    'questionNode': 'What would you like to know?',
    'customerResponseNode': 'Waiting for customer response...',
    'webhookNode': 'Please give me a moment as I check our system..',
    'facebookPixelNode': 'Tracking conversion event...',
    'transferNode': 'Transferring the call now. Please hold..',
    'endCallNode': 'Thank you for your time. Have a great day!'
  }

  return textMap[nodeType] || 'Default message'
}

/**
 * Validates API data structure
 */
export function validateApiData(data: any): data is ApiFlowData {
  return (
    data &&
    Array.isArray(data.nodes) &&
    Array.isArray(data.edges) &&
    data.nodes.every((node: any) => node.id && node.type && node.data) &&
    data.edges.every((edge: any) => edge.id && edge.source && edge.target)
  )
}

/**
 * Enhances flowchart with tree-based hierarchical positioning
 */
export function enhanceFlowchartLayout(data: ReactFlowData): ReactFlowData {
  console.log('🎨 Enhancing flowchart layout with tree structure...')

  const { nodes, edges } = data
  
  // Find root node (node with no incoming edges, or greeting node)
  const rootNode = nodes.find(node => {
    const isGreeting = node.type === 'greetingNode' || 
                      node.data?.isStart === true ||
                      node.data?.name?.toLowerCase().includes('greeting')
    if (isGreeting) return true
    
    // Check if node has no incoming edges
    return !edges.some(edge => edge.target === node.id)
  }) || nodes[0] // Fallback to first node

  if (!rootNode) {
    console.warn('⚠️ No root node found, using default layout')
    return data
  }

  // Build adjacency list (children map)
  const childrenMap = new Map<string, string[]>()
  const parentMap = new Map<string, string>()
  
  edges.forEach(edge => {
    if (!childrenMap.has(edge.source)) {
      childrenMap.set(edge.source, [])
    }
    childrenMap.get(edge.source)!.push(edge.target)
    parentMap.set(edge.target, edge.source)
  })

  // Calculate tree structure (depth and horizontal position)
  const nodeInfo = new Map<string, { depth: number; x: number; subtreeWidth: number }>()
  const HORIZONTAL_SPACING = 300
  const VERTICAL_SPACING = 200
  const START_X = 400
  const START_Y = 50

  // Calculate subtree widths using DFS
  function calculateSubtreeWidth(nodeId: string, depth: number): number {
    const children = childrenMap.get(nodeId) || []
    
    if (children.length === 0) {
      // Leaf node - takes minimum width
      nodeInfo.set(nodeId, { depth, x: 0, subtreeWidth: HORIZONTAL_SPACING })
      return HORIZONTAL_SPACING
    }

    // Calculate width of all children subtrees
    let totalWidth = 0
    const childWidths: number[] = []
    
    children.forEach(childId => {
      const childWidth = calculateSubtreeWidth(childId, depth + 1)
      childWidths.push(childWidth)
      totalWidth += childWidth
    })

    // Add spacing between children
    const spacing = Math.max(0, (children.length - 1) * 50)
    const subtreeWidth = Math.max(HORIZONTAL_SPACING, totalWidth + spacing)
    
    nodeInfo.set(nodeId, { depth, x: 0, subtreeWidth })
    return subtreeWidth
  }

  // Position nodes using calculated widths
  function positionNodes(nodeId: string, depth: number, startX: number): number {
    const info = nodeInfo.get(nodeId)
    if (!info) return startX

    const children = childrenMap.get(nodeId) || []
    
    if (children.length === 0) {
      // Leaf node - position it
      info.x = startX + HORIZONTAL_SPACING / 2
      return startX + HORIZONTAL_SPACING
    }

    // Position children first (left to right)
    let currentX = startX
    const childPositions: number[] = []
    
    children.forEach(childId => {
      const childInfo = nodeInfo.get(childId)
      if (childInfo) {
        const childWidth = childInfo.subtreeWidth
        // Center the child within its subtree width
        const childCenterX = currentX + childWidth / 2
        currentX = positionNodes(childId, depth + 1, currentX)
        childInfo.x = childCenterX
        childPositions.push(childCenterX)
      }
    })

    // Center parent above its children
    if (childPositions.length > 0) {
      const minChildX = Math.min(...childPositions)
      const maxChildX = Math.max(...childPositions)
      info.x = (minChildX + maxChildX) / 2
    } else {
      info.x = startX + HORIZONTAL_SPACING / 2
    }

    return currentX
  }

  // Calculate subtree widths starting from root
  calculateSubtreeWidth(rootNode.id, 0)
  
  // Position all nodes
  const rootInfo = nodeInfo.get(rootNode.id)
  if (rootInfo) {
    const totalWidth = rootInfo.subtreeWidth
    const rootStartX = START_X - totalWidth / 2 + HORIZONTAL_SPACING / 2
    positionNodes(rootNode.id, 0, rootStartX)
  }

  // Apply positions to nodes
  const positionedNodes = nodes.map(node => {
    const info = nodeInfo.get(node.id)
    if (info) {
      return {
        ...node,
        position: {
          x: info.x,
          y: START_Y + info.depth * VERTICAL_SPACING
        }
      }
    }
    
    // Fallback for nodes not in tree (orphaned nodes)
    const parentId = parentMap.get(node.id)
    if (parentId) {
      const parentInfo = nodeInfo.get(parentId)
      if (parentInfo) {
        return {
          ...node,
          position: {
            x: parentInfo.x + HORIZONTAL_SPACING,
            y: START_Y + (parentInfo.depth + 1) * VERTICAL_SPACING
          }
        }
      }
    }
    
    // Last resort - use index-based positioning
    const index = nodes.findIndex(n => n.id === node.id)
    return {
      ...node,
      position: {
        x: START_X + (index % 3) * HORIZONTAL_SPACING,
        y: START_Y + Math.floor(index / 3) * VERTICAL_SPACING
      }
    }
  })

  console.log('✅ Tree layout applied:', {
    rootNode: rootNode.id,
    totalNodes: positionedNodes.length,
    maxDepth: Math.max(...Array.from(nodeInfo.values()).map(i => i.depth))
  })

  return {
    nodes: positionedNodes,
    edges: data.edges
  }
}

/**
 * Adds missing connections between nodes
 */
export function ensureNodeConnections(data: ReactFlowData): ReactFlowData {
  console.log('🔗 Ensuring proper node connections...')

  const { nodes, edges } = data
  const existingConnections = new Set(edges.map(edge => `${edge.source}-${edge.target}`))
  const newEdges = [...edges]

  // Find nodes without incoming connections (except the first node)
  const nodesWithoutInput = nodes.filter((node, index) => {
    if (index === 0) return false // Skip first node (start node)
    return !edges.some(edge => edge.target === node.id)
  })

  // Connect orphaned nodes to the previous node
  nodesWithoutInput.forEach((node, index) => {
    const previousNodeIndex = nodes.findIndex(n => n.id === node.id) - 1
    if (previousNodeIndex >= 0) {
      const previousNode = nodes[previousNodeIndex]
      const connectionKey = `${previousNode.id}-${node.id}`

      if (!existingConnections.has(connectionKey)) {
        newEdges.push({
          id: `auto_edge_${previousNode.id}_${node.id}`,
          source: previousNode.id,
          target: node.id,
          type: 'custom',
          animated: true,
          label: 'next',
          data: { label: 'next' },
          style: { stroke: '#3b82f6', strokeWidth: 2 }
        })
      }
    }
  })

  return {
    nodes,
    edges: newEdges
  }
}