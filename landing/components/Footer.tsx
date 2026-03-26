// landing/components/Footer.tsx
import Link from 'next/link'

const APP_URL = 'https://app.resume.johnathanwwh.com'

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <span className="text-white font-bold text-lg">ResumeAI</span>
          <span className="text-gray-500 text-sm">© 2026 ResumeAI. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/terms"
            className="text-gray-400 hover:text-gray-300 transition-colors text-sm"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-gray-400 hover:text-gray-300 transition-colors text-sm"
          >
            Privacy
          </Link>
          <a
            href={APP_URL}
            className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
          >
            Go to app <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
