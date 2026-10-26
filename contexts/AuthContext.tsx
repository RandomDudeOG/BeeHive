'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';
import { doc, getDoc, deleteDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { HiveLoader } from '@/components/fun';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signUpWithEmail: async () => {},
  signInWithEmail: async () => {},
  resetPassword: async () => {},
  resendVerification: async () => {},
  signOut: async () => {},
  deleteAccount: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Skipping email verification for seamless prototyping/development
        // if (!currentUser.emailVerified) {
        //   if (pathname !== '/verify-email') {
        //     router.push('/verify-email');
        //   }
        //   setLoading(false);
        //   return;
        // }

        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (!userDoc.exists()) {
            if (pathname !== '/onboarding' && pathname !== '/verify-email') {
              router.push('/onboarding');
            }
          } else {
            if (pathname === '/' || pathname === '/onboarding' || pathname === '/verify-email') {
              router.push('/beehive');
            }
          }
        } catch (error) {
          console.error("Error checking user document:", error);
        }
      } else {
        const isPublicPath = 
          pathname === '/' || 
          pathname === '/verify-email' || 
          pathname === '/terms' || 
          pathname === '/privacy' || 

          pathname?.startsWith('/api');
        
        if (!isPublicPath) {
          router.push('/');
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // await sendEmailVerification(userCredential.user);
    } catch (error) {
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (error) {
        throw error;
      }
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const deleteAccount = async () => {
    if (auth.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        
        // Delete all projects created by the user
        const projectsQuery = query(collection(db, 'projects'), where('creatorId', '==', uid));
        const projectsSnapshot = await getDocs(projectsQuery);
        const deletePromises = projectsSnapshot.docs.map(projectDoc => deleteDoc(doc(db, 'projects', projectDoc.id)));
        await Promise.all(deletePromises);

        // Delete user document from Firestore
        await deleteDoc(doc(db, 'users', uid));
        
        // Then delete the auth user
        await deleteUser(auth.currentUser);
      } catch (error) {
        throw error;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signInWithGoogle, 
      signUpWithEmail, 
      signInWithEmail, 
      resetPassword,
      resendVerification,
      signOut,
      deleteAccount
    }}>
      {!loading ? children : (
        <div className="min-h-screen flex items-center justify-center bg-[#fdf8e9]">
          <HiveLoader />
        </div>
      )}
    </AuthContext.Provider>
  );
}
