import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Known DigitalOcean IP ranges (common ones)
const DIGITALOCEAN_IP_RANGES = [
  { start: "104.131.0.0", end: "104.131.255.255" },
  { start: "104.236.0.0", end: "104.236.255.255" },
  { start: "107.170.0.0", end: "107.170.255.255" },
  { start: "128.199.0.0", end: "128.199.255.255" },
  { start: "138.68.0.0", end: "138.68.255.255" },
  { start: "159.203.0.0", end: "159.203.255.255" },
  { start: "159.89.0.0", end: "159.89.255.255" },
  { start: "162.243.0.0", end: "162.243.255.255" },
  { start: "164.92.0.0", end: "164.92.255.255" },
  { start: "165.227.0.0", end: "165.227.255.255" },
  { start: "167.99.0.0", end: "167.99.255.255" },
  { start: "174.138.0.0", end: "174.138.255.255" },
  { start: "178.62.0.0", end: "178.62.255.255" },
  { start: "188.166.0.0", end: "188.166.255.255" },
  { start: "192.81.208.0", end: "192.81.223.255" },
  { start: "198.199.64.0", end: "198.199.127.255" },
  { start: "207.154.0.0", end: "207.154.255.255" },
  { start: "209.97.128.0", end: "209.97.191.255" },
]

// Helper function to convert IP to number for comparison
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
}

// Check if IP is in a range
function isInRange(ip: string, range: { start: string; end: string }): boolean {
  const ipNum = ipToNumber(ip)
  const startNum = ipToNumber(range.start)
  const endNum = ipToNumber(range.end)
  return ipNum >= startNum && ipNum <= endNum
}

// Check if IP belongs to DigitalOcean
function isDigitalOceanIP(ip: string): boolean {
  return DIGITALOCEAN_IP_RANGES.some(range => isInRange(ip, range))
}

// Get IP information from external services
async function getIPInfo(ip?: string) {
  const checkIP = ip || ""
  try {
    // Try ip-api.com for IP info
    const response = await fetch(`http://ip-api.com/json/${checkIP}?fields=status,message,country,countryCode,region,regionName,city,isp,org,as,query`)
    const data = await response.json()
    return data
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [IP-CHECK] Starting IP diagnostic...")

    // 1. Get server's public IP by making external request
    let serverPublicIP: string | null = null
    let ipInfo: any = null
    let isDigitalOcean = false

    try {
      // Get our public IP
      const ipResponse = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout(5000)
      })
      const ipData = await ipResponse.json()
      serverPublicIP = ipData.ip
      console.log("🌐 [IP-CHECK] Server public IP:", serverPublicIP)

      // Get IP information
      ipInfo = await getIPInfo(serverPublicIP)
      console.log("📋 [IP-CHECK] IP info:", ipInfo)

      // Check if it's DigitalOcean
      isDigitalOcean = isDigitalOceanIP(serverPublicIP) || 
                      (ipInfo.org && ipInfo.org.toLowerCase().includes('digitalocean')) ||
                      (ipInfo.isp && ipInfo.isp.toLowerCase().includes('digitalocean'))
    } catch (error) {
      console.error("❌ [IP-CHECK] Error getting server IP:", error)
    }

    // 2. Get client IP from request headers
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                    request.headers.get('x-real-ip') ||
                    request.headers.get('cf-connecting-ip') ||
                    "Unknown"

    // 3. Check environment variables for host information
    const hostname = process.env.VERCEL_URL || 
                    process.env.NEXT_PUBLIC_APP_URL ||
                    request.headers.get('host') ||
                    "Unknown"

    // 4. Test Bland.ai API connection (what IP they see)
    let blandAiTest: any = {
      attempted: true,
      blocked: false,
      error: null,
      status: null
    }

    const blandApiKey = process.env.BLAND_AI_API_KEY
    if (blandApiKey) {
      try {
        console.log("🧪 [IP-CHECK] Testing Bland.ai API connection...")
        const blandResponse = await fetch('https://api.bland.ai/v1/calls?limit=1', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${blandApiKey}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        })

        blandAiTest.status = blandResponse.status
        blandAiTest.blocked = blandResponse.status === 403

        if (!blandResponse.ok) {
          const errorText = await blandResponse.text()
          // Check if it's the cloud provider blocking message
          if (errorText.includes('Cloud Providers') || errorText.includes('Access denied')) {
            blandAiTest.error = "Blocked: Cloud provider IP detected by Bland.ai"
          } else {
            blandAiTest.error = errorText.substring(0, 500)
          }
        } else {
          blandAiTest.success = true
        }
      } catch (error: any) {
        blandAiTest.error = error.message
        console.error("❌ [IP-CHECK] Bland.ai test error:", error)
      }
    } else {
      blandAiTest.attempted = false
      blandAiTest.error = "BLAND_AI_API_KEY not configured"
    }

    // 5. Additional IP check services
    let additionalIPChecks: any[] = []
    try {
      // Try another IP service
      const ipifyResponse = await fetch("https://api64.ipify.org?format=json", {
        signal: AbortSignal.timeout(5000)
      })
      const ipifyData = await ipifyResponse.json()
      additionalIPChecks.push({
        service: "ipify.org",
        ip: ipifyData.ip,
        matches: ipifyData.ip === serverPublicIP
      })
    } catch (error) {
      console.error("Error with additional IP check:", error)
    }

    // Compile results
    const result = {
      server: {
        public_ip: serverPublicIP,
        ip_info: ipInfo,
        is_digitalocean: isDigitalOcean,
        hostname: hostname,
        environment: process.env.NODE_ENV,
      },
      client: {
        ip: clientIP,
        forwarded_for: request.headers.get('x-forwarded-for'),
        real_ip: request.headers.get('x-real-ip'),
        cloudflare_ip: request.headers.get('cf-connecting-ip'),
      },
      bland_ai_test: blandAiTest,
      additional_checks: additionalIPChecks,
      recommendation: isDigitalOcean || blandAiTest.blocked
        ? "Your server IP appears to be from DigitalOcean or another cloud provider that Bland.ai blocks. Contact hello@bland.ai with your IP address for whitelisting."
        : "IP check passed - server IP should not be blocked by Bland.ai",
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error: any) {
    console.error("🚨 [IP-CHECK] Unexpected error:", error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    }, { status: 500 })
  }
}

