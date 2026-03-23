import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ResumeAI — Build Resumes That Actually Get Interviews',
  description:
    'AI-powered resume builder that tailors your resume to every job description, tracks your applications, and preps you for interviews — all in one place.',
  metadataBase: new URL('https://resume.johnathanwwh.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'ResumeAI — Build Resumes That Actually Get Interviews',
    description:
      'AI-powered resume builder that tailors your resume to every job description, tracks your applications, and preps you for interviews — all in one place.',
    url: 'https://resume.johnathanwwh.com',
    siteName: 'ResumeAI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ResumeAI — Build Resumes That Actually Get Interviews',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ResumeAI — Build Resumes That Actually Get Interviews',
    description:
      'AI-powered resume builder that tailors your resume to every job description, tracks your applications, and preps you for interviews — all in one place.',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>{children}</body>
    </html>
  )
}
