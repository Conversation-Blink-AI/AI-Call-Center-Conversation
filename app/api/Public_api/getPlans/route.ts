import { NextRequest, NextResponse } from "next/server"
import { CALL_CENTER_PLANS } from "@/config/plans"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platformParam = (searchParams.get("platform") || "").trim().toLowerCase()
    const planIdParam = (searchParams.get("planId") || "").trim().toLowerCase()

    // Currently only the Call Center platform is supported by this project.
    // Reject unknown platforms with a clear message so consumers get a stable contract.
    if (
      platformParam &&
      platformParam !== "callcenter" &&
      platformParam !== "call_center" &&
      platformParam !== "call-center"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `Platform "${platformParam}" is not available from this API. Supported: "callCenter".`,
          supportedPlatforms: ["callCenter"],
        },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    // Optional single-plan filter
    if (planIdParam) {
      const plan = CALL_CENTER_PLANS.plans.find(
        (p) => p.planId.toLowerCase() === planIdParam
      )
      if (!plan) {
        return NextResponse.json(
          {
            success: false,
            message: `planId "${planIdParam}" not found.`,
            availablePlanIds: CALL_CENTER_PLANS.plans.map((p) => p.planId),
          },
          { status: 404, headers: CORS_HEADERS }
        )
      }

      return NextResponse.json(
        {
          success: true,
          platform: CALL_CENTER_PLANS.platform,
          currency: CALL_CENTER_PLANS.currency,
          plan,
          fetchedAt: new Date().toISOString(),
        },
        { status: 200, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json(
      {
        success: true,
        platform: CALL_CENTER_PLANS.platform,
        displayName: CALL_CENTER_PLANS.displayName,
        description: CALL_CENTER_PLANS.description,
        productUrl: CALL_CENTER_PLANS.productUrl,
        signupUrl: CALL_CENTER_PLANS.signupUrl,
        loginUrl: CALL_CENTER_PLANS.loginUrl,
        pricingModel: CALL_CENTER_PLANS.pricingModel,
        currency: CALL_CENTER_PLANS.currency,
        plans: CALL_CENTER_PLANS.plans,
        usagePricing: CALL_CENTER_PLANS.usagePricing,
        features: CALL_CENTER_PLANS.features,
        paymentProviders: CALL_CENTER_PLANS.paymentProviders,
        support: CALL_CENTER_PLANS.support,
        version: CALL_CENTER_PLANS.version,
        lastUpdated: CALL_CENTER_PLANS.lastUpdated,
        fetchedAt: new Date().toISOString(),
      },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (error: any) {
    console.error("[GET-PLANS] Error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && {
          error: error?.message,
        }),
      },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
