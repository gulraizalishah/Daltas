import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import type { MatchRow } from '../types';
import { photoUrl } from '../lib/photos';
import { timeAgo } from '../lib/format';
import { primaryBtn } from '../ui';

export default function Matches() {
  const [rows, setRows] = useState<MatchRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase.rpc('my_matches').then(({ data, error }) => {
      if (error) { console.error(error); setError(true); return; }
      setRows((data ?? []) as MatchRow[]);
    });
  }, []);

  if (error) return <p role="alert" className="text-red-700">We couldn’t load your matches. Please refresh.</p>;
  if (!rows) {
    return (
      <div className="grid grid-cols-2 gap-3" role="status" aria-label="Loading matches">
        {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-neutral-200 [animation:pulse-soft_1.5s_infinite]" />)}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="grid place-items-center gap-3 py-16 text-center">
        <p className="text-neutral-600">You don’t have any matches yet.</p>
        <Link to="/home" className={primaryBtn}>Discover people</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <h1 className="text-2xl font-semibold">Matches</h1>
      <ul className="grid grid-cols-2 gap-3">
        {rows.map((m) => (
          <li key={m.match_id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="aspect-[3/4] bg-neutral-200">
              {m.photo ? (
                <img src={photoUrl(m.photo)} alt={`${m.display_name}`} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-5xl text-neutral-400">{m.display_name.slice(0, 1).toUpperCase()}</div>
              )}
            </div>
            <div className="p-3">
              <p className="font-semibold">{m.display_name}, {m.age}</p>
              <p className="text-xs text-neutral-500">Matched {timeAgo(m.matched_at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}