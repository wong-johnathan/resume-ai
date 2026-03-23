import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import WhySection from '@/components/WhySection'
import FeaturesSection from '@/components/FeaturesSection'
import HowItWorks from '@/components/HowItWorks'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <WhySection />
      <FeaturesSection />
      <HowItWorks />
    </main>
  )
}
