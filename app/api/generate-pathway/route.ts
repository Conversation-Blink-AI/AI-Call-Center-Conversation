import { type NextRequest, NextResponse } from "next/server"
import {
  convertApiToReactFlow,
  enhanceFlowchartLayout,
  ensureNodeConnections,
  validateApiData,
} from "@/utils/api-to-flowchart-converter"

// Reject all methods except POST
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  )
}

export async function POST(req: NextRequest) {
  // ============================================
  // NO AUTH CHECK - pathway generation is now open
  // This route does NOT require authentication
  // ============================================
  console.log("✅✅✅ [GENERATE-PATHWAY] Request received - NO AUTH CHECK - AUTH REMOVED ✅✅✅")
  
  try {
    // Parse request body
    let requestBody
    try {
      requestBody = await req.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    const { prompt, apiKey: clientApiKey } = requestBody

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    console.log("🤖 Generating pathway with prompt:", prompt)

    // Check if API key is available - prefer client-provided key, then environment variable
    const apiKey = clientApiKey || process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.warn("⚠️ OPENROUTER_API_KEY not found, falling back to mock data")
      throw new Error("OPENROUTER_API_KEY not configured. Please set it in your environment variables or in Settings.")
    }

    // Call OpenRouter API directly
    console.log("🌐 [GENERATE-PATHWAY] Calling OpenRouter API with key:", apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING')
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Call Flow Generator'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert AI call flow designer. Create a comprehensive call flow based on the user's prompt. Return ONLY a valid JSON object with this exact structure:

{
  "nodes": [
    {
      "id": "1",
      "type": "greetingNode",
      "data": {
        "name": "Greeting",
        "text": "Hello! How can I help you today?",
        "isStart": true
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1_2",
      "source": "1",
      "target": "2",
      "label": "next"
    }
  ]
}

Available node types:
- greetingNode: Starting point with greeting message
- questionNode: Ask questions to gather information
- customerResponseNode: Wait for and process customer responses
- webhookNode: Make API calls to external services
- transferNode: Transfer call to human agent
- endCallNode: End the conversation

Create a logical flow with proper connections between nodes. Include realistic conversation text for each node.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    console.log("📡 [GENERATE-PATHWAY] OpenRouter response status:", openRouterResponse.status, openRouterResponse.statusText)
    
    if (!openRouterResponse.ok) {
      let errorText = ''
      try {
        errorText = await openRouterResponse.text()
        console.log("📡 [GENERATE-PATHWAY] OpenRouter error response text:", errorText.substring(0, 500))
        const errorJson = JSON.parse(errorText)
        console.error("❌ [GENERATE-PATHWAY] OpenRouter API error (parsed):", JSON.stringify(errorJson, null, 2))
        
        // Check if this is actually an OpenRouter error or something else
        if (errorJson.error?.message?.includes('cookie auth')) {
          console.error("⚠️ [GENERATE-PATHWAY] WARNING: OpenRouter returned cookie auth error - this shouldn't happen!")
          console.error("⚠️ [GENERATE-PATHWAY] This suggests the request might be intercepted or proxied")
        }
        
        return NextResponse.json(
          { 
            error: "Failed to generate pathway",
            message: errorJson.error?.message || errorJson.error || "OpenRouter API request failed",
            details: errorText,
            status: openRouterResponse.status
          },
          { status: openRouterResponse.status }
        )
      } catch (parseError) {
        console.error("❌ OpenRouter API error (non-JSON):", errorText)
        return NextResponse.json(
          { 
            error: "Failed to generate pathway",
            message: `OpenRouter API returned status ${openRouterResponse.status}`,
            details: errorText || "Unknown error"
          },
          { status: openRouterResponse.status }
        )
      }
    }

    const openRouterData = await openRouterResponse.json()
    console.log("✅ OpenRouter response received")

    // Extract the generated content
    const generatedContent = openRouterData.choices?.[0]?.message?.content
    if (!generatedContent) {
      throw new Error("No content generated from OpenRouter")
    }

    // Parse the JSON content
    let rawApiData
    try {
      rawApiData = JSON.parse(generatedContent)
    } catch (parseError) {
      console.error("❌ Failed to parse generated JSON:", generatedContent)
      throw new Error("Generated content is not valid JSON")
    }

    console.log("✅ Raw API data parsed successfully")

    // Validate the API data structure
    if (!validateApiData(rawApiData)) {
      console.error("❌ Invalid API data structure:", rawApiData)
      return NextResponse.json(
        { 
          error: "Invalid pathway data structure from AI",
          details: "The AI generated an invalid flowchart structure"
        },
        { status: 500 }
      )
    }

    // Convert API data to ReactFlow format
    let reactFlowData = convertApiToReactFlow(rawApiData)

    // Enhanced positioning with hierarchical layout and proper branching
    reactFlowData = enhanceFlowchartLayout(reactFlowData)

    // Ensure proper node connections
    reactFlowData = ensureNodeConnections(reactFlowData)

    console.log("✅ Pathway generated and converted successfully")

    return NextResponse.json(reactFlowData)

  } catch (error) {
    console.error("❌ Error in generate-pathway:", error)

    // If it's an API key error, return it directly instead of falling back
    if (error instanceof Error && error.message.includes("OPENROUTER_API_KEY")) {
      return NextResponse.json(
        { 
          error: "Configuration Error",
          message: error.message,
          details: "Please set OPENROUTER_API_KEY in your environment variables. You can get an API key from https://openrouter.ai"
        },
        { status: 500 }
      )
    }

    // Fallback to mock data if API fails
    console.log("🔄 Falling back to mock data generation...")

    const mockApiData = {
      nodes: [
        {
          id: "1",
          type: "greetingNode",
          data: {
            name: "Greeting",
            text: "Hello! Thank you for calling. How can I assist you today?",
            isStart: true
          }
        },
        {
          id: "question_2",
          type: "questionNode",
          data: {
            name: "Initial Screening",
            text: "I'd be happy to help you. Could you please tell me what you're looking for today?"
          }
        },
        {
          id: "response_3",
          type: "customerResponseNode",
          data: {
            name: "Customer Response",
            text: "I understand. Let me gather some information to better assist you."
          }
        },
        {
          id: "transfer_4",
          type: "transferNode",
          data: {
            name: "Transfer to Agent",
            text: "Let me connect you with one of our specialists who can help you further.",
            transferNumber: "+1234567890"
          }
        },
        {
          id: "end_5",
          type: "endCallNode",
          data: {
            name: "End Call",
            prompt: "Thank you for your time. Have a great day!"
          }
        }
      ],
      edges: [
        {
          id: "edge_1_question_2",
          source: "1",
          target: "question_2",
          label: "next"
        },
        {
          id: "edge_question_2_response_3",
          source: "question_2",
          target: "response_3",
          label: "next"
        },
        {
          id: "edge_response_3_transfer_4",
          source: "response_3",
          target: "transfer_4",
          label: "qualified"
        },
        {
          id: "edge_transfer_4_end_5",
          source: "transfer_4",
          target: "end_5",
          label: "next"
        }
      ]
    }

    // Validate the mock data structure
    if (!validateApiData(mockApiData)) {
      return NextResponse.json(
        { 
          error: "Failed to generate valid pathway data",
          details: "Mock data validation failed"
        },
        { status: 500 }
      )
    }

    // Convert mock data to ReactFlow format
    let reactFlowData = convertApiToReactFlow(mockApiData)

    // Enhanced positioning with hierarchical layout and proper branching
    reactFlowData = enhanceFlowchartLayout(reactFlowData)

    // Ensure proper node connections
    reactFlowData = ensureNodeConnections(reactFlowData)

    console.log("✅ Fallback pathway generated successfully")

    return NextResponse.json(reactFlowData)
  }
}