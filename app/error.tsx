'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for internal tracking
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fdf8e9] text-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-red-200">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-2">
        Something went wrong
      </h1>
      <p className="text-slate-600 max-w-md mb-8 text-base">
        A hive disturbance occurred. Don&apos;t worry, your work is safe.
      </p>
      {process.env.NODE_ENV !== 'production' && (
        <pre className="max-w-xl mb-6 p-3 rounded-lg bg-slate-900 text-amber-200 text-xs text-left whitespace-pre-wrap">{String(error?.message || error)}</pre>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Try Again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
