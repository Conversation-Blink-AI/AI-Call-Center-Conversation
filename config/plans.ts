/**
 * Public pricing & plan configuration for the Call Center platform.
 *
 * Source of truth for the `/api/Public_api/getPlans` endpoint.
 * Edit values here to update the public pricing API.
 *
 * Notes on the model:
 * - The Call Center is a pay-as-you-go (PAYG) product backed by a prepaid wallet.
 * - "Plans" below represent wallet top-up tiers (the closest analog to a
 *   tiered subscription). Per-minute call cost and per-number monthly cost are
 *   exposed under `usagePricing` so consumers have the full picture.
 * - Update CALL_RATE / PHONE_NUMBER_MONTHLY_FEE here AND in
 *   `config/pricing.ts` if you change the underlying app rates.
 */

export type BillingCycle = "one_time" | "monthly" | "yearly"

export interface PlanFeature {
  label: string
  included: boolean
}

export interface Plan {
  planId: string
  name: string
  description: string
  price: number
  originalPrice?: number
  currency: string
  billingCycle: BillingCycle
  credits: number
  estimatedCallMinutes: number
  features: string[]
  detailedFeatures: PlanFeature[]
  popular: boolean
  ctaLabel: string
  redirectUrl: string
  paymentProviders: Array<"stripe" | "paypal">
  metadata: {
    bonusCredits?: number
    discountPercent?: number
    notes?: string
  }
}

export interface UsagePricing {
  callRate: {
    pricePerMinute: number
    pricePerMinuteCents: number
    currency: string
    minimumBillableSeconds: number
    roundUpPartialMinutes: boolean
    description: string
  }
  phoneNumber: {
    defaultMonthlyFee: number
    currency: string
    billingCycle: BillingCycle
    description: string
  }
}

export interface PlatformPlans {
  platform: "callCenter"
  displayName: string
  productUrl: string
  signupUrl: string
  loginUrl: string
  description: string
  pricingModel: "pay_as_you_go_with_topups"
  currency: string
  plans: Plan[]
  usagePricing: UsagePricing
  features: string[]
  paymentProviders: Array<"stripe" | "paypal">
  support: {
    email: string
    docsUrl: string
    apiDocsUrl: string
  }
  version: string
  lastUpdated: string
}

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://conversation.hustleapp.co"

