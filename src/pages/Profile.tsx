import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { photoUrl } from '../lib/photos';
import { ageFromDob, intentLabel } from '../lib/format';
import { ghostBtn, primaryBtn } from '../ui';

type Me = { display_name: string; bio: string; interests: string[]; relationship_intention: string | null };

export default function Profile() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const [me, setMe] = useState<Me | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [stats, setStats] = useState<{ matches: number; likes_received: number } | null>(null);

  useEffect(() => {
    if (!uid) return;
    supabase.from('profiles').select('display_name,bio,interests,relationship_intention').eq('user_id', uid).maybeSingle()
      .then(({ data }) => setMe(data as Me | null));
    supabase.from('user_private').select('date_of_birth').eq('user_id', uid).maybeSingle()
      .then(({ data }) => { if (data) setAge(ageFromDob(data.date_of_birth)); });
    supabase.from('profile_photos').select('path').eq('user_id', uid).order('position').limit(1)
      .then(({ data }) => setPhoto(data?.[0]?.path ?? null));
    supabase.rpc('my_stats').then(({ data }) => { const r = Array.isArray(data) ? data[0] : data; if (r) setStats(r); });
  }, [uid]);

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
        {photo ? (
          <img src={photoUrl(photo)} alt="Your main photo" className="mx-auto h-28 w-28 rounded-full object-cover" />
        ) : (
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-neutral-200 text-4xl text-neutral-500">
            {(me?.display_name ?? '?').slice(0, 1).toUpperCase()}
          </div>
        )}
        <h1 className="mt-3 text-2xl font-semibold">{me ? `${me.display_name}${age ? `, ${age}` : ''}` : '…'}</h1>
        {me?.bio && <p className="mt-1 text-neutral-600">{me.bio}</p>}
        {intentLabel(me?.relationship_intention ?? null) && <p className="mt-1 text-sm text-neutral-500">Looking for: {intentLabel(me!.relationship_intention)}</p>}
        <div className="mt-4 grid grid-cols-2 divide-x divide-neutral-200 text-center">
          <div><p className="text-xl font-semibold">{stats?.matches ?? '–'}</p><p className="text-xs text-neutral-500">Matches</p></div>
          <div><p className="text-xl font-semibold">{stats?.likes_received ?? '–'}</p><p className="text-xs text-neutral-500">Likes</p></div>
        </div>
        <Link to="/profile/edit" className={`${primaryBtn} mt-4 block`}>Edit profile</Link>
      </div>

      {me && me.interests.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Interests</h2>
          <ul className="flex flex-wrap gap-2">{me.interests.map((i) => <li key={i} className="rounded-full bg-neutral-100 px-3 py-1 text-sm">{i}</li>)}</ul>
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 text-sm text-neutral-500 shadow-sm">
        <p className="font-medium text-neutral-700">Verification</p>
        <p>Profile verification isn’t available yet.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className={ghostBtn} onClick={() => supabase.auth.signOut()}>Log out</button>
        <button className={ghostBtn} onClick={() => supabase.auth.signOut({ scope: 'global' })}>Log out of all devices</button>
      </div>
    </div>
  );
}