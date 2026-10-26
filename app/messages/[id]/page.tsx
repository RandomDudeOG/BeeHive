'use client';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { Message, sendMessage, reportMessage } from '@/lib/messaging';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { ArrowLeft, Loader2, Send, AlertTriangle, Flag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Bee } from '@/components/fun';

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<{uid: string, username: string} | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (user && conversationId) {
      // 1. Fetch conversation details to get the other user
      const fetchConvDetails = async () => {
        try {
          const convSnap = await getDoc(doc(db, 'conversations', conversationId));
          if (convSnap.exists()) {
            const participants = convSnap.data().participants as string[];
            if (!participants.includes(user.uid)) {
              // User not part of this conversation
              router.push('/messages');
              return;
            }
            
            const otherUserId = participants.find(id => id !== user.uid);
            if (otherUserId) {
              const userSnap = await getDoc(doc(db, 'users', otherUserId));
              if (userSnap.exists()) {
                setOtherUser({
                  uid: userSnap.id,
                  username: userSnap.data().username || 'Unknown User'
                });
              }
            }
          } else {
            router.push('/messages');
          }
        } catch (error) {
          console.error("Error fetching conversation:", error);
        }
      };

      fetchConvDetails();

      // 2. Set up real-time listener for messages
      const q = query(
        collection(db, `conversations/${conversationId}/messages`),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Message))
          .filter(m => m.status !== 'hidden'); // Hidden (heavily reported) messages are never shown
        setMessages(newMessages);
        setLoading(false);
      }, (error) => {
        console.error("Error listening to messages:", error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, authLoading, conversationId, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !otherUser || sending) return;

    setSending(true);
    const textToSend = inputText.trim();
    setInputText(''); // Optimistic clear

    try {
      const result = await sendMessage(conversationId, user.uid, otherUser.uid, textToSend);
      if (result.flagged) {
        toast.warning(`Your message was flagged for ${result.category} and won't be shown to the other student. Repeated violations will restrict your account.`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setInputText(textToSend); // give the text back so nothing is lost
      toast.error("Couldn't send that message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleReport = async (messageId: string) => {
    if (!user) return;
    try {
      await reportMessage(conversationId, messageId, user.uid);
      alert("Message reported. Our moderation team will review it.");
    } catch (error: any) {
      alert(error.message || "Failed to report message.");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf8e9] font-sans flex flex-col">
      <header className="bg-[#fdf8e9] border-b border-slate-200 sticky top-0 z-10 flex-shrink-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/messages" className="text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                {(otherUser?.username || '?').charAt(0).toUpperCase()}
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">
                {otherUser ? `@${otherUser.username}` : 'Chat'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        <div className="flex-1 bg-white rounded-t-3xl shadow-sm border border-slate-200 p-4 sm:p-6 overflow-y-auto mb-0 flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}><Bee className="w-20 h-16" /></motion.div>
              <p>No messages yet. Say hi!</p>
              <p className="text-xs mt-2 text-slate-300">Messages are monitored by AI for safety.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMine = msg.senderId === user?.uid;
              const displayText = (msg.flagged && !isMine) ? '######' : msg.text;
              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, x: isMine ? 60 : -60, scale: 0.7 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  style={{ transformOrigin: isMine ? 'bottom right' : 'bottom left' }}
                >
                  <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isMine 
                        ? 'bg-indigo-500 text-white rounded-br-sm' 
                        : 'bg-slate-100 text-slate-900 rounded-bl-sm'
                    }`}
                  >
                    <p className="break-words">{displayText}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    
                    {msg.flagged && isMine && (
                      <span className="text-[10px] text-rose-500 flex items-center gap-1" title="Flagged by moderation">
                        <AlertTriangle className="w-3 h-3" /> Flagged
                      </span>
                    )}
                    
                    {!isMine && (
                      <button 
                        onClick={() => handleReport(msg.id!)}
                        className="text-[10px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
                        title="Report message"
                      >
                        <Flag className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-white rounded-b-3xl shadow-sm border-x border-b border-slate-200 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={sending}
            />
            <motion.button
              type="submit"
              disabled={!inputText.trim() || sending}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.85, rotate: 18 }}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white w-12 h-12 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Send message"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
            </motion.button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-3">
            Be kind and respectful. Messages are monitored by AI moderation.
          </p>
        </div>
      </main>
    </div>
  );
}
