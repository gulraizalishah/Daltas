export function ageFromDob(dob: string) {
  const d = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) a--;
  return a;
}

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m > 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

export const INTENTS: [string, string][] = [
  ['relationship', 'Relationship'], ['dating', 'Dating'], ['friendship', 'Friendship'],
  ['casual', 'Something casual'], ['not_sure', 'Not sure yet'],
];
export const intentLabel = (v: string | null) => INTENTS.find(([k]) => k === v)?.[1] ?? null;