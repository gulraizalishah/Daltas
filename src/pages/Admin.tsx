import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../supabase';
import type { AdminPost, AdminReport, AdminStats, AdminUser } from '../types';
import Avatar from '../components/Avatar';
import { photoUrl } from '../lib/photos';
import { timeAgo } from '../lib/format';
import { inputCls } from '../ui';

type Tab = 'reports' | 'users' | 'posts' | 'overview';
const REASON: Record<string, string> = {
  harassment: 'Harassment', nudity_sexual: 'Nudity / sexual content', hate_speech: 'Hate speech', threats: 'Threats',
  spam: 'Spam', fake_profile: 'Fake profile', underage: 'Underage user', other: 'Other',
};

async function setStatus(target: string, status: 'active' | 'suspended' | 'banned') {
  const note = window.prompt(`Optional note for the audit log (${status}):`, '');
  if (note === null) return false;
  const { error } = await supabase.rpc('admin_set_status', { p_target: target, p_status: status, p_note: note });
  if (error) { console.error(error); window.alert('That action failed.'); return false; }
  return true;
}

export default function Admin() {
  const [tab, setTab] = useState<Tab>('reports');
  const tabs: [Tab, string][] = [['reports', 'Reports'], ['users', 'Users'], ['posts', 'Posts'], ['overview', 'Overview']];
  return (
    <div className="grid gap-4 pb-6">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div role="tablist" className="flex gap-1 rounded-full bg-neutral-200 p-1">
        {tabs.map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`flex-1 rounded-full py-1.5 text-sm font-medium ${tab === k ? 'bg-white shadow-sm' : 'text-neutral-600'}`}>{l}</button>
        ))}
      </div>
      {tab === 'reports' && <Reports />}
      {tab === 'users' && <Users />}
      {tab === 'posts' && <PostsTab />}
      {tab === 'overview' && <Overview />}
    </div>
  );
}

function Overview() {
  const [s, setS] = useState<AdminStats | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    supabase.rpc('admin_stats').then(({ data, error }) => {
      if (error) { console.error(error); return setErr(true); }
      setS((Array.isArray(data) ? data[0] : data) as AdminStats);
    });
  }, []);
  if (err) return <p role="alert" className="text-red-700">Couldn’t load statistics.</p>;
  if (!s) return <p className="text-neutral-500" role="status">Loading…</p>;
  const items: [string, number][] = [
    ['Users', s.users_total], ['New (7 days)', s.new_users_7d], ['Active (24h)', s.active_24h],
    ['Suspended', s.suspended_total], ['Banned', s.banned_total], ['Matches', s.matches_total],
    ['Messages (24h)', s.messages_24h], ['Live calls (24h)', s.live_sessions_24h], ['Open reports', s.open_reports], ['Posts', s.posts_total],
  ];
  return (
    <ul className="grid grid-cols-2 gap-3">
      {items.map(([l, n]) => (
        <li key={l} className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-2xl font-semibold">{n}</p><p className="text-sm text-neutral-500">{l}</p></li>
      ))}
    </ul>
  );
}

