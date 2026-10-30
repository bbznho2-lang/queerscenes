import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { getEmailRedirectUrl } from '@/lib/auth-urls';
import { validatePassword } from '@/lib/password-validation';
import { CLOCK_SKEW_MESSAGE, hasClockSkew } from '@/lib/clock-skew';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const pendingTasks = new Set<ReturnType<typeof setTimeout>>();

    const loadAdminStatus = async (userId: string | null) => {
      if (!userId) {
        if (isMounted) setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle();
        if (isMounted) setIsAdmin(!error && !!data);
      } catch {
        if (isMounted) setIsAdmin(false);
      }
    };

    const bootstrapAuth = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!isMounted) return;
        const currentUser = userData.user ?? null;
        setUser(currentUser);
        await loadAdminStatus(currentUser?.id ?? null);
        if (currentUser) void supabase.rpc('claim_supporter_for_current_user' as any);
      } catch {
        if (isMounted) { setUser(null); setIsAdmin(false); }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void bootstrapAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        // Refreshing a token doesn't change roles. Authenticated requests must
        // run after this callback releases the auth client's session lock.
        if (event === 'TOKEN_REFRESHED') return;
        setIsAdmin(false);
        setLoading(true);
        const task = setTimeout(async () => {
          pendingTasks.delete(task);
          if (!isMounted) return;
          await loadAdminStatus(nextUser?.id ?? null);
          if (isMounted) setLoading(false);
          if (event === 'SIGNED_IN' && nextUser) {
            void supabase.rpc('claim_supporter_for_current_user' as any);
          }
        }, 0);
        pendingTasks.add(task);
      }
    );

    return () => {
      isMounted = false;
      pendingTasks.forEach(clearTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session && hasClockSkew(data.session.access_token)) {
      // A wrong device clock makes every session look expired and triggers a
      // refresh storm; stop it locally and tell the user how to fix it.
      await supabase.auth.signOut({ scope: 'local' });
      return { error: new Error(CLOCK_SKEW_MESSAGE) };
    }
    return { error };
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, redirectPath?: string) => {
    const passwordError = validatePassword(password);
    if (passwordError) return { error: new Error(passwordError), data: null };

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: getEmailRedirectUrl(redirectPath) }
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
