"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Building2,
  Phone,
  Workflow,
  CreditCard,
  Sparkles,
  Shield,
  HelpCircle,
  ExternalLink,
  BarChart3,
  Plug,
  Search,
  X,
  type LucideIcon,
} from "lucide-react"
import { Navbar } from "@/components/navbar"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type FaqItem = {
  question: string
  answer: string
}

type FaqSection = {
  id: string
  title: string
  description: string
  icon: LucideIcon
  items: FaqItem[]
}

const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "What Conversation is and how to get going.",
    icon: Building2,
    items: [
      {
        question: "What is Conversation?",
        answer:
          "Conversation is an AI call flow builder and call center platform. You purchase virtual phone numbers, design conversational pathways visually, run inbound and outbound AI calls, and track results from one dashboard — without writing code.",
      },
      {
        question: "Who is Conversation built for?",
        answer:
          "Teams that need automated phone conversations: sales and lead qualification, customer support, appointment booking, and similar workflows. Product teams and agencies can also run campaigns across multiple numbers and pathways.",
      },
      {
        question: "How does the AI Call Flow Builder work?",
        answer:
          "You design a pathway as a flowchart: add nodes for what the AI says, how it listens, branching logic, transfers, webhooks, and more. Connect the nodes, save the pathway, assign it to a phone number, then go live or send a test call.",
      },
      {
        question: "Do I need coding experience?",
        answer:
          "No. The visual drag-and-drop builder is enough for most flows. If you need system integrations, you can also use webhooks and the public REST API.",
      },
      {
        question: "How quickly can I deploy my first call flow?",
        answer:
          "Most users can purchase a number, build or generate a pathway, assign it, and place a test call in a single session. Time depends on how complex your conversation is — simple flows can be live in minutes.",
      },
    ],
  },
  {
    id: "call-flows",
    title: "AI Call Flows",
    description: "Inbound answering and what you can automate.",
    icon: Phone,
    items: [
      {
        question: "What is an AI call flow?",
        answer:
          "A call flow (pathway) is the conversation script your AI agent follows. It defines prompts, questions, branching based on caller responses, and actions like transferring or ending the call.",
      },
      {
        question: "What types of call flows can I build?",
        answer:
          "Common examples include lead qualification, customer support, appointment booking over the phone, information collection, and routing callers based on intent. You design the logic to match your use case.",
      },
      {
        question: "Can I create inbound call flows?",
        answer:
          "Yes. Purchase a number, assign a pathway, and configure inbound settings so callers reach your AI agent when they dial that number.",
      },
      {
        question: "Does it support call transfer?",
        answer:
          "Yes. Add a Transfer node to your pathway and set the destination number. The AI can hand off the call to a human agent when conditions you define are met.",
      },
      {
        question: "Does it support IVR?",
        answer:
          "Conversation uses conversational AI pathways rather than classic keypad IVR menus. You build branching voice dialogs that understand natural speech instead of relying only on DTMF button presses.",
      },
      {
        question: "Can it schedule callbacks?",
        answer:
          "There is no built-in callback scheduler today. You can design pathways that discuss scheduling, and use webhooks or your own systems to book follow-ups after the call.",
      },
      {
        question: "Can I automate lead qualification calls?",
        answer:
          "Yes. Build a pathway that asks qualifying questions, branches on answers, collects details into variables, and routes hot leads — for example with a transfer to a human agent.",
      },
      {
        question: "Can AI answer customer calls 24/7?",
        answer:
          "Inbound numbers with an assigned pathway can answer whenever someone calls, so your AI agent is available around the clock without staffing a live queue.",
      },
      {
        question: "How many simultaneous calls can I make?",
        answer:
          "There is no fixed concurrent-call cap published in the product. Capacity depends on your account usage and wallet balance. Contact support@hustleapp.co if you need higher concurrency for production traffic.",
      },
      {
        question: "Can I increase concurrent calls later?",
        answer:
          "Yes. As your volume grows, reach out to support@hustleapp.co and we can help scale concurrent capacity for your account.",
      },
      {
        question: "Is there any limit on daily calls?",
        answer:
          "There is no daily call limit in the product. Practical limits are your prepaid wallet balance and any account-level capacity agreed with support.",
      },
    ],
  },
  {
    id: "flow-builder",
    title: "Flow Builder",
    description: "Designing, editing, and testing pathways.",
    icon: Workflow,
    items: [
      {
        question: "Does Conversation include a drag-and-drop flow builder?",
        answer:
          "Yes. The pathway editor is a visual flowchart builder. Drag nodes from the palette, connect edges, and configure each step without code.",
      },
      {
        question: "Can I edit call flows after publishing?",
        answer:
          "Yes. Open the pathway in the editor, make changes, save, and update the pathway so live numbers use the latest version.",
      },
      {
        question: "Can I test my call flow before going live?",
        answer:
          "Yes. Use Send Call with your pathway to place a real outbound test call and verify the conversation before you rely on it for production traffic.",
      },
      {
        question: "Can I generate a starting pathway with AI?",
        answer:
          "Yes. You can generate an initial pathway from a description, then refine prompts, branches, and nodes in the visual editor.",
      },
    ],
  },
  {
    id: "phone-numbers",
    title: "Phone Numbers",
    description: "Buying, renting, and availability by country or city.",
    icon: Phone,
    items: [
      {
        question: "Can I purchase phone numbers directly from Conversation?",
        answer:
          "Yes. Go to Phone Numbers → Purchase Number, choose a country and area code, then complete checkout. Numbers cost $15 each and are billed at $15 per month.",
      },
      {
        question: "How much does a phone number cost per month?",
        answer:
          "Virtual phone numbers cost $15 to purchase and $15 per month thereafter on a recurring monthly cycle.",
      },
      {
        question: "Can I buy a permanent number?",
        answer:
          "Yes. You purchase a dedicated virtual number and keep it as long as the $15/month rental remains active on your account.",
      },
      {
        question: "Can I port my existing number?",
        answer:
          "Number porting is not available today. You purchase a new virtual number from Conversation and assign your pathway to it.",
      },
      {
        question: "What number types are available (Local, Mobile, Toll-Free)?",
        answer:
          "Purchase currently focuses on local numbers by area code in the United States and Canada. Mobile and toll-free inventory is not offered in the purchase flow today.",
      },
      {
        question: "Can I have multiple numbers? What is the max number limit?",
        answer:
          "Yes. Buy and manage as many numbers as you need from the Phone Numbers area. There is no fixed product maximum — you can scale with your wallet and business needs.",
      },
      {
        question: "Is this service available in India?",
        answer:
          "You cannot purchase Indian (+91) phone numbers today. Number purchase supports the United States and Canada only. Contact support@hustleapp.co if you need other regions.",
      },
      {
        question: "Which cities are supported?",
        answer:
          "There is no fixed city list. For the United States and Canada, search by area code for the city you need (for example 415 for San Francisco or 213 for Los Angeles). Availability depends on current inventory at purchase time.",
      },
      {
        question: "Is it available in California or my city?",
        answer:
          "For U.S. cities including California, search available local numbers by area code on the Purchase Number page. If inventory exists for that area code, you can buy it for $15 plus $15/month. City availability changes with stock.",
      },
      {
        question: "Which countries are supported?",
        answer:
          "Number purchase currently supports the United States and Canada. Availability of specific area codes depends on what is in stock at purchase time.",
      },
      {
        question: "Can I assign different flows to different numbers?",
        answer:
          "Yes. Each number can have its own pathway, or several numbers can share the same flow — useful for separate campaigns, brands, or regions.",
      },
    ],
  },
  {
    id: "ai-features",
    title: "AI Features",
    description: "Voices, languages, knowledge, and conversation behavior.",
    icon: Sparkles,
    items: [
      {
        question: "Can AI understand natural conversations?",
        answer:
          "Yes. Pathways use conversational AI with question and response nodes so callers can speak naturally. You define how the agent interprets answers and which branch to take next.",
      },
      {
        question: "Can AI ask follow-up questions?",
        answer:
          "Yes. Chain question nodes and conditional edges so the agent asks follow-ups based on what the caller said.",
      },
      {
        question: "Can AI collect customer information?",
        answer:
          "Yes. Capture details into variables during the call (for example name, phone, ZIP, or custom fields) and use them later in the flow or via webhooks.",
      },
      {
        question: "Which languages are supported?",
        answer:
          "Many languages are supported, including English (US, UK, Australia, India), Hindi, Spanish, French, German, Chinese, Japanese, Korean, Portuguese, Italian, Dutch, and more, plus Auto Detect. Set the language on your phone number / inbound settings.",
      },
      {
        question: "Can it switch languages during a call?",
        answer:
          "Language is configured per number or inbound settings for the conversation. Mid-call language switching is not available as a separate feature today.",
      },
      {
        question: "Can I use my own AI voice?",
        answer:
          "You can choose from the Voices library, preview options, and assign a voice that matches your brand. Uploading or cloning a custom personal voice is not supported today.",
      },
      {
        question: "Can I customize the AI voice?",
        answer:
          "Yes. Browse the Voices library, preview options, and assign a voice that matches your brand on number settings or when sending a call.",
      },
      {
        question: "What is a knowledge base?",
        answer:
          "Knowledge bases give the AI extra context — product details, FAQs, policies — so answers stay accurate. Manage them under Knowledgebase and attach them in your pathway where needed.",
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    description: "Call history, recordings, transcripts, and performance.",
    icon: BarChart3,
    items: [
      {
        question: "What analytics does Conversation provide?",
        answer:
          "The Analytics and Calls areas show totals, completion rates, duration, outcomes, and related metrics. You can filter by date range and drill into individual calls.",
      },
      {
        question: "Does it record calls?",
        answer:
          "Yes. You can enable call recording on your inbound number settings. When recording is available for a call, you can review it from Call History.",
      },
      {
        question: "Can I download recordings?",
        answer:
          "Yes. When a recording is available, Call History provides a recording link so you can open or save the audio from that call.",
      },
      {
        question: "Do you provide call transcripts?",
        answer:
          "Yes. Call History includes transcripts for calls when they are available, so you can review what was said and improve your pathways.",
      },
      {
        question: "Can I track conversion rates?",
        answer:
          "Yes. Analytics surfaces success and conversion-style metrics based on call outcomes so you can see how pathways perform over time.",
      },
      {
        question: "Can I export call reports?",
        answer:
          "Yes. Call History supports exporting call data (for example as CSV) so you can analyze results outside the dashboard.",
      },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "APIs, webhooks, CRM, and messaging channels.",
    icon: Plug,
    items: [
      {
        question: "Can I use webhooks?",
        answer:
          "Yes. Pathways can include webhook nodes, and you can send post-call webhooks so external systems receive events when a call completes. See /public-api for REST API docs.",
      },
      {
        question: "Does it integrate with HubSpot?",
        answer:
          "There is no built-in HubSpot connector. You can push call data into HubSpot using pathway webhooks, post-call webhooks, or the public API.",
      },
      {
        question: "Does it integrate with Salesforce?",
        answer:
          "There is no built-in Salesforce connector. Connect Salesforce via webhooks or the public API using your own integration or middleware.",
      },
      {
        question: "Can it send SMS after a call?",
        answer:
          "Sending SMS automatically after a call is not a built-in pathway feature today. Use webhooks to trigger SMS from your own messaging provider after the call ends.",
      },
      {
        question: "Does it support WhatsApp?",
        answer:
          "WhatsApp is not supported today. Conversation focuses on AI voice calls over virtual phone numbers.",
      },
      {
        question: "Can I trigger workflows after a call ends?",
        answer:
          "Yes. Configure post-call webhooks or pathway webhook / Meta (Facebook Pixel) nodes so external systems receive events when a call completes.",
      },
      {
        question: "Can Conversation integrate with my CRM?",
        answer:
          "There is no single built-in CRM connector. You can push call data to your CRM using pathway webhooks, post-call webhooks, or the public API.",
      },
      {
        question: "Can I connect through Hustle?",
        answer:
          "Yes. Organizations and members can sync via Hustle integration routes, and users can sign in through Hustle authentication when your org is connected.",
      },
    ],
  },
  {
    id: "pricing",
    title: "Pricing",
    description: "Call rates, number fees, wallet, and billing.",
    icon: CreditCard,
    items: [
      {
        question: "What are the per-minute call charges?",
        answer:
          "Inbound AI call usage is billed at $0.11 per minute (USD), with a 30-second minimum and partial minutes rounded up.",
      },
      {
        question: "Do you charge per second or per minute?",
        answer:
          "Billing is per minute at $0.11/min. There is a 30-second minimum, and partial minutes are rounded up — not billed per second.",
      },
      {
        question: "Are inbound and outbound charges different?",
        answer:
          "Inbound AI answering is available and charged at $0.11 per minute (30-second minimum, rounded up). That is the call usage rate applied to inbound conversations.",
      },
      {
        question: "Is there any setup fee?",
        answer:
          "No. There is no separate setup fee. You pay for wallet top-ups, $15 phone-number purchase/rental, and $0.11 per minute of inbound AI call usage.",
      },
      {
        question: "Is onboarding free?",
        answer:
          "Yes. Creating an account and getting started has no onboarding fee. New accounts may also receive free trial wallet credit to test the platform. You only pay when you purchase numbers or use billable call minutes.",
      },
      {
        question: "How am I billed?",
        answer:
          "You top up a prepaid wallet, then inbound AI call minutes and phone number fees are charged against that balance. Stripe and PayPal are supported for top-ups.",
      },
      {
        question: "Is billing prepaid or postpaid?",
        answer:
          "Billing is prepaid. Add funds to your wallet first, then usage and number fees deduct from that balance.",
      },
      {
        question: "Can I recharge my wallet?",
        answer:
          "Yes. Open Dashboard → Billing and top up whenever you need more credit. Tiers include amounts such as $25, $50, $100, and $250.",
      },
      {
        question: "Do unused credits expire?",
        answer:
          "No. Wallet funds do not expire.",
      },
      {
        question: "How does pay-as-you-go pricing work?",
        answer:
          "You top up a prepaid wallet, then AI call minutes and phone number fees are charged against that balance. Wallet funds do not expire.",
      },
      {
        question: "Is there a monthly subscription?",
        answer:
          "Call usage is pay-as-you-go from your wallet — there is no required platform subscription for minutes. Phone numbers are $15/month each on a recurring cycle after purchase.",
      },
      {
        question: "How much do phone numbers cost?",
        answer:
          "Virtual phone numbers cost $15 to purchase and $15 per month thereafter, charged on a recurring monthly cycle.",
      },
    ],
  },
  {
    id: "security-team",
    title: "Security & Team",
    description: "Data protection, compliance, roles, and collaboration.",
    icon: Shield,
    items: [
      {
        question: "Is customer data encrypted?",
        answer:
          "Yes. Sensitive fields such as emails and phone numbers are encrypted at rest using AES-256-GCM. Access to the dashboard requires authentication, and org roles limit what members can see.",
      },
      {
        question: "Is call recording legal?",
        answer:
          "Conversation can record calls when you enable recording. Whether recording is legal depends on local consent laws (for example one-party vs two-party consent). You are responsible for complying with the laws in the regions where you operate.",
      },
      {
        question: "Does it support DND compliance?",
        answer:
          "There is no built-in Do Not Disturb (DND) / Do-Not-Call registry module today. You should apply your own compliance processes and contact lists for the markets you call or serve.",
      },
      {
        question: "Who can access call recordings?",
        answer:
          "Recordings and transcripts are available to authenticated users with access to your account’s Call History. Organization roles further control who can view org-scoped data.",
      },
      {
        question: "Can multiple team members manage call flows?",
        answer:
          "Yes. When you use organizations (for example via Hustle), multiple members can work in the same org according to their roles and permissions.",
      },
      {
        question: "Can I assign different roles and permissions?",
        answer:
          "Yes. Roles such as organization_admin, call_center_admin, and operator control access to org analytics, wallets, and member management.",
      },
    ],
  },
  {
    id: "support",
    title: "Deployment & Support",
    description: "Going live and getting help.",
    icon: HelpCircle,
    items: [
      {
        question: "Do you offer technical support email or contact number?",
        answer:
          "Yes. Email support@hustleapp.co for technical help. You can also use the Help Center and the Report Issue form. A public support phone number is not listed — email is the primary contact channel.",
      },
      {
        question: "How long does it take to deploy a call flow?",
        answer:
          "After you save and update a pathway and assign it to a number, it can handle calls right away. Simple flows often go live the same day you build them.",
      },
      {
        question: "Can I update a live flow without downtime?",
        answer:
          "Yes. Edit the pathway, save, and update it. New calls use the updated flow; you do not need to repurchase the number.",
      },
      {
        question: "Is technical support included?",
        answer:
          "Yes. Use the Help Center at /help, report issues from Help, or email support@hustleapp.co. Higher top-up tiers note priority support for production teams.",
      },
      {
        question: "Where can I find more documentation?",
        answer:
          "Visit /public-api for API docs and /help for product guides — no sign-in required.",
      },
    ],
  },
]

export default function FaqPage() {
  const [activeSection, setActiveSection] = useState(FAQ_SECTIONS[0].id)
  const [searchQuery, setSearchQuery] = useState("")

  const normalizedQuery = searchQuery.trim().toLowerCase()

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return FAQ_SECTIONS

    return FAQ_SECTIONS.map((section) => {
      const items = section.items.filter(
        (item) =>
          item.question.toLowerCase().includes(normalizedQuery) ||
          item.answer.toLowerCase().includes(normalizedQuery) ||
          section.title.toLowerCase().includes(normalizedQuery) ||
          section.description.toLowerCase().includes(normalizedQuery),
      )
      return { ...section, items }
    }).filter((section) => section.items.length > 0)
  }, [normalizedQuery])

  const matchCount = useMemo(
    () => filteredSections.reduce((total, section) => total + section.items.length, 0),
    [filteredSections],
  )

  const scrollToSection = (id: string) => {
    setActiveSection(id)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="min-h-screen bg-[#07071a] text-white">
      <Navbar />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <header className="mb-12 text-center">
            <p className="text-sm font-medium text-purple-300/90 mb-3 tracking-wide uppercase">
              Help & answers
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Frequently Asked Questions
              </span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
              Learn how Conversation works — inbound call flows, phone numbers, AI features, pricing,
              recordings, integrations, and support — based on what the platform actually supports.
            </p>

            <div className="relative mx-auto max-w-xl text-left">
              <label htmlFor="faq-search" className="sr-only">
                Search FAQ
              </label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="faq-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions, answers, and topics..."
                className="h-12 rounded-xl border-white/15 bg-white/5 pl-10 pr-10 text-white placeholder:text-gray-500 focus-visible:ring-purple-500/50 focus-visible:ring-offset-0"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {normalizedQuery && (
              <p className="mt-3 text-sm text-gray-400" aria-live="polite">
                {matchCount === 0
                  ? "No matching questions"
                  : `${matchCount} result${matchCount === 1 ? "" : "s"} for “${searchQuery.trim()}”`}
              </p>
            )}
          </header>

          {filteredSections.length > 0 && (
            <nav
              aria-label="FAQ sections"
              className="mb-12 flex flex-wrap justify-center gap-2"
            >
              {filteredSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors border",
                      isActive
                        ? "bg-purple-600/30 border-purple-500/50 text-white"
                        : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {section.title}
                  </button>
                )
              })}
            </nav>
          )}

          <div className="space-y-10">
            {filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center">
                <Search className="mx-auto mb-4 h-8 w-8 text-gray-500" />
                <h2 className="text-xl font-semibold text-white mb-2">No results found</h2>
                <p className="text-gray-400 max-w-md mx-auto mb-6">
                  Nothing matched “{searchQuery.trim()}”. Try a different keyword, clear the
                  search to browse all topics, or visit the Help Center.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    asChild
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                  >
                    <Link href="/help">Open Help Center</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  >
                    Clear search
                  </Button>
                </div>
              </div>
            ) : (
              filteredSections.map((section) => {
                const Icon = section.icon
                return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-28 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8"
                  >
                    <div className="mb-6 flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-purple-500/20 p-2 text-purple-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-semibold text-white">{section.title}</h2>
                        <p className="mt-1 text-sm text-gray-400">{section.description}</p>
                      </div>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                      {section.items.map((item, index) => (
                        <AccordionItem
                          key={`${section.id}-${index}`}
                          value={`${section.id}-${index}`}
                          className="border-white/10"
                        >
                          <AccordionTrigger className="text-left text-base text-gray-100 hover:no-underline hover:text-white">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-400 leading-relaxed">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </section>
                )
              })
            )}
          </div>

          <div className="mt-14 rounded-2xl border border-white/10 bg-gradient-to-br from-purple-900/40 via-gray-900/60 to-blue-900/30 p-8 text-center">
            <Workflow className="mx-auto mb-4 h-8 w-8 text-purple-300" />
            <h2 className="text-2xl font-semibold mb-2">Still need help?</h2>
            <p className="text-gray-300 mb-6 max-w-xl mx-auto">
              Browse the Help Center, review public API docs, or contact support.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
              >
                <Link href="/help">Open Help Center</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/public-api">
                  API docs
                  <ExternalLink className="ml-2 h-4 w-4 opacity-80" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <a href="mailto:support@hustleapp.co">Email support</a>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
