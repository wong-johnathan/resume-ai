'use client'

import { motion, useReducedMotion } from 'framer-motion'

const templates = [
  { name: 'Minimal', bg: 'bg-white', border: 'border-gray-300', lines: 'bg-gray-300' },
  { name: 'Dark', bg: 'bg-gray-900', border: 'border-gray-700', lines: 'bg-gray-600' },
  { name: 'Teal', bg: 'bg-teal-50', border: 'border-teal-300', lines: 'bg-teal-300' },
  { name: 'Coral', bg: 'bg-orange-50', border: 'border-orange-300', lines: 'bg-orange-300' },
  { name: 'Slate', bg: 'bg-slate-100', border: 'border-slate-400', lines: 'bg-slate-400' },
  { name: 'Soft', bg: 'bg-purple-50', border: 'border-purple-300', lines: 'bg-purple-300' },
]

function AbstractResume({
  bg,
  border,
  lines,
}: {
  bg: string
  border: string
  lines: string
}) {
  return (
    <div
      className={`${bg} border ${border} rounded-lg p-3 w-32 h-44 flex-shrink-0 flex flex-col gap-2 shadow-sm`}
    >
      <div className={`${lines} rounded h-3 w-3/4 opacity-80`} />
      <div className={`${lines} rounded h-2 w-1/2 opacity-50`} />
      <div className={`${lines} h-px w-full opacity-30 mt-1`} />
      <div className={`${lines} rounded h-2 w-full opacity-60`} />
      <div className={`${lines} rounded h-2 w-5/6 opacity-60`} />
      <div className={`${lines} rounded h-2 w-4/6 opacity-50`} />
      <div className={`${lines} h-px w-full opacity-20 mt-1`} />
      <div className={`${lines} rounded h-2 w-full opacity-50`} />
      <div className={`${lines} rounded h-2 w-3/4 opacity-40`} />
      <div className={`${lines} rounded h-2 w-5/6 opacity-40`} />
    </div>
  )
}

export default function TemplatesSection() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="bg-gray-50 py-20 sm:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            20 professional templates
          </h2>
          <p className="text-gray-500">
            Pick the style that fits your industry. Download as a polished PDF in seconds.
          </p>
        </motion.div>

        <div className="flex gap-6 overflow-x-auto pb-4 md:justify-center">
          {templates.map((template, i) => (
            <motion.div
              key={template.name}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="flex flex-col items-center gap-2 cursor-default flex-shrink-0"
            >
              <AbstractResume {...template} />
              <span className="text-xs text-gray-400 font-medium">{template.name}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
