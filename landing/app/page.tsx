import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import WhySection from '@/components/WhySection'
import FeaturesSection from '@/components/FeaturesSection'
import HowItWorks from '@/components/HowItWorks'
import TemplatesSection from '@/components/TemplatesSection'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <WhySection />
        <FeaturesSection />
        <HowItWorks />
        <TemplatesSection />
      </main>
      <Footer />
    </>
  )
}
