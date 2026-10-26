'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Bee } from '@/components/fun';
import Image from 'next/image';
import { toast } from 'sonner';
import logoImg from '@/src/assets/images/logo.png';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password);
        toast.success('Account created! Please check your email to verify.');
        onClose();
      } else if (mode === 'login') {
        await signInWithEmail(email, password);
        toast.success('Successfully signed in!');
        onClose();
      } else if (mode === 'forgot') {
        await resetPassword(email);
        toast.success('Password reset email sent! Check your inbox.');
        setMode('login');
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        toast.error('Invalid email or password. If you don\'t have an account, please Sign Up.');
      } else if (err.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists.');
      } else if (err.code === 'auth/user-not-found') {
        toast.error('No account found with this email. Please Sign Up.');
      } else if (err.code === 'auth/wrong-password') {
        toast.error('Incorrect password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        toast.error('Too many failed login attempts. Please try again later or reset your password.');
      } else {
        toast.error(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('Successfully signed in with Google!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in with Google.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
      <motion.div
        key="auth-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 40, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8">
            <div className="text-center mb-6">
              <div className="flex justify-center -mt-2 mb-1"><Bee className="w-16 h-12" /></div>
              <Image src={logoImg} alt="BeeHive Logo" width={150} height={50} className="mx-auto mb-6 object-contain" referrerPolicy="no-referrer" />
              <h2 className="text-2xl font-bold text-slate-900">
                {mode === 'forgot' ? 'Reset Password' : 'Welcome to BeeHive'}
              </h2>
              <p className="text-slate-500 mt-2 text-sm">
                {mode === 'forgot' ? 'Enter your email to receive a reset link' : 'Connect, build, and showcase your work.'}
              </p>
            </div>

            {mode !== 'forgot' && (
              <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                <button
                  onClick={() => setMode('login')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Sign Up
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      placeholder="••••••••"
                      minLength={6}
                    />
                  </div>
                  {mode === 'login' && (
                    <div className="flex justify-end mt-2">
                      <button 
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/30 active:translate-y-0 disabled:opacity-70 mt-6"
              >
                {loading ? 'Please wait...' : (
                  mode === 'login' ? 'Sign In' : 
                  mode === 'signup' ? 'Create Account' : 
                  'Send Reset Link'
                )}
              </button>
            </form>

            {mode !== 'forgot' && (
              <>
                <div className="mt-6 relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogleSignIn}
                  type="button"
                  className="mt-6 w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </button>
              </>
            )}

            {mode === 'forgot' && (
              <div className="mt-8 text-center text-sm text-slate-600">
                <p>
                  Remember your password?{' '}
                  <button onClick={() => setMode('login')} className="text-amber-600 hover:text-amber-700 font-semibold">
                    Back to sign in
                  </button>
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
