import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { resizeImage } from '../lib/photos';
import { inputCls, primaryBtn } from '../ui';

export default function NewPostSheet({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const { session } = useAuth();
  const uid = session?.user.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return setErr('Please choose a JPEG, PNG or WebP image.');
    if (f.size > 25 * 1024 * 1024) return setErr('That image is too large.');
    setErr(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit() {
    if (!uid) return;
    if (!file && !caption.trim()) return setErr('Add a photo or write something.');
    setBusy(true); setErr(null);
    let path: string | null = null;
    try {
      if (file) {
        const blob = await resizeImage(file);
        path = `${uid}/posts/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
        if (up.error) throw up.error;
      }
      const { error } = await supabase.rpc('create_post', { p_caption: caption.trim(), p_image_path: path });
      if (error) { if (path) await supabase.storage.from('photos').remove([path]); throw error; }
      onPosted();
      onClose();
    } catch (e: any) {
      console.error(e);
      setErr(String(e?.message ?? '').includes('rate_limited')
        ? 'You’re posting too quickly. Please try again later.'
        : 'We couldn’t publish your post. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="New post" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 md:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">New post</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100"><X /></button>
        </div>
        {preview ? (
          <img src={preview} alt="Selected photo" className="mb-3 max-h-64 w-full rounded-xl object-cover" />
        ) : (
          <button onClick={() => fileRef.current?.click()} className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-8 text-neutral-500 hover:bg-neutral-50">
            <ImagePlus /> Add a photo (optional)
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
        <textarea className={inputCls} rows={3} maxLength={500} value={caption} onChange={(e) => setCaption(e.target.value)} aria-label="Caption" placeholder="Write a caption…" />
        {err && <p role="alert" className="mt-2 text-sm text-red-600">{err}</p>}
        <button className={`${primaryBtn} mt-3 w-full`} disabled={busy} onClick={() => void submit()}>{busy ? 'Posting…' : 'Post'}</button>
      </div>
    </div>
  );
}