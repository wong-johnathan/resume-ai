'use client'

import { motion, useReducedMotion } from 'framer-motion'

const APP_URL = 'https://resume-ai.johnathanwwh.com'

export default function Hero() {
  const prefersReducedMotion = useReducedMotion()

  const blobProps = prefersReducedMotion
    ? {}
    : {
        animate: { scale: [1, 1.05, 1] } as const,
        transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
      }

  const fadeUp = (delay = 0) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay },
        }

  return (
    <section className="relative bg-gray-900 overflow-hidden py-24 sm:py-36">
      {/* Blue blob */}
      <motion.div
        {...blobProps}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 opacity-20 rounded-full blur-3xl pointer-events-none"
      />
      {/* Purple blob */}
      <motion.div
        {...blobProps}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600 opacity-15 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div {...fadeUp(0)}>
          <span className="inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            ✦ AI-Powered Job Search
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp(0.1)}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
        >
          Build resumes that{' '}
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            actually get interviews
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          {...fadeUp(0.2)}
          className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10"
        >
          AI-powered resume builder that tailors your resume to every job description,
          tracks your applications, and preps you for interviews — all in one place.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.3)}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <motion.a
            href={APP_URL}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors text-lg w-full sm:w-auto text-center"
          >
            Get Started Free →
          </motion.a>
          <a
            href="#how-it-works"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            See how it works ↓
          </a>
        </motion.div>
      </div>
    </section>
  )
}
