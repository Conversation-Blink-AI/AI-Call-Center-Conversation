"use client"

import Link from "next/link"
import {
  ArrowRight,
  Check,
  CreditCard,
  Phone,
  Sparkles,
  Zap,
  Shield,
  HelpCircle,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const rates = [
  {
    icon: Phone,
    label: "Phone numbers",
    price: "$15",
    unit: "per number / month",
    detail: "Dedicated numbers for inbound and outbound AI calls.",
  },
  {
    icon: Zap,
    label: "Voice minutes",
    price: "$0.16",
    unit: "per minute",
    detail: "Only pay for the time your agents are on a live call.",
  },
  {
    icon: Sparkles,
    label: "Free trial credit",
    price: "$5",
    unit: "wallet balance",
    detail: "Test flows and voices before you spend a dollar.",
  },
]

const included = [
  "Visual no-code call flow builder",
  "Premium AI voices & pathways",
  "Analytics and call history",
  "Knowledge base support",
  "Secure Stripe payments",
  "Scale numbers and minutes anytime",
  "No long-term contracts",
  "Email support",
]

const faqs = [
  {
    q: "Is there a monthly plan fee?",
    a: "No platform subscription. You pay $15/month per phone number and $0.16 per minute of voice usage. Add funds to your wallet as you need them.",
  },
  {
    q: "How does the $5 free credit work?",
    a: "New accounts receive $5 in trial wallet balance so you can purchase a number or run test calls without adding a payment method first.",
  },
  {
    q: "Can I cancel or remove a phone number?",
    a: "Yes. Cancel anytime from billing. You only pay for numbers that stay active into the next billing cycle.",
  },
  {
    q: "Do you offer volume discounts?",
    a: "For high-volume teams, contact sales for custom rates on minutes and multi-number deployments.",
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl animate-[pulse_6s_ease-in-out_infinite]" />
          <div className="absolute top-32 right-1/5 h-80 w-80 rounded-full bg-purple-500/15 blur-3xl animate-[pulse_8s_ease-in-out_infinite_1s]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="mb-4 text-sm font-medium tracking-widest uppercase text-blue-400/90">
            Conversation
          </p>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white/90">
            Pricing
          </h1>
          <p className="mt-5 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Transparent usage-based pricing. No seat fees, no lock-ins—pay for
            numbers and minutes as you grow.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button className="h-12 px-7 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                Start with $5 free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/try-demo">
              <Button
                variant="outline"
                className="h-12 px-7 border-gray-700 bg-transparent text-gray-200 hover:bg-gray-900 hover:text-white"
              >
                Try demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Rate cards */}
      <section className="relative pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {rates.map((rate, i) => (
              <div
                key={rate.label}
                className="group relative rounded-2xl border border-gray-800 bg-gray-900/60 p-7 transition-all duration-300 hover:border-purple-500/40 hover:bg-gray-900"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 text-blue-300 ring-1 ring-white/10">
                  <rate.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-gray-400">{rate.label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-white">
                    {rate.price}
                  </span>
                  <span className="text-sm text-gray-500">{rate.unit}</span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-gray-400">
                  {rate.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-20 border-t border-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900/80 px-3 py-1 text-xs text-gray-400 mb-4">
                <Shield className="h-3.5 w-3.5 text-blue-400" />
                Everything included
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                One simple model.
                <span className="block text-gray-500 mt-1">All the tools.</span>
              </h2>
              <p className="mt-4 text-gray-400 leading-relaxed max-w-md">
                Build AI call flows, qualify leads, and run support—without
                stacking plan tiers for features you already need.
              </p>
              <Link href="/signup" className="inline-block mt-8">
                <Button className="h-11 px-6 bg-white text-gray-950 hover:bg-gray-200">
                  Create free account
                </Button>
              </Link>
            </div>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {included.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-xl border border-gray-800/80 bg-gray-900/40 px-4 py-3.5"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-sm text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Pay as you go highlight */}
      <section className="py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative max-w-5xl mx-auto overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-purple-950/40 p-8 md:p-12">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="relative flex flex-col md:flex-row md:items-center gap-8">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
                <CreditCard className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white">Pay as you go</h3>
                <p className="mt-2 text-gray-400 max-w-xl leading-relaxed">
                  Top up your wallet, buy numbers, and run calls. Scale up for
                  campaigns or scale down overnight—no renegotiation required.
                </p>
              </div>
              <Link href="/signup">
                <Button className="h-11 px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 whitespace-nowrap">
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-t border-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-900 border border-gray-800 mb-4">
              <HelpCircle className="h-5 w-5 text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Pricing questions</h2>
            <p className="mt-3 text-gray-400">
              Quick answers about how billing works on Conversation.
            </p>
          </div>

          <Accordion
            type="single"
            collapsible
            className="max-w-2xl mx-auto space-y-2"
          >
            {faqs.map((faq, i) => (
              <AccordionItem
                key={faq.q}
                value={`item-${i}`}
                className="border border-gray-800 rounded-xl px-5 bg-gray-900/40 data-[state=open]:border-gray-700"
              >
                <AccordionTrigger className="text-left text-white hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-400 pb-4 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <p className="text-center mt-8 text-sm text-gray-500">
            More help in our{" "}
            <Link href="/faq" className="text-blue-400 hover:text-blue-300">
              FAQ
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-purple-900/80" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-purple-500/25 blur-3xl" />
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to launch your first AI call?
          </h2>
          <p className="mt-4 text-lg text-blue-100/80 max-w-xl mx-auto">
            Sign up, claim your $5 credit, and build a flow in minutes.
          </p>
          <Link href="/signup" className="inline-block mt-8">
            <Button className="h-12 px-8 bg-white text-blue-950 hover:bg-gray-100 text-base">
              Start free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
