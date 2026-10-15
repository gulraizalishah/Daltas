import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Ban, ChevronUp, Flag, Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { useLive } from '../useLive';

const REASONS: [string, string][] = [
  ['harassment', 'Harassment'], ['nudity_sexual', 'Nudity / sexual content'], ['hate_speech', 'Hate speech'],
  ['threats', 'Threats'], ['spam', 'Spam'], ['fake_profile', 'Fake profile'],
  ['underage', 'Underage user'], ['other', 'Other'],
];

const MESSAGES: Record<string, string> = {
  requesting_media: 'Starting your camera…',
  searching: 'Finding someone…',
  empty: 'No one is available right now.',
  connecting: 'Connecting…',
  lost: 'Connection lost.',
  denied: 'Camera and microphone access are required for Live.',
  no_device: 'We couldn’t find a camera or microphone on this device.',
  unsupported: 'This browser doesn’t support video calling. Try a recent Chrome, Safari, Edge or Firefox.',
  error: 'We couldn’t establish the video connection. Try again.',
};

export default function Live() {
  const live = useLive();
  const { state, stop, next } = live;
  const [reporting, setReporting] = useState(false);
  const touchY = useRef<number | null>(null);
  const canSkip = ['connected', 'connecting', 'empty'].includes(state);
  const inCall = ['searching', 'empty', 'connecting', 'connected', 'lost'].includes(state);

  // Release camera, mic and queue slot when leaving this page.
  useEffect(() => () => { void stop(); }, [stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowDown' && canSkip) void next(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canSkip, next]);

  if (state === 'idle' || ['denied', 'no_device', 'unsupported', 'error'].includes(state)) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-neutral-950 p-6 text-center text-white">
        <h1 className="text-2xl font-semibold">Live</h1>
        <p className="max-w-sm text-neutral-300">
          {MESSAGES[state] ?? 'Meet someone new over live video. Your camera only turns on once you start.'}
        </p>
        {state === 'denied' && (
          <p className="max-w-sm text-sm text-neutral-400">
            Click the camera icon in your browser’s address bar (or site settings), allow camera and microphone for this site, then try again.
          </p>
        )}
        <button onClick={live.start}
          className="rounded-full bg-rose-500 px-6 py-3 font-medium hover:bg-rose-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
          {state === 'idle' ? 'Go Live' : 'Try again'}
        </button>
        <Link to="/home" className="text-sm text-neutral-400 underline">Back to Home</Link>
      </div>
    );
  }

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-black text-white"
      onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        if (touchY.current !== null && touchY.current - e.changedTouches[0].clientY > 90 && canSkip) void next();
        touchY.current = null;
      }}
    >
      <video ref={live.remoteVideo} autoPlay playsInline aria-label="Remote video" className="h-full w-full object-cover" />

      <video ref={live.localVideo} autoPlay playsInline muted aria-label="Your camera preview"
        className="absolute right-3 top-3 h-40 w-28 rounded-2xl border border-white/30 bg-neutral-900 object-cover shadow-lg [transform:scaleX(-1)] md:h-48 md:w-36" />

      {state !== 'connected' && (
        <div role="status" aria-live="polite"
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 p-6 text-center">
          <p className="text-xl font-medium">{MESSAGES[state]}</p>
          {state === 'empty' && (
            <button onClick={() => void next()} className="rounded-full bg-white px-5 py-2 font-medium text-black focus-visible:ring-2 focus-visible:ring-rose-400">
              Keep looking
            </button>
          )}
          {state === 'lost' && (
            <button onClick={live.findSomeone} className="rounded-full bg-rose-500 px-5 py-2 font-medium focus-visible:ring-2 focus-visible:ring-white">
              Find someone else
            </button>
          )}
        </div>
      )}

      {state === 'connected' && live.peer && (
        <div className="absolute left-3 top-3 rounded-full bg-black/50 px-3 py-1 text-sm backdrop-blur">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-400" />
          Connected · {live.peer.displayName}, {live.peer.age}
        </div>
      )}

      {inCall && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/70 to-transparent p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {canSkip && (
            <button onClick={() => void next()} aria-label="Next person"
              className="flex items-center gap-1 text-sm text-white/80 hover:text-white">
              <ChevronUp size={18} /> Swipe up or press ↓ for next
            </button>
          )}
          <div className="flex items-center gap-3">
            <Btn label={live.micOn ? 'Mute microphone' : 'Unmute microphone'} onClick={live.toggleMic}>{live.micOn ? <Mic /> : <MicOff />}</Btn>
            <Btn label={live.camOn ? 'Turn camera off' : 'Turn camera on'} onClick={live.toggleCam}>{live.camOn ? <Video /> : <VideoOff />}</Btn>
            <Btn label={live.speakerOn ? 'Mute their audio' : 'Unmute their audio'} onClick={live.toggleSpeaker}>{live.speakerOn ? <Volume2 /> : <VolumeX />}</Btn>
            <Btn label="End call" onClick={() => void stop()} danger><PhoneOff /></Btn>
            {state === 'connected' && (
              <>
                <Btn label="Report user" onClick={() => setReporting(true)}><Flag /></Btn>
                <Btn label="Block user" onClick={() => void live.block()}><Ban /></Btn>
              </>
            )}
          </div>
        </div>
      )}

      {reporting && (
        <div role="dialog" aria-modal="true" aria-label="Report user"
          className="absolute inset-0 z-10 flex items-end justify-center bg-black/70 p-4 md:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-900 p-5">
            <h2 className="mb-3 text-lg font-semibold">{live.reported ? 'Thanks — report sent' : 'Report this person'}</h2>
            {!live.reported && (
              <div className="grid gap-2">
                {REASONS.map(([v, l]) => (
                  <button key={v} onClick={() => void live.report(v)} className="rounded-lg bg-neutral-800 px-3 py-2 text-left hover:bg-neutral-700">{l}</button>
                ))}
              </div>
            )}
            <button onClick={() => setReporting(false)} className="mt-4 w-full rounded-lg border border-white/20 py-2">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Btn({ children, label, onClick, danger }: { children: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className={`grid h-12 w-12 place-items-center rounded-full backdrop-blur focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${danger ? 'bg-red-600 hover:bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}>
      {children}
    </button>
  );
}