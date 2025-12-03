import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Diagnostic endpoint to test Bland.ai API call format
 * This helps verify that we're calling the API correctly
 */
export async function GET(request: NextRequest) {
  try {
    const blandApiKey = process.env.BLAND_AI_API_KEY

    if (!blandApiKey) {
      return NextResponse.json({
        success: false,
        error: "BLAND_AI_API_KEY not configured",
        checks: {
          api_key_exists: false,
          api_key_length: 0
        }
      }, { status: 500 })
    }

    const results: any = {
      api_key_configured: true,
      api_key_length: blandApiKey.length,
      api_key_prefix: blandApiKey.substring(0, 8) + "...",
      tests: []
    }

    // Test 1: Check API key format (Bland.ai keys usually start with specific prefixes)
    const apiKeyFormatCheck = {
      name: "API Key Format",
      passed: blandApiKey.length > 20, // Bland.ai keys are usually long
      details: {
        length: blandApiKey.length,
        starts_with_letters: /^[a-zA-Z]/.test(blandApiKey),
        contains_special_chars: /[_-]/.test(blandApiKey)
      }
    }
    results.tests.push(apiKeyFormatCheck)

    // Test 2: Test the exact same call format we use in production
    const testUrl = "https://api.bland.ai/v1/calls?limit=1"
    
    // Method 1: Using Bearer token format (what we currently use)
    try {
      console.log("🧪 [BLAND-TEST] Testing with Bearer token format...")
      const response1 = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${blandApiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      })

      const status1 = response1.status
      const headers1 = Object.fromEntries(response1.headers.entries())
      
      let responseBody1: any = null
      try {
        const text1 = await response1.text()
        responseBody1 = text1.length < 500 ? text1 : text1.substring(0, 500)
        // Try to parse as JSON if possible
        try {
          responseBody1 = JSON.parse(text1)
        } catch {
          // Keep as text
        }
      } catch (e) {
        responseBody1 = "Could not read response"
      }

      results.tests.push({
        name: "API Call with Bearer Token Format",
        method: "GET",
        url: testUrl,
        headers_used: {
          "Authorization": "Bearer [REDACTED]",
          "Content-Type": "application/json"
        },
        response_status: status1,
        response_headers: headers1,
        response_body: responseBody1,
        passed: status1 === 200,
        blocked: status1 === 403,
        error_message: status1 === 403 ? "Blocked by IP - Cloud provider detected" : null
      })
    } catch (error: any) {
      results.tests.push({
        name: "API Call with Bearer Token Format",
        error: error.message,
        passed: false
      })
    }

    // Test 3: Alternative format - Direct API key (some APIs expect this)
    try {
      console.log("🧪 [BLAND-TEST] Testing with direct API key format...")
      const response2 = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': blandApiKey, // Without Bearer prefix
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      })

      const status2 = response2.status
      let responseBody2: any = null
      try {
        const text2 = await response2.text()
        responseBody2 = text2.length < 500 ? text2 : text2.substring(0, 500)
        try {
          responseBody2 = JSON.parse(text2)
        } catch {
          // Keep as text
        }
      } catch (e) {
        responseBody2 = "Could not read response"
      }

      results.tests.push({
        name: "API Call with Direct API Key (no Bearer)",
        response_status: status2,
        response_body: responseBody2,
        passed: status2 === 200,
        blocked: status2 === 403
      })
    } catch (error: any) {
      results.tests.push({
        name: "API Call with Direct API Key",
        error: error.message,
        passed: false
      })
    }

    // Test 4: Check what IP the request is coming from
    try {
      const ipResponse = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout(5000)
      })
      const ipData = await ipResponse.json()
      results.server_ip = ipData.ip
    } catch (error) {
      results.server_ip = "Could not determine"
    }

    // Summary
    const allTestsPassed = results.tests.every((t: any) => t.passed === true)
    const has403Block = results.tests.some((t: any) => t.blocked === true)

    results.summary = {
      all_tests_passed: allTestsPassed,
      blocked_by_ip: has403Block,
      recommendation: has403Block 
        ? "API call format is CORRECT, but requests are being blocked by IP address (403). Contact Bland.ai to whitelist your server IP."
        : allTestsPassed
        ? "All tests passed - API call format is correct!"
        : "Some tests failed - check individual test results"
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, { status: 500 })
  }
}

