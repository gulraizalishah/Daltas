import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Send } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';
import { useBadges } from '../useBadges';
import type { ChatPeer, MessageRow } from '../types';
import Avatar from '../components/Avatar';
import MoreSheet from '../components/MoreSheet';
import { activeAgo, shortTime } from '../lib/format';
import { useViewportHeight } from '../lib/viewport';

const PAGE = 40;

export default function Chat() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { session } = useAuth();
  const me = session?.user.id;
  const { refresh } = useBadges();
  const vh = useViewportHeight();

  const [peer, setPeer] = useState<ChatPeer | null>(null);
  const [msgs, setMsgs] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [menu, setMenu] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingChan = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerTypingTimer = useRef<number | undefined>(undefined);
  const myIdleTimer = useRef<number | undefined>(undefined);
  const lastTypingSent = useRef(0);
  const stickBottom = useRef(true);

  const addMessage = useCallback((m: MessageRow) => {
    stickBottom.current = true;
    setMsgs((list) => {
      if (list.some((x) => x.id === m.id)) return list;
      // my own message arriving through realtime replaces its optimistic copy
      const i = list.findIndex((x) => x.pending && x.sender_id === m.sender_id && x.content === m.content);
      if (i >= 0) { const copy = list.slice(); copy[i] = { ...m }; return copy; }
      return [...list, m];
    });
  }, []);

  // initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, m] = await Promise.all([
        supabase.rpc('chat_peer', { p_conversation: id }),
        supabase.rpc('get_messages', { p_conversation: id, p_limit: PAGE }),
      ]);
      if (cancelled) return;
      if (p.error || m.error) {
        console.error(p.error ?? m.error);
        setError('We couldn’t open this conversation.');
        setLoading(false);
        return;
      }
      setPeer((Array.isArray(p.data) ? p.data[0] : p.data) as ChatPeer);
      const rows = ((m.data ?? []) as MessageRow[]).slice().reverse();
      setMsgs(rows);
      setHasMore(rows.length === PAGE);
      setLoading(false);
      await supabase.rpc('mark_read', { p_conversation: id });
      void refresh();
    })();
    return () => { cancelled = true; };
  }, [id, refresh]);

  // live messages + read receipts (database changes)
  useEffect(() => {
    if (!me || !id) return;
    const ch = supabase.channel('msgs-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (e) => {
        const m = e.new as MessageRow;
        addMessage(m);
        if (m.receiver_id === me) {
          setTyping(false);
          void supabase.rpc('mark_read', { p_conversation: id }).then(() => refresh());
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (e) => {
        const m = e.new as MessageRow;
        setMsgs((l) => l.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me, id, addMessage, refresh]);

  // typing indicator (private broadcast channel)
  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel('chat:' + id, { config: { private: true, broadcast: { self: false } } });
    typingChan.current = ch;
    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      window.clearTimeout(peerTypingTimer.current);
      const on = Boolean(payload?.typing);
      setTyping(on);
      if (on) peerTypingTimer.current = window.setTimeout(() => setTyping(false), 4000);
    }).subscribe();
    return () => {
      window.clearTimeout(peerTypingTimer.current);
      window.clearTimeout(myIdleTimer.current);
      supabase.removeChannel(ch);
      typingChan.current = null;
    };
  }, [id]);

  useEffect(() => {
    if (stickBottom.current) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, typing, vh]);

  function sendTyping(on: boolean) {
    const now = Date.now();
    if (on && now - lastTypingSent.current < 2000) return;
    lastTypingSent.current = on ? now : 0;
    void typingChan.current?.send({ type: 'broadcast', event: 'typing', payload: { typing: on } });
  }

  function onType(value: string) {
    setText(value);
    if (!value) return sendTyping(false);
    sendTyping(true);
    window.clearTimeout(myIdleTimer.current);
    myIdleTimer.current = window.setTimeout(() => sendTyping(false), 3000);
  }

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const content = text.trim();
    if (!content || sending || !me) return;
    const tempId = 'tmp-' + crypto.randomUUID();
    setText(''); setError(null); setSending(true);
    window.clearTimeout(myIdleTimer.current);
    sendTyping(false);
    stickBottom.current = true;
    setMsgs((l) => [...l, { id: tempId, sender_id: me, content, created_at: new Date().toISOString(), read_at: null, pending: true }]);

    const { data, error } = await supabase.rpc('send_message', { p_conversation: id, p_content: content });
    setSending(false);
    if (error) {
      console.error(error);
      setMsgs((l) => l.filter((x) => x.id !== tempId));
      setText(content);
      setError(error.message.includes('rate_limited')
        ? 'You’re sending messages too quickly. Please wait a moment.'
        : 'Your message wasn’t sent. Please try again.');
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    setMsgs((l) =>
      l.some((x) => x.id === row.message_id)
        ? l.filter((x) => x.id !== tempId)   // realtime already delivered the real one
        : l.map((x) => (x.id === tempId ? { ...x, id: row.message_id, created_at: row.sent_at, pending: false } : x))
    );
  }

  async function loadEarlier() {
    const oldest = msgs.find((m) => !m.pending);
    if (!oldest) return;
    stickBottom.current = false;
    const { data, error } = await supabase.rpc('get_messages', { p_conversation: id, p_before: oldest.created_at, p_limit: PAGE });
    if (error) { console.error(error); return setError('We couldn’t load earlier messages.'); }
    const rows = ((data ?? []) as MessageRow[]).slice().reverse();
    setMsgs((l) => [...rows, ...l]);
    setHasMore(rows.length === PAGE);
  }

  async function report(reason: string) {
    if (!peer) return;
    const { error } = await supabase.rpc('report_user', { p_target: peer.user_id, p_reason: reason });
    if (error) { console.error(error); setError('We couldn’t send your report. Please try again.'); }
    setMenu(false);
  }
  async function block() {
    if (!peer) return;
    const { error } = await supabase.rpc('block_user', { p_target: peer.user_id });
    if (error) { console.error(error); setError('We couldn’t block this person. Please try again.'); setMenu(false); return; }
    void refresh();
    nav('/messages', { replace: true });
  }
  async function clear() {
    const { error } = await supabase.rpc('clear_conversation', { p_conversation: id });
    if (error) { console.error(error); setError('We couldn’t delete this conversation.'); setMenu(false); return; }
    void refresh();
    nav('/messages', { replace: true });
  }

  // index of my most recent message (for the "Seen" label)
  let lastMine = -1;
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].sender_id === me) { lastMine = i; break; }

  const status = typing ? 'typing…' : peer ? activeAgo(peer.last_active_at, peer.online) : null;

  return (
    <div className="flex flex-col bg-neutral-50 text-neutral-900" style={{ height: vh ? `${vh}px` : '100dvh' }}>
      <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3 pb-2 pt-[calc(0.5rem_+_env(safe-area-inset-top))]">
        <Link to="/messages" aria-label="Back to messages" className="grid h-10 w-10 place-items-center rounded-full hover:bg-neutral-100"><ArrowLeft /></Link>
        {peer && <Avatar path={peer.photo} name={peer.display_name} size={40} />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{peer?.display_name ?? '…'}</p>
          {status && <p className={`truncate text-xs ${typing || peer?.online ? 'text-green-600' : 'text-neutral-500'}`} aria-live="polite">{status}</p>}
        </div>
        <button onClick={() => setMenu(true)} aria-label="Conversation options" className="grid h-10 w-10 place-items-center rounded-full hover:bg-neutral-100"><MoreVertical /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3" onScroll={(e) => {
        const el = e.currentTarget;
        stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}>
        {loading && <p className="text-center text-sm text-neutral-500" role="status">Loading messages…</p>}
        {!loading && hasMore && (
          <button onClick={() => void loadEarlier()} className="mx-auto mb-3 block rounded-full bg-white px-4 py-1.5 text-sm text-neutral-600 shadow-sm">Load earlier messages</button>
        )}
        {!loading && msgs.length === 0 && !error && (
          <p className="py-10 text-center text-sm text-neutral-500">You matched with {peer?.display_name}. Say hello!</p>
        )}

        <ul className="grid gap-1">
          {msgs.map((m, i) => {
            const mine = m.sender_id === me;
            const prev = msgs[i - 1];
            const showTime = !prev || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 10 * 60 * 1000;
            return (
              <li key={m.id}>
                {showTime && <p className="my-2 text-center text-xs text-neutral-400">{shortTime(m.created_at)}</p>}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <p className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 ${mine ? 'rounded-br-md bg-rose-500 text-white' : 'rounded-bl-md bg-white shadow-sm'} ${m.pending ? 'opacity-70' : ''}`}>
                    {m.content}
                  </p>
                </div>
                {i === lastMine && (
                  <p className="mt-0.5 text-right text-[11px] text-neutral-400">{m.pending ? 'Sending…' : m.read_at ? 'Seen' : 'Sent'}</p>
                )}
              </li>
            );
          })}
        </ul>
        {typing && <p className="mt-2 text-xs text-neutral-500" aria-hidden>{peer?.display_name} is typing…</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p role="alert" className="mx-3 mb-1 rounded-xl bg-red-50 p-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={send} className="flex shrink-0 items-center gap-2 border-t border-neutral-200 bg-white p-2 pb-[calc(0.5rem_+_env(safe-area-inset-bottom))]">
        <input
          value={text}
          onChange={(e) => onType(e.target.value)}
          maxLength={2000}
          enterKeyHint="send"
          autoComplete="off"
          aria-label="Message"
          placeholder="Write a message…"
          className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-neutral-50 px-4 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        />
        <button type="submit" disabled={!text.trim() || sending} aria-label="Send message"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-500 text-white disabled:opacity-40">
          <Send size={20} />
        </button>
      </form>

      {menu && peer && <MoreSheet name={peer.display_name} onClose={() => setMenu(false)} onReport={report} onBlock={block} onClear={clear} />}
    </div>
  );
}