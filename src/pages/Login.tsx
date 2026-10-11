import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { inputCls, primaryBtn } from '../ui';

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'forgot' | 'sent'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      console.error(error);
      return setErr(error.message.toLowerCase().includes('confirm')
        ? 'Please confirm your email first. Check your inbox.'
        : 'Incorrect email or password.');
    }
    nav('/home');
  }

  async function sendReset(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setErr('Enter the email you signed up with.');
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/reset-password' });
    setBusy(false);
    if (error) console.error(error);   // same message either way, so nobody can probe which emails exist
    setMode('sent');
  }

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-neutral-50 p-4">
      {mode === 'login' && (
        <form onSubmit={submit} className="grid w-full max-w-md gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <label className="grid gap-1 text-sm font-medium text-neutral-700">Email
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-neutral-700">Password
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <button className={primaryBtn} disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
          <button type="button" className="text-sm text-rose-600 underline" onClick={() => { setErr(null); setMode('forgot'); }}>Forgot password?</button>
          <p className="text-center text-sm text-neutral-600">New here? <Link to="/register" className="text-rose-600 underline">Create an account</Link></p>
        </form>
      )}

      {mode === 'forgot' && (
        <form onSubmit={sendReset} className="grid w-full max-w-md gap-4 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Reset your password</h1>
          <p className="text-sm text-neutral-600">Enter your email and we’ll send you a link to choose a new password.</p>
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" aria-label="Email" />
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <button className={primaryBtn} disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <button type="button" className="text-sm text-neutral-600 underline" onClick={() => setMode('login')}>Back to log in</button>
        </form>
      )}

      {mode === 'sent' && (
        <div className="grid w-full max-w-md gap-3 rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Check your email</h1>
          <p className="text-neutral-600">If an account exists for <b>{email}</b>, we’ve sent a link to reset the password.</p>
          <button className="text-left text-sm text-rose-600 underline" onClick={() => setMode('login')}>Back to log in</button>
        </div>
      )}
    </div>
  );
}