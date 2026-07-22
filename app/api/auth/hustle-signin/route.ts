import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { buildHustleSignInResponse, completeHustleSignIn } from "@/lib/hustle-signin"
import { mapHustleSignInError } from "@/lib/hustle-signin-errors"

const hustleSignInSchema = z
  .object({
    token: z.string().min(1).max(8192),
    redirect: z.string().max(2048).optional().nullable(),
    billingCtx: z.string().min(1).max(16384).optional(),
    billingTs: z.union([z.string().min(1), z.number()]).optional(),
    billingSig: z.string().min(1).max(256).optional(),
  })
  .superRefine((data, ctx) => {
    const hasAnyBilling =
      data.billingCtx !== undefined ||
      data.billingTs !== undefined ||
      data.billingSig !== undefined
    const hasAllBilling =
      data.billingCtx !== undefined &&
      data.billingTs !== undefined &&
      data.billingSig !== undefined

    if (hasAnyBilling && !hasAllBilling) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "billingCtx, billingTs, and billingSig are all required together",
      })
    }
  })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = hustleSignInSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid request body" },
        { status: 400 },
      )
    }

    const { token, redirect, billingCtx, billingTs, billingSig } = parsed.data

    console.log("[HUSTLE-SIGNIN] Starting Forex-verified auto login...")

    const billing =
      billingCtx && billingTs !== undefined && billingSig
        ? { billingCtx, billingTs, billingSig }
        : null

    const result = await completeHustleSignIn(token, { billing, redirect })
    if (!result.ok) {
      console.log("[HUSTLE-SIGNIN] Sign-in failed:", result.message)
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      )
    }

    return NextResponse.json(buildHustleSignInResponse(result))
  } catch (error: unknown) {
    console.error("[HUSTLE-SIGNIN] Error:", error)
    const { status, message } = mapHustleSignInError(error)
    return NextResponse.json({ success: false, message }, { status })
  }
}
