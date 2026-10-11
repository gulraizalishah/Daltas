import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MoreHorizontal, X } from 'lucide-react';
import { supabase } from '../supabase';
import type { FeedProfile } from '../types';
import ProfileCard from '../components/ProfileCard';
import MatchModal from '../components/MatchModal';
import MoreSheet from '../components/MoreSheet';
import { ghostBtn, primaryBtn } from '../ui';

export default function Home() {
  const [queue, setQueue] = useState<FeedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<{ p: FeedProfile; matchId: string } | null>(null);
  const [more, setMore] = useState(false);
  const fetching = useRef(false);
  const queueRef = useRef<FeedProfile[]>([]);
  const seen = useRef(new Set<string>());

  useEffect(() => { queueRef.current = queue; }, [queue]);

  const loadMore = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
    const exclude = [...queueRef.current.map((q) => q.user_id), ...seen.current];
    const { data, error } = await supabase.rpc('discover_feed', { p_limit: 10, p_exclude: exclude });
    fetching.current = false;
    setLoading(false);
    if (error) { console.error(error); return setError('We couldn’t load profiles. Please try again.'); }
    const rows = (data ?? []) as FeedProfile[];
    setError(null);
    if (rows.length === 0) setExhausted(true);
    setQueue((q) => {
      const ids = new Set(q.map((x) => x.user_id));
      return [...q, ...rows.filter((r) => !ids.has(r.user_id))];
    });
  }, []);

  useEffect(() => { void loadMore(); }, [loadMore]);

  const top = queue[0];

  function failed(p: FeedProfile) {
    seen.current.delete(p.user_id);
    setQueue((q) => [p, ...q]);
    setError('Something went wrong. Please try again.');
  }

  async function act(kind: 'like' | 'pass') {
    if (!top) return;
    const p = top;
    seen.current.add(p.user_id);
    setQueue((q) => q.slice(1));
    setError(null);
    if (queue.length <= 4 && !exhausted) void loadMore();

    if (kind === 'pass') {
      const { error } = await supabase.rpc('pass_user', { p_target: p.user_id });
      if (error) { console.error(error); failed(p); }
      return;
    }
    const { data, error } = await supabase.rpc('like_user', { p_target: p.user_id });
    if (error) { console.error(error); return failed(p); }
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.matched && row.match_id) setMatch({ p, matchId: row.match_id });
  }

  async function report(reason: string) {
    if (!top) return;
    const p = top;
    const { error } = await supabase.rpc('report_user', { p_target: p.user_id, p_reason: reason });
    if (error) { console.error(error); setError('We couldn’t send your report. Please try again.'); return; }
    setMore(false);
    await act('pass');
  }

  async function block() {
    if (!top) return;
    const p = top;
    const { error } = await supabase.rpc('block_user', { p_target: p.user_id });
    if (error) { console.error(error); setError('We couldn’t block this person. Please try again.'); return; }
    seen.current.add(p.user_id);
    setQueue((q) => q.filter((x) => x.user_id !== p.user_id));
    setMore(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col" role="status" aria-label="Loading profiles">
        <div className="flex-1 rounded-3xl bg-neutral-200 [animation:pulse-soft_1.5s_infinite]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error && (
        <p role="alert" className="mb-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error} <button className="underline" onClick={() => { setError(null); void loadMore(); }}>Retry</button>
        </p>
      )}

      {top ? (
        <>
          <div className="min-h-0 flex-1">
            <ProfileCard key={top.user_id} p={top} onLike={() => void act('like')} onPass={() => void act('pass')} />
          </div>
          <div className="flex shrink-0 items-center justify-center gap-5 py-3">
            <RoundBtn label="Pass" onClick={() => void act('pass')}><X size={28} className="text-neutral-700" /></RoundBtn>
            <RoundBtn label="More options" small onClick={() => setMore(true)}><MoreHorizontal size={22} className="text-neutral-600" /></RoundBtn>
            <RoundBtn label="Like" onClick={() => void act('like')}><Heart size={28} className="fill-rose-500 text-rose-500" /></RoundBtn>
          </div>
        </>
      ) : (
        <div className="grid flex-1 place-items-center text-center">
          <div className="grid max-w-xs gap-3">
            <h1 className="text-xl font-semibold">You’re all caught up</h1>
            <p className="text-neutral-600">No new profiles match your preferences right now. Check back soon, or meet someone on Live.</p>
            <button className={ghostBtn} onClick={() => { setExhausted(false); setLoading(true); void loadMore(); }}>Check again</button>
            <Link to="/live" className={primaryBtn}>Go Live</Link>
          </div>
        </div>
      )}

      {match && <MatchModal p={match.p} matchId={match.matchId} onClose={() => setMatch(null)} />}
      {more && top && <MoreSheet name={top.display_name} onClose={() => setMore(false)} onReport={report} onBlock={block} />}
    </div>
  );
}

function RoundBtn({ children, label, onClick, small }: { children: ReactNode; label: string; onClick: () => void; small?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className={`grid place-items-center rounded-full bg-white shadow-md hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${small ? 'h-12 w-12' : 'h-16 w-16'}`}>
      {children}
    </button>
  );
}