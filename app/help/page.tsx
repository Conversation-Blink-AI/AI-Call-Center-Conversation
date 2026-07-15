import type { Metadata } from "next"
import { Navbar } from "@/components/navbar"
import { HelpCenterContent } from "@/components/help/help-center-content"

export const metadata: Metadata = {
  title: "Help Center | Conversation",
  description: "Learn how to use Conversation to build and manage your AI call flows.",
}

export default function PublicHelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <HelpCenterContent isPublic />
      </main>
    </div>
  )
}
