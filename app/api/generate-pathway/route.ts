import { type NextRequest, NextResponse } from "next/server"
import { convertApiToReactFlow, enhanceFlowchartLayout, ensureNodeConnections, validateApiData } from "@/utils/api-to-flowchart-converter"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    console.log("🤖 Generating pathway with prompt:", prompt)

    // Call OpenRouter API directly
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
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

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text()
      console.error("❌ OpenRouter API error:", errorText)
      return NextResponse.json(
        { 
          error: "Failed to generate pathway",
          details: errorText 
        },
        { status: openRouterResponse.status }
      )
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