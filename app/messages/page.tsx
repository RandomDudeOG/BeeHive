'use client';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { Conversation } from '@/lib/messaging';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import logoImg from '@/src/assets/images/logo.png';

interface ConversationWithUser extends Conversation {
  otherUser: {
    uid: string;
    username: string;
  } | null;
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      const fetchConversations = async () => {
        try {
          const q = query(
            collection(db, 'conversations'),
            where('participants', 'array-contains', user.uid)
          );
          const snapshot = await getDocs(q);
          
          const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
          
          // Fetch user details for the other participant
          const convsWithUsers = await Promise.all(convs.map(async (conv) => {
            const otherUserId = conv.participants.find(id => id !== user.uid);
            let otherUser = null;
            
            if (otherUserId) {
              const userSnap = await getDoc(doc(db, 'users', otherUserId));
              if (userSnap.exists()) {
                otherUser = {
                  uid: userSnap.id,
                  username: userSnap.data().username || 'Unknown User'
                };
              }
            }
            
            return {
              ...conv,
              otherUser
            };
          }));

          setConversations(convsWithUsers);
        } catch (error) {
          console.error("Error fetching conversations:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchConversations();
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8e9] font-sans pb-12">
      <header className="bg-[#fdf8e9] border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Link href="/beehive" className="text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex items-center gap-2">
            <Image src={logoImg} alt="BeeHive Logo" width={100} height={100} className="w-[100px] h-[100px] object-contain" referrerPolicy="no-referrer" />
            <span className="text-lg font-bold tracking-tight text-slate-900">Messages</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-indigo-500" />
            <h1 className="text-2xl font-bold text-slate-900">Your Conversations</h1>
          </div>
          
          {conversations.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-lg">You don&apos;t have any messages yet.</p>
              <p className="text-sm mt-2">Go to a student&apos;s profile to send them a message!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {conversations.map((conv) => (
                <Link 
                  key={conv.id} 
                  href={`/messages/${conv.id}`}
                  className="block p-6 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
                      {(conv.otherUser?.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {conv.otherUser ? `@${conv.otherUser.username}` : 'Unknown User'}
                      </h3>
                      <p className="text-sm text-slate-500">Click to view conversation</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
