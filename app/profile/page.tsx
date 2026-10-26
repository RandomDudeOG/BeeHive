'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function MyProfileRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace(`/profile/${user.uid}`);
      } else {
        router.replace('/');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-[#fdf8e9] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-medium">Loading profile...</p>
      </div>
    </div>
  );
}
