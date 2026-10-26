'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import logoImg from '@/src/assets/images/logo.png';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#fdf8e9] text-slate-900 font-sans">
      <header className="px-6 py-6 lg:py-8 flex items-center justify-between max-w-7xl mx-auto border-b border-amber-200/50">
        <Link href="/" className="flex items-center">
          <Image src={logoImg} alt="BeeHive Logo" width={150} height={50} className="w-[150px] h-[50px] object-contain object-left" referrerPolicy="no-referrer" />
        </Link>
        <Link href="/" className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="prose prose-amber max-w-none text-slate-700 space-y-6">
          <p className="text-sm text-slate-500">Last Updated: April 7, 2026</p>
          
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">1. Information We Collect</h2>
            <p>When you create an account on BeeHive, we collect the following information:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Account Information:</strong> Your email address, username, date of birth, and grade level.</li>
              <li><strong>Profile Information:</strong> Your location, bio, interests, and optional contact methods (like Discord).</li>
              <li><strong>Content:</strong> Projects you upload, messages you send, and your interactions with other users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Provide, maintain, and improve the BeeHive platform.</li>
              <li>Help you connect with peers who share similar interests.</li>
              <li>Ensure the safety and security of our community.</li>
              <li>Communicate with you about updates or support requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">3. Information Sharing</h2>
            <p>We do not sell your personal information to third parties. Your profile information (username, grade, interests, projects) is visible to other registered users on the platform to facilitate networking.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">4. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">5. Children&apos;s Privacy (COPPA)</h2>
            <p>BeeHive is strictly for users aged 13 and older. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child under 13 has provided us with personal information, please contact us immediately so we can delete their account and data.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
