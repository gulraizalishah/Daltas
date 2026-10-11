import { photoUrl } from '../lib/photos';

export default function Avatar({ path, name, size = 48 }: { path: string | null; name: string; size?: number }) {
  const style = { width: size, height: size };
  return path ? (
    <img src={photoUrl(path)} alt="" style={style} className="shrink-0 rounded-full object-cover" />
  ) : (
    <div style={style} className="grid shrink-0 place-items-center rounded-full bg-neutral-200 text-neutral-500">
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}