import { useEffect, useState } from 'react';
import { Heart, MoreHorizontal, X } from 'lucide-react';
import { supabase } from '../supabase';
import type { FeedProfile, PostRow } from '../types';
import { photoUrl } from '../lib/photos';
import { intentLabel } from '../lib/format';
import PostCard from './PostCard';
import MoreSheet from './MoreSheet';

type Props = {
  p: FeedProfile;
  onClose: () => void;
  onLike: () => void;
  onPass: () => void;
  onReport: (reason: string) => Promise<void>;
  onBlock: () => Promise<void>;
};

export default function ProfileSheet({ p, onClose, onLike, onPass, onReport, onBlock }: Props) {
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [postsError, setPostsError] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    supabase.rpc('profile_posts', { p_user: p.user_id, p_limit: 20 }).then(({ data, error }) => {
      if (error) { console.error(error); setPostsError(true); setPosts([]); return; }
      setPosts((data ?? []) as PostRow[]);
    });
  }, [p.user_id]);

  const facts = [intentLabel(p.relationship_intention), p.occupation, p.education, p.location_label].filter(Boolean) as string[];

  return (
    <div role="dialog" aria-modal="true" aria-label={`${p.display_name}’s profile`} className="fixed inset-0 z-40 overflow-y-auto bg-neutral-50">
      <div className="mx-auto max-w-xl">
        <div className="relative">
          {p.photos.length > 0 ? (
            <div className="flex snap-x snap-mandatory overflow-x-auto">
              {p.photos.map((ph, i) => (
                <img key={ph} src={photoUrl(ph)} alt={`${p.display_name}, photo ${i + 1} of ${p.photos.length}`}
                  className="aspect-[4/5] w-full shrink-0 snap-center object-cover" />
              ))}
            </div>
          ) : (
            <div className="grid aspect-[4/5] w-full place-items-center bg-gradient-to-br from-rose-300 to-neutral-300 text-8xl text-white/80">
              {p.display_name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <button onClick={onClose} aria-label="Close profile"
            className="absolute left-3 top-[calc(0.75rem_+_env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur">
            <X />
          </button>
        </div>

        <div className="grid gap-4 p-4 pb-28">
          <div>
            <h1 className="text-2xl font-semibold">{p.display_name}, {p.age}</h1>
            {facts.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2 text-sm text-neutral-600">
                {facts.map((f) => <li key={f} className="rounded-full bg-neutral-100 px-3 py-1">{f}</li>)}
              </ul>
            )}
          </div>
          {p.bio && <p className="text-neutral-800">{p.bio}</p>}
          {p.languages.length > 0 && <p className="text-sm text-neutral-500">Speaks {p.languages.join(', ')}</p>}

          {p.interests.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-neutral-700">
                Interests{p.mutual_interests.length > 0 && <span className="ml-2 font-normal text-rose-600">{p.mutual_interests.length} in common</span>}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {p.interests.map((i) => (
                  <li key={i} className={`rounded-full px-3 py-1 text-sm ${p.mutual_interests.includes(i) ? 'bg-rose-100 text-rose-700' : 'bg-neutral-100 text-neutral-700'}`}>{i}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-3">
            <h2 className="text-sm font-semibold text-neutral-700">Posts</h2>
            {!posts && <p className="text-sm text-neutral-500" role="status">Loading posts…</p>}
            {postsError && <p role="alert" className="text-sm text-red-600">We couldn’t load posts.</p>}
            {posts?.length === 0 && !postsError && <p className="text-sm text-neutral-500">No posts yet.</p>}
            {posts?.map((po) => <PostCard key={po.id} post={po} />)}
          </section>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-center gap-5 border-t border-neutral-200 bg-white/95 py-3 pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] backdrop-blur">
          <button onClick={onPass} aria-label="Pass" className="grid h-14 w-14 place-items-center rounded-full bg-white shadow-md"><X size={26} /></button>
          <button onClick={() => setMore(true)} aria-label="More options" className="grid h-11 w-11 place-items-center rounded-full bg-white shadow-md"><MoreHorizontal size={20} /></button>
          <button onClick={onLike} aria-label="Like" className="grid h-14 w-14 place-items-center rounded-full bg-white shadow-md"><Heart size={26} className="fill-rose-500 text-rose-500" /></button>
        </div>
      </div>
      {more && <MoreSheet name={p.display_name} onClose={() => setMore(false)} onReport={onReport} onBlock={onBlock} />}
    </div>
  );
}