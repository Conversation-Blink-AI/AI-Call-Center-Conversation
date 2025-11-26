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

    // Ensure proper positioning if not provided
    const position = node.position || {
      x: 250 + (index % 3) * 300, // Spread nodes horizontally
      y: index * 150 // Vertical spacing
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
 * Enhances flowchart with automatic positioning
 */
export function enhanceFlowchartLayout(data: ReactFlowData): ReactFlowData {
  console.log('🎨 Enhancing flowchart layout...')

  const enhancedNodes = data.nodes.map((node, index) => {
    // Create a more intelligent positioning system
    const row = Math.floor(index / 3)
    const col = index % 3

    return {
      ...node,
      position: {
        x: 100 + col * 300,
        y: 50 + row * 180
      }
    }
  })

  return {
    nodes: enhancedNodes,
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