function Reports() {
  const [status, setStatus_] = useState('open');
  const [rows, setRows] = useState<AdminReport[] | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_reports', { p_status: status, p_limit: 50, p_offset: 0 });
    if (error) { console.error(error); setErr(true); return; }
    setErr(false);
    setRows((data ?? []) as AdminReport[]);
  }, [status]);

  useEffect(() => { setRows(null); void load(); }, [load]);

  async function resolve(r: AdminReport, res: 'reviewed' | 'dismissed') {
    const { error } = await supabase.rpc('admin_resolve_report', { p_report: r.id, p_status: res, p_note: '' });
    if (error) { console.error(error); return window.alert('That action failed.'); }
    void load();
  }
  async function enforce(r: AdminReport, s: 'suspended' | 'banned') {
    if (!window.confirm(`${s === 'banned' ? 'Ban' : 'Suspend'} ${r.reported_name}?`)) return;
    if (!(await setStatus(r.reported_id, s))) return;
    await supabase.rpc('admin_resolve_report', { p_report: r.id, p_status: 'actioned', p_note: s });
    void load();
  }

  return (
    <div className="grid gap-3">
      <select className={inputCls} value={status} onChange={(e) => setStatus_(e.target.value)} aria-label="Report status">
        <option value="open">Open</option><option value="reviewed">Reviewed</option>
        <option value="actioned">Actioned</option><option value="dismissed">Dismissed</option>
      </select>
      {err && <p role="alert" className="text-red-700">Couldn’t load reports.</p>}
      {!rows && !err && <p className="text-neutral-500" role="status">Loading…</p>}
      {rows?.length === 0 && <p className="rounded-2xl bg-white p-4 text-center text-neutral-500">Nothing here.</p>}
      {rows?.map((r) => (
        <article key={r.id} className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">{REASON[r.reason] ?? r.reason}</span>
            {r.is_live && <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-white">Live</span>}
            <span className="ml-auto text-neutral-400">{timeAgo(r.created_at)}</span>
          </div>
          <div className="flex items-center gap-3">
            <Avatar path={r.reported_photo} name={r.reported_name} size={44} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{r.reported_name} <span className="text-sm font-normal text-neutral-500">({r.reported_status})</span></p>
              <p className="text-xs text-neutral-500">{r.reported_total_reports} report(s) in total · reported by {r.reporter_name}</p>
            </div>
          </div>
          {r.reported_bio && <p className="text-sm text-neutral-600">“{r.reported_bio}”</p>}
          {r.details && <p className="rounded-xl bg-neutral-100 p-2 text-sm">{r.details}</p>}
          {r.status === 'open' && (
            <div className="flex flex-wrap gap-2 text-sm">
              <button className="rounded-full border px-3 py-1.5" onClick={() => void resolve(r, 'dismissed')}>Dismiss</button>
              <button className="rounded-full border px-3 py-1.5" onClick={() => void resolve(r, 'reviewed')}>Mark reviewed</button>
              <button className="rounded-full bg-amber-500 px-3 py-1.5 text-white" onClick={() => void enforce(r, 'suspended')}>Suspend</button>
              <button className="rounded-full bg-red-600 px-3 py-1.5 text-white" onClick={() => void enforce(r, 'banned')}>Ban</button>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function Users() {
  const [q, setQ] = useState('');
  const [status, setStatusFilter] = useState('');
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_users', { p_search: q, p_status: status || null, p_limit: 50, p_offset: 0 });
    if (error) { console.error(error); setErr(true); return; }
    setErr(false);
    setRows((data ?? []) as AdminUser[]);
  }, [q, status]);

  useEffect(() => { void load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function change(u: AdminUser, s: 'active' | 'suspended' | 'banned') {
    if (!window.confirm(`Set ${u.display_name} to “${s}”?`)) return;
    if (await setStatus(u.user_id, s)) void load();
  }

  function search(e: FormEvent) { e.preventDefault(); setRows(null); void load(); }

  return (
    <div className="grid gap-3">
      <form onSubmit={search} className="flex gap-2">
        <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search users" />
        <button className="rounded-full bg-neutral-900 px-4 text-white">Search</button>
      </form>
      <select className={inputCls} value={status} onChange={(e) => { setRows(null); setStatusFilter(e.target.value); }} aria-label="Status filter">
        <option value="">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option>
        <option value="banned">Banned</option><option value="deactivated">Deactivated</option>
      </select>
      {err && <p role="alert" className="text-red-700">Couldn’t load users.</p>}
      {!rows && !err && <p className="text-neutral-500" role="status">Loading…</p>}
      {rows?.map((u) => (
        <article key={u.user_id} className="grid gap-2 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar path={u.photo} name={u.display_name} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{u.display_name}, {u.age} <span className="text-sm font-normal text-neutral-500">({u.status}{u.role === 'admin' ? ', admin' : ''})</span></p>
              <p className="truncate text-xs text-neutral-500">{u.email}</p>
              <p className="text-xs text-neutral-500">{u.report_count} report(s) · joined {timeAgo(u.created_at)}{u.last_active_at ? ` · active ${timeAgo(u.last_active_at)}` : ''}</p>
            </div>
          </div>
          {u.role !== 'admin' && (
            <div className="flex flex-wrap gap-2 text-sm">
              {u.status !== 'active' && <button className="rounded-full border px-3 py-1.5" onClick={() => void change(u, 'active')}>Restore</button>}
              {u.status !== 'suspended' && <button className="rounded-full bg-amber-500 px-3 py-1.5 text-white" onClick={() => void change(u, 'suspended')}>Suspend</button>}
              {u.status !== 'banned' && <button className="rounded-full bg-red-600 px-3 py-1.5 text-white" onClick={() => void change(u, 'banned')}>Ban</button>}
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

function PostsTab() {
  const [rows, setRows] = useState<AdminPost[] | null>(null);
  const [err, setErr] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_posts', { p_limit: 50 });
    if (error) { console.error(error); setErr(true); return; }
    setRows((data ?? []) as AdminPost[]);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function remove(p: AdminPost) {
    if (!window.confirm('Remove this post?')) return;
    const { error } = await supabase.rpc('admin_remove_post', { p_post: p.id, p_note: '' });
    if (error) { console.error(error); return window.alert('That action failed.'); }
    void load();
  }

  if (err) return <p role="alert" className="text-red-700">Couldn’t load posts.</p>;
  if (!rows) return <p className="text-neutral-500" role="status">Loading…</p>;
  if (rows.length === 0) return <p className="rounded-2xl bg-white p-4 text-center text-neutral-500">No posts.</p>;
  return (
    <div className="grid gap-3">
      {rows.map((p) => (
        <article key={p.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {p.image_path && <img src={photoUrl(p.image_path)} alt="" loading="lazy" className="max-h-72 w-full object-cover" />}
          <div className="grid gap-2 p-3">
            <p className="text-sm text-neutral-500">{p.author_name} · {timeAgo(p.created_at)}</p>
            {p.caption && <p className="break-words">{p.caption}</p>}
            <button className="justify-self-start rounded-full bg-red-600 px-3 py-1.5 text-sm text-white" onClick={() => void remove(p)}>Remove post</button>
          </div>
        </article>
      ))}
    </div>
  );
}