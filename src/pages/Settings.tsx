import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { inputCls, ghostBtn, primaryBtn } from '../ui';

type Prefs = {
  show_in_recommendations: boolean; show_online_status: boolean; show_last_active: boolean;
  notify_messages: boolean; notify_matches: boolean; notify_likes: boolean;
};
const COLS = 'show_in_recommendations,show_online_status,show_last_active,notify_messages,notify_matches,notify_likes';

async function wipeStorage(uid: string) {
  const bucket = supabase.storage.from('photos');
  for (const folder of [uid, `${uid}/posts`]) {
    const { data } = await bucket.list(folder, { limit: 1000 });
    const files = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
    if (files.length) await bucket.remove(files);
  }
}

export default function Settings() {
  const { session } = useAuth();
  const nav = useNavigate();
  const uid = session?.user.id;
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!uid) return;
    supabase.from('user_preferences').select(COLS).eq('user_id', uid).single().then(({ data, error }) => {
      if (error) { console.error(error); return setMsg({ ok: false, text: 'We couldn’t load your settings. Please refresh.' }); }
      setPrefs(data as Prefs);
    });
  }, [uid]);

  async function toggle(key: keyof Prefs, value: boolean) {
    if (!prefs || !uid) return;
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    setMsg(null);
    const { error } = await supabase.from('user_preferences').update({ [key]: value }).eq('user_id', uid);
    if (error) { console.error(error); setPrefs(prev); setMsg({ ok: false, text: 'We couldn’t save that setting.' }); }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 10) return setMsg({ ok: false, text: 'Use a password with at least 10 characters.' });
    if (pw !== pw2) return setMsg({ ok: false, text: 'The two passwords don’t match.' });
    setBusy('pw'); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(null);
    if (error) { console.error(error); return setMsg({ ok: false, text: 'We couldn’t change your password. Try logging in again first.' }); }
    setPw(''); setPw2('');
    setMsg({ ok: true, text: 'Password changed.' });
  }

  async function changeEmail(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy('email'); setMsg(null);
    const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: window.location.origin + '/settings' });
    setBusy(null);
    if (error) { console.error(error); return setMsg({ ok: false, text: 'We couldn’t change your email. Please check the address and try again.' }); }
    setEmail('');
    setMsg({ ok: true, text: 'Check your inbox to confirm the change. It may also ask your current address to approve.' });
  }

  async function deactivate() {
    setBusy('deactivate');
    const { error } = await supabase.rpc('deactivate_account');
    if (error) { console.error(error); setBusy(null); return setMsg({ ok: false, text: 'We couldn’t deactivate your account.' }); }
    await supabase.auth.signOut();
  }

  async function deleteAccount() {
    if (!uid || typed !== 'DELETE') return;
    setBusy('delete'); setMsg(null);
    try {
      await wipeStorage(uid);
      const { error } = await supabase.rpc('delete_my_account');
      if (error) throw error;
      await supabase.auth.signOut({ scope: 'local' });
      nav('/', { replace: true });
    } catch (e) {
      console.error(e);
      setBusy(null);
      setMsg({ ok: false, text: 'We couldn’t delete your account. Please try again or contact support.' });
    }
  }

  const rows = (items: [keyof Prefs, string, string][]) =>
    prefs && items.map(([k, label, hint]) => <Toggle key={k} label={label} hint={hint} checked={prefs[k]} onChange={(v) => void toggle(k, v)} />);

  return (
    <div className="grid gap-4 pb-6">
      <div className="flex items-center gap-3">
        <Link to="/profile" aria-label="Back to profile" className="grid h-10 w-10 place-items-center rounded-full hover:bg-neutral-100"><ArrowLeft /></Link>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      {msg && <p role="status" className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      <Card title="Discovery">
        {rows([['show_in_recommendations', 'Show me in recommendations', 'Turn off to stop appearing in other people’s Home feed.']])}
        <Link to="/profile/edit" className="text-sm text-rose-600 underline">Change age range and who you’re interested in</Link>
      </Card>

      <Card title="Privacy">
        {rows([
          ['show_online_status', 'Show when I’m online', 'People you chat with can see an “Online” label.'],
          ['show_last_active', 'Show when I was last active', 'For example “Active 15m ago”.'],
        ])}
        <p className="text-sm text-neutral-500">Only people you’ve matched with can message you.</p>
      </Card>

      <Card title="Notifications">
        {rows([
          ['notify_messages', 'Messages', 'New messages from your matches.'],
          ['notify_matches', 'Matches', 'When you match with someone.'],
          ['notify_likes', 'Likes and post activity', 'Likes on you, and likes or comments on your posts.'],
        ])}
        <p className="text-sm text-neutral-500">Notifications appear in the app while it’s open. Push notifications aren’t available yet.</p>
      </Card>

      <Card title="Security">
        <form onSubmit={changePassword} className="grid gap-2">
          <h3 className="text-sm font-medium">Change password</h3>
          <input className={inputCls} type="password" autoComplete="new-password" placeholder="New password (10+ characters)" aria-label="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <input className={inputCls} type="password" autoComplete="new-password" placeholder="Repeat new password" aria-label="Repeat new password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          <button className={ghostBtn} disabled={busy === 'pw'}>{busy === 'pw' ? 'Saving…' : 'Change password'}</button>
        </form>
        <form onSubmit={changeEmail} className="grid gap-2">
          <h3 className="text-sm font-medium">Change email</h3>
          <p className="text-sm text-neutral-500">Current: {session?.user.email}</p>
          <input className={inputCls} type="email" autoComplete="email" placeholder="New email address" aria-label="New email address" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className={ghostBtn} disabled={busy === 'email'}>{busy === 'email' ? 'Saving…' : 'Change email'}</button>
        </form>
        <div className="grid gap-2">
          <h3 className="text-sm font-medium">Devices</h3>
          <p className="text-sm text-neutral-500">Signs you out everywhere you’re logged in, including this device.</p>
          <button className={ghostBtn} onClick={() => supabase.auth.signOut({ scope: 'global' })}>Log out of all devices</button>
        </div>
      </Card>

      <Card title="Safety and legal">
        <ul className="grid gap-1 text-sm text-rose-600 underline">
          <li><Link to="/safety">Safety guidelines</Link></li>
          <li><Link to="/guidelines">Community guidelines</Link></li>
          <li><Link to="/report-abuse">Report abuse</Link></li>
          <li><Link to="/terms">Terms of Service</Link></li>
          <li><Link to="/privacy">Privacy Policy</Link></li>
        </ul>
      </Card>

      <Card title="Account">
        {!confirmDeactivate ? (
          <button className={ghostBtn} onClick={() => setConfirmDeactivate(true)}>Deactivate account</button>
        ) : (
          <div className="grid gap-2 rounded-xl bg-neutral-100 p-3 text-sm">
            <p>Your profile will be hidden from everyone. Log in again any time to reactivate it.</p>
            <div className="flex gap-2">
              <button className={ghostBtn} onClick={() => setConfirmDeactivate(false)}>Cancel</button>
              <button className={primaryBtn} disabled={busy === 'deactivate'} onClick={() => void deactivate()}>{busy === 'deactivate' ? 'Deactivating…' : 'Deactivate'}</button>
            </div>
          </div>
        )}
        <div className="grid gap-2 rounded-xl border border-red-200 p-3">
          <h3 className="text-sm font-semibold text-red-700">Delete account</h3>
          <p className="text-sm text-neutral-600">Permanently deletes your profile, photos, posts, matches and messages. This can’t be undone. Type DELETE to confirm.</p>
          <input className={inputCls} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type DELETE to confirm" placeholder="DELETE" />
          <button disabled={typed !== 'DELETE' || busy === 'delete'} onClick={() => void deleteAccount()}
            className="rounded-full bg-red-600 px-5 py-2.5 font-medium text-white disabled:opacity-40">
            {busy === 'delete' ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-neutral-500">{hint}</p>
      </div>
      <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${checked ? 'bg-rose-500' : 'bg-neutral-300'}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}