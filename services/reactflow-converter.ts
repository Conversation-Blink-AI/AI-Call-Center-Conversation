
import type { Node, Edge } from 'reactflow'

export interface BlandNode {
  id: string
  type: string
  data: any
}

export interface BlandEdge {
  id: string
  source: string
  target: string
  type?: string
  label?: string
  data?: any
}

export interface BlandFlowData {
  nodes: BlandNode[]
  edges: BlandEdge[]
}

export interface ReactFlowData {
  nodes: Node[]
  edges: Edge[]
}

/**
 * Converts ReactFlow JSON data to clean Bland.ai compatible format
 * Removes UI-specific properties like position, selected, width, height, etc.
 */
export function convertReactFlowToBland(reactFlowData: ReactFlowData): BlandFlowData {
  console.log('🔄 Converting ReactFlow data to Bland.ai format...')
  
  // Clean nodes - preserve position but remove other UI-specific properties
  const cleanNodes: BlandNode[] = reactFlowData.nodes.map(node => {
    let cleanData = { ...node.data }
    
    // Preserve position for proper layout restoration
    const nodeWithPosition: any = {
      id: node.id,
      type: '',
      data: cleanData,
      position: node.position // Preserve position data
    }
    
    // Special handling for Facebook Pixel nodes - convert to Webhook with preset config
    if (node.type === 'facebookPixelNode') {
      const configId = cleanData.configId || ''
      const configNickname = cleanData.configNickname || ''
      const eventName = cleanData.eventName || 'CallLead'
      const testEventCode = cleanData.testEventCode || ''
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://dev.conversation.blinklab.in').replace(/\/$/, '')
      const url = configId ? `${baseUrl}/api/integrations/meta-capi/${configId}` : ''

      const bodyPayload: Record<string, string> = {
        call_id: '{{call_id}}',
        from: '{{from}}',
        to: '{{to}}',
        ip: '{{ip}}',
        user_agent: '{{user_agent}}'
      }
      if (testEventCode) {
        bodyPayload.test_event_code = testEventCode
      }
      const body = JSON.stringify(bodyPayload)
      
      return {
        id: node.id,
        type: 'Webhook',
        data: {
          name: cleanData.name || 'Facebook Pixel Event',
          text: cleanData.text || 'Tracking conversion event...',
          url: url,
          method: 'POST',
          headers: [
            {
              key: 'Content-Type',
              value: 'application/json'
            }
          ],
          body: body,
          configId,
          configNickname,
          eventName,
          testEventCode,
          __reactFlowType: 'facebookPixelNode'
        }
      }
    }
    
    // Special handling for webhook nodes - generate responsePathways from edges
    if (node.type === 'webhookNode') {
      const connectedEdges = reactFlowData.edges.filter(edge => edge.source === node.id)
      const responsePathways: any[] = []
      
      // Generate conditional pathways based on connected edges
      connectedEdges.forEach(edge => {
        const targetNode = reactFlowData.nodes.find(n => n.id === edge.target)
        if (targetNode && edge.data?.label) {
          // Create pathway based on edge label
          const [variable, operator, value] = edge.data.label.split(' ')
          if (variable && operator && value) {
            responsePathways.push([
              variable.trim(),
              operator.trim(),
              value.trim(),
              {
                id: targetNode.id,
                name: targetNode.data.name || 'Next Node'
              }
            ])
          }
        }
      })
      
      cleanData = {
        ...cleanData,
        responsePathways,
        // Remove UI-only fields that shouldn't go to Bland.ai
        authorization: undefined,
        timeout: undefined,
        retryAttempts: undefined,
        rerouteServer: undefined
      }
      
      nodeWithPosition.type = 'Webhook'
      nodeWithPosition.data = cleanData
      return nodeWithPosition
    }
    
    // Special handling for End Call nodes
    if (node.type === 'endCallNode') {
      nodeWithPosition.type = 'End Call'
      nodeWithPosition.data = {
        prompt: cleanData.prompt || cleanData.text || 'Thank you for calling. Goodbye!',
        name: cleanData.name || 'End Call'
      }
      return nodeWithPosition
    }
    
    // Special handling for Transfer nodes
    if (node.type === 'transferNode') {
      nodeWithPosition.type = 'Transfer Call'
      // Build data object with all fields, removing undefined values
      const transferData: any = {
        transferNumber: cleanData.transferNumber || cleanData.transfer_phone_number,
        name: cleanData.name || 'Transfer Call',
      }
      
      // Add optional fields only if they exist
      if (cleanData.text !== undefined && cleanData.text !== '') transferData.text = cleanData.text
      if (cleanData.prompt !== undefined && cleanData.prompt !== '') transferData.prompt = cleanData.prompt
      if (cleanData.condition !== undefined && cleanData.condition !== '') transferData.condition = cleanData.condition
      if (cleanData.modelOptions !== undefined && Object.keys(cleanData.modelOptions || {}).length > 0) {
        transferData.modelOptions = cleanData.modelOptions
      }
      if (cleanData.pathwayExamples !== undefined && cleanData.pathwayExamples !== '') transferData.pathwayExamples = cleanData.pathwayExamples
      if (cleanData.conditionExamples !== undefined && cleanData.conditionExamples !== '') transferData.conditionExamples = cleanData.conditionExamples
      if (cleanData.dialogueExamples !== undefined && cleanData.dialogueExamples !== '') transferData.dialogueExamples = cleanData.dialogueExamples
      if (cleanData.extractVars !== undefined && Array.isArray(cleanData.extractVars) && cleanData.extractVars.length > 0) {
        transferData.extractVars = cleanData.extractVars
      }
      
      nodeWithPosition.data = transferData
      return nodeWithPosition
    }
    
    // Default nodes (greeting, question, customer response)
    // Map ReactFlow node types to Bland.ai node types
    const typeMapping: { [key: string]: string } = {
      'greetingNode': 'Default',
      'questionNode': 'Default',
      'customerResponseNode': 'Default',
      'Default': 'Default'
    }
    
    nodeWithPosition.type = typeMapping[node.type] || 'Default'
    // Preserve the original ReactFlow type in data for accurate restoration
    nodeWithPosition.data = {
      ...cleanData,
      __reactFlowType: node.type // Store original type for restoration
    }
    return nodeWithPosition
  })

  // Clean edges - remove UI-specific properties and color, but keep type: "custom"
  const cleanEdges: BlandEdge[] = reactFlowData.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "custom",
    label: edge.data?.label || edge.label || 'next',
    ...(edge.data && { 
      data: {
        label: edge.data.label || edge.label || 'next',
        ...(edge.data.description && { description: edge.data.description }),
        isHighlighted: false
      }
    })
  }))

  const result = {
    nodes: cleanNodes,
    edges: cleanEdges
  }

  console.log('✅ Conversion complete:', {
    originalNodes: reactFlowData.nodes.length,
    cleanNodes: cleanNodes.length,
    originalEdges: reactFlowData.edges.length,
    cleanEdges: cleanEdges.length
  })
  
  // Log each node type for debugging
  console.log('📋 Converted node types:', cleanNodes.map(n => ({ id: n.id, type: n.type, hasData: !!n.data })))

  return result
}

