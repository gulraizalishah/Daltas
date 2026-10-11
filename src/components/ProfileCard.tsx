import { useRef, useState } from 'react';
import type { MouseEvent as RME, PointerEvent as RPE } from 'react';
import { Info } from 'lucide-react';
import type { FeedProfile } from '../types';
import { photoUrl } from '../lib/photos';
import { intentLabel } from '../lib/format';

type Props = { p: FeedProfile; onLike: () => void; onPass: () => void; onInfo: () => void };

export default function ProfileCard({ p, onLike, onPass, onInfo }: Props) {
  const [idx, setIdx] = useState(0);
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const tapTimer = useRef<number | undefined>(undefined);

  const down = (e: RPE<HTMLElement>) => { start.current = { x: e.clientX, y: e.clientY }; moved.current = false; };
  const move = (e: RPE<HTMLElement>) => {
    if (!start.current) return;
    const x = e.clientX - start.current.x;
    const y = e.clientY - start.current.y;
    if (!moved.current && Math.abs(x) > 10 && Math.abs(x) > Math.abs(y)) {
      moved.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (moved.current) setDx(x);
  };
  const up = () => {
    if (!start.current) return;
    const x = dx;
    start.current = null;
    setDx(0);
    if (moved.current) { if (x > 110) onLike(); else if (x < -110) onPass(); }
  };

  const tap = (e: RME<HTMLDivElement>) => {
    if (moved.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const left = e.clientX - rect.left < rect.width / 3;
    if (tapTimer.current) {                       // second tap = like
      window.clearTimeout(tapTimer.current);
      tapTimer.current = undefined;
      onLike();
      return;
    }
    tapTimer.current = window.setTimeout(() => {  // single tap = previous / next photo
      tapTimer.current = undefined;
      setIdx((i) => (left ? Math.max(0, i - 1) : Math.min(p.photos.length - 1, i + 1)));
    }, 250);
  };

  const facts = [intentLabel(p.relationship_intention), p.occupation, p.location_label].filter(Boolean) as string[];
  const sorted = [...p.interests].sort((a, b) => Number(p.mutual_interests.includes(b)) - Number(p.mutual_interests.includes(a)));
  const shown = sorted.slice(0, 4);
  const extra = sorted.length - shown.length;

  return (
    <article
      aria-label={`${p.display_name}, ${p.age}`}
      className="relative h-full select-none overflow-hidden rounded-3xl bg-neutral-900 shadow-lg [touch-action:none]"
      style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)`, transition: dx === 0 ? 'transform .2s' : 'none' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    >
      {p.photos.length > 0 ? (
        <img src={photoUrl(p.photos[idx])} alt={`${p.display_name}, photo ${idx + 1} of ${p.photos.length}`}
          className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-rose-300 to-neutral-300 text-8xl font-semibold text-white/80">
          {p.display_name.slice(0, 1).toUpperCase()}
        </div>
      )}

      {/* tap layer: tap sides for photos, double-tap to like */}
      <div className="absolute inset-0" onClick={tap} />

      {p.photos.length > 1 && (
        <div className="pointer-events-none absolute inset-x-3 top-3 flex gap-1" aria-hidden>
          {p.photos.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`} />)}
        </div>
      )}

      {dx > 40 && <Stamp text="LIKE" cls="left-4 rotate-[-12deg] border-green-400 text-green-400" />}
      {dx < -40 && <Stamp text="PASS" cls="right-4 rotate-[12deg] border-red-400 text-red-400" />}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4 pt-24 text-white">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold">{p.display_name}, {p.age}</h2>
            {facts.length > 0 && <p className="mt-0.5 truncate text-sm text-white/80">{facts.join(' · ')}</p>}
          </div>
          <button onClick={onInfo} aria-label={`Full profile of ${p.display_name}`}
            className="pointer-events-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <Info size={22} />
          </button>
        </div>
        {p.bio && <p className="mt-2 line-clamp-2 text-sm text-white/90">{p.bio}</p>}
        {shown.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {shown.map((i) => (
              <li key={i} className={`rounded-full px-2.5 py-1 text-xs backdrop-blur ${p.mutual_interests.includes(i) ? 'bg-rose-500/90' : 'bg-white/20'}`}>{i}</li>
            ))}
            {extra > 0 && <li className="rounded-full bg-white/20 px-2.5 py-1 text-xs backdrop-blur">+{extra}</li>}
          </ul>
        )}
      </div>
    </article>
  );
}

function Stamp({ text, cls }: { text: string; cls: string }) {
  return <div className={`pointer-events-none absolute top-8 rounded-lg border-4 px-3 py-1 text-3xl font-extrabold ${cls}`}>{text}</div>;
}