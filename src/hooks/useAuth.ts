import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { getEmailRedirectUrl } from '@/lib/auth-urls';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAdminStatus = async (userId: string | null) => {
      if (!userId) {
        if (isMounted) setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (!isMounted) return;
      setIsAdmin(!error && !!data);
    };

    const bootstrapAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      setUser(currentUser);
      await loadAdminStatus(currentUser?.id ?? null);

      if (isMounted) setLoading(false);
    };

    void bootstrapAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        void loadAdminStatus(nextUser?.id ?? null);
        // Auto-claim any pending Stripe Supporter payment tied to this email.
        if (event === 'SIGNED_IN' && nextUser) {
          // Defer to avoid running inside the auth callback's transaction
          setTimeout(() => {
            void supabase.rpc('claim_supporter_for_current_user' as any);
          }, 0);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getEmailRedirectUrl() }
    });
    if (!error && data.user) {
      // Update profile with name
      if (firstName || lastName) {
        await supabase
          .from('profiles')
          .update({ first_name: firstName, last_name: lastName })
          .eq('user_id', data.user.id);
      }
    }
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, isAdmin, signIn, signUp, signOut };
};
