'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { FlyingBee, HexDrift, useConfetti } from '@/components/fun';
import { Sparkles, Users, FolderKanban } from 'lucide-react';
import logoImg from '@/src/assets/images/logo.png';

const spring = { type: 'spring' as const, stiffness: 220, damping: 20 };

// Each headline line slides up out of a mask.
function Line({ children, delay, className }: { children: React.ReactNode; delay: number; className?: string }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        className={`block ${className || ''}`}
        initial={{ y: '110%', rotate: 3 }}
        animate={{ y: 0, rotate: 0 }}
        transition={{ ...spring, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const { fire, node: confetti } = useConfetti();

  const handleHeroAction = () => {
    if (user) {
      router.push('/beehive');
    } else {
      setIsAuthOpen(true);
    }
  };

  const signInClasses =
    'bg-slate-900 hover:bg-black text-white text-sm font-semibold px-6 py-2.5 rounded-2xl shadow-sm';

  return (
    <div className="relative min-h-screen bg-[#fdf8e9] text-slate-900 flex flex-col justify-between selection:bg-amber-400 selection:text-slate-900 font-sans overflow-hidden">
      <HexDrift />
      {confetti}

      {/* Top Navigation */}
      <header className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <motion.div
              className="relative h-12 w-44 sm:w-52"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={spring}
              whileHover={{ scale: 1.04, rotate: -1.5 }}
            >
              <Image src={logoImg} alt="BeeHive Logo" fill className="object-contain object-left" priority />
            </motion.div>
          </Link>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: 0.1 }}
          >
            {user ? (
              <motion.span whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} className="inline-block">
                <Link href="/beehive" className={`${signInClasses} inline-block`}>
                  Go to Feed
                </Link>
              </motion.span>
            ) : (
              <motion.button
                onClick={() => setIsAuthOpen(true)}
                className={signInClasses}
                whileHover={{ scale: 1.06, rotate: 1 }}
                whileTap={{ scale: 0.94 }}
              >
                Sign In
              </motion.button>
            )}
          </motion.div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Content Column */}
            <div className="relative lg:col-span-7 space-y-6 sm:space-y-8">
              {/* A bee that wanders around the headline. Click it! */}
              <div className="hidden sm:block absolute inset-x-0 top-0 h-0">
                <FlyingBee className="left-0 -top-6" onClick={() => fire(60)} />
              </div>

              {/* Audience Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#faecd6] text-[#b45309] text-xs sm:text-sm font-medium"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...spring, delay: 0.15 }}
                whileHover={{ scale: 1.06 }}
              >
                <motion.span
                  animate={{ rotate: [0, 20, -20, 0], scale: [1, 1.25, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6 }}
                  className="inline-flex"
                >
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                </motion.span>
                <span>For High School Students</span>
              </motion.div>

              {/* Main Headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-[76px] font-extrabold tracking-tight leading-[1.06] text-slate-900">
                <Line delay={0.25}>Your hub to</Line>
                <Line delay={0.38} className="text-amber-500">connect and</Line>
                <Line delay={0.5} className="text-amber-500">showcase.</Line>
              </h1>

              {/* Subheading */}
              <motion.p
                className="text-slate-600 text-base sm:text-lg lg:text-[19px] leading-relaxed max-w-xl font-normal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.7 }}
              >
                BeeHive is the networking and project-sharing platform designed specifically for high school
                students. Build your portfolio, discover peers with shared interests, and collaborate on the
                next big thing.
              </motion.p>

              {/* CTA Button */}
              <motion.div
                className="pt-2"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ ...spring, delay: 0.85 }}
              >
                <motion.button
                  onClick={handleHeroAction}
                  className="relative inline-flex items-center gap-2 px-8 py-3.5 bg-amber-500 text-white font-semibold rounded-full text-base group cursor-pointer"
                  whileHover={{ scale: 1.06, rotate: -1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(245,158,11,0.55)',
                      '0 0 0 16px rgba(245,158,11,0)',
                    ],
                  }}
                  transition={{ boxShadow: { duration: 1.8, repeat: Infinity, ease: 'easeOut' } }}
                >
                  Join the BeeHive
                  <span className="text-lg transition-transform group-hover:translate-x-1.5">→</span>
                </motion.button>
              </motion.div>
            </div>

            {/* Right Card Column */}
            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <motion.div
                className="w-full max-w-lg"
                initial={{ opacity: 0, y: 60, rotate: 4 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ ...spring, delay: 0.5 }}
              >
                {/* gentle idle float */}
                <motion.div
                  className="bg-white rounded-[32px] p-8 sm:p-9 shadow-sm border border-amber-100/60"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ boxShadow: '0 24px 60px -20px rgba(245,158,11,0.45)' }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
                    {/* Feature 1: Showcase Projects */}
                    <motion.div
                      className="space-y-3 cursor-default"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 0.95 }}
                      whileHover={{ y: -6 }}
                    >
                      <motion.div
                        className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-500"
                        whileHover={{ rotate: [0, -14, 14, -8, 0], scale: 1.12 }}
                        transition={{ duration: 0.6 }}
                      >
                        <FolderKanban className="w-6 h-6 text-amber-500" />
                      </motion.div>
                      <h3 className="text-lg font-bold text-slate-900">Showcase Projects</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Upload your best work and build a portfolio that stands out.
                      </p>
                    </motion.div>

                    {/* Feature 2: Find Peers */}
                    <motion.div
                      className="space-y-3 cursor-default"
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: 1.1 }}
                      whileHover={{ y: -6 }}
                    >
                      <motion.div
                        className="w-12 h-12 rounded-2xl bg-amber-50/60 flex items-center justify-center text-amber-500"
                        whileHover={{ rotate: [0, -14, 14, -8, 0], scale: 1.12 }}
                        transition={{ duration: 0.6 }}
                      >
                        <Users className="w-7 h-7 text-amber-500" />
                      </motion.div>
                      <h3 className="text-lg font-bold text-slate-900">Find Peers</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Connect with other students based on shared interests and skills.
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-amber-100/50 py-5">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {new Date().getFullYear()} BeeHive</p>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-slate-800 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-slate-800 transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>

      {/* Sign In / Sign Up Modal */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
