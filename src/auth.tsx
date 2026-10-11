import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Account = { status: 'active' | 'suspended' | 'banned' | 'deactivated'; role: 'user' | 'admin' };
type AuthCtx = { session: Session | null; loading: boolean; account: Account | null; refreshAccount: () => Promise<void> };

const Ctx = createContext<AuthCtx>({ session: null, loading: true, account: null, refreshAccount: async () => {} });
export const useAuth = () => useContext(Ctx);

async function fetchAccount(): Promise<Account | null> {
  const { data, error } = await supabase.rpc('my_account');
  if (error) { console.error(error); return null; }
  const r = Array.isArray(data) ? data[0] : data;
  return r ? { status: r.status, role: r.role } : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccount = useCallback(async () => setAccount(await fetchAccount()), []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) setAccount(await fetchAccount());
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Never call Supabase directly inside this callback (it can deadlock), so defer it.
      window.setTimeout(() => { if (s) void refreshAccount(); else setAccount(null); }, 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [refreshAccount]);

  const value = useMemo(() => ({ session, loading, account, refreshAccount }), [session, loading, account, refreshAccount]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}