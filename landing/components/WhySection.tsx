'use client'

import { motion, useReducedMotion } from 'framer-motion'

const reasons = [
  {
    icon: '📄',
    headline: 'Generic resumes get ignored',
    body: "Most resumes never make it past the first filter. ResumeAI rewrites yours to match every job description — keywords, tone, and all.",
  },
  {
    icon: '📋',
    headline: 'Job hunting feels like chaos',
    body: 'Applications scattered across tabs, emails, and spreadsheets. ResumeAI keeps every role, status, and document in one organized tracker.',
  },
  {
    icon: '🎤',
    headline: 'Interviews catch you off guard',
    body: 'ResumeAI generates tailored interview questions for each role and gives you AI feedback on your practice answers.',
  },
]

export default function WhySection() {
  const prefersReducedMotion = useReducedMotion()

  const fadeHeading = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true as const },
        transition: { duration: 0.5 },
      }

  const fadeCard = (delay = 0) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true as const },
          transition: { duration: 0.5, delay },
        }

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          {...fadeHeading}
          className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-14"
        >
          Why ResumeAI?
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reasons.map((reason, i) => (
            <motion.div
              key={reason.headline}
              {...fadeCard(i * 0.1)}
              className="border border-gray-200 rounded-xl p-6"
            >
              <span className="text-3xl mb-4 block" aria-hidden="true">{reason.icon}</span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{reason.headline}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{reason.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
