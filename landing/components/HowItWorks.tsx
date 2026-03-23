'use client'

import { motion, useReducedMotion } from 'framer-motion'

const steps = [
  {
    number: '01',
    title: 'Build your profile once',
    description:
      'Enter your experience, skills, education, and summary. Import from an existing PDF resume to auto-fill everything.',
  },
  {
    number: '02',
    title: 'Paste a job description',
    description:
      'AI tailors your resume to the role in seconds. Generate a cover letter and check your fit score before applying.',
  },
  {
    number: '03',
    title: 'Track, prep, and apply',
    description:
      'Log your application, generate interview questions, practice your answers, and stay organized until you land the offer.',
  },
]

export default function HowItWorks() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section id="how-it-works" className="bg-white py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h2
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-14"
        >
          Get started in minutes
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Dashed connector (desktop only) */}
          <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] border-t-2 border-dashed border-gray-200 pointer-events-none" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative z-10 inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-blue-500 text-blue-500 font-bold text-lg mb-5 bg-white">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
