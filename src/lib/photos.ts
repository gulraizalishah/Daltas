import { supabase } from '../supabase';

export const photoUrl = (path: string) =>
  supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;

export async function resizeImage(file: File, max = 1280, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  if (Math.min(bmp.width, bmp.height) < 200) { bmp.close(); throw new Error('too_small'); }
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('encode_failed'))), 'image/jpeg', quality));
}