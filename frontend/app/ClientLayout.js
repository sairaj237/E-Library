'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { BookOpen, Users, Clock, TrendingUp, X } from 'lucide-react';
import Link from 'next/link';

// Define public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/'];

export default function ClientLayout({ children }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [redirectTo, setRedirectTo] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navigation, setNavigation] = useState([]);

  // Build navigation based on user role and current path
  useEffect(() => {
    if (!mounted) return;
    
    const navItems = [
      { name: 'Dashboard', href: '/dashboard', icon: TrendingUp, current: pathname === '/dashboard' },
      { name: 'Books', href: '/books', icon: BookOpen, current: pathname.startsWith('/books') },
      { name: 'Transactions', href: '/transactions', icon: Clock, current: pathname.startsWith('/transactions') },
    ];

    if (user?.role === 'admin') {
      navItems.push({ name: 'Users', href: '/users', icon: Users, current: pathname === '/users' });
    }

    setNavigation(navItems);
  }, [mounted, pathname, user?.role]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    // Redirect to login if not authenticated and not on a public route
    if (!user && !publicRoutes.includes(pathname)) {
      setRedirectTo('/login');
      setShouldRedirect(true);
    }
    // Redirect to dashboard if authenticated and on login/register page
    else if (user && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
      setRedirectTo('/dashboard');
      setShouldRedirect(true);
    }
  }, [user, loading, pathname, mounted]);

  useEffect(() => {
    if (shouldRedirect && redirectTo) {
      router.push(redirectTo);
      setShouldRedirect(false);
    }
  }, [shouldRedirect, redirectTo, router]);

  // Don't show anything until we know if we're authenticated or not
  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Don't show sidebar on public routes
  if (publicRoutes.includes(pathname)) {
    return children;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${mobileMenuOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">Library</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    item.current
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-4 h-6 w-6" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile menu button */}
        <div className="md:hidden bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              className="text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex-shrink-0">
              <BookOpen className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