export const CALL_CENTER_PLANS: PlatformPlans = {
  platform: "callCenter",
  displayName: "Hustle Call Center",
  productUrl: APP_BASE_URL,
  signupUrl: `${APP_BASE_URL}/signup`,
  loginUrl: `${APP_BASE_URL}/login`,
  description:
    "AI-powered call center platform with virtual phone numbers, conversational pathways, and pay-as-you-go billing.",
  pricingModel: "pay_as_you_go_with_topups",
  currency: "USD",

  plans: [
    {
      planId: "starter",
      name: "Starter",
      description:
        "Try the platform with a small wallet top-up. Great for testing pathways and a first phone number.",
      price: 25,
      currency: "USD",
      billingCycle: "one_time",
      credits: 25,
      estimatedCallMinutes: Math.floor(2500 / 11), // 25 USD ÷ $0.11/min ≈ 227 min
      features: [
        "Wallet top-up of $25",
        "≈ 227 minutes of AI calls",
        "1 virtual phone number ($1.50/mo)",
        "Conversational AI pathways",
        "Stripe & PayPal checkout",
      ],
      detailedFeatures: [
        { label: "AI calling (inbound + outbound)", included: true },
        { label: "Pathway designer", included: true },
        { label: "Call history & transcripts", included: true },
        { label: "Knowledge bases", included: true },
        { label: "Public API access", included: true },
        { label: "Priority support", included: false },
      ],
      popular: false,
      ctaLabel: "Top up $25",
      redirectUrl: `${APP_BASE_URL}/dashboard/billing`,
      paymentProviders: ["stripe", "paypal"],
      metadata: {
        notes: "One-time wallet top-up. Funds never expire.",
      },
    },
    {
      planId: "growth",
      name: "Growth",
      description:
        "Most popular top-up — enough credit to run real campaigns and prove out call flows.",
      price: 50,
      currency: "USD",
      billingCycle: "one_time",
      credits: 50,
      estimatedCallMinutes: Math.floor(5000 / 11), // ≈ 454 min
      features: [
        "Wallet top-up of $50",
        "≈ 454 minutes of AI calls",
        "Multiple virtual phone numbers",
        "Conversational AI pathways",
        "Stripe & PayPal checkout",
      ],
      detailedFeatures: [
        { label: "AI calling (inbound + outbound)", included: true },
        { label: "Pathway designer", included: true },
        { label: "Call history & transcripts", included: true },
        { label: "Knowledge bases", included: true },
        { label: "Public API access", included: true },
        { label: "Priority support", included: false },
      ],
      popular: true,
      ctaLabel: "Top up $50",
      redirectUrl: `${APP_BASE_URL}/dashboard/billing`,
      paymentProviders: ["stripe", "paypal"],
      metadata: {
        notes: "Most popular wallet top-up.",
      },
    },
    {
      planId: "pro",
      name: "Pro",
      description:
        "For teams running steady call volume across multiple numbers and pathways.",
      price: 100,
      currency: "USD",
      billingCycle: "one_time",
      credits: 100,
      estimatedCallMinutes: Math.floor(10000 / 11), // ≈ 909 min
      features: [
        "Wallet top-up of $100",
        "≈ 909 minutes of AI calls",
        "Unlimited virtual phone numbers",
        "Conversational AI pathways",
        "Knowledge bases & integrations",
        "Stripe & PayPal checkout",
      ],
      detailedFeatures: [
        { label: "AI calling (inbound + outbound)", included: true },
        { label: "Pathway designer", included: true },
        { label: "Call history & transcripts", included: true },
        { label: "Knowledge bases", included: true },
        { label: "Public API access", included: true },
        { label: "Priority support", included: true },
      ],
      popular: false,
      ctaLabel: "Top up $100",
      redirectUrl: `${APP_BASE_URL}/dashboard/billing`,
      paymentProviders: ["stripe", "paypal"],
      metadata: {
        notes: "Recommended for production teams.",
      },
    },
    {
      planId: "scale",
      name: "Scale",
      description:
        "High-volume top-up for agencies and enterprise call campaigns.",
      price: 250,
      currency: "USD",
      billingCycle: "one_time",
      credits: 250,
      estimatedCallMinutes: Math.floor(25000 / 11), // ≈ 2272 min
      features: [
        "Wallet top-up of $250",
        "≈ 2272 minutes of AI calls",
        "Unlimited virtual phone numbers",
        "Conversational AI pathways",
        "Knowledge bases & integrations",
        "Priority support",
        "Stripe & PayPal checkout",
      ],
      detailedFeatures: [
        { label: "AI calling (inbound + outbound)", included: true },
        { label: "Pathway designer", included: true },
        { label: "Call history & transcripts", included: true },
        { label: "Knowledge bases", included: true },
        { label: "Public API access", included: true },
        { label: "Priority support", included: true },
      ],
      popular: false,
      ctaLabel: "Top up $250",
      redirectUrl: `${APP_BASE_URL}/dashboard/billing`,
      paymentProviders: ["stripe", "paypal"],
      metadata: {
        notes: "Best value per minute for high-volume usage.",
      },
    },
  ],

  usagePricing: {
    callRate: {
      pricePerMinute: 0.11,
      pricePerMinuteCents: 11,
      currency: "USD",
      minimumBillableSeconds: 30,
      roundUpPartialMinutes: true,
      description:
        "AI calls are billed at $0.11/minute, with a 30-second minimum and partial minutes rounded up.",
    },
    phoneNumber: {
      defaultMonthlyFee: 1.5,
      currency: "USD",
      billingCycle: "monthly",
      description:
        "Each virtual phone number is billed at $1.50/month, charged on a recurring monthly cycle.",
    },
  },

  features: [
    "AI-powered inbound and outbound calling",
    "Visual conversational pathway designer",
    "Virtual phone number purchase & management",
    "Call recordings, transcripts, and history",
    "Knowledge bases for AI agents",
    "Webhooks and public REST API",
    "Stripe and PayPal checkout",
    "Wallet-based prepaid billing",
  ],

  paymentProviders: ["stripe", "paypal"],

  support: {
    email: "support@hustleapp.co",
    docsUrl: `${APP_BASE_URL}/docs`,
    apiDocsUrl: `${APP_BASE_URL}/public-api`,
  },

  version: "1.0.0",
  lastUpdated: "2026-05-04",
}
