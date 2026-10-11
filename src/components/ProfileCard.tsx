import { useRef, useState } from 'react';
import type { MouseEvent as RME, PointerEvent as RPE } from 'react';
import type { FeedProfile } from '../types';
import { photoUrl } from '../lib/photos';
import { intentLabel } from '../lib/format';

type Props = { p: FeedProfile; onLike: () => void; onPass: () => void };

export default function ProfileCard({ p, onLike, onPass }: Props) {
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
    tapTimer.current = window.setTimeout(() => {  // single tap = next/previous photo
      tapTimer.current = undefined;
      setIdx((i) => (left ? Math.max(0, i - 1) : Math.min(p.photos.length - 1, i + 1)));
    }, 250);
  };

  const intent = intentLabel(p.relationship_intention);
  const facts = [intent, p.occupation, p.education, p.location_label].filter(Boolean) as string[];

  return (
    <article
      aria-label={`${p.display_name}, ${p.age}`}
      className="relative flex h-full select-none flex-col overflow-y-auto rounded-3xl bg-white shadow-lg [touch-action:pan-y]"
      style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)`, transition: dx === 0 ? 'transform .2s' : 'none' }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    >
      <div className="relative aspect-[4/5] w-full shrink-0 bg-neutral-200" onClick={tap}>
        {p.photos.length > 0 ? (
          <img src={photoUrl(p.photos[idx])} alt={`${p.display_name}, photo ${idx + 1} of ${p.photos.length}`}
            className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="grid h-full place-items-center text-7xl font-semibold text-neutral-400">
            {p.display_name.slice(0, 1).toUpperCase()}
          </div>
        )}

        {p.photos.length > 1 && (
          <div className="absolute inset-x-3 top-3 flex gap-1" aria-hidden>
            {p.photos.map((_, i) => (
              <span key={i} className={`h-1 flex-1 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}

        {dx > 40 && <Stamp text="LIKE" cls="left-4 rotate-[-12deg] border-green-400 text-green-400" />}
        {dx < -40 && <Stamp text="PASS" cls="right-4 rotate-[12deg] border-red-400 text-red-400" />}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-16 text-white">
          <h2 className="text-2xl font-semibold">{p.display_name}, {p.age}</h2>
        </div>
      </div>

      <div className="grid gap-3 p-4">
        {p.bio && <p className="text-neutral-800">{p.bio}</p>}
        {facts.length > 0 && (
          <ul className="flex flex-wrap gap-2 text-sm text-neutral-600">
            {facts.map((f) => <li key={f} className="rounded-full bg-neutral-100 px-3 py-1">{f}</li>)}
          </ul>
        )}
        {p.languages.length > 0 && <p className="text-sm text-neutral-500">Speaks {p.languages.join(', ')}</p>}
        {p.interests.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-700">
              Interests{p.mutual_interests.length > 0 && <span className="ml-2 font-normal text-rose-600">{p.mutual_interests.length} in common</span>}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {p.interests.map((i) => (
                <li key={i} className={`rounded-full px-3 py-1 text-sm ${p.mutual_interests.includes(i) ? 'bg-rose-100 text-rose-700' : 'bg-neutral-100 text-neutral-700'}`}>{i}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

function Stamp({ text, cls }: { text: string; cls: string }) {
  return <div className={`absolute top-8 rounded-lg border-4 px-3 py-1 text-3xl font-extrabold ${cls}`}>{text}</div>;
}