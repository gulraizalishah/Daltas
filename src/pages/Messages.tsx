import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { useBadges } from '../useBadges';
import type { ConversationRow } from '../types';
import Avatar from '../components/Avatar';
import { shortTime } from '../lib/format';
import { primaryBtn } from '../ui';

export default function Messages() {
  const { session } = useAuth();
  const me = session?.user.id;
  const { version } = useBadges();
  const [rows, setRows] = useState<ConversationRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase.rpc('my_conversations').then(({ data, error }) => {
      if (error) { console.error(error); setError(true); return; }
      setError(false);
      setRows((data ?? []) as ConversationRow[]);
    });
  }, [version]);

  if (error && !rows) return <p role="alert" className="text-red-700">We couldn’t load your messages. Please refresh.</p>;
  if (!rows) {
    return (
      <div className="grid gap-3" role="status" aria-label="Loading messages">
        {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-neutral-200 [animation:pulse-soft_1.5s_infinite]" />)}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="grid place-items-center gap-3 py-16 text-center">
        <p className="text-neutral-600">Your conversations will appear here.</p>
        <Link to="/matches" className={primaryBtn}>View matches</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-semibold">Messages</h1>
      <ul className="grid gap-2">
        {rows.map((c) => (
          <li key={c.conversation_id}>
            <Link to={`/messages/${c.conversation_id}`}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
              <div className="relative">
                <Avatar path={c.photo} name={c.display_name} />
                {c.online && <span aria-label="Online" className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate ${c.unread_count > 0 ? 'font-semibold' : 'font-medium'}`}>{c.display_name}</p>
                  <span className="shrink-0 text-xs text-neutral-500">{shortTime(c.last_message_at)}</span>
                </div>
                <p className={`truncate text-sm ${c.unread_count > 0 ? 'font-medium text-neutral-900' : 'text-neutral-500'}`}>
                  {c.last_sender_id === me ? 'You: ' : ''}{c.last_message}
                </p>
              </div>
              {c.unread_count > 0 && (
                <span aria-label={`${c.unread_count} unread`} className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">
                  {c.unread_count > 99 ? '99+' : c.unread_count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}