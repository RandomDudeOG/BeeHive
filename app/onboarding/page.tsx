'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Plus, X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Bee, useConfetti } from '@/components/fun';
import logoImg from '@/src/assets/images/logo.png';

const onboardingSchema = z.object({
  username: z.string().min(1, 'Username is required').max(30, 'Max 30 characters'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  location: z.string().min(1, 'Location is required').max(100, 'Max 100 characters'),
  grade: z.number().min(9, 'Must be 9-12').max(12, 'Must be 9-12'),
  interests: z.array(z.object({ value: z.string().max(30) })).max(10, 'Max 10 interests'),
  bio: z.string().max(500, 'Max 500 characters').optional(),
  contact: z.object({
    discord: z.string().max(50).optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().max(20).optional(),
  }).optional(),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the Terms of Service and Privacy Policy',
  }),
  isOver13: z.boolean().refine(val => val === true, {
    message: 'You must be at least 13 years old to use BeeHive',
  }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { fire: fireConfetti, node: confettiNode } = useConfetti();

  const { register, control, handleSubmit, formState: { errors } } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      username: '',
      dob: '',
      location: '',
      grade: 9,
      interests: [],
      bio: '',
      contact: {
        discord: '',
        email: user?.email || '',
        phone: '',
      },
      // @ts-ignore - we want these to start undefined so they must be checked
      agreedToTerms: false,
      // @ts-ignore
      isOver13: false,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "interests"
  });

  const [interestInput, setInterestInput] = useState('');

  const handleAddInterest = () => {
    if (interestInput.trim() && fields.length < 10) {
      append({ value: interestInput.trim() });
      setInterestInput('');
    }
  };

  const onSubmit = async (data: OnboardingFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    
    try {
      const interestsArray = data.interests.map(i => i.value);
      
      const userData = {
        uid: user.uid,
        username: data.username,
        dob: data.dob,
        location: data.location,
        grade: data.grade,
        interests: interestsArray,
        bio: data.bio || '',
        followers: [],
        following: [],
        contact: {
          discord: data.contact?.discord || '',
          email: data.contact?.email || '',
          phone: data.contact?.phone || '',
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      toast.success('Profile created successfully!');
      fireConfetti(80);
      await new Promise((r) => setTimeout(r, 1300)); // let the celebration play
      router.push('/beehive');
    } catch (error) {
      toast.error('Failed to create profile. Please try again.');
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8e9] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      {confettiNode}
      <motion.div
        className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-amber-100 overflow-hidden"
        initial={{ opacity: 0, y: 60, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <div className="bg-amber-500 px-8 py-6 text-white flex items-center gap-4">
          <div className="relative h-12 w-28 flex-shrink-0 bg-white/10 rounded-xl p-1.5 backdrop-blur-sm">
            <Image 
              src={logoImg} 
              alt="BeeHive Logo" 
              fill 
              className="object-contain" 
              priority 
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Welcome to BeeHive</h1>
            <p className="text-amber-100 text-sm">Let&apos;s set up your student profile</p>
          </div>
          <motion.div
            className="ml-auto hidden sm:block"
            animate={{ x: [0, 14, 0, -6, 0], y: [0, -8, 4, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Bee className="w-16 h-12" flip />
          </motion.div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Basic Info</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                <input 
                  {...register('username')} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="coolstudent99"
                />
                {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                <input 
                  type="date"
                  {...register('dob')} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location (City) *</label>
                <input 
                  {...register('location')} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="San Francisco, CA"
                />
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grade Level *</label>
                <select 
                  {...register('grade', { valueAsNumber: true })} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                >
                  <option value={9}>9th Grade</option>
                  <option value={10}>10th Grade</option>
                  <option value={11}>11th Grade</option>
                  <option value={12}>12th Grade</option>
                </select>
                {errors.grade && <p className="text-red-500 text-xs mt-1">{errors.grade.message}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">About You</h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
              <textarea 
                {...register('bio')} 
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                placeholder="Tell us a bit about yourself and what you're building..."
              />
              {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interests (Max 10)</label>
              <div className="flex gap-2 mb-3">
                <input 
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddInterest(); } }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="e.g. Robotics, Web Dev, Art"
                />
                <button 
                  type="button"
                  onClick={handleAddInterest}
                  disabled={fields.length >= 10}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    {field.value}
                    <button type="button" onClick={() => remove(index)} className="hover:text-amber-900">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {errors.interests && <p className="text-red-500 text-xs mt-1">{errors.interests.message}</p>}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2">Contact Info (Optional)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discord</label>
                <input 
                  {...register('contact.discord')} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="username#1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email"
                  {...register('contact.email')} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                {errors.contact?.email && <p className="text-red-500 text-xs mt-1">{errors.contact.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input 
                  {...register('contact.phone')} 
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Trust & Safety</h2>
            
            <div className="flex items-start gap-3">
              <div className="flex items-center h-5 mt-1">
                <input
                  id="isOver13"
                  type="checkbox"
                  {...register('isOver13')}
                  className="w-5 h-5 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="isOver13" className="text-sm text-slate-700 font-medium">
                  I confirm that I am at least 13 years old. *
                </label>
                <p className="text-xs text-slate-500 mt-1">BeeHive requires users to be 13 or older to comply with COPPA regulations.</p>
                {errors.isOver13 && <p className="text-red-500 text-xs mt-1">{errors.isOver13.message}</p>}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex items-center h-5 mt-1">
                <input
                  id="agreedToTerms"
                  type="checkbox"
                  {...register('agreedToTerms')}
                  className="w-5 h-5 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                />
              </div>
              <div className="flex-1">
                <label htmlFor="agreedToTerms" className="text-sm text-slate-700 font-medium">
                  I agree to the <Link href="/terms" target="_blank" className="text-amber-600 hover:underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-amber-600 hover:underline">Privacy Policy</Link>. *
                </label>
                {errors.agreedToTerms && <p className="text-red-500 text-xs mt-1">{errors.agreedToTerms.message}</p>}
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Buzzing...
                </>
              ) : 'Complete Profile'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
