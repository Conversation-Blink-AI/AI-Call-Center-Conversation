import React from "react"
import { HeroSection } from "@/components/hero-section"
import { FeatureCards } from "@/components/feature-cards"
import { PricingInfo } from "@/components/pricing-info"
import { UseCases } from "@/components/use-cases"
import { Testimonials } from "@/components/testimonials"
import { StatsSection } from "@/components/stats-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Feature Cards Section */}
      <FeatureCards />

      {/* Stats Section */}
      <StatsSection />

      {/* Pricing Info */}
      <PricingInfo />

      {/* Use Cases Section */}
      <UseCases />

      {/* Testimonials */}
      <Testimonials />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  )
}