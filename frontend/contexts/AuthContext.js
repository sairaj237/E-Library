'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = Cookies.get('token');
      const savedUser = Cookies.get('user');
      
      console.log('AuthContext - Initializing auth:', { hasToken: !!token, hasSavedUser: !!savedUser });

      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          console.log('AuthContext - Setting user from cookies:', parsedUser);
          setUser(parsedUser);
        } catch (error) {
          console.error('Error parsing saved user:', error, { savedUser });
          logout();
        }
      } else {
        console.log('AuthContext - No valid token or user in cookies');
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { user: userData } = response.data;
      
      // The token is now in an HTTP-only cookie, we don't need to store it client-side
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      // Call the server to clear the HTTP-only cookie
      await authAPI.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear client-side state
      setUser(null);
    }
  };

  const isAdmin = () => user?.role === 'admin';
  const isLibrarian = () => user?.role === 'librarian';
  const isStudent = () => user?.role === 'student';
  const canManageBooks = () => isAdmin() || isLibrarian();
  const canManageUsers = () => isAdmin();

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
    isLibrarian,
    isStudent,
    canManageBooks,
    canManageUsers,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

