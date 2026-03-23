import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import WhySection from '@/components/WhySection'
import FeaturesSection from '@/components/FeaturesSection'

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <WhySection />
      <FeaturesSection />
    </main>
  )
}
