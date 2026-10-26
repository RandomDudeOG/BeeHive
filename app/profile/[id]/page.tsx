'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import { UserProfile, Project } from '@/types';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import ProjectCard from '@/components/ProjectCard';
import { MapPin, GraduationCap, Users, UserPlus, UserMinus, ArrowLeft, Loader2, Edit2, X, FileText, Copy, Check, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { aiStream } from '@/lib/ai-client';
import Markdown from 'react-markdown';
import { motion } from 'motion/react';
import { HiveLoader, CountUp, listItem } from '@/components/fun';
import logoImg from '@/src/assets/images/logo.png';

export default function ProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    location: '',
    grade: '',
    interests: ''
  });

  const [isGeneratingResume, setIsGeneratingResume] = useState(false);
  const [resumeContent, setResumeContent] = useState('');
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!id || !user) return;

    const fetchProfiles = async () => {
      try {
        // Fetch the profile being viewed
        const profileDoc = await getDoc(doc(db, 'users', id as string));
        if (profileDoc.exists()) {
          const data = profileDoc.data() as UserProfile;
          setProfileUser(data);
        }

        // Fetch current user's profile to check follow status
        const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
        if (currentUserDoc.exists()) {
          const currentData = currentUserDoc.data() as UserProfile;
          setCurrentUserProfile(currentData);
          setIsFollowing(currentData.following?.includes(id as string) || false);
        }
      } catch (error) {
        console.error("Error fetching profiles:", error);
      }
    };

    fetchProfiles();

    // Listen to user's projects
    const qProjects = query(
      collection(db, 'projects'), 
      where('creatorId', '==', id)
    );
    
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      const projs: Project[] = [];
      snapshot.forEach((doc) => {
        projs.push({ id: doc.id, ...doc.data() } as Project);
      });
      // Sort in memory to avoid requiring a Firestore composite index
      projs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setProjects(projs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
      setLoading(false);
    });

    return () => unsubProjects();
  }, [id, user]);

  const handleToggleFollow = async () => {
    if (!user || !profileUser || !currentUserProfile || followLoading) return;
    
    setFollowLoading(true);
    const targetUserId = id as string;
    const currentUserId = user.uid;
    
    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', targetUserId);

    try {
      if (isFollowing) {
        // Unfollow
        await updateDoc(currentUserRef, { following: arrayRemove(targetUserId) });
        await updateDoc(targetUserRef, { followers: arrayRemove(currentUserId) });
        setIsFollowing(false);
        setProfileUser(prev => prev ? { ...prev, followers: (prev.followers || []).filter(uid => uid !== currentUserId) } : null);
      } else {
        // Follow
        await updateDoc(currentUserRef, { following: arrayUnion(targetUserId) });
        await updateDoc(targetUserRef, { followers: arrayUnion(currentUserId) });
        setIsFollowing(true);
        setProfileUser(prev => prev ? { ...prev, followers: [...(prev.followers || []), currentUserId] } : null);
        
        // Notify
        await addDoc(collection(db, 'notifications'), {
          recipientId: targetUserId,
          actorId: currentUserId,
          actorName: currentUserProfile.username,
          type: 'follow',
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8e9]">
        <HiveLoader label="Loading profile..." />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">User not found</h2>
        <button onClick={() => router.push('/beehive')} className="text-amber-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to BeeHive
        </button>
      </div>
    );
  }

  const isOwnProfile = user?.uid === id;

  const openEditModal = () => {
    if (!profileUser) return;
    setEditForm({
      username: profileUser.username || '',
      bio: profileUser.bio || '',
      location: profileUser.location || '',
      grade: profileUser.grade?.toString() || '',
      interests: (profileUser.interests || []).join(', ')
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isOwnProfile) return;
    setIsUpdating(true);
    try {
      const interestsArray = editForm.interests.split(',').map(i => i.trim()).filter(i => i);
      await updateDoc(doc(db, 'users', user.uid), {
        username: editForm.username,
        bio: editForm.bio,
        location: editForm.location,
        grade: parseInt(editForm.grade) || 9,
        interests: interestsArray
      });
      setIsEditModalOpen(false);
      setProfileUser(prev => prev ? {
        ...prev,
        username: editForm.username,
        bio: editForm.bio,
        location: editForm.location,
        grade: parseInt(editForm.grade) || 9,
        interests: interestsArray
      } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerateResume = async () => {
    if (!profileUser) return;
    setIsGeneratingResume(true);
    setIsResumeModalOpen(true);
    setResumeContent('');
    
    try {
      await aiStream({
        action: 'resume',
        username: profileUser.username,
        grade: profileUser.grade,
        location: profileUser.location,
        bio: profileUser.bio,
        interests: profileUser.interests,
        projects: projects.map(p => ({ title: p.title, description: p.description, tags: p.tags })),
      }, setResumeContent);
    } catch (error) {
      console.error("Error generating resume:", error);
      setResumeContent("An error occurred while generating the resume. Please try again.");
    } finally {
      setIsGeneratingResume(false);
    }
  };

  const handleCopyResume = () => {
    navigator.clipboard.writeText(resumeContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#fdf8e9] font-sans pb-12">
      <header className="bg-[#fdf8e9] border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/beehive" className="text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-32">
              <Image 
                src={logoImg} 
                alt="BeeHive Logo" 
                fill 
                className="object-contain object-left" 
                priority 
              />
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-lg font-bold tracking-tight text-slate-900">Profile</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mb-8 relative overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 right-0 h-32"
            style={{ backgroundImage: 'linear-gradient(110deg, #fbbf24, #fb923c, #f59e0b, #fbbf24)', backgroundSize: '300% 100%' }}
            animate={{ backgroundPositionX: ['0%', '100%', '0%'] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          <div className="relative mt-12 flex flex-col sm:flex-row gap-6 items-start sm:items-end">
            <motion.div
              className="w-32 h-32 rounded-full bg-white p-2 shadow-lg"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
              whileHover={{ rotate: [0, -8, 8, -4, 0], scale: 1.06 }}
            >
              <div className="w-full h-full rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-5xl font-bold">
                {(profileUser.username || '?').charAt(0).toUpperCase()}
              </div>
            </motion.div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">@{profileUser.username}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-600">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profileUser.location}</span>
                <span className="flex items-center gap-1"><GraduationCap className="w-4 h-4" /> Grade {profileUser.grade}</span>
              </div>
            </div>

            {!isOwnProfile ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleFollow}
                  disabled={followLoading}
                  className={`px-6 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-colors ${
                    isFollowing 
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                      : 'bg-amber-500 text-white hover:bg-amber-600'
                  }`}
                >
                  {followLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isFollowing ? <><UserMinus className="w-5 h-5" /> Unfollow</> : <><UserPlus className="w-5 h-5" /> Follow</>}
                </button>
                <button
                  onClick={async () => {
                    if (!user) return;
                    const { getOrCreateConversation } = await import('@/lib/messaging');
                    const convId = await getOrCreateConversation(user.uid, profileUser.uid);
                    router.push(`/messages/${convId}`);
                  }}
                  className="px-6 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-colors bg-indigo-500 text-white hover:bg-indigo-600"
                >
                  <MessageCircle className="w-5 h-5" /> Message
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerateResume}
                  className="px-6 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-colors bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                >
                  <FileText className="w-4 h-4" /> Generate Resume
                </button>
                <button
                  onClick={openEditModal}
                  className="px-6 py-2.5 rounded-full font-semibold flex items-center gap-2 transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                >
                  <Edit2 className="w-4 h-4" /> Edit Profile
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">About</h3>
                <p className="text-slate-700 leading-relaxed">{profileUser.bio || "This user hasn't written a bio yet."}</p>
              </div>
              
              {profileUser.interests && profileUser.interests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {profileUser.interests.map((interest, idx) => (
                      <motion.span
                        key={idx}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 16, delay: 0.3 + idx * 0.07 }}
                        whileHover={{ scale: 1.12, rotate: -3 }}
                        className="bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {interest}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 h-fit">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-slate-900"><CountUp value={profileUser.followers?.length || 0} /></div>
                  <div className="text-xs text-slate-500 font-medium">Followers</div>
                </div>
                <div className="text-center p-3 bg-white rounded-xl shadow-sm">
                  <div className="text-2xl font-bold text-slate-900"><CountUp value={profileUser.following?.length || 0} /></div>
                  <div className="text-xs text-slate-500 font-medium">Following</div>
                </div>
                <div className="text-center p-3 bg-white rounded-xl shadow-sm col-span-2">
                  <div className="text-2xl font-bold text-slate-900"><CountUp value={projects.length} /></div>
                  <div className="text-xs text-slate-500 font-medium">Projects</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User's Projects */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Image src={logoImg} alt="BeeHive Logo" width={100} height={100} className="w-[100px] h-[100px] object-contain" referrerPolicy="no-referrer" />
            Portfolio
          </h2>
          
          {projects.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <p className="text-slate-500">No projects shared yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {projects.map((project, pi) => (
                <motion.div key={project.id} {...listItem(pi)}>
                  <ProjectCard project={project} currentUser={currentUserProfile!} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Edit Profile</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                <input 
                  required
                  maxLength={30}
                  value={editForm.username}
                  onChange={e => setEditForm({...editForm, username: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                <textarea 
                  maxLength={500}
                  rows={3}
                  value={editForm.bio}
                  onChange={e => setEditForm({...editForm, bio: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input 
                    required
                    value={editForm.location}
                    onChange={e => setEditForm({...editForm, location: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="City, State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                  <select 
                    required
                    value={editForm.grade}
                    onChange={e => setEditForm({...editForm, grade: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white"
                  >
                    <option value="">Select Grade</option>
                    <option value="9">9th Grade</option>
                    <option value="10">10th Grade</option>
                    <option value="11">11th Grade</option>
                    <option value="12">12th Grade</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interests (comma separated)</label>
                <input 
                  value={editForm.interests}
                  onChange={e => setEditForm({...editForm, interests: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Robotics, Coding, Art"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !editForm.username.trim()}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Resume Modal */}
      {isResumeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-xl font-bold text-indigo-900">AI Generated Portfolio</h2>
              </div>
              <button onClick={() => setIsResumeModalOpen(false)} className="text-indigo-400 hover:text-indigo-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              {isGeneratingResume && !resumeContent ? (
                <div className="flex flex-col items-center justify-center py-12 text-indigo-600">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="font-medium">Buzzing your professional portfolio...</p>
                  <p className="text-sm text-indigo-400 mt-2">Analyzing your profile and projects</p>
                </div>
              ) : (
                <div className="prose prose-indigo max-w-none">
                  <div className="markdown-body">
                    <Markdown>{resumeContent}</Markdown>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setIsResumeModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleCopyResume}
                disabled={isGeneratingResume || !resumeContent}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {isCopied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
