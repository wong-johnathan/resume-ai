import { Link } from 'react-router-dom';
import { FileText, Sparkles, Briefcase, Download } from 'lucide-react';

const features = [
  { icon: FileText, title: 'Build Your Profile', desc: 'Enter your experience, skills, and education once. Reuse across all resumes.' },
  { icon: Sparkles, title: 'AI-Tailored Resumes', desc: 'Paste a job description and Claude rewrites your resume to match it perfectly.' },
  { icon: Briefcase, title: 'Track Applications', desc: 'Kanban board to manage every application from Saved to Offer.' },
  { icon: Download, title: 'Export to PDF', desc: 'Download polished, print-ready PDFs from 4 professional templates.' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <span className="font-bold text-xl text-gray-900">ResumeAI</span>
        <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          Get Started
        </Link>
      </header>

      <section className="text-center px-6 py-24 max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          Build resumes that<br />
          <span className="text-blue-600">actually get interviews</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10">
          AI-powered resume builder that tailors your resume to every job description and tracks all your applications in one place.
        </p>
        <Link to="/login" className="inline-block bg-blue-600 text-white px-8 py-3.5 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors">
          Start for free →
        </Link>
      </section>

      <section className="bg-gray-50 px-6 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl p-6 shadow-sm border">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Icon size={20} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-500 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center px-6 py-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to land your next job?</h2>
        <Link to="/login" className="inline-block bg-gray-900 text-white px-8 py-3.5 rounded-xl text-lg font-semibold hover:bg-gray-800 transition-colors">
          Sign in to get started
        </Link>
      </section>
    </div>
  );
}