/**
 * Converts clean Bland.ai format back to ReactFlow format
 * Adds default UI properties for ReactFlow rendering
 */
export function convertBlandToReactFlow(blandData: BlandFlowData): ReactFlowData {
  console.log('🔄 Converting Bland.ai data to ReactFlow format...')
  
  // Map Bland.ai types back to ReactFlow node types
  const blandToReactFlowTypeMapping: { [key: string]: string } = {
    'Default': 'greetingNode', // Default fallback
    'Webhook': 'webhookNode',
    'Transfer': 'transferNode',
    'Transfer Call': 'transferNode', // Handle both "Transfer" and "Transfer Call" for backward compatibility
    'End Call': 'endCallNode'
  }
  
  // Add UI properties to nodes
  const reactFlowNodes: Node[] = blandData.nodes.map((node, index) => {
    // Check if node already has position data saved (from previous saves)
    const savedPosition = (node as any).position
    
    // First check if we preserved the original ReactFlow type
    let reactFlowType = node.data.__reactFlowType || blandToReactFlowTypeMapping[node.type] || 'greetingNode'
    
    // More intelligent type detection based on node content (fallback)
    if (!node.data.__reactFlowType && node.type === 'Default') {
      const nodeData = node.data
      
      // Check for specific patterns to determine type
      if (nodeData.name?.toLowerCase().includes('greeting') || 
          nodeData.text?.toLowerCase().includes('hello') ||
          nodeData.text?.toLowerCase().includes('welcome')) {
        reactFlowType = 'greetingNode'
      } else if (nodeData.name?.toLowerCase().includes('question') || 
                 nodeData.text?.includes('?')) {
        reactFlowType = 'questionNode'
      } else if (nodeData.name?.toLowerCase().includes('response') || 
                 nodeData.name?.toLowerCase().includes('customer')) {
        reactFlowType = 'customerResponseNode'
      }
    }
    
    // Clean the data to remove internal metadata
    const cleanedData = { ...node.data }
    delete cleanedData.__reactFlowType
    
    return {
      id: node.id,
      type: reactFlowType,
      // Use saved position if available, otherwise use default positioning
      position: savedPosition || { x: 250 + (index * 50), y: index * 100 },
      data: cleanedData,
      selected: false
    }
  })

  // Add UI properties to edges
  const reactFlowEdges: Edge[] = blandData.edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'custom',
    animated: true,
    label: edge.label || edge.data?.label || 'next',
    data: edge.data || { label: edge.label || 'next' },
    style: { stroke: '#3b82f6', strokeWidth: 2 }
  }))

  const result = {
    nodes: reactFlowNodes,
    edges: reactFlowEdges
  }

  console.log('✅ Conversion complete:', {
    blandNodes: blandData.nodes.length,
    reactFlowNodes: reactFlowNodes.length,
    blandEdges: blandData.edges.length,
    reactFlowEdges: reactFlowEdges.length
  })

  return result
}

/**
 * Utility function to validate ReactFlow data structure
 */
export function validateReactFlowData(data: any): data is ReactFlowData {
  return (
    data &&
    Array.isArray(data.nodes) &&
    Array.isArray(data.edges) &&
    data.nodes.every((node: any) => node.id && node.type && node.data) &&
    data.edges.every((edge: any) => edge.id && edge.source && edge.target)
  )
}

/**
 * Utility function to validate Bland.ai data structure
 */
export function validateBlandData(data: any): data is BlandFlowData {
  return (
    data &&
    Array.isArray(data.nodes) &&
    Array.isArray(data.edges) &&
    data.nodes.every((node: any) => node.id && node.type && node.data) &&
    data.edges.every((edge: any) => edge.id && edge.source && edge.target)
  )
}
