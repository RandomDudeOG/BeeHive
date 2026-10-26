'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDoc, doc, where, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Plus, LogOut, Loader2, FolderKanban, Users, Tag, Calendar, Search, Filter, Bell, Flame, Briefcase, Bookmark, ExternalLink, Sparkles, Wand2, MessageCircle, Settings, Download } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { HiveLoader, Bee, useConfetti, listItem } from '@/components/fun';
import ProjectCard from '@/components/ProjectCard';
import { Project, UserProfile, AppNotification, Opportunity } from '@/types';
import { toast } from 'sonner';
import { aiCall } from '@/lib/ai-client';
import logoImg from '@/src/assets/images/logo.png';

export default function BeeHivePage() {
  const { user, signOut } = useAuth();
  const { fire: fireConfetti, node: confettiNode } = useConfetti();
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'trending' | 'recommended' | 'opportunities'>('feed');

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [oppFilter, setOppFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '', tags: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [recommendedTags, setRecommendedTags] = useState<string[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);

  const allTags = Array.from(new Set(projects.flatMap(p => p.tags || []))).sort();

  let filteredProjects = projects.filter(project => {
    if (activeTab === 'recommended') {
      if (recommendedTags.length === 0) return false;
      return recommendedTags.some(tag => 
        project.tags?.some(pt => pt.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(pt.toLowerCase()))
      );
    }

    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      project.title.toLowerCase().includes(query) || 
      project.description.toLowerCase().includes(query);
      
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => project.tags?.some(pt => pt.toLowerCase() === tag.toLowerCase()));
      
    return matchesSearch && matchesTags;
  });

  if (activeTab === 'trending') {
    filteredProjects = [...filteredProjects].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
  }

  useEffect(() => {
    if (!user) return;

    // Fetch current user profile
    const fetchProfile = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', user.uid));
        if (docSnap.exists()) {
          setCurrentUserProfile(docSnap.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    };
    fetchProfile();

    // Listen to projects
    const qProjects = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      const projs: Project[] = [];
      snapshot.forEach((doc) => {
        projs.push({ id: doc.id, ...doc.data() } as Project);
      });
      setProjects(projs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    // Listen to users
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const usrs: UserProfile[] = [];
      snapshot.forEach((doc) => {
        if (doc.id !== user.uid) {
          usrs.push(doc.data() as UserProfile);
        }
      });
      setUsers(usrs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Listen to notifications
    const qNotifs = query(collection(db, 'notifications'), where('recipientId', '==', user.uid));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      const notifs: AppNotification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as AppNotification);
      });
      // Sort in memory to avoid requiring a Firestore composite index
      notifs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setNotifications(notifs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    // Listen to opportunities
    const qOpps = query(collection(db, 'opportunities'), where('generatedFor', '==', user.uid));
    const unsubOpps = onSnapshot(qOpps, (snapshot) => {
      const opps: Opportunity[] = [];
      snapshot.forEach((doc) => {
        opps.push({ id: doc.id, ...doc.data() } as Opportunity);
      });
      opps.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setOpportunities(opps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'opportunities');
    });

    return () => {
      unsubProjects();
      unsubUsers();
      unsubNotifs();
      unsubOpps();
    };
  }, [user]);

  const handleGetRecommendations = async () => {
    if (!currentUserProfile || !user) return;
    setIsRecommending(true);
    try {
      const { tags } = await aiCall<{ tags: string[] }>({
        action: 'recommend-tags',
        interests: currentUserProfile.interests,
      });
      setRecommendedTags(tags);
    } catch (error) {
      console.error("Error getting recommendations:", error);
      toast.error('Could not get recommendations right now.');
    } finally {
      setIsRecommending(false);
    }
  };


  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    setIsAISearching(true);
    try {
      const { tags } = await aiCall<{ tags: string[] }>({ action: 'search-tags', query: searchQuery });
      setSelectedTags(tags);
      setSearchQuery(''); // Clear query so we filter by the AI tags instead
    } catch (error) {
      console.error("Error with AI search:", error);
      toast.error('AI search is unavailable right now.');
    } finally {
      setIsAISearching(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        try {
          await updateDoc(doc(db, 'notifications', n.id), { read: true });
        } catch (e) {
          console.error("Error marking read", e);
        }
      }
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentUserProfile) return;
    if (!newProject.title.trim() || !newProject.description.trim()) return;

    setIsSubmitting(true);
    try {
      const tagsArray = newProject.tags.split(',').map(t => t.trim()).filter(t => t).slice(0, 5);
      
      await addDoc(collection(db, 'projects'), {
        title: newProject.title.trim(),
        description: newProject.description.trim(),
        tags: tagsArray,
        creatorId: user.uid,
        creatorName: currentUserProfile.username,
        createdAt: serverTimestamp(),
      });
      
      setNewProject({ title: '', description: '', tags: '' });
      setIsModalOpen(false);
      fireConfetti();
      toast.success('Project posted!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscoverOpportunities = async () => {
    if (!currentUserProfile || !user) return;
    setIsDiscovering(true);
    try {
      const { items } = await aiCall<{ items: any[] }>({
        action: 'opportunities',
        location: currentUserProfile.location,
        grade: currentUserProfile.grade,
        interests: currentUserProfile.interests,
      });

      // Save generated opportunities to Firestore
      for (const opp of items) {
        await addDoc(collection(db, 'opportunities'), {
          ...opp,
          createdAt: serverTimestamp(),
          savedBy: [],
          generatedFor: user.uid
        });
      }
      if (items.length === 0) toast.info('No opportunities found this time. Try again.');
    } catch (error) {
      console.error("Error discovering opportunities:", error);
      toast.error('Failed to discover opportunities. Please try again.');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleToggleSaveOpportunity = async (oppId: string, currentlySaved: boolean) => {
    if (!user) return;
    try {
      const ref = doc(db, 'opportunities', oppId);
      if (currentlySaved) {
        await updateDoc(ref, { savedBy: arrayRemove(user.uid) });
      } else {
        await updateDoc(ref, { savedBy: arrayUnion(user.uid) });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `opportunities/${oppId}`);
    }
  };

  const filteredOpportunities = opportunities.filter(opp => {
    if (oppFilter === 'saved') return opp.savedBy?.includes(user?.uid || '');
    if (oppFilter !== 'all') return opp.type.toLowerCase() === oppFilter;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdf8e9]">
        <HiveLoader label="Opening the hive..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8e9] font-sans">
      {confettiNode}
      <header className="bg-[#fdf8e9] border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/beehive" className="flex items-center gap-2">
            <div className="relative h-10 w-36 sm:w-44">
              <Image 
                src={logoImg} 
                alt="BeeHive Logo" 
                fill 
                className="object-contain object-left" 
                priority 
              />
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <motion.span whileHover={{ scale: 1.15, rotate: -8 }} whileTap={{ scale: 0.9 }} className="inline-flex"><Link href="/messages" className="text-slate-500 hover:text-indigo-600 transition-colors relative" title="Messages" aria-label="Messages">
              <MessageCircle className="w-6 h-6" />
            </Link></motion.span>
            <motion.span whileHover={{ scale: 1.15, rotate: 90 }} whileTap={{ scale: 0.9 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }} className="inline-flex"><Link href="/settings" className="text-slate-500 hover:text-slate-700 transition-colors relative" title="Settings" aria-label="Settings">
              <Settings className="w-6 h-6" />
            </Link></motion.span>
            <span className="text-sm font-medium text-slate-600 hidden sm:block">
              Welcome, <Link href={`/profile/${user?.uid}`} className="hover:text-amber-600 hover:underline">{currentUserProfile?.username || 'Student'}</Link>
            </span>
            
            <div className="relative">
              <motion.button 
                onClick={handleMarkNotificationsRead}
                aria-label="Notifications"
                whileTap={{ scale: 0.88 }}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <motion.span
                  className="inline-flex origin-top"
                  animate={notifications.some(n => !n.read) ? { rotate: [0, 16, -14, 10, -8, 0] } : { rotate: 0 }}
                  transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Bell className="w-5 h-5" />
                </motion.span>
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5">
                    <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping"></span>
                    <span className="absolute inset-0 bg-rose-500 rounded-full border-2 border-white"></span>
                  </span>
                )}
              </motion.button>
              
              <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -8 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                  style={{ transformOrigin: 'top right' }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-500 text-sm">No notifications yet.</div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!notif.read ? 'bg-amber-50/30' : ''}`}>
                          <p className="text-sm text-slate-800">
                            <span className="font-semibold">@{notif.actorName}</span>{' '}
                            {notif.type === 'like' && 'liked your project '}
                            {notif.type === 'comment' && 'commented on your project '}
                            {notif.type === 'follow' && 'started following you'}
                            {(notif.type === 'like' || notif.type === 'comment') && (
                              <span className="font-medium text-amber-600">&quot;{notif.projectTitle}&quot;</span>
                            )}
                          </p>
                          <span className="text-xs text-slate-400 mt-1 block">
                            {notif.createdAt?.toDate ? format(notif.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            <motion.button
              onClick={() => setIsModalOpen(true)}
              whileHover={{ scale: 1.06, rotate: -1.5 }}
              whileTap={{ scale: 0.94 }}
              className="group bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" /> New Project
            </motion.button>
            <button
              onClick={signOut}
              className="text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Feed Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                {activeTab === 'opportunities' ? (
                  <Briefcase className="w-6 h-6 text-slate-700" />
                ) : (
                  <FolderKanban className="w-6 h-6 text-slate-700" />
                )}
                <h2 className="text-2xl font-bold text-slate-900">
                  {activeTab === 'opportunities' ? 'Opportunities' : 'Project Feed'}
                </h2>
              </div>
              <div className="flex bg-slate-200/50 p-1 rounded-xl overflow-x-auto" role="tablist">
                {([
                  { id: 'feed', label: 'Recent', icon: null, color: 'text-slate-900' },
                  { id: 'trending', label: 'Trending', icon: Flame, color: 'text-rose-600' },
                  { id: 'recommended', label: 'For You', icon: Sparkles, color: 'text-amber-600' },
                  { id: 'opportunities', label: 'Jobs & Internships', icon: Briefcase, color: 'text-indigo-600' },
                ] as const).map(tab => {
                  const active = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      role="tab"
                      aria-selected={active}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (tab.id === 'recommended' && recommendedTags.length === 0 && !isRecommending) {
                          handleGetRecommendations();
                        }
                      }}
                      className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${active ? tab.color : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {active && (
                        <motion.span
                          layoutId="feed-tab-pill"
                          className="absolute inset-0 bg-white rounded-lg shadow-sm"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1">
                        {Icon && (
                          <motion.span animate={active ? { rotate: [0, -20, 20, 0], scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.5 }} className="inline-flex">
                            <Icon className="w-4 h-4" />
                          </motion.span>
                        )}
                        {tab.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {activeTab === 'opportunities' ? (
              <div className="space-y-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-indigo-900 mb-1">AI Opportunity Finder</h3>
                    <p className="text-indigo-700 text-sm">We&apos;ll search the web for local internships, jobs, and volunteer roles based on your grade, location, and interests.</p>
                  </div>
                  <button
                    onClick={handleDiscoverOpportunities}
                    disabled={isDiscovering}
                    className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    {isDiscovering ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {isDiscovering ? 'Buzzing the web...' : 'Find For Me'}
                  </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['all', 'internship', 'job', 'volunteer', 'competition', 'saved'].map(filter => (
                    <button
                      key={filter}
                      onClick={() => setOppFilter(filter)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                        oppFilter === filter 
                          ? 'bg-slate-800 text-white' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {filteredOpportunities.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Briefcase className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No opportunities found</h3>
                    <p className="text-slate-500 mb-6">Click the button above to have AI find personalized opportunities for you!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOpportunities.map((opp, oi) => {
                      const isSaved = opp.savedBy?.includes(user?.uid || '');
                      return (
                        <motion.div key={opp.id} {...listItem(oi)} whileHover={{ y: -4 }} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                  {opp.type}
                                </span>
                                <span className="text-sm text-slate-500 flex items-center gap-1">
                                  • {opp.location}
                                </span>
                              </div>
                              <h3 className="text-xl font-bold text-slate-900">{opp.title}</h3>
                              <p className="text-slate-600 font-medium">{opp.organization}</p>
                            </div>
                            <button 
                              onClick={() => handleToggleSaveOpportunity(opp.id, isSaved || false)}
                              className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-amber-50 text-amber-500' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                              title={isSaved ? "Unsave" : "Save"}
                            >
                              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-amber-500' : ''}`} />
                            </button>
                          </div>
                          
                          <p className="text-slate-700 my-4 text-sm leading-relaxed">{opp.description}</p>
                          
                          <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-100">
                            <div className="flex flex-wrap gap-2">
                              {opp.tags?.map((tag, idx) => (
                                <span key={idx} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1">
                                  <Tag className="w-3 h-3" /> {tag}
                                </span>
                              ))}
                            </div>
                            <a 
                              href={opp.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                              View Details <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search naturally (e.g. &apos;cool robot project&apos;)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white shadow-sm"
                  />
                </div>
                <button
                  onClick={handleAISearch}
                  disabled={isAISearching || !searchQuery.trim()}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                >
                  {isAISearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                  <span className="hidden sm:inline">{isAISearching ? 'Buzzing...' : 'AI Search'}</span>
                </button>
              </div>
              
              {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="w-4 h-4 text-slate-400 mr-1" />
                  {allTags.map(tag => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isSelected 
                            ? 'bg-amber-500 text-white shadow-sm' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                  {selectedTags.length > 0 && (
                    <button 
                      onClick={() => setSelectedTags([])}
                      className="text-sm text-slate-500 hover:text-slate-700 underline ml-2"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {activeTab === 'recommended' && isRecommending ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <div className="flex justify-center mb-3"><Bee className="w-20 h-16" /></div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Buzzing for recommendations...</h3>
                <p className="text-slate-500">Analyzing your interests using AI.</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <motion.div
                  className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  animate={{ y: [0, -10, 0], rotate: [0, -6, 6, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <FolderKanban className="w-8 h-8" />
                </motion.div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No projects yet</h3>
                <p className="text-slate-500 mb-6">Be the first to share what you&apos;re working on!</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Create Project
                </button>
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No results found</h3>
                <p className="text-slate-500 mb-6">Try adjusting your search or filters to find what you&apos;re looking for.</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedTags([]); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence initial>
                  {filteredProjects.map((project, pi) => (
                    <motion.div key={project.id} layout {...listItem(pi)}>
                      <ProjectCard project={project} currentUser={currentUserProfile!} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
            </>
            )}
          </div>

          {/* Discover Students */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-6 h-6 text-slate-700" />
              <h2 className="text-2xl font-bold text-slate-900">Discover</h2>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Other Students</h3>
              {users.length === 0 ? (
                <p className="text-slate-500 text-sm">No other students found.</p>
              ) : (
                <div className="space-y-4">
                  {users.map((u, ui) => (
                    <motion.div
                      key={u.uid}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 22, delay: Math.min(ui, 8) * 0.07 }}
                      whileHover={{ x: 6 }}
                    >
                    <Link href={`/profile/${u.uid}`} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                      <motion.div whileHover={{ rotate: [0, -12, 12, 0], scale: 1.12 }} transition={{ duration: 0.5 }} className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg shrink-0">
                        {(u.username || '?').charAt(0).toUpperCase()}
                      </motion.div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">@{u.username || 'unknown'}</h4>
                        <p className="text-xs text-slate-500 mb-1">Grade {u.grade || 'N/A'} • {u.location || 'Unknown'}</p>
                        {u.interests && u.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {u.interests.slice(0, 3).map((interest, idx) => (
                              <span key={idx} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                                {interest}
                              </span>
                            ))}
                            {u.interests.length > 3 && (
                              <span className="text-[10px] text-slate-400 px-1.5 py-0.5">+{u.interests.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
      {isModalOpen && (
        <motion.div
          key="project-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Share a Project</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <LogOut className="w-5 h-5 transform rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Title *</label>
                <input 
                  required
                  maxLength={100}
                  value={newProject.title}
                  onChange={e => setNewProject({...newProject, title: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="What are you building?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea 
                  required
                  maxLength={2000}
                  rows={4}
                  value={newProject.description}
                  onChange={e => setNewProject({...newProject, description: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                  placeholder="Describe your project, the tech stack, and what you learned..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (comma separated)</label>
                <input 
                  value={newProject.tags}
                  onChange={e => setNewProject({...newProject, tags: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="React, Robotics, Design (max 5)"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newProject.title.trim() || !newProject.description.trim()}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Post Project'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
