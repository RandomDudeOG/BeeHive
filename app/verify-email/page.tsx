'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, RefreshCw, ArrowRight, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const { user, resendVerification, signOut } = useAuth();
  const router = useRouter();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    try {
      setLoading(true);
      setError('');
      await resendVerification();
      setMessage('Verification email sent! Please check your inbox.');
      setResendCooldown(60);
    } catch (err: any) {
      if (err.code === 'auth/user-token-expired') {
        setError('Your session has expired. Please sign out and sign back in, then try again.');
      } else {
        setError(err.message || 'Failed to resend verification email.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerified = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError('');
      await user.reload();
      if (user.emailVerified) {
        setMessage('Email verified successfully! Redirecting...');
        setTimeout(() => {
          router.push('/onboarding');
        }, 1500);
      } else {
        setError('Email is not verified yet. Please check your inbox or spam folder.');
      }
    } catch (err: any) {
      if (err.code === 'auth/user-token-expired') {
        setError('Your session has expired. Please sign out and sign back in to continue.');
      } else {
        setError(err.message || 'Failed to check verification status.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8e9] flex flex-col items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-md w-full text-center border border-amber-100"
      >
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10 text-amber-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Verify your email</h1>
        
        <p className="text-slate-600 mb-8">
          We&apos;ve sent a verification email to <span className="font-semibold text-slate-900">{user?.email}</span>. 
          Please check your inbox and click the link to verify your account.
        </p>

        {message && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleCheckVerified}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'I\'ve Verified'}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>

          <button
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {resendCooldown > 0 
              ? `Resend available in ${resendCooldown}s` 
              : 'Resend Verification Email'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <button 
            onClick={signOut}
            className="text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center justify-center gap-2 mx-auto transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out and use a different account
          </button>
        </div>
      </motion.div>
    </div>
  );
}
