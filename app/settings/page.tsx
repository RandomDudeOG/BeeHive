'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, deleteAccount } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount();
      toast.success('Your account has been successfully deleted.');
      router.push('/');
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      if (error.code === 'auth/requires-recent-login') {
        toast.error('For security reasons, please sign out and sign back in before deleting your account.');
      } else {
        toast.error('Failed to delete account. Please try again.');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!user) {
    return null; // Will be redirected by AuthContext
  }

  return (
    <div className="min-h-screen bg-[#fdf8e9] font-sans">
      <header className="bg-[#fdf8e9] border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/beehive" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Account Information</h2>
                <p className="text-slate-600">Manage your account details and preferences.</p>
              </div>
              <Link 
                href="/settings/profile" 
                className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                Edit Profile
              </Link>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Email Address</label>
                <div className="text-slate-900 font-medium bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-rose-50/30">
            <h2 className="text-xl font-bold text-rose-700 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h2>
            <p className="text-slate-600 mb-6">
              Once you delete your account, there is no going back. Please be certain.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-white border-2 border-rose-200 hover:bg-rose-50 hover:border-rose-300 text-rose-600 px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            ) : (
              <div className="bg-white border-2 border-rose-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">Are you absolutely sure?</h3>
                <p className="text-slate-600 text-sm mb-6">
                  This action cannot be undone. This will permanently delete your account, profile, projects, and remove your data from our servers.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Yes, delete my account
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
