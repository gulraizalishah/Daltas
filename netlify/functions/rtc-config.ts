export default async (req: Request) => {
  const auth = req.headers.get('authorization') ?? '';
  const who = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: process.env.SUPABASE_ANON_KEY! },
  });
  if (!who.ok) return Response.json({ error: 'Please log in.' }, { status: 401 });

  const iceServers: unknown[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  const keyId = process.env.CF_TURN_KEY_ID;
  const token = process.env.CF_TURN_API_TOKEN;

  if (keyId && token) {
    const r = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ttl: 3600 }),
      }
    );
    if (r.ok) {
      const j = await r.json();
      const extra = j.iceServers ?? j;
      iceServers.push(...(Array.isArray(extra) ? extra : [extra]));
    } else {
      console.error('TURN credential request failed', r.status);
    }
  }

  return Response.json({ iceServers, turnConfigured: iceServers.length > 1 });
};