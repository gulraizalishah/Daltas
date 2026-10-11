import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { inputCls, primaryBtn } from '../ui';

export default function ResetPassword() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 10) return setErr('Use a password with at least 10 characters.');
    if (pw !== pw2) return setErr('The two passwords don’t match.');
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { console.error(error); return setErr('We couldn’t change your password. The link may have expired. Please request a new one.'); }
    nav('/home', { replace: true });
  }

  if (loading) return <div className="grid min-h-[100dvh] place-items-center text-neutral-500" role="status">Loading…</div>;

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-neutral-50 p-4">
      {session ? (
        <form onSubmit={submit} className="grid w-full max-w-md gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Choose a new password</h1>
          <input className={inputCls} type="password" autoComplete="new-password" placeholder="New password (10+ characters)" aria-label="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <input className={inputCls} type="password" autoComplete="new-password" placeholder="Repeat new password" aria-label="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <button className={primaryBtn} disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
        </form>
      ) : (
        <div className="grid w-full max-w-md gap-3 rounded-2xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-semibold">This link isn’t valid</h1>
          <p className="text-neutral-600">It may have expired or already been used.</p>
          <Link to="/login" className={primaryBtn}>Request a new link</Link>
        </div>
      )}
    </div>
  );
}