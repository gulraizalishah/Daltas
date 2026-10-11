import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

type Badges = { messages: number; notifications: number; version: number; refresh: () => Promise<void> };

const Ctx = createContext<Badges>({ messages: 0, notifications: 0, version: 0, refresh: async () => {} });
export const useBadges = () => useContext(Ctx);

export function BadgesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [counts, setCounts] = useState({ messages: 0, notifications: 0 });
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('unread_counts');
    if (error) return console.error(error);
    const r = Array.isArray(data) ? data[0] : data;
    if (r) setCounts({ messages: r.messages, notifications: r.notifications });
    setVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!uid) { setCounts({ messages: 0, notifications: 0 }); return; }

    const beat = () => { void supabase.rpc('touch_active'); };
    const onVisible = () => { if (document.visibilityState === 'visible') { beat(); void refresh(); } };

    beat();
    void refresh();

    const ch = supabase.channel('badges-' + uid)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${uid}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` }, () => void refresh())
      .subscribe();

    const timer = window.setInterval(onVisible, 60000);   // safety net + keeps "online" fresh
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(ch);
    };
  }, [uid, refresh]);

  const value = useMemo(() => ({ ...counts, version, refresh }), [counts, version, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}