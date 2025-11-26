import { type NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const { prompt, model = "openai/gpt-4o-mini", debug = false } = await req.json()

  if (!prompt) {
    return NextResponse.json({ error: "Prompt required" }, { status: 400 })
  }

  console.log(`Generating pathway with OpenRouter, model: ${model}, prompt:`, prompt)

  const systemPrompt = `
You are an expert conversation designer specializing in creating natural, effective phone call flows for AI agents. You understand human psychology, sales methodology, and customer service best practices.

CONVERSATION DESIGN PRINCIPLES:
1. Start with a warm, professional greeting that establishes purpose and builds rapport
2. Use open-ended questions early to understand customer needs and situation
3. Follow with specific qualification questions based on their responses
4. Address common objections with empathy and clear, factual information
5. Include natural transitions between conversation topics using bridging phrases
6. Provide clear next steps or call-to-actions at closing
7. Use conditional branching to handle different customer scenarios naturally
8. Keep each node focused on ONE clear objective or question
9. Anticipate realistic customer responses and objections
10. Maintain a helpful, consultative tone throughout

CONVERSATION STRUCTURE FRAMEWORK:
- Introduction (1-2 nodes): Establish rapport, company identity, and call purpose
- Discovery (2-3 nodes): Understand customer situation, needs, and pain points
- Qualification (5-8 nodes): Comprehensive screening with multiple criteria and branching
- Value Proposition (2-3 nodes): Present solutions tailored to their situation
- Objection Handling (2-4 nodes): Address concerns with specific, empathetic responses
- Closing (2-4 nodes): Multiple endpoints based on qualification results

ADVANCED QUALIFICATION REQUIREMENTS:
For Medicare/Insurance flows, include comprehensive screening for:
- Age verification (65+ or disability status)
- Citizenship/residency status
- Current Medicare/Medicaid enrollment
- Social Security Disability status
- Current insurance coverage analysis
- Eligibility determination with clear branching
- Multiple qualification paths (eligible vs ineligible)
- Detailed information collection for qualified leads
- Professional handling of ineligible prospects

NODE TYPES AND BEST PRACTICES:
- greeting: Warm introduction with company name, agent name, and clear purpose
- question: One focused question per node, directly connects to next logical node
- response: Only use for providing information or acknowledging customer input before major transitions
- transfer: Provide clear context for why transfer is happening and what to expect
- end-call: Thank customer and provide specific follow-up expectations

CRITICAL RULE: DO NOT create intermediate response nodes that just say "Waiting for customer response" or similar. Question nodes should connect directly to the next logical node in the conversation flow.

EXAMPLE 1 - COMPREHENSIVE MEDICARE INSURANCE QUALIFICATION FLOW WITH BRANCHING:
{
  "nodes": [
    {
      "id": "initial_greeting", 
      "type": "greetingNode",
      "data": {
        "name": "Greeting",
        "text": "Hello! Thank you for calling about Medicare insurance. How can I help you today?",
        "isStart": true
      },
      "position": { "x": 400, "y": 0 }
    },
    {
      "id": "introduction_medicare",
      "type": "response",
      "data": {
        "text": "Background medicare is a complex topic, especially for those who are new to it. I'm here to help you understand your options and see if you qualify for additional benefits."
      },
      "position": { "x": 250, "y": 100 }
    },
    {
      "id": "age_verification",
      "type": "questionNode", 
      "data": {
        "name": "Age Verification",
        "text": "To get started, can you verify your age for me? Are you 65 or older, or do you receive Social Security Disability benefits?"
      },
      "position": { "x": 400, "y": 100 }
    },
    {
      "id": "age_response",
      "type": "customerResponseNode",
      "data": {
        "name": "Age Response",
        "text": "Waiting for customer age response",
        "options": ["65 or older", "Under 65", "Receive disability"],
        "variableName": "age_status"
      },
      "position": { "x": 400, "y": 200 }
    },
    {
      "id": "citizenship_status",
      "type": "question",
      "data": {
        "text": "Great! Now I need to verify your citizenship status. Are you a U.S. citizen or legal permanent resident?"
      },
      "position": { "x": 250, "y": 300 }
    },
    {
      "id": "social_security_disability",
      "type": "question",
      "data": {
        "text": "Do you currently receive Social Security Disability benefits, or have you in the past?"
      },
      "position": { "x": 150, "y": 400 }
    },
    {
      "id": "current_insurance_status",
      "type": "question",
      "data": {
        "text": "What is your current insurance situation? Do you have Medicare Part A and B, or any other health insurance?"
      },
      "position": { "x": 250, "y": 500 }
    },
    {
      "id": "eligibility_determination",
      "type": "response",
      "data": {
        "text": "Based on your responses, let me determine your eligibility for Medicare benefits and additional coverage options."
      },
      "position": { "x": 250, "y": 600 }
    },
    {
      "id": "eligible_lead_info",
      "type": "question",
      "data": {
        "text": "Excellent! You appear to be eligible for Medicare benefits. Can I get your full name and zip code so I can provide you with specific plan options in your area?"
      },
      "position": { "x": 150, "y": 700 }
    },
    {
      "id": "transfer_to_agent",
      "type": "transfer",
      "data": {
        "text": "Perfect! I'm going to transfer you to one of our licensed Medicare specialists who can walk you through your specific options and help you enroll. Please hold for just a moment.",
        "transferNumber": "+18445940353"
      },
      "position": { "x": 150, "y": 800 }
    },
    {
      "id": "ineligible_lead_notification",
      "type": "response",
      "data": {
        "text": "I understand your situation. While you may not be eligible for Medicare at this time, there may be other insurance options available. Let me see if I can help you find alternative coverage."
      },
      "position": { "x": 350, "y": 700 }
    },
    {
      "id": "younger_than_65",
      "type": "question",
      "data": {
        "text": "Since you're under 65, you may still have options through the Health Insurance Marketplace. Would you like me to transfer you to someone who can help with those plans?"
      },
      "position": { "x": 450, "y": 300 }
    },
    {
      "id": "end_call_ineligible",
      "type": "end-call",
      "data": {
        "text": "Thank you for your time today. We'll keep your information on file and reach out when you become eligible for Medicare. Have a great day!"
      },
      "position": { "x": 350, "y": 800 }
    },
    {
      "id": "end_call_transfer",
      "type": "end-call",
      "data": {
        "text": "You should be connected with a specialist momentarily. Thank you for calling, and have a wonderful day!"
      },
      "position": { "x": 150, "y": 900 }
    }
  ],
  "edges": [
    { "id": "edge_greeting_age", "source": "initial_greeting", "target": "age_verification" },
    { "id": "edge_age_response", "source": "age_verification", "target": "age_response" },
    { "id": "edge_qualified_citizenship", "source": "age_response", "target": "citizenship_status", "label": "65 or older" },
    { "id": "edge_disability_citizenship", "source": "age_response", "target": "citizenship_status", "label": "Receive disability" },
    { "id": "edge_young_ineligible", "source": "age_response", "target": "younger_than_65", "label": "Under 65" },
    { "id": "edge_citizenship_disability", "source": "citizenship_status", "target": "social_security_disability", "label": "Yes" },
    { "id": "edge_citizenship_ineligible", "source": "citizenship_status", "target": "ineligible_lead_notification", "label": "No" },
    { "id": "edge_disability_insurance", "source": "social_security_disability", "target": "current_insurance_status" },
    { "id": "edge_insurance_eligibility", "source": "current_insurance_status", "target": "eligibility_determination" },
    { "id": "edge_eligibility_eligible", "source": "eligibility_determination", "target": "eligible_lead_info", "label": "Eligible" },
    { "id": "edge_eligibility_ineligible", "source": "eligibility_determination", "target": "ineligible_lead_notification", "label": "Not eligible" },
    { "id": "edge_eligible_transfer", "source": "eligible_lead_info", "target": "transfer_to_agent" },
    { "id": "edge_transfer_end", "source": "transfer_to_agent", "target": "end_call_transfer" },
    { "id": "edge_ineligible_end", "source": "ineligible_lead_notification", "target": "end_call_ineligible" },
    { "id": "edge_younger_end", "source": "younger_than_65", "target": "end_call_ineligible" }
  ]
}

EXAMPLE 2 - HEALTHCARE APPOINTMENT SCHEDULING FLOW:
{
  "nodes": [
    {
      "id": "greeting_1",
      "type": "greeting",
      "data": {
        "text": "Hello! This is Jennifer from Wellness Medical Center. I'm calling to follow up on your recent inquiry about scheduling a consultation with Dr. Martinez. How are you doing today?"
      },
      "position": { "x": 250, "y": 0 }
    },
    {
      "id": "discovery_1",
      "type": "question",
      "data": {
        "text": "Wonderful! You had reached out about some concerns with joint pain and mobility. Dr. Martinez specializes in non-surgical treatments that have helped many of our patients. Are you still experiencing those symptoms?"
      },
      "position": { "x": 250, "y": 100 }
    },
    {
      "id": "urgency_assessment",
      "type": "question",
      "data": {
        "text": "I'm sorry to hear that. On a scale of 1 to 10, how would you rate your pain level currently? And is it affecting your daily activities like walking, sleeping, or work?"
      },
      "position": { "x": 250, "y": 200 }
    },
    {
      "id": "scheduling_offer",
      "type": "response",
      "data": {
        "text": "I understand how frustrating that must be. Dr. Martinez has helped many patients with similar symptoms using advanced, non-invasive treatments. I have some openings this week - would you prefer a morning or afternoon appointment?"
      },
      "position": { "x": 250, "y": 300 }
    },
    {
      "id": "appointment_preference",
      "type": "question",
      "data": {
        "text": "Perfect! I can schedule you for Thursday at 10:30 AM with Dr. Martinez. The consultation will take about 45 minutes, and we'll send you some forms to fill out beforehand. Does Thursday morning work for you?"
      },
      "position": { "x": 250, "y": 400 }
    },
    {
      "id": "confirm_appointment",
      "type": "response",
      "data": {
        "text": "Excellent! You're all set for Thursday at 10:30 AM. You'll receive a confirmation text and email with directions and forms. Dr. Martinez looks forward to helping you feel better."
      },
      "position": { "x": 150, "y": 500 }
    },
    {
      "id": "callback_scheduling",
      "type": "response",
      "data": {
        "text": "No problem at all. When would be a good time for me to call you back to schedule? I can call tomorrow morning, or would later this week work better?"
      },
      "position": { "x": 350, "y": 400 }
    },
    {
      "id": "end_call_scheduled",
      "type": "end-call",
      "data": {
        "text": "Have a great day, and we'll see you Thursday morning!"
      },
      "position": { "x": 150, "y": 600 }
    },
    {
      "id": "end_call_callback",
      "type": "end-call",
      "data": {
        "text": "Perfect! I'll call you back tomorrow morning to get you scheduled. In the meantime, if your symptoms worsen, please don't hesitate to call our office directly. Take care!"
      },
      "position": { "x": 350, "y": 500 }
    }
  ],
  "edges": [
    { "id": "edge_1_2", "source": "greeting_1", "target": "discovery_1" },
    { "id": "edge_1_callback", "source": "greeting_1", "target": "callback_scheduling" },
    { "id": "edge_2_3", "source": "discovery_1", "target": "urgency_assessment" },
    { "id": "edge_2_end", "source": "discovery_1", "target": "end_call_callback" },
    { "id": "edge_3_4", "source": "urgency_assessment", "target": "scheduling_offer" },
    { "id": "edge_4_5", "source": "scheduling_offer", "target": "appointment_preference" },
    { "id": "edge_5_confirm", "source": "appointment_preference", "target": "confirm_appointment" },
    { "id": "edge_5_callback", "source": "appointment_preference", "target": "callback_scheduling" },
    { "id": "edge_confirm_end", "source": "confirm_appointment", "target": "end_call_scheduled" },
    { "id": "edge_callback_end", "source": "callback_scheduling", "target": "end_call_callback" }
  ]
}

CRITICAL IMPLEMENTATION RULES:
1. Always start with a "greeting" node that includes company name and call purpose
2. Create BRANCHING LOGIC with multiple paths based on customer responses
3. Use proper conditional edges with labels like "Yes", "No", "Qualified", "Not Qualified", "65+", "Under 65"
4. Each qualification question should have at least 2 different outcome paths
5. Include specific age-based branching (65+ vs Under 65 for Medicare)
6. Create separate paths for eligible vs ineligible prospects
7. Use "customer-response" nodes ONLY for Yes/No questions that need branching
8. Position nodes hierarchically with branching flow, not linearly
9. Include multiple end-call scenarios based on qualification results
10. Always provide clear conditional logic in edge labels

MEDICARE QUALIFICATION SPECIFIC RULES:
11. Include comprehensive age verification (65+ or disability status)
12. Verify citizenship/legal residency status
13. Check Social Security Disability status
14. Assess current Medicare/insurance coverage
15. Create multiple branching paths for different qualification scenarios
16. Include separate endpoints for eligible vs ineligible prospects
17. Collect detailed information from qualified leads before transfer
18. Handle ineligible prospects professionally with alternative options
19. Create at least 8-12 nodes for comprehensive Medicare qualification
20. Include conditional branching based on age, citizenship, and disability status

RESPONSE FORMAT:
Return ONLY a valid JSON object with "nodes" and "edges" arrays. No markdown formatting, no explanations, no code blocks.

User prompt: "${prompt}"
`

  try {
    console.log("Calling OpenRouter API...")

    // Get API key from environment variable
    const apiKey = process.env.OPENROUTER_API_KEY

    // If no API key is found, return an error
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "No OpenRouter API key found",
          message: "Please set your OpenRouter API key in the environment variables",
        },
        { status: 401 },
      )
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://bland-flowchart-builder.vercel.app/", // Replace with your actual domain
        "X-Title": "Bland.ai Flowchart Builder",
      },
      body: JSON.stringify({
        model: model, // Now using the model parameter with default of gpt-4o-mini
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.3, // Lower temperature for more consistent results
      }),
    })

    console.log("OpenRouter API response status:", response.status)

    if (!response.ok) {
      const errorData = await response.json()
      console.error("OpenRouter API error:", errorData)
      return NextResponse.json(
        {
          error: "Failed to generate pathway with OpenRouter",
          details: errorData,
          status: response.status,
        },
        { status: 500 },
      )
    }

    const result = await response.json()
    console.log("OpenRouter API response received")

    const content = result.choices?.[0]?.message?.content

    if (!content) {
      console.error("No content in OpenRouter response")
      return NextResponse.json(
        {
          error: "No content in OpenRouter response",
          rawResponse: result,
        },
        { status: 500 },
      )
    }

    try {
      console.log("Parsing JSON from OpenRouter response")
      // Clean the content to handle potential markdown formatting
      const cleaned = content
        .trim()
        .replace(/^```(json|javascript|js)?\n/i, "")
        .replace(/\n```$/i, "")

      console.log("Cleaned content:", cleaned.substring(0, 100) + "...")

      // Try to parse the JSON
      let parsed
      try {
        parsed = JSON.parse(cleaned)
      } catch (parseError) {
        console.error("Initial JSON parsing failed:", parseError)

        // Try more aggressive cleaning for malformed JSON
        const moreAggressiveCleaning = cleaned
          .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
          .replace(/[\u2018\u2019]/g, "'") // Replace smart apostrophes
          .replace(/\n/g, " ") // Replace newlines with spaces
          .replace(/\s+/g, " ") // Collapse multiple spaces
          .trim()

        console.log("Trying more aggressive cleaning:", moreAggressiveCleaning.substring(0, 100) + "...")

        try {
          parsed = JSON.parse(moreAggressiveCleaning)
        } catch (secondParseError) {
          console.error("Second JSON parsing attempt failed:", secondParseError)

          // If debug mode is enabled, return the raw content for debugging
          if (debug) {
            return NextResponse.json(
              {
                error: "Failed to parse JSON",
                message: secondParseError.message,
                rawContent: content,
                cleanedContent: cleaned,
                moreAggressiveCleaning: moreAggressiveCleaning,
              },
              { status: 500 },
            )
          }

          throw secondParseError
        }
      }

      // Validate the response
      if (!parsed.nodes || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
        console.error("Invalid JSON structure: missing or empty nodes array")

        // If debug mode is enabled, return the parsed content for debugging
        if (debug) {
          return NextResponse.json(
            {
              error: "Invalid JSON structure: missing or empty nodes array",
              parsedContent: parsed,
              rawContent: content,
            },
            { status: 500 },
          )
        }

        return NextResponse.json(
          {
            error: "Invalid JSON structure: missing or empty nodes array",
          },
          { status: 500 },
        )
      }

      if (!parsed.edges || !Array.isArray(parsed.edges)) {
        console.error("Invalid JSON structure: missing or invalid edges array")

        // If debug mode is enabled, return the parsed content for debugging
        if (debug) {
          return NextResponse.json(
            {
              error: "Invalid JSON structure: missing or invalid edges array",
              parsedContent: parsed,
              rawContent: content,
            },
            { status: 500 },
          )
        }

        return NextResponse.json(
          {
            error: "Invalid JSON structure: missing or invalid edges array",
          },
          { status: 500 },
        )
      }

      // Process the flow to ensure Yes/No questions use customer-response nodes
      ensureYesNoQuestionsUseCustomerResponse(parsed.nodes, parsed.edges)

      console.log(`Successfully parsed JSON with ${parsed.nodes.length} nodes and ${parsed.edges.length} edges`)

      // If debug mode is enabled, include the raw content in the response
      if (debug) {
        return NextResponse.json({
          ...parsed,
          _debug: {
            rawContent: content,
            cleanedContent: cleaned,
          },
        })
      }

      return NextResponse.json(parsed)
    } catch (e) {
      console.error("Failed to parse JSON from OpenRouter:", e)
      console.error("Raw content:", content)

      // If debug mode is enabled, return the raw content for debugging
      if (debug) {
        return NextResponse.json(
          {
            error: "Invalid JSON from OpenRouter",
            message: e.message,
            rawContent: content,
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          error: "Invalid JSON from OpenRouter",
          message: e.message,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error calling OpenRouter:", error)

    // If debug mode is enabled, return more detailed error information
    if (debug) {
      return NextResponse.json(
        {
          error: "Failed to generate pathway with OpenRouter",
          message: error.message,
          stack: error.stack,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to generate pathway with OpenRouter",
        message: error.message,
      },
      { status: 500 },
    )
  }
}

/**
 * Ensure that all Yes/No questions use customer-response nodes with proper branching
 */
function ensureYesNoQuestionsUseCustomerResponse(nodes, edges) {
  // Find all question nodes that are Yes/No questions
  const yesNoQuestionNodes = nodes.filter(
    (node) =>
      (node.type === "question" || node.type.toLowerCase().includes("question")) &&
      node.data &&
      node.data.text &&
      (node.data.text.toLowerCase().includes("are you") ||
        node.data.text.toLowerCase().includes("do you") ||
        node.data.text.toLowerCase().includes("have you") ||
        node.data.text.toLowerCase().includes("would you") ||
        node.data.text.toLowerCase().includes("can you") ||
        node.data.text.toLowerCase().includes("will you") ||
        node.data.text.toLowerCase().includes("is this") ||
        node.data.text.toLowerCase().includes("is that") ||
        node.data.text.toLowerCase().includes("are they") ||
        node.data.text.toLowerCase().includes("did you") ||
        node.data.text.toLowerCase().includes("should") ||
        node.data.text.toLowerCase().includes("could") ||
        node.data.text.toLowerCase().includes("interested") ||
        node.data.text.toLowerCase().includes("want to") ||
        node.data.text.toLowerCase().includes("medicare") ||
        node.data.text.toLowerCase().includes("medicaid") ||
        node.data.text.toLowerCase().includes("insurance") ||
        node.data.text.toLowerCase().includes("coverage") ||
        // Check for question marks in short questions (likely yes/no)
        (node.data.text.includes("?") && node.data.text.length < 100)),
  )

  // Process each Yes/No question node
  for (const questionNode of yesNoQuestionNodes) {
    // Find outgoing edges from this question
    const outgoingEdges = edges.filter((edge) => edge.source === questionNode.id)

    // Skip if there are no outgoing edges
    if (outgoingEdges.length === 0) continue

    // Get target nodes
    const targetNodeIds = outgoingEdges.map((edge) => edge.target)
    const targetNodes = nodes.filter((node) => targetNodeIds.includes(node.id))

    // Check if the next node is already a customer response node
    const nextIsCustomerResponse = targetNodes.some(
      (node) =>
        node.type === "customer-response" ||
        node.type.toLowerCase().includes("customer") ||
        node.type.toLowerCase().includes("user-response"),
    )

    // If the next node is already a customer response node, ensure it has Yes/No options
    if (nextIsCustomerResponse) {
      const customerResponseNode = targetNodes.find(
        (node) =>
          node.type === "customer-response" ||
          node.type.toLowerCase().includes("customer") ||
          node.type.toLowerCase().includes("user-response"),
      )

      if (customerResponseNode) {
        // Ensure the node has options array with Yes/No
        if (!customerResponseNode.data.options || !Array.isArray(customerResponseNode.data.options)) {
          customerResponseNode.data.options = ["Yes", "No"]
        } else if (
          !customerResponseNode.data.options.includes("Yes") ||
          !customerResponseNode.data.options.includes("No")
        ) {
          customerResponseNode.data.options = ["Yes", "No"]
        }

        // Ensure the node has a variableName
        if (!customerResponseNode.data.variableName) {
          // Determine variable name based on question content
          let variableName = "response"

          if (questionNode.data.text.toLowerCase().includes("medicare")) {
            variableName = "medicare_status"
          } else if (questionNode.data.text.toLowerCase().includes("medicaid")) {
            variableName = "medicaid_status"
          } else if (questionNode.data.text.toLowerCase().includes("insurance")) {
            variableName = "insurance_status"
          } else if (questionNode.data.text.toLowerCase().includes("coverage")) {
            variableName = "coverage_status"
          }

          customerResponseNode.data.variableName = variableName
        }

        // Find outgoing edges from the customer response node
        const customerResponseOutgoingEdges = edges.filter((edge) => edge.source === customerResponseNode.id)

        // Check if we have edges for both Yes and No options
        const hasYesEdge = customerResponseOutgoingEdges.some((edge) => edge.label === "Yes")
        const hasNoEdge = customerResponseOutgoingEdges.some((edge) => edge.label === "No")

        // If we're missing the Yes edge, create one to the next node in the flow
        if (!hasYesEdge) {
          // Find the next node in the flow
          const nodeIndex = nodes.findIndex((node) => node.id === customerResponseNode.id)
          if (nodeIndex >= 0 && nodeIndex < nodes.length - 1) {
            const nextNode = nodes[nodeIndex + 1]
            edges.push({
              id: `edge_${customerResponseNode.id}_${nextNode.id}_Yes`,
              source: customerResponseNode.id,
              target: nextNode.id,
              label: "Yes",
            })
          }
        }

        // If we're missing the No edge, create one to an end call node
        if (!hasNoEdge) {
          // Check if we already have an end call node
          let endCallNode = nodes.find(
            (node) =>
              node.type === "end-call" ||
              node.type.toLowerCase().includes("end") ||
              (node.data &&
                node.data.text &&
                (node.data.text.toLowerCase().includes("thank") ||
                  node.data.text.toLowerCase().includes("goodbye") ||
                  node.data.text.toLowerCase().includes("great day"))),
          )

          // If we don't have an end call node, create one
          if (!endCallNode) {
            endCallNode = {
              id: `end_call_${Date.now()}`,
              type: "end-call",
              data: {
                text: "Thank you for your time. Have a great day!",
              },
              position: {
                x: customerResponseNode.position?.x + 200 || 450,
                y: customerResponseNode.position?.y || 300,
              },
            }
            nodes.push(endCallNode)
          }

          // Create an edge from the customer response node to the end call node
          edges.push({
            id: `edge_${customerResponseNode.id}_${endCallNode.id}_No`,
            source: customerResponseNode.id,
            target: endCallNode.id,
            label: "No",
          })
        }
      }
    } else {
      // The next node is not a customer response node, so we need to create one
      // Check if the next node is a response node
      const responseNode = targetNodes.find(
        (node) =>
          node.type === "response" ||
          node.type === "AI Response" ||
          (node.type.toLowerCase().includes("response") && !node.type.toLowerCase().includes("customer")),
      )

      if (responseNode) {
        console.log("Converting response node after Yes/No question to customer response node")

        // Determine variable name based on question content
        let variableName = "response"

        if (questionNode.data.text.toLowerCase().includes("medicare")) {
          variableName = "medicare_status"
        } else if (questionNode.data.text.toLowerCase().includes("medicaid")) {
          variableName = "medicaid_status"
        } else if (questionNode.data.text.toLowerCase().includes("insurance")) {
          variableName = "insurance_status"
        } else if (questionNode.data.text.toLowerCase().includes("coverage")) {
          variableName = "coverage_status"
        }

        // Create a new customer response node
        const customerResponseNode = {
          id: `customer_response_${Date.now()}`,
          type: "customer-response",
          data: {
            text: "Waiting for customer response",
            options: ["Yes", "No"],
            responses: ["Yes", "No"],
            variableName: variableName,
            intentDescription: questionNode.data.text || "Capture customer response",
          },
          position: {
            x: responseNode.position?.x || 250,
            y: responseNode.position?.y || 200,
          },
        }

        // Add the new node
        nodes.push(customerResponseNode)

        // Create an edge from the question to the customer response node
        edges.push({
          id: `edge_${questionNode.id}_${customerResponseNode.id}`,
          source: questionNode.id,
          target: customerResponseNode.id,
        })

        // Find outgoing edges from the response node
        const responseOutgoingEdges = edges.filter((edge) => edge.source === responseNode.id)

        // If there are outgoing edges, connect the Yes option to the first target
        if (responseOutgoingEdges.length > 0) {
          edges.push({
            id: `edge_${customerResponseNode.id}_${responseOutgoingEdges[0].target}_Yes`,
            source: customerResponseNode.id,
            target: responseOutgoingEdges[0].target,
            label: "Yes",
          })
        }

        // Check if we already have an end call node
        let endCallNode = nodes.find(
          (node) =>
            node.type === "end-call" ||
            node.type.toLowerCase().includes("end") ||
            (node.data &&
              node.data.text &&
              (node.data.text.toLowerCase().includes("thank") ||
                node.data.text.toLowerCase().includes("goodbye") ||
                node.data.text.toLowerCase().includes("great day"))),
        )

        // If we don't have an end call node, create one
        if (!endCallNode) {
          endCallNode = {
            id: `end_call_${Date.now()}`,
            type: "end-call",
            data: {
              text: "Thank you for your time. Have a great day!",
            },
            position: {
              x: customerResponseNode.position?.x + 200 || 450,
              y: customerResponseNode.position?.y || 300,
            },
          }
          nodes.push(endCallNode)
        }

        // Create an edge from the customer response node to the end call node
        edges.push({
          id: `edge_${customerResponseNode.id}_${endCallNode.id}_No`,
          source: customerResponseNode.id,
          target: endCallNode.id,
          label: "No",
        })

        // Remove the response node and its edges
        const nodesToRemove = [responseNode.id]

        // Remove edges connected to the nodes we're removing
        const edgesToRemove = edges
          .filter((edge) => nodesToRemove.includes(edge.source) || nodesToRemove.includes(edge.target))
          .map((edge) => edge.id)

        // Update the nodes and edges arrays
        for (let i = nodes.length - 1; i >= 0; i--) {
          if (nodesToRemove.includes(nodes[i].id)) {
            nodes.splice(i, 1)
          }
        }

        for (let i = edges.length - 1; i >= 0; i--) {
          if (edgesToRemove.includes(edges[i].id)) {
            edges.splice(i, 1)
          }
        }
      }
    }
  }
}
