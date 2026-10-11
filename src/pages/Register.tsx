import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { inputCls, primaryBtn } from '../ui';

function ageOf(dob: string) {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return -1;
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
  return a;
}

type Key = 'email' | 'password' | 'dob' | 'name' | 'gender' | 'into';

export default function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '', dob: '', name: '', gender: 'woman', into: 'everyone' });
  const [confirm18, setConfirm18] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const on = (k: Key) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!confirm18) return setErr('Please confirm that you are 18 years of age or older.');
    if (ageOf(f.dob) < 18) return setErr('You must be 18 or older to use this app.');
    if (f.password.length < 10) return setErr('Use a password with at least 10 characters.');
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: {
        emailRedirectTo: window.location.origin + '/home',
        data: { date_of_birth: f.dob, confirm18: true, display_name: f.name.trim(), gender: f.gender, interested_in: [f.into] },
      },
    });
    setBusy(false);
    if (error) {
      console.error(error);
      return setErr(
        error.message.toLowerCase().includes('database error')
          ? 'We couldn’t create your account. Check that every field is filled in and that you are 18 or older.'
          : 'We couldn’t create your account. Please check your details and try again.'
      );
    }
    if (data.session) nav('/home');
    else setSent(true);
  }

  if (sent) {
    return (
      <Card title="Check your email">
        <p className="text-neutral-600">We sent a confirmation link to <b>{f.email}</b>. Open it to finish creating your account.</p>
        <Link to="/login" className="mt-4 inline-block text-rose-600 underline">Go to log in</Link>
      </Card>
    );
  }

  return (
    <Card title="Create your account">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Display name"><input className={inputCls} value={f.name} onChange={on('name')} required maxLength={40} autoComplete="given-name" /></Field>
        <Field label="Email"><input className={inputCls} type="email" value={f.email} onChange={on('email')} required autoComplete="email" /></Field>
        <Field label="Password (10+ characters)"><input className={inputCls} type="password" value={f.password} onChange={on('password')} required minLength={10} autoComplete="new-password" /></Field>
        <Field label="Date of birth"><input className={inputCls} type="date" value={f.dob} onChange={on('dob')} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="I am">
            <select className={inputCls} value={f.gender} onChange={on('gender')}>
              <option value="woman">Woman</option><option value="man">Man</option>
              <option value="non_binary">Non-binary</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Interested in">
            <select className={inputCls} value={f.into} onChange={on('into')}>
              <option value="everyone">Everyone</option><option value="woman">Women</option>
              <option value="man">Men</option><option value="non_binary">Non-binary people</option>
            </select>
          </Field>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={confirm18} onChange={(e) => setConfirm18(e.target.checked)} className="mt-1" />
          <span>
            I confirm that I am 18 years of age or older, and I agree to the{' '}
            <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </span>
        </label>
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <button className={primaryBtn} disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="text-center text-sm text-neutral-600">Already have an account? <Link to="/login" className="text-rose-600 underline">Log in</Link></p>
      </form>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-neutral-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm font-medium text-neutral-700">{label}{children}</label>;
}