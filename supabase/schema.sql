-- ============ TABLES ============
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 500),
  gender text not null check (gender in ('woman','man','non_binary','other')),
  pronouns text,
  location_label text,
  show_location boolean not null default false,
  relationship_intention text,
  occupation text,
  education text,
  languages text[] not null default '{}',
  height_cm int,
  verified_at timestamptz,        -- verification is NOT implemented; stays null
  account_status text not null default 'active'
    check (account_status in ('active','suspended','banned','deactivated')),
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

-- Date of birth is private: only the owner (and server functions) can read it
create table public.user_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date_of_birth date not null
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_min int not null default 18 check (age_min >= 18),
  age_max int not null default 99 check (age_max >= age_min),
  interested_in text[] not null
    check (cardinality(interested_in) >= 1
           and interested_in <@ array['woman','man','non_binary','other','everyone']),
  show_in_recommendations boolean not null default true
);

create table public.blocks (
  blocker_id uuid references auth.users(id) on delete cascade,
  blocked_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index on public.blocks (blocked_id);

create table public.live_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting','matched','left')),
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,  -- user_a = WebRTC initiator
  user_b uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active'
);
create index on public.live_sessions (user_a) where ended_at is null;
create index on public.live_sessions (user_b) where ended_at is null;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  live_session_id uuid references public.live_sessions(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- ============ SIGN-UP TRIGGER (server-side 18+ enforcement) ============
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare dob date;
begin
  begin dob := (new.raw_user_meta_data->>'date_of_birth')::date;
  exception when others then raise exception 'invalid_date_of_birth'; end;
  if dob is null or dob > current_date - interval '18 years' then raise exception 'must_be_18'; end if;
  if coalesce(new.raw_user_meta_data->>'confirm18','') <> 'true' then raise exception 'confirm_18_required'; end if;

  insert into user_private (user_id, date_of_birth) values (new.id, dob);
  insert into profiles (user_id, display_name, gender)
    values (new.id,
            left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), 'New user'), 40),
            coalesce(new.raw_user_meta_data->>'gender', 'other'));
  insert into user_preferences (user_id, interested_in)
    values (new.id, array(select jsonb_array_elements_text(
              coalesce(new.raw_user_meta_data->'interested_in', '["everyone"]'::jsonb))));
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ ROW LEVEL SECURITY ============
alter table public.profiles         enable row level security;
alter table public.user_private     enable row level security;
alter table public.user_preferences enable row level security;
alter table public.blocks           enable row level security;
alter table public.live_queue       enable row level security;   -- no policies: no direct access
alter table public.live_sessions    enable row level security;
alter table public.reports          enable row level security;   -- no policies: admin-only later

create policy "read own profile"  on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "update own profile" on public.profiles for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read own dob"      on public.user_private for select to authenticated using (auth.uid() = user_id);
create policy "read own prefs"    on public.user_preferences for select to authenticated using (auth.uid() = user_id);
create policy "update own prefs"  on public.user_preferences for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read own blocks"   on public.blocks for select to authenticated using (auth.uid() = blocker_id);
create policy "members read own sessions" on public.live_sessions for select to authenticated
  using (auth.uid() in (user_a, user_b));

-- Users may edit only harmless profile fields (never role / account_status / verified_at)
revoke update on public.profiles from authenticated, anon;
grant update (display_name, bio, pronouns, location_label, show_location, relationship_intention,
              occupation, education, languages, height_cm) on public.profiles to authenticated;

-- ============ LIVE FUNCTIONS ============
create or replace function public.join_live(p_fresh boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  my_age int; my_gender text; my_min int; my_max int; my_into text[];
  partner uuid; sid uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('join_live'));   -- serializes matching: no double pairing

  if p_fresh then
    update live_sessions set ended_at = now(), status = 'abandoned'
     where ended_at is null and me in (user_a, user_b);
  else
    select id into sid from live_sessions
     where ended_at is null and me in (user_a, user_b) order by started_at desc limit 1;
    if sid is not null then return sid; end if;           -- someone matched us since the last poll
  end if;

  select date_part('year', age(dp.date_of_birth))::int, p.gender, f.age_min, f.age_max, f.interested_in
    into my_age, my_gender, my_min, my_max, my_into
    from profiles p
    join user_preferences f on f.user_id = p.user_id
    join user_private dp on dp.user_id = p.user_id
   where p.user_id = me and p.account_status = 'active';
  if my_gender is null then raise exception 'profile_unavailable'; end if;

  insert into live_queue (user_id, status, joined_at, last_seen) values (me, 'waiting', now(), now())
  on conflict (user_id) do update
    set last_seen = now(),
        joined_at = case when live_queue.status = 'waiting' then live_queue.joined_at else now() end,
        status = 'waiting';

  select q.user_id into partner
    from live_queue q
    join profiles pp on pp.user_id = q.user_id and pp.account_status = 'active'
    join user_preferences pf on pf.user_id = q.user_id
    join user_private pd on pd.user_id = q.user_id
   where q.status = 'waiting' and q.user_id <> me
     and q.last_seen > now() - interval '10 seconds'
     and my_into && array[pp.gender, 'everyone']
     and date_part('year', age(pd.date_of_birth)) between my_min and my_max
     and pf.interested_in && array[my_gender, 'everyone']
     and my_age between pf.age_min and pf.age_max
     and not exists (select 1 from blocks b
                      where (b.blocker_id = me and b.blocked_id = q.user_id)
                         or (b.blocker_id = q.user_id and b.blocked_id = me))
     and not exists (select 1 from live_sessions s                 -- no instant rematch
                      where s.started_at > now() - interval '5 minutes'
                        and ((s.user_a = me and s.user_b = q.user_id)
                          or (s.user_a = q.user_id and s.user_b = me)))
     and not exists (select 1 from live_sessions s2
                      where s2.ended_at is null and q.user_id in (s2.user_a, s2.user_b))
   order by q.joined_at
   limit 1;

  if partner is null then return null; end if;
  insert into live_sessions (user_a, user_b) values (me, partner) returning id into sid;
  update live_queue set status = 'matched' where user_id in (me, partner);
  return sid;
end $$;

create or replace function public.leave_live(p_session uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_session is not null then
    update live_sessions set ended_at = now(), status = 'ended'
     where id = p_session and ended_at is null and auth.uid() in (user_a, user_b);
  end if;
  update live_queue set status = 'left' where user_id = auth.uid();
end $$;

create or replace function public.live_peer(p_session uuid)
returns table (display_name text, age int, initiator boolean)
language sql security definer set search_path = public stable as $$
  select p.display_name, date_part('year', age(d.date_of_birth))::int, (s.user_a = auth.uid())
    from live_sessions s
    join profiles p on p.user_id = case when s.user_a = auth.uid() then s.user_b else s.user_a end
    join user_private d on d.user_id = p.user_id
   where s.id = p_session and s.ended_at is null and auth.uid() in (s.user_a, s.user_b);
$$;

create or replace function public.live_block(p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare peer uuid;
begin
  select case when user_a = auth.uid() then user_b else user_a end into peer
    from live_sessions where id = p_session and auth.uid() in (user_a, user_b);
  if peer is null then return; end if;
  insert into blocks (blocker_id, blocked_id) values (auth.uid(), peer) on conflict do nothing;
  update live_sessions set ended_at = coalesce(ended_at, now()), status = 'blocked' where id = p_session;
end $$;

create or replace function public.live_report(p_session uuid, p_reason text, p_details text default '')
returns void language plpgsql security definer set search_path = public as $$
declare peer uuid;
begin
  if p_reason not in ('harassment','nudity_sexual','hate_speech','threats','spam','fake_profile','underage','other')
    then raise exception 'invalid_reason'; end if;
  select case when user_a = auth.uid() then user_b else user_a end into peer
    from live_sessions where id = p_session and auth.uid() in (user_a, user_b);
  if peer is null then raise exception 'not_in_session'; end if;
  insert into reports (reporter_id, reported_id, live_session_id, reason, details)
  values (auth.uid(), peer, p_session, p_reason, left(coalesce(p_details, ''), 1000));
end $$;

revoke all on function public.join_live(boolean), public.leave_live(uuid), public.live_peer(uuid),
  public.live_block(uuid), public.live_report(uuid, text, text) from public, anon;
grant execute on function public.join_live(boolean), public.leave_live(uuid), public.live_peer(uuid),
  public.live_block(uuid), public.live_report(uuid, text, text) to authenticated;

-- ============ REALTIME: only the two people in a live session can use its channel ============
create policy "live members receive" on realtime.messages for select to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and exists (select 1 from public.live_sessions s
               where 'live:' || s.id::text = (select realtime.topic())
                 and s.ended_at is null and auth.uid() in (s.user_a, s.user_b))
);
create policy "live members send" on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension in ('broadcast', 'presence')
  and exists (select 1 from public.live_sessions s
               where 'live:' || s.id::text = (select realtime.topic())
                 and s.ended_at is null and auth.uid() in (s.user_a, s.user_b))
);