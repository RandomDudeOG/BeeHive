'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import logoImg from '@/src/assets/images/logo.png';

export default function TermsOfServicePage() {
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
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <div className="prose prose-amber max-w-none text-slate-700 space-y-6">
          <p className="text-sm text-slate-500">Last Updated: July 9, 2026</p>
          
          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>By accessing and using BeeHive (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">2. COPPA Compliance &amp; Age Requirements</h2>
            <p>In compliance with the <strong>Children&apos;s Online Privacy Protection Act (COPPA)</strong>, BeeHive is not directed to children under the age of 13. You must be at least 13 years of age to create an account and use this platform.</p>
            <p className="mt-2">We do not knowingly collect, use, or distribute personal information from children under the age of 13 without prior verifiable parental consent. If we discover that an account was created by someone under 13 without such consent, we will take immediate steps to delete the information and terminate the account.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">3. FERPA Compliance &amp; Student Records</h2>
            <p>BeeHive respects the privacy of student educational records and complies with the <strong>Family Educational Rights and Privacy Act (FERPA)</strong>. To the extent that BeeHive collects, stores, or processes student educational records on behalf of an educational institution, we operate as a &quot;School Official&quot; with a &quot;legitimate educational interest&quot; as defined by FERPA.</p>
            <p className="mt-2">We agree to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Maintain appropriate administrative, physical, and technical safeguards to protect the security, confidentiality, and integrity of student data.</li>
              <li>Only use student data for the purpose of providing the BeeHive service and not sell or use student data for targeted advertising.</li>
              <li>Allow users and parents/guardians (where applicable) to access, review, and request correction of their educational records stored on our platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">4. User Conduct</h2>
            <p>You agree to use BeeHive for its intended purpose of networking and showcasing projects. You agree NOT to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Harass, bully, or intimidate other users.</li>
              <li>Post inappropriate, offensive, or illegal content.</li>
              <li>Impersonate another person or entity.</li>
              <li>Spam or solicit other users for commercial purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">5. Content Ownership & Privacy</h2>
            <p>You retain all ownership rights to the projects and content you post on BeeHive. By posting content, you grant BeeHive a non-exclusive license to display and share that content within the platform to provide the service. We will protect your personal information in accordance with our Privacy Policy and applicable laws, including FERPA and COPPA.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-900 mt-8 mb-4">6. Account Termination</h2>
            <p>We reserve the right to suspend or terminate your account at any time if you violate these Terms of Service, fail to meet age requirements, or engage in behavior that harms the BeeHive community.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
