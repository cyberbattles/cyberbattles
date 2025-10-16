'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type {User} from 'firebase/auth';
import {onAuthStateChanged} from 'firebase/auth';
import {auth} from '@/lib/firebase';
import {useRouter, usePathname} from 'next/navigation';

const protectedRoutes = [
  '/dashboard',
  '/leaderboard',
  '/learn',
  '/network-traffic',
  '/shell',
  '/profile',
];

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({children}: {children: ReactNode}) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Effect to listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Effect to handle redirection based on auth state
  useEffect(() => {
    // We don't want to redirect until we are done loading
    if (loading) return;

    const isProtectedRoute = protectedRoutes.some(route =>
      pathname.startsWith(route),
    );

    // If the user is not logged in and is on a protected route, redirect to home
    if (!currentUser && isProtectedRoute) {
      router.push('/');
    }
  }, [currentUser, loading, pathname, router]);

  const value = {
    currentUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
