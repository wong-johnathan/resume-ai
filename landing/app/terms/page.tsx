import type { Metadata } from 'next'
import Link from 'next/link'
import LegalLayout from '@/components/LegalLayout'

export const metadata: Metadata = {
  title: 'Terms of Service — ResumeAI',
  description: 'Read the Terms of Service for ResumeAI, the AI-powered resume builder.',
}

export default function TermsPage() {
  return (
    <LegalLayout>
      {/* Title block */}
      <div className="mb-8 pb-6 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Legal</p>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400">Last updated: March 26, 2026</p>
      </div>

      <div className="space-y-8 text-gray-700">

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">1. Acceptance of Terms</h2>
          <p className="leading-relaxed">By accessing or using ResumeAI, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the service. Your continued use of ResumeAI constitutes acceptance of any updates to these terms.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">2. What ResumeAI Does</h2>
          <p className="leading-relaxed">ResumeAI is an AI-powered platform that helps you build, manage, and tailor resumes for job applications. Features include AI-assisted resume tailoring to specific job descriptions, cover letter generation, interview preparation, and a job application tracker. AI-generated content is produced via Claude (Anthropic) and is intended as a starting point — you should review and edit all outputs before submitting them.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">3. Your Account</h2>
          <p className="leading-relaxed">You sign in to ResumeAI exclusively via Google OAuth. We do not store your Google password — all authentication is handled by Google. You are responsible for all activity that occurs under your account. If you believe your account has been compromised, contact us immediately.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">4. AI-Generated Content</h2>
          <p className="leading-relaxed">ResumeAI uses AI to generate tailored resume content, cover letters, interview questions, and sample responses. These outputs are suggestions only — they may contain inaccuracies or be unsuitable for your specific situation. You are solely responsible for reviewing, editing, and deciding whether to use any AI-generated content. We make no guarantees about the accuracy or effectiveness of AI outputs.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">5. Acceptable Use</h2>
          <p className="leading-relaxed">You agree not to misuse the service. Prohibited activities include: using the platform to generate misleading or fraudulent resume content, scraping or reverse-engineering the platform, attempting to circumvent rate limits (10 AI requests per 15 minutes per account), or using the service in any way that violates applicable laws. We reserve the right to suspend accounts that violate these terms.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">6. Intellectual Property</h2>
          <p className="leading-relaxed">You retain ownership of all resume content, work history, and personal data you provide. By using the service, you grant ResumeAI a limited license to process and store your content solely to provide the service. ResumeAI owns the platform, codebase, templates, and all non-user content. You may not copy or reproduce the platform or its templates outside of normal use.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">7. Service Availability</h2>
          <p className="leading-relaxed">ResumeAI is provided "as is" without any warranty of uptime or availability. We may modify, suspend, or discontinue any part of the service at any time without notice. We are not liable for any losses resulting from service downtime or changes.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">8. Termination</h2>
          <p className="leading-relaxed">We may suspend or terminate your account at any time if we determine you have violated these Terms of Service. You may stop using the service at any time. Upon termination, you may request deletion of your data as described in our Privacy Policy.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">9. Limitation of Liability</h2>
          <p className="leading-relaxed">ResumeAI is not liable for any job application outcomes, hiring decisions, or career results arising from your use of the platform. To the maximum extent permitted by law, our total liability for any claim is limited to the amount you paid us in the past 12 months (which, for a free service, is $0).</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">10. Changes to These Terms</h2>
          <p className="leading-relaxed">We may update these Terms of Service from time to time. When we do, we will update the "Last updated" date at the top of this page. Continued use of the service after changes are posted constitutes your acceptance of the updated terms.</p>
        </section>

        <section>
          <h2 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">11. Contact</h2>
          <p className="leading-relaxed">If you have questions about these Terms of Service, please contact us through the ResumeAI application.</p>
        </section>

      </div>

      {/* Cross-link */}
      <div className="mt-12 pt-6 border-t border-gray-100">
        <Link href="/privacy" className="text-blue-600 hover:text-blue-700 text-sm transition-colors">
          Privacy Policy →
        </Link>
      </div>
    </LegalLayout>
  )
}
