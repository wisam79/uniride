import { AuthProvider } from '@refinedev/core';
import { supabaseClient } from './supabaseClient';

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error,
      };
    }

    if (data?.session) {
      // Only allow admins - use app_metadata (not user_metadata which is client-writable)
      const role = data.user?.app_metadata?.role;
      if (role !== 'admin') {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          error: {
            message: 'Unauthorized. Admin access only.',
            name: 'Unauthorized',
          },
        };
      }
      return {
        success: true,
        redirectTo: '/',
      };
    }

    return {
      success: false,
      error: {
        message: 'Login failed',
        name: 'Invalid credentials',
      },
    };
  },
  logout: async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      return { success: false, error };
    }
    return { success: true, redirectTo: '/login' };
  },
  check: async () => {
    const { data } = await supabaseClient.auth.getSession();
    const { session } = data;

    if (!session) {
      return { authenticated: false, redirectTo: '/login' };
    }

    // Check if user is admin - use app_metadata for security
    const role = session.user?.app_metadata?.role;
    if (role !== 'admin') {
      return { authenticated: false, redirectTo: '/login', logout: true };
    }

    return { authenticated: true };
  },
  getPermissions: async () => {
    const { data } = await supabaseClient.auth.getUser();
    if (data?.user) {
      return data.user.app_metadata?.role;
    }
    return null;
  },
  getIdentity: async () => {
    const { data } = await supabaseClient.auth.getUser();
    if (data?.user) {
      return {
        ...data.user,
        name: data.user.email,
      };
    }
    return null;
  },
  onError: async (error) => {
    if (error?.status === 401) {
      return { logout: true };
    }
    return { error };
  },
};
