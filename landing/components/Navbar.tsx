'use client'

import { motion } from 'framer-motion'

const APP_URL = 'https://resume-ai.johnathanwwh.com'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <span className="text-white font-bold text-xl tracking-tight">ResumeAI</span>
        <motion.a
          href={APP_URL}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition-colors text-sm"
        >
          <span className="hidden sm:inline">Get Started <span aria-hidden="true">→</span></span>
          <span className="sm:hidden">Start <span aria-hidden="true">→</span></span>
        </motion.a>
      </div>
    </header>
  )
}
