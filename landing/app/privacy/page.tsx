import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout from '@/components/LegalLayout'

export const metadata: Metadata = {
  title: 'Privacy Policy — ResumeAI',
  description: 'Read the Privacy Policy for ResumeAI — how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <LegalLayout>
      {/* Title block */}
      <div className="mb-8 pb-6 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Legal</p>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400">Last updated: March 26, 2026</p>
      </div>

      <div className="space-y-8 text-gray-700">

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">1. Information We Collect</h2>
          <p className="leading-relaxed">We collect the following information when you use ResumeAI:</p>
          <ul className="mt-3 space-y-1 list-disc list-inside text-sm leading-relaxed">
            <li><strong>Google account info:</strong> your name, email address, and profile picture, received via Google OAuth when you sign in.</li>
            <li><strong>Resume content:</strong> work experience, education, skills, certifications, and other profile data you enter.</li>
            <li><strong>Job applications:</strong> job descriptions, application status, notes, and cover letters you create.</li>
            <li><strong>AI-generated content:</strong> tailored resumes, cover letters, and interview prep materials generated on your behalf.</li>
            <li><strong>Usage data:</strong> activity logs (e.g., which features you use) to help us improve the service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">2. How We Use Your Data</h2>
          <p className="leading-relaxed">We use your data to provide and improve the ResumeAI service: generating tailored resumes and cover letters, producing PDF exports, tracking your job applications, and personalizing your experience. We do not sell your personal data to third parties. We do not use your data for advertising.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">3. AI Processing</h2>
          <p className="leading-relaxed">When you use AI features (resume tailoring, cover letter generation, interview prep), your resume content and job description are sent to Anthropic's Claude API to generate the output. Anthropic processes this data under their own privacy policy. Your data is not used to train AI models. We only send the minimum data necessary to generate the requested output.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">4. Google OAuth</h2>
          <p className="leading-relaxed">We use Google OAuth exclusively for authentication. When you sign in, Google shares your name, email address, and profile picture with us. We do not request access to your Gmail, Google Drive, Google Calendar, or any other Google services. We store a session token to keep you signed in — we never see your Google password.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">5. Data Storage</h2>
          <p className="leading-relaxed">Your data is stored in a PostgreSQL database hosted on Railway. Sessions are stored server-side. We take reasonable technical measures to protect your data, including encrypted connections (TLS) and secure credential management.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">6. Data Retention</h2>
          <p className="leading-relaxed">We retain your data for as long as your account is active. If you wish to delete your account and all associated data, contact us through the application and we will process your request within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">7. Cookies & Sessions</h2>
          <p className="leading-relaxed">We use a single session cookie (<code className="bg-gray-100 px-1 rounded text-xs">connect.sid</code>) to keep you signed in. This is a strictly necessary cookie — the service cannot function without it. We do not use tracking cookies, advertising cookies, or any third-party analytics cookies.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">8. Third-Party Services</h2>
          <p className="leading-relaxed">We use the following third-party services to operate ResumeAI:</p>
          <ul className="mt-3 space-y-1 list-disc list-inside text-sm leading-relaxed">
            <li><strong>Anthropic:</strong> AI model provider (Claude) for resume tailoring, cover letters, and interview prep.</li>
            <li><strong>Railway:</strong> cloud hosting for the API server and database.</li>
            <li><strong>Vercel:</strong> hosting for this landing page.</li>
            <li><strong>Google:</strong> authentication via Google OAuth.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">9. Your Rights</h2>
          <p className="leading-relaxed">You have the right to access, correct, or delete your personal data. You can update your profile information directly within the app. To request a full export or deletion of your account data, contact us through the ResumeAI application. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">10. Children's Privacy</h2>
          <p className="leading-relaxed">ResumeAI is not intended for use by anyone under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with their data, please contact us and we will delete it promptly.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">11. Changes to This Policy</h2>
          <p className="leading-relaxed">We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. We encourage you to review this page periodically. Continued use of the service after changes are posted constitutes acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">12. Contact</h2>
          <p className="leading-relaxed">If you have questions or concerns about this Privacy Policy, please contact us through the ResumeAI application.</p>
        </section>

      </div>

      {/* Cross-link */}
      <div className="mt-12 pt-6 border-t border-gray-100">
        <Link href="/terms" className="text-blue-600 hover:text-blue-700 text-sm transition-colors">
          Terms of Service →
        </Link>
      </div>
    </LegalLayout>
  )
}
