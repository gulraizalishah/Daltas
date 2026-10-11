import { useState } from 'react';
import { ghostBtn } from '../ui';

const REASONS: [string, string][] = [
  ['harassment', 'Harassment'], ['nudity_sexual', 'Nudity / sexual content'], ['hate_speech', 'Hate speech'],
  ['threats', 'Threats'], ['spam', 'Spam'], ['fake_profile', 'Fake profile'],
  ['underage', 'Underage user'], ['other', 'Other'],
];

type Props = { name: string; onClose: () => void; onReport: (reason: string) => Promise<void>; onBlock: () => Promise<void> };

export default function MoreSheet({ name, onClose, onReport, onBlock }: Props) {
  const [step, setStep] = useState<'menu' | 'report' | 'block'>('menu');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => { setBusy(true); await fn(); setBusy(false); };

  return (
    <div role="dialog" aria-modal="true" aria-label={`Options for ${name}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] md:rounded-3xl"
        onClick={(e) => e.stopPropagation()}>
        {step === 'menu' && (
          <div className="grid gap-2">
            <h2 className="mb-1 text-lg font-semibold">{name}</h2>
            <button className={ghostBtn} onClick={() => setStep('report')}>Report</button>
            <button className={ghostBtn} onClick={() => setStep('block')}>Block</button>
            <button className="py-2 text-neutral-500" onClick={onClose}>Cancel</button>
          </div>
        )}
        {step === 'report' && (
          <div className="grid gap-2">
            <h2 className="mb-1 text-lg font-semibold">Why are you reporting {name}?</h2>
            {REASONS.map(([v, l]) => (
              <button key={v} disabled={busy} className="rounded-xl bg-neutral-100 px-4 py-3 text-left hover:bg-neutral-200 disabled:opacity-60"
                onClick={() => run(() => onReport(v))}>{l}</button>
            ))}
            <button className="py-2 text-neutral-500" onClick={() => setStep('menu')}>Back</button>
          </div>
        )}
        {step === 'block' && (
          <div className="grid gap-3">
            <h2 className="text-lg font-semibold">Block {name}?</h2>
            <p className="text-sm text-neutral-600">You won’t see each other again anywhere in the app, including Live.</p>
            <button disabled={busy} className="rounded-full bg-red-600 px-5 py-2.5 font-medium text-white disabled:opacity-60"
              onClick={() => run(onBlock)}>{busy ? 'Blocking…' : 'Block'}</button>
            <button className="py-2 text-neutral-500" onClick={() => setStep('menu')}>Back</button>
          </div>
        )}
      </div>
    </div>
  );
}