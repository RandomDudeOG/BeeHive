'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Project, UserProfile, Comment } from '@/types';
import { handleFirestoreError, OperationType } from '@/lib/firestore-errors';
import { Heart, MessageCircle, Send, Tag, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Burst, listItem } from '@/components/fun';

interface ProjectCardProps {
  project: Project;
  currentUser: UserProfile;
}

export default function ProjectCard({ project, currentUser }: ProjectCardProps) {
  const hasUserLiked = Boolean(project.likes?.includes(currentUser.uid));
  const [isLikedOptimistic, setIsLikedOptimistic] = useState<boolean | null>(null);
  const [likesDelta, setLikesDelta] = useState(0);

  const isLiked = isLikedOptimistic !== null ? isLikedOptimistic : hasUserLiked;
  const likesCount = Math.max(0, (project.likes?.length || 0) + likesDelta);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!showComments) return;
    
    const q = query(collection(db, 'projects', project.id, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(fetchedComments);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${project.id}/comments`);
    });
    return () => unsub();
  }, [showComments, project.id]);

  const handleLike = async () => {
    const ref = doc(db, 'projects', project.id);
    const currentlyLiked = isLiked;
    
    // Optimistic update
    setIsLikedOptimistic(!currentlyLiked);
    setLikesDelta(prev => (currentlyLiked ? prev - 1 : prev + 1));

    try {
      if (currentlyLiked) {
        await updateDoc(ref, { likes: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(ref, { likes: arrayUnion(currentUser.uid) });
        
        // Notify creator
        if (project.creatorId !== currentUser.uid) {
          await addDoc(collection(db, 'notifications'), {
            recipientId: project.creatorId,
            actorId: currentUser.uid,
            actorName: currentUser.username,
            type: 'like',
            projectId: project.id,
            projectTitle: project.title,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
      setIsLikedOptimistic(null);
      setLikesDelta(0);
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      setIsLikedOptimistic(null);
      setLikesDelta(0);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'projects', project.id, 'comments'), {
        text: newComment.trim(),
        authorId: currentUser.uid,
        authorName: currentUser.username,
        createdAt: serverTimestamp()
      });
      
      setNewComment('');
      
      // Notify creator
      if (project.creatorId !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: project.creatorId,
          actorId: currentUser.uid,
          actorName: currentUser.username,
          type: 'comment',
          projectId: project.id,
          projectTitle: project.title,
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm"
      whileHover={{ y: -4, boxShadow: '0 18px 40px -18px rgba(245,158,11,0.35)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">{project.title}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link href={`/profile/${project.creatorId}`} className="font-medium text-amber-600 hover:underline">
              @{project.creatorName}
            </Link>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {project.createdAt?.toDate ? format(project.createdAt.toDate(), 'MMM d, yyyy') : 'Just now'}
            </span>
          </div>
        </div>
      </div>
      
      <p className="text-slate-700 mb-4 whitespace-pre-wrap">{project.description}</p>
      
      {project.tags && project.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {project.tags.map((tag, idx) => (
            <span key={idx} className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1">
              <Tag className="w-3 h-3" /> {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
        <motion.button 
          onClick={handleLike}
          whileTap={{ scale: 0.88 }}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${isLiked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-500'}`}
        >
          <span className="relative inline-grid place-items-center">
            <motion.span
              key={String(isLiked)}
              initial={false}
              animate={isLiked ? { scale: [1, 1.6, 0.9, 1.1, 1], rotate: [0, -12, 8, 0] } : { scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex"
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500' : ''}`} />
            </motion.span>
            <Burst show={isLiked} />
          </span>
          <motion.span key={likesCount} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}>
            {likesCount}
          </motion.span>
        </motion.button>
        <motion.button 
          onClick={() => setShowComments(!showComments)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-amber-500 transition-colors"
        >
          <motion.span animate={showComments ? { rotate: [0, -15, 15, 0] } : {}} transition={{ duration: 0.4 }} className="inline-flex">
            <MessageCircle className="w-5 h-5" />
          </motion.span>
          Comment
        </motion.button>
      </div>

      <AnimatePresence initial={false}>
      {showComments && (
        <motion.div
          key="comments"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="overflow-hidden"
        >
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-4">
          {comments.length > 0 ? (
            <div className="space-y-3 mb-4">
              {comments.map((comment, ci) => (
                <motion.div key={comment.id} {...listItem(ci)} layout className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Link href={`/profile/${comment.authorId}`} className="font-semibold text-sm text-slate-900 hover:underline">
                      @{comment.authorName}
                    </Link>
                    <span className="text-xs text-slate-400">
                      {comment.createdAt?.toDate ? format(comment.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{comment.text}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 mb-4">No comments yet. Be the first!</p>
          )}
          
          <form onSubmit={handleComment} className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
            <button 
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-full disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
}
