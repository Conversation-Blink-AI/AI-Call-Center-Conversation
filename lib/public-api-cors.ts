import { NextResponse } from "next/server"

export const PUBLIC_API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const

export function publicApiOptionsResponse() {
  return new NextResponse(null, { status: 200, headers: PUBLIC_API_CORS_HEADERS })
}

export function publicApiJsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PUBLIC_API_CORS_HEADERS })
}
