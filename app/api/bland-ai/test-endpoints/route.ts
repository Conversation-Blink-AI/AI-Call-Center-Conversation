import { NextRequest, NextResponse } from "next/server"
import { getUserFromRequest } from "@/lib/auth-utils"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const blandApiKey = process.env.BLAND_AI_API_KEY
    if (!blandApiKey) {
      return NextResponse.json({ error: "Bland.ai API key not configured" }, { status: 500 })
    }

    const endpoints = [
      { name: "Voices", url: "https://api.bland.ai/v1/voices", method: "GET" },
      { name: "Pathway List", url: "https://api.bland.ai/v1/pathway/list", method: "GET" },
      { name: "Calls", url: "https://api.bland.ai/v1/calls?limit=10", method: "GET" },
      { name: "Numbers", url: "https://api.bland.ai/v1/numbers", method: "GET" },
    ]

    const results = []

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now()
        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Authorization': `Bearer ${blandApiKey.trim()}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Cursor-Conversation-App/1.0'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        const duration = Date.now() - startTime
        const contentType = response.headers.get("content-type") || ""
        let responseData: any = null
        let errorText = ""

        if (contentType.includes("application/json")) {
          try {
            responseData = await response.json()
          } catch {
            errorText = await response.text()
          }
        } else {
          errorText = await response.text()
        }

        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          status: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`,
          success: response.ok,
          has_data: !!responseData,
          error: response.ok ? null : (errorText.substring(0, 200) || responseData?.error || "Unknown error"),
          data_preview: responseData ? JSON.stringify(responseData).substring(0, 200) : null
        })
      } catch (error: any) {
        results.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          status: "ERROR",
          statusText: error.message || "Request failed",
          duration: "N/A",
          success: false,
          has_data: false,
          error: error.message || "Network or timeout error"
        })
      }
    }

    return NextResponse.json({
      api_key_configured: !!blandApiKey,
      api_key_length: blandApiKey.length,
      api_key_prefix: blandApiKey.substring(0, 10) + "...",
      api_key_type: blandApiKey.startsWith('org_') ? 'organization' : blandApiKey.startsWith('sk_') ? 'secret' : 'unknown',
      server_ip: await getServerIP(),
      results,
      summary: {
        total_tested: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        working_endpoints: results.filter(r => r.success).map(r => r.endpoint),
        failing_endpoints: results.filter(r => !r.success).map(r => r.endpoint)
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: "Failed to test endpoints",
      message: error.message
    }, { status: 500 })
  }
}

async function getServerIP(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(3000)
    })
    const data = await response.json()
    return data.ip
  } catch {
    return null
  }
}

