'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Plus, X, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { UserProfile } from '@/types';

const editProfileSchema = z.object({
  username: z.string().min(1, 'Username is required').max(30, 'Max 30 characters'),
  location: z.string().min(1, 'Location is required').max(100, 'Max 100 characters'),
  grade: z.number().min(9, 'Must be 9-12').max(12, 'Must be 9-12'),
  interests: z.array(z.object({ value: z.string().max(30) })).max(10, 'Max 10 interests'),
  bio: z.string().max(500, 'Max 500 characters').optional(),
  contact: z.object({
    discord: z.string().max(50).optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().max(20).optional(),
  }).optional(),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      username: '',
      location: '',
      grade: 9,
      interests: [],
      bio: '',
      contact: {
        discord: '',
        email: '',
        phone: '',
      },
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "interests"
  });

  const [interestInput, setInterestInput] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          reset({
            username: data.username || '',
            location: data.location || '',
            grade: data.grade || 9,
            interests: (data.interests || []).map(i => ({ value: i })),
            bio: data.bio || '',
            contact: {
              discord: data.contact?.discord || '',
              email: data.contact?.email || '',
              phone: data.contact?.phone || '',
            }
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        toast.error('Failed to load profile data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, reset]);

  const handleAddInterest = () => {
    if (interestInput.trim() && fields.length < 10) {
      append({ value: interestInput.trim() });
      setInterestInput('');
    }
  };

  const onSubmit = async (data: EditProfileFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    
    // Show loading toast
    const toastId = toast.loading('Updating profile...');
    
    try {
      const interestsArray = data.interests.map(i => i.value);
      
      const updateData = {
        username: data.username,
        location: data.location,
        grade: data.grade,
        interests: interestsArray,
        bio: data.bio || '',
        contact: {
          discord: data.contact?.discord || '',
          email: data.contact?.email || '',
          phone: data.contact?.phone || '',
        },
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'users', user.uid), updateData);
      
      // Update toast to success
      toast.success('Profile updated successfully!', { id: toastId });
      
      // Redirect back to settings or profile
      router.push('/settings');
    } catch (error) {
      // Update toast to error
      toast.error('Failed to update profile. Please try again.', { id: toastId });
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8e9] font-sans">
      <header className="bg-[#fdf8e9] border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/settings" className="text-slate-500 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Settings
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Edit Profile</h1>
            <p className="text-slate-600">Update your public profile information.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 space-y-8">
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
                  rows={4}
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
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {fields.map((field, index) => (
                    <div key={field.id} className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 font-medium">
                      {field.value}
                      <button type="button" onClick={() => remove(index)} className="hover:text-amber-900 hover:bg-amber-200 rounded-full p-0.5 transition-colors">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Discord</label>
                  <input 
                    {...register('contact.discord')} 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="username#1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Public Email</label>
                  <input 
                    type="email"
                    {...register('contact.email')} 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="hello@example.com"
                  />
                  {errors.contact?.email && <p className="text-red-500 text-xs mt-1">{errors.contact.email.message}</p>}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex gap-3">
              <Link
                href="/settings"
                className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold py-3 px-4 rounded-xl transition-colors text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
