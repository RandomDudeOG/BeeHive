import Link from 'next/link';
import { Home, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#fdf8e9] text-slate-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-amber-200">
        <Compass className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">
        Page Not Found
      </h1>
      <p className="text-slate-600 max-w-md mb-8 text-base">
        The hive cell you are looking for doesn&apos;t exist or has flown to another branch.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
        <Link
          href="/beehive"
          className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm"
        >
          Explore Projects
        </Link>
      </div>
    </div>
  );
}
