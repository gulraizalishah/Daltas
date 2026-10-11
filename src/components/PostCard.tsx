import { useState } from 'react';
import type { FormEvent } from 'react';
import { Heart, MessageCircle, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';
import type { CommentRow, PostRow } from '../types';
import { photoUrl } from '../lib/photos';
import { timeAgo } from '../lib/format';
import Avatar from './Avatar';

type Props = { post: PostRow; mine?: boolean; onDeleted?: (id: string) => void };

export default function PostCard({ post, mine = false, onDeleted }: Props) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likes, setLikes] = useState(post.like_count);
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [count, setCount] = useState(post.comment_count);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  async function toggleLike() {
    const prev = { liked, likes };
    setLiked(!liked);
    setLikes(likes + (liked ? -1 : 1));
    const { data, error } = await supabase.rpc('toggle_post_like', { p_post: post.id });
    if (error) { console.error(error); setLiked(prev.liked); setLikes(prev.likes); return; }
    const r = Array.isArray(data) ? data[0] : data;
    if (r) { setLiked(r.liked); setLikes(r.like_count); }
  }

  async function loadComments() {
    const { data, error } = await supabase.rpc('post_comments', { p_post: post.id });
    if (error) { console.error(error); setErr('We couldn’t load comments.'); setComments([]); return; }
    setComments((data ?? []) as CommentRow[]);
  }

  function toggleComments() {
    const next = !open;
    setOpen(next);
    if (next && !comments) void loadComments();
  }

  async function addComment(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true); setErr(null);
    const { error } = await supabase.rpc('add_comment', { p_post: post.id, p_content: content });
    setBusy(false);
    if (error) {
      console.error(error);
      return setErr(error.message.includes('rate_limited') ? 'You’re commenting too quickly. Please wait a moment.' : 'We couldn’t post your comment.');
    }
    setText('');
    setCount((c) => c + 1);
    await loadComments();
  }

  async function removeComment(id: string) {
    const { error } = await supabase.rpc('delete_comment', { p_comment: id });
    if (error) { console.error(error); return setErr('We couldn’t delete that comment.'); }
    setComments((l) => (l ?? []).filter((c) => c.id !== id));
    setCount((c) => Math.max(0, c - 1));
  }

  async function deletePost() {
    const { data, error } = await supabase.rpc('delete_post', { p_post: post.id });
    if (error) { console.error(error); setErr('We couldn’t delete this post.'); return; }
    if (data) await supabase.storage.from('photos').remove([data as string]);
    onDeleted?.(post.id);
  }

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm">
      {post.image_path && <img src={photoUrl(post.image_path)} alt="" loading="lazy" className="max-h-[28rem] w-full object-cover" />}
      <div className="grid gap-2 p-3">
        {post.caption && <p className="whitespace-pre-wrap break-words">{post.caption}</p>}

        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <button onClick={() => void toggleLike()} aria-pressed={liked} aria-label={liked ? 'Unlike post' : 'Like post'} className="flex items-center gap-1">
            <Heart size={20} className={liked ? 'fill-rose-500 text-rose-500' : ''} /> {likes}
          </button>
          <button onClick={toggleComments} aria-expanded={open} aria-label="Comments" className="flex items-center gap-1">
            <MessageCircle size={20} /> {count}
          </button>
          <span className="ml-auto text-xs text-neutral-400">{timeAgo(post.created_at)}</span>
          {mine && (
            <button onClick={() => setConfirmDel(true)} aria-label="Delete post" className="text-neutral-400 hover:text-red-600"><Trash2 size={18} /></button>
          )}
        </div>

        {confirmDel && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-red-50 p-3 text-sm">
            <span>Delete this post?</span>
            <span className="flex gap-3">
              <button className="text-neutral-600" onClick={() => setConfirmDel(false)}>Cancel</button>
              <button className="font-semibold text-red-600" onClick={() => void deletePost()}>Delete</button>
            </span>
          </div>
        )}

        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}

        {open && (
          <div className="grid gap-2 border-t border-neutral-100 pt-2">
            {!comments && <p className="text-sm text-neutral-500" role="status">Loading comments…</p>}
            {comments?.length === 0 && <p className="text-sm text-neutral-500">No comments yet.</p>}
            {comments?.map((c) => (
              <div key={c.id} className="flex items-start gap-2">
                <Avatar path={c.photo} name={c.display_name} size={28} />
                <div className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold">{c.display_name}</span>{' '}
                  <span className="break-words">{c.content}</span>
                </div>
                {(c.mine || mine) && (
                  <button onClick={() => void removeComment(c.id)} aria-label="Delete comment" className="text-neutral-400 hover:text-red-600"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
            <form onSubmit={addComment} className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} aria-label="Add a comment" placeholder="Add a comment…"
                className="min-w-0 flex-1 rounded-full border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" />
              <button disabled={!text.trim() || busy} className="rounded-full bg-rose-500 px-4 text-sm font-medium text-white disabled:opacity-40">Post</button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}