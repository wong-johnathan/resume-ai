import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Minimal header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-gray-900 font-bold text-lg tracking-tight">
            ResumeAI
          </Link>
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm transition-colors">
            <span aria-hidden="true">←</span> Back to home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  )
}
