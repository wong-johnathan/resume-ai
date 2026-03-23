'use client'

import { motion, useReducedMotion } from 'framer-motion'

const features = [
  {
    large: true,
    icon: '✨',
    title: 'AI Resume Tailoring',
    description:
      'Paste any job description and AI rewrites your entire resume to match — reordering, reframing, and optimizing for the role.',
  },
  {
    large: true,
    icon: '📊',
    title: 'Job Tracker',
    description:
      'Track every application with status, dates, salary, location, and attachments in a clean table view.',
  },
  {
    large: false,
    icon: '🎯',
    title: 'Interview Prep',
    description:
      'AI generates role-specific interview questions by category. Practice your answers and get AI feedback.',
  },
  {
    large: false,
    icon: '✉️',
    title: 'Cover Letter Generator',
    description:
      'Generate a tailored cover letter in Professional, Conversational, or Enthusiastic tone — streamed in real time.',
  },
  {
    large: false,
    icon: '📈',
    title: 'Fit Analysis',
    description:
      'Get an AI match score and breakdown of your strengths and gaps before you apply.',
  },
  {
    large: false,
    icon: '🎨',
    title: '20 Resume Templates',
    description:
      'Choose from 20 professional templates and download a print-ready PDF instantly.',
  },
]

export default function FeaturesSection() {
  const prefersReducedMotion = useReducedMotion()

  const fadeUp = (delay = 0) => ({
    initial: prefersReducedMotion ? {} : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, delay },
  })

  const largeFeatures = features.filter((f) => f.large)
  const smallFeatures = features.filter((f) => !f.large)

  return (
    <section className="bg-gray-50 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          {...fadeUp(0)}
          className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-14"
        >
          Everything you need to land the job
        </motion.h2>

        {/* Large cards row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {largeFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...fadeUp(i * 0.1)}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
            >
              <span className="text-4xl mb-4 block" aria-hidden="true">{feature.icon}</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Small cards 2x2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {smallFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              {...fadeUp(0.2 + i * 0.08)}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <span className="text-3xl mb-3 block" aria-hidden="true">{feature.icon}</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
