'use client';

import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export function useSupabase() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Using imported supabase client

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error getting user in useSupabase:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      try {
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return {
    user,
    loading,
    supabase,
    signOut: () => supabase.auth.signOut(),
  };
}
