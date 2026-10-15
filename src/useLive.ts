import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type LiveState =
  | 'idle' | 'requesting_media' | 'searching' | 'empty' | 'connecting' | 'connected'
  | 'lost' | 'denied' | 'no_device' | 'unsupported' | 'error';
export type Peer = { displayName: string; age: number };
type PeerInfo = { display_name: string; age: number; initiator: boolean };

export function useLive() {
  const [state, setState] = useState<LiveState>('idle');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [reported, setReported] = useState(false);

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const chanRef = useRef<RealtimeChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<string | null>(null);
  const iceRef = useRef<RTCIceServer[]>([]);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const offered = useRef(false);
  const timers = useRef<{ poll?: number; empty?: number; ready?: number; connect?: number }>({});
  const myKey = useRef(crypto.randomUUID());

  // Attach the local stream whenever the <video> mounts.
  useEffect(() => {
    if (localVideo.current && streamRef.current) localVideo.current.srcObject = streamRef.current;
  }, [state]);

  // Mute or unmute the other person's audio (handy when testing two phones side by side).
  useEffect(() => {
    if (remoteVideo.current) remoteVideo.current.muted = !speakerOn;
  }, [state, speakerOn]);

  const clearTimers = useCallback(() => {
    Object.values(timers.current).forEach((t) => { window.clearInterval(t); window.clearTimeout(t); });
    timers.current = {};
  }, []);

  const send = useCallback(
    (event: string, payload: unknown = {}) => chanRef.current?.send({ type: 'broadcast', event, payload }),
    []
  );

  const closePeer = useCallback(() => {
    clearTimers();
    const pc = pcRef.current;
    if (pc) {
      pc.ontrack = null; pc.onicecandidate = null; pc.onconnectionstatechange = null;
      pc.close();
      pcRef.current = null;
    }
    if (chanRef.current) { supabase.removeChannel(chanRef.current); chanRef.current = null; }
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    pendingIce.current = []; offered.current = false; sessionRef.current = null;
    setPeer(null); setReported(false);
  }, [clearTimers]);

  /** Tell the other person and the database that this session is over. */
  const endRemote = useCallback(async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    await send('bye');
    await supabase.rpc('leave_live', { p_session: sid });
  }, [send]);

  const handleLost = useCallback(() => {
    const sid = sessionRef.current;
    if (sid) supabase.rpc('leave_live', { p_session: sid }).then(() => {});
    closePeer();
    setState('lost');
  }, [closePeer]);

  const connect = useCallback(async (sid: string) => {
    closePeer();
    sessionRef.current = sid;
    setState('connecting');

    const { data, error } = await supabase.rpc('live_peer', { p_session: sid }).single();
    if (error || !data || sessionRef.current !== sid) return handleLost();
    const info = data as PeerInfo;
    setPeer({ displayName: info.display_name, age: info.age });

    const pc = new RTCPeerConnection({ iceServers: iceRef.current });
    pcRef.current = pc;
    streamRef.current!.getTracks().forEach((t) => pc.addTrack(t, streamRef.current!));
    pc.onicecandidate = (e) => { if (e.candidate) send('ice', e.candidate.toJSON()); };
    pc.ontrack = (e) => { if (remoteVideo.current) remoteVideo.current.srcObject = e.streams[0]; };
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      if (pc.connectionState === 'connected') { window.clearTimeout(timers.current.connect); setState('connected'); }
      if (pc.connectionState === 'failed') handleLost();
      if (pc.connectionState === 'disconnected') {
        window.setTimeout(() => {
          if (pcRef.current === pc && pc.connectionState === 'disconnected') handleLost();
        }, 5000);
      }
    };
    timers.current.connect = window.setTimeout(() => {
      if (pcRef.current === pc && pc.connectionState !== 'connected') handleLost();
    }, 20000);

    const flush = async () => {
      for (const c of pendingIce.current) await pc.addIceCandidate(c).catch(() => {});
      pendingIce.current = [];
    };
    const makeOffer = async () => {
      if (offered.current) return;
      offered.current = true;
      const o = await pc.createOffer();
      await pc.setLocalDescription(o);
      send('offer', { type: o.type, sdp: o.sdp });
    };

    const ch = supabase.channel('live:' + sid, {
      config: { private: true, broadcast: { self: false }, presence: { key: myKey.current } },
    });
    chanRef.current = ch;

    ch.on('broadcast', { event: 'ready' }, () => { if (info.initiator) makeOffer(); })
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        window.clearInterval(timers.current.ready);
        await pc.setRemoteDescription(payload);
        await flush();
        const a = await pc.createAnswer();
        await pc.setLocalDescription(a);
        send('answer', { type: a.type, sdp: a.sdp });
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        await pc.setRemoteDescription(payload);
        await flush();
      })
      .on('broadcast', { event: 'ice' }, async ({ payload }) => {
        if (pc.remoteDescription) await pc.addIceCandidate(payload).catch(() => {});
        else pendingIce.current.push(payload);
      })
      .on('broadcast', { event: 'bye' }, () => {
        if (sessionRef.current === sid) { closePeer(); setState('lost'); }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {   // peer closed the tab / lost internet
        if (key !== myKey.current && sessionRef.current === sid) { closePeer(); setState('lost'); }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await ch.track({ at: Date.now() });
          if (!info.initiator) {            // the answerer announces itself until the offer arrives
            send('ready');
            timers.current.ready = window.setInterval(() => send('ready'), 1000);
          }
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') handleLost();
      });
  }, [closePeer, handleLost, send]);

  const beginSearch = useCallback(() => {
    closePeer();
    setState('searching');
    timers.current.empty = window.setTimeout(() => setState((s) => (s === 'searching' ? 'empty' : s)), 12000);
    let fresh = true;
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      const { data, error } = await supabase.rpc('join_live', { p_fresh: fresh });
      busy = false; fresh = false;
      if (error) { console.error(error); clearTimers(); setState('error'); return; }
      if (data) { clearTimers(); connect(data as string); }
    };
    tick();
    timers.current.poll = window.setInterval(tick, 2500);   // stays in the queue until matched
  }, [clearTimers, closePeer, connect]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) return setState('unsupported');
    setState('requesting_media');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e: any) {
      console.error('getUserMedia failed:', e?.name, e?.message);
      return setState(
        e?.name === 'NotAllowedError' || e?.name === 'SecurityError' ? 'denied'
          : e?.name === 'NotFoundError' ? 'no_device' : 'error'
      );
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch('/.netlify/functions/rtc-config', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const isJson = r.headers.get('content-type')?.includes('application/json');
      if (!r.ok || !isJson) throw new Error('rtc-config unavailable (' + r.status + ')');
      iceRef.current = (await r.json()).iceServers;
    } catch (e) {
      if (import.meta.env.DEV) {
        // Local testing: Google's STUN server is enough for two browsers on one machine.
        console.warn('rtc-config not available locally, using STUN only.', e);
        iceRef.current = [{ urls: 'stun:stun.l.google.com:19302' }];
      } else {
        console.error(e);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        return setState('error');
      }
    }
    beginSearch();
  }, [beginSearch]);

  const next = useCallback(async () => { await endRemote(); beginSearch(); }, [endRemote, beginSearch]);

  const stop = useCallback(async () => {
    await endRemote();
    supabase.rpc('leave_live', { p_session: null }).then(() => {});
    closePeer();
    streamRef.current?.getTracks().forEach((t) => t.stop());   // releases camera + mic
    streamRef.current = null;
    setState('idle');
  }, [endRemote, closePeer]);

  const toggleMic = () => {
    const t = streamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
  };
  const toggleCam = () => {
    const t = streamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); }
  };
  const toggleSpeaker = () => setSpeakerOn((on) => !on);

  const block = useCallback(async () => {
    const sid = sessionRef.current;
    if (!sid) return;
    await send('bye');
    await supabase.rpc('live_block', { p_session: sid });
    beginSearch();
  }, [send, beginSearch]);

  const report = useCallback(async (reason: string, details = '') => {
    const sid = sessionRef.current;
    if (!sid) return;
    const { error } = await supabase.rpc('live_report', { p_session: sid, p_reason: reason, p_details: details });
    if (!error) setReported(true);
  }, []);

  return {
    state, peer, micOn, camOn, speakerOn, reported, localVideo, remoteVideo,
    start, stop, next, findSomeone: beginSearch, toggleMic, toggleCam, toggleSpeaker, block, report,
  };
}