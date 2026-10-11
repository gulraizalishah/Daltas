import { Link } from 'react-router-dom';
import { primaryBtn, ghostBtn } from '../ui';
import { CONTACT_EMAIL, SITE_NAME } from '../lib/site';

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-neutral-950 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-5 pt-[calc(1.25rem_+_env(safe-area-inset-top))]">
        <span className="text-xl font-semibold">{SITE_NAME}</span>
        <Link to="/login" className="text-sm text-neutral-300 hover:text-white">Log in</Link>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-16 text-center md:py-20">
        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Meet someone worth talking to.</h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-neutral-300">
          Discover people, make meaningful connections, and meet someone new through live video.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/register" className={primaryBtn}>Create account</Link>
          <Link to="/login" className={`${ghostBtn} border-white/30 hover:bg-white/10`}>Log in</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-20 md:grid-cols-3">
        {[
          ['1. Create your profile', 'Tell us who you are and who you’d like to meet.'],
          ['2. Go Live', 'Get connected by real-time video to another real person who matches your preferences. Swipe up any time to meet someone else.'],
          ['3. Stay in control', `Report or block anyone, mid-call, in one tap. Everyone on ${SITE_NAME} is 18+.`],
        ].map(([t, d]) => (
          <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h2 className="font-semibold">{t}</h2>
            <p className="mt-2 text-sm text-neutral-300">{d}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-white/10 p-6 text-center text-sm text-neutral-400">
        <nav aria-label="Footer" className="mb-3 flex flex-wrap justify-center gap-4">
          <Link to="/terms" className="underline">Terms</Link>
          <Link to="/privacy" className="underline">Privacy</Link>
          <Link to="/guidelines" className="underline">Guidelines</Link>
          <Link to="/safety" className="underline">Safety</Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">Contact</a>
        </nav>
        {SITE_NAME} is for adults 18 and over only.
      </footer>
    </div>
  );
}