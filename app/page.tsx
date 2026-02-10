import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { StatsSection } from "@/components/landing/stats-section"
import { CTASection } from "@/components/landing/cta-section"
import { LandingHeader } from "@/components/landing/landing-header"
import { LandingFooter } from "@/components/landing/landing-footer"
import { StandaloneRedirect } from "@/components/pwa/standalone-redirect"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background grid-background">
      <StandaloneRedirect />
      <LandingHeader />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  )
}
