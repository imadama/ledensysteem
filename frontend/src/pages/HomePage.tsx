import { Hero } from '../components/marketing/Hero'
import { Features } from '../components/marketing/Features'
import { Pricing } from '../components/marketing/Pricing'
import { CTA } from '../components/marketing/CTA'
import { Footer } from '../components/marketing/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Hero />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}

