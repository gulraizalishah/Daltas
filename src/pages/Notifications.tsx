import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';
import { useBadges } from '../useBadges';
import type { NotificationRow } from '../types';
import { timeAgo } from '../lib/format';

export default function Notifications() {
  const { version, refresh } = useBadges();
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [error, setError] = useState(false);
  const fresh = useRef(new Set<string>());   // ids that were unread when first shown, so they stay highlighted

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('notifications')
        .select('id,type,payload,created_at,read_at').order('created_at', { ascending: false }).limit(50);
      if (error) { console.error(error); setError(true); return; }
      const list = (data ?? []) as NotificationRow[];
      list.forEach((n) => { if (!n.read_at) fresh.current.add(n.id); });
      setError(false);
      setRows(list);
      if (list.some((n) => !n.read_at)) {
        await supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
        void refresh();
      }
    })();
  }, [version, refresh]);

  if (error && !rows) return <p role="alert" className="text-red-700">We couldn’t load your notifications. Please refresh.</p>;
  if (!rows) {
    return (
      <div className="grid gap-3" role="status" aria-label="Loading notifications">
        {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-2xl bg-neutral-200 [animation:pulse-soft_1.5s_infinite]" />)}
      </div>
    );
  }
  if (rows.length === 0) {
    return <p className="py-16 text-center text-neutral-600">You’re all caught up. New matches, likes and messages will show up here.</p>;
  }

  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <ul className="grid gap-2">
        {rows.map((n) => {
          const name = n.payload.name ?? 'Someone';
          let text = n.payload.text ?? '';
          let to = '/home';
          let Icon = Sparkles;
          if (n.type === 'match') { text = `It’s a match with ${name}!`; to = `/messages/${n.payload.match_id}`; Icon = Heart; }
          if (n.type === 'like') { text = `${name} liked you`; to = '/home'; Icon = Heart; }
          if (n.type === 'message') { text = `New message from ${name}`; to = `/messages/${n.payload.conversation_id}`; Icon = MessageCircle; }
          const unread = fresh.current.has(n.id);
          return (
            <li key={n.id}>
              <Link to={to} className={`flex items-center gap-3 rounded-2xl p-3 shadow-sm hover:bg-neutral-50 ${unread ? 'bg-rose-50' : 'bg-white'}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-600"><Icon size={20} /></span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${unread ? 'font-semibold' : ''}`}>{text}</span>
                  <span className="block text-xs text-neutral-500">{timeAgo(n.created_at)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}