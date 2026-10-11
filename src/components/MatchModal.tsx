import { Link } from 'react-router-dom';
import type { FeedProfile } from '../types';
import { photoUrl } from '../lib/photos';
import { ghostBtn, primaryBtn } from '../ui';

export default function MatchModal({ p, onClose }: { p: FeedProfile; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="It’s a match" className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center [animation:pop_.25s_ease-out]">
        {p.photos[0] ? (
          <img src={photoUrl(p.photos[0])} alt="" className="mx-auto h-28 w-28 rounded-full object-cover" />
        ) : (
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-neutral-200 text-4xl text-neutral-500">
            {p.display_name.slice(0, 1).toUpperCase()}
          </div>
        )}
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-rose-500">IT’S A MATCH!</h2>
        <p className="mt-2 text-neutral-600">You and {p.display_name} liked each other.</p>
        <Link to="/matches" onClick={onClose} className={`${primaryBtn} mt-5 block`}>View matches</Link>
        <button onClick={onClose} className={`${ghostBtn} mt-2 w-full`}>Keep browsing</button>
      </div>
    </div>
  );
}