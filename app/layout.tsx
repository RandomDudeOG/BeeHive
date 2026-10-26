import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'BeeHive - Student Collaboration & Project Showcase',
  description:
    'A networking and project-sharing platform designed specifically for high school students to connect, collaborate, and showcase their work.',
  openGraph: {
    title: 'BeeHive - Student Collaboration & Project Showcase',
    description:
      'A networking and project-sharing platform designed specifically for high school students to connect, collaborate, and showcase their work.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#fdf8e9] text-slate-900 selection:bg-amber-400 selection:text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
