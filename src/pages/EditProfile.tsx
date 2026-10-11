import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { photoUrl, resizeImage } from '../lib/photos';
import { INTENTS } from '../lib/format';
import { inputCls, primaryBtn, ghostBtn } from '../ui';

type Photo = { id: string; path: string; position: number };
type Form = {
  display_name: string; bio: string; gender: string; pronouns: string; location_label: string;
  show_location: boolean; relationship_intention: string; occupation: string; education: string;
  languages: string; height_cm: string; interests: string[];
};
type Prefs = { age_min: string; age_max: string; into: string };

const INTEREST_OPTIONS = ['Travel', 'Photography', 'Movies', 'Music', 'Coffee', 'Fitness', 'Hiking', 'Cooking', 'Gaming', 'Reading',
  'Art', 'Dancing', 'Pets', 'Fashion', 'Tech', 'Food', 'Yoga', 'Sports', 'Nature', 'Comedy'];

export default function EditProfile() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<'profile' | 'prefs' | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const [p, f, ph] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', uid).single(),
        supabase.from('user_preferences').select('*').eq('user_id', uid).single(),
        supabase.from('profile_photos').select('id,path,position').eq('user_id', uid).order('position'),
      ]);
      if (p.error || f.error) { console.error(p.error ?? f.error); return setMsg({ ok: false, text: 'We couldn’t load your profile. Please refresh.' }); }
      const d = p.data;
      setForm({
        display_name: d.display_name, bio: d.bio ?? '', gender: d.gender, pronouns: d.pronouns ?? '',
        location_label: d.location_label ?? '', show_location: d.show_location, relationship_intention: d.relationship_intention ?? '',
        occupation: d.occupation ?? '', education: d.education ?? '', languages: (d.languages ?? []).join(', '),
        height_cm: d.height_cm ? String(d.height_cm) : '', interests: d.interests ?? [],
      });
      setPrefs({ age_min: String(f.data.age_min), age_max: String(f.data.age_max), into: f.data.interested_in[0] ?? 'everyone' });
      setPhotos((ph.data ?? []) as Photo[]);
    })();
  }, [uid]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function saveProfile() {
    if (!form || !uid) return;
    if (!form.display_name.trim()) return setMsg({ ok: false, text: 'Please enter a display name.' });
    const height = form.height_cm ? Number(form.height_cm) : null;
    if (height !== null && (isNaN(height) || height < 100 || height > 250)) return setMsg({ ok: false, text: 'Height must be between 100 and 250 cm.' });
    setSaving('profile'); setMsg(null);
    const { error } = await supabase.from('profiles').update({
      display_name: form.display_name.trim(), bio: form.bio.trim(), gender: form.gender,
      pronouns: form.pronouns.trim() || null, location_label: form.location_label.trim() || null,
      show_location: form.show_location, relationship_intention: form.relationship_intention || null,
      occupation: form.occupation.trim() || null, education: form.education.trim() || null,
      languages: form.languages.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 10),
      height_cm: height, interests: form.interests,
    }).eq('user_id', uid);
    setSaving(null);
    if (error) { console.error(error); return setMsg({ ok: false, text: 'We couldn’t save your profile. Please check your details.' }); }
    setMsg({ ok: true, text: 'Profile saved.' });
  }

  async function savePrefs() {
    if (!prefs || !uid) return;
    const min = Number(prefs.age_min), max = Number(prefs.age_max);
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 18 || max > 99 || max < min)
      return setMsg({ ok: false, text: 'Age range must be between 18 and 99, with the minimum below the maximum.' });
    setSaving('prefs'); setMsg(null);
    const { error } = await supabase.from('user_preferences')
      .update({ age_min: min, age_max: max, interested_in: [prefs.into] }).eq('user_id', uid);
    setSaving(null);
    if (error) { console.error(error); return setMsg({ ok: false, text: 'We couldn’t save your preferences.' }); }
    setMsg({ ok: true, text: 'Preferences saved.' });
  }

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uid) return;
    if (photos.length >= 6) return setMsg({ ok: false, text: 'You can have up to 6 photos.' });
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setMsg({ ok: false, text: 'Please choose a JPEG, PNG or WebP image.' });
    if (file.size > 25 * 1024 * 1024) return setMsg({ ok: false, text: 'That image is too large.' });
    setUploading(true); setMsg(null);
    try {
      const blob = await resizeImage(file);
      const path = `${uid}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
      if (up.error) throw up.error;
      const { data, error } = await supabase.from('profile_photos')
        .insert({ user_id: uid, path, position: photos.length }).select('id,path,position').single();
      if (error) { await supabase.storage.from('photos').remove([path]); throw error; }
      setPhotos((p) => [...p, data as Photo]);
    } catch (err) {
      console.error(err);
      setMsg({ ok: false, text: 'We couldn’t upload that photo. Please try a different image.' });
    } finally {
      setUploading(false);
    }
  }

  async function renumber(list: Photo[]) {
    await Promise.all(list.map((p, k) => supabase.from('profile_photos').update({ position: k }).eq('id', p.id)));
  }
  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    setPhotos(next);
    await renumber(next);
  }
  async function remove(ph: Photo) {
    const { error } = await supabase.from('profile_photos').delete().eq('id', ph.id);
    if (error) { console.error(error); return setMsg({ ok: false, text: 'We couldn’t delete that photo.' }); }
    await supabase.storage.from('photos').remove([ph.path]);
    const rest = photos.filter((p) => p.id !== ph.id);
    setPhotos(rest);
    await renumber(rest);
  }

  if (!form || !prefs) return <p className="text-neutral-500" role="status">{msg?.text ?? 'Loading…'}</p>;

  return (
    <div className="grid gap-6 pb-6">
      <div className="flex items-center gap-3">
        <Link to="/profile" aria-label="Back to profile" className="grid h-10 w-10 place-items-center rounded-full hover:bg-neutral-100"><ArrowLeft /></Link>
        <h1 className="text-2xl font-semibold">Edit profile</h1>
      </div>

      {msg && <p role="status" className={`rounded-xl p-3 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

      <Section title="Photos" hint="The first photo is your main photo. Up to 6.">
        <ul className="grid grid-cols-3 gap-2">
          {photos.map((ph, i) => (
            <li key={ph.id} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-neutral-200">
              <img src={photoUrl(ph.path)} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">Main</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-1 text-white">
                <button aria-label="Move earlier" disabled={i === 0} onClick={() => void move(i, -1)} className="grid h-8 w-8 place-items-center disabled:opacity-30"><ChevronLeft size={18} /></button>
                <button aria-label="Delete photo" onClick={() => void remove(ph)} className="grid h-8 w-8 place-items-center"><Trash2 size={16} /></button>
                <button aria-label="Move later" disabled={i === photos.length - 1} onClick={() => void move(i, 1)} className="grid h-8 w-8 place-items-center disabled:opacity-30"><ChevronRight size={18} /></button>
              </div>
            </li>
          ))}
          {photos.length < 6 && (
            <li>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="grid aspect-[3/4] w-full place-items-center rounded-xl border-2 border-dashed border-neutral-300 text-sm text-neutral-500 hover:bg-neutral-50 disabled:opacity-60">
                {uploading ? 'Uploading photo…' : '+ Add photo'}
              </button>
            </li>
          )}
        </ul>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
      </Section>

      <Section title="About you">
        <Field label="Display name"><input className={inputCls} maxLength={40} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} /></Field>
        <Field label="Bio"><textarea className={inputCls} rows={3} maxLength={500} value={form.bio} onChange={(e) => set('bio', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Gender">
            <select className={inputCls} value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              <option value="woman">Woman</option><option value="man">Man</option>
              <option value="non_binary">Non-binary</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Pronouns (optional)"><input className={inputCls} maxLength={30} value={form.pronouns} onChange={(e) => set('pronouns', e.target.value)} /></Field>
        </div>
        <Field label="Looking for">
          <select className={inputCls} value={form.relationship_intention} onChange={(e) => set('relationship_intention', e.target.value)}>
            <option value="">Not specified</option>
            {INTENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Location (city or area)"><input className={inputCls} maxLength={80} value={form.location_label} onChange={(e) => set('location_label', e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.show_location} onChange={(e) => set('show_location', e.target.checked)} />
          Show my location on my profile
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Occupation"><input className={inputCls} maxLength={80} value={form.occupation} onChange={(e) => set('occupation', e.target.value)} /></Field>
          <Field label="Education"><input className={inputCls} maxLength={80} value={form.education} onChange={(e) => set('education', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Languages (comma-separated)"><input className={inputCls} value={form.languages} onChange={(e) => set('languages', e.target.value)} /></Field>
          <Field label="Height in cm (optional)"><input className={inputCls} inputMode="numeric" value={form.height_cm} onChange={(e) => set('height_cm', e.target.value.replace(/\D/g, ''))} /></Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-neutral-700">Interests (up to 20)</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((i) => {
              const on = form.interests.includes(i);
              return (
                <button key={i} type="button" aria-pressed={on}
                  onClick={() => set('interests', on ? form.interests.filter((x) => x !== i) : [...form.interests, i].slice(0, 20))}
                  className={`rounded-full px-3 py-1.5 text-sm ${on ? 'bg-rose-500 text-white' : 'bg-neutral-100 text-neutral-700'}`}>{i}</button>
              );
            })}
          </div>
        </div>
        <button className={primaryBtn} disabled={saving === 'profile'} onClick={() => void saveProfile()}>
          {saving === 'profile' ? 'Saving…' : 'Save profile'}
        </button>
      </Section>

      <Section title="Who I’d like to meet" hint="Used for your feed and for Live matching.">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Min age"><input className={inputCls} inputMode="numeric" value={prefs.age_min} onChange={(e) => setPrefs({ ...prefs, age_min: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Max age"><input className={inputCls} inputMode="numeric" value={prefs.age_max} onChange={(e) => setPrefs({ ...prefs, age_max: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Interested in">
            <select className={inputCls} value={prefs.into} onChange={(e) => setPrefs({ ...prefs, into: e.target.value })}>
              <option value="everyone">Everyone</option><option value="woman">Women</option>
              <option value="man">Men</option><option value="non_binary">Non-binary people</option>
            </select>
          </Field>
        </div>
        <button className={ghostBtn} disabled={saving === 'prefs'} onClick={() => void savePrefs()}>
          {saving === 'prefs' ? 'Saving…' : 'Save preferences'}
        </button>
      </Section>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-2xl bg-white p-4 shadow-sm">
      <div><h2 className="text-lg font-semibold">{title}</h2>{hint && <p className="text-sm text-neutral-500">{hint}</p>}</div>
      {children}
    </section>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm font-medium text-neutral-700">{label}{children}</label>;
}