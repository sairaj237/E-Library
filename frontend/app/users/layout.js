'use client';

import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UsersLayout({ children }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // This will only run on the client side after the component mounts
    if (user && user.role !== 'admin') {
      // Redirect non-admin users to dashboard
      router.push('/dashboard');
    }
  }, [user, router]);

  return <>{children}</>;
}
