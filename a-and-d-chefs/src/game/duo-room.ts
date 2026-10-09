"use client";
/**
 * SHARED FILE: the browser half of a-and-d-kart/server/games/duo-rooms.mjs.
 * Canonical copy lives in /shared; `npm run sync:cores` copies it into each
 * duo game. Handles the private-room lobby, reconnecting, resuming after a
 * reload, and a clock estimate so snapshots can be aged correctly.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

export type DuoPhase = "setup" | "waiting" | "ready" | "playing";
export type DuoStatus = "ok" | "reconnecting" | "partner-away";
type RoomInfo = { code: string; playing: boolean; players: { seat: number; connected: boolean }[] };
type Reply = { room?: RoomInfo; seat?: number; error?: string };
type Handlers<S> = { onSnapshot: (snap: S) => void; onStart?: () => void };

const SERVER = process.env.NEXT_PUBLIC_RACING_SERVER_URL ?? "http://localhost:3000";
// The free host puts the server to sleep when idle: wake it as soon as the game opens, not when Online is pressed.
if (typeof window !== "undefined") fetch(`${SERVER}/socket.io/?EIO=4&transport=polling`, { mode: "no-cors" }).catch(() => {});
const WAKING = "Waking up the arcade server… it naps when nobody is playing. This can take up to a minute.";
const store = {
  get: (key: string) => { try { return sessionStorage.getItem(key); } catch { return null; } },
  set: (key: string, value: string | null) => {
    try { if (value) sessionStorage.setItem(key, value); else sessionStorage.removeItem(key); } catch { /* storage blocked */ }
  },
};
const newToken = () => typeof crypto !== "undefined" && "randomUUID" in crypto
  ? crypto.randomUUID()
  : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

export function useDuoRoom<S>(prefix: string, handlers: Handlers<S>) {
  const socket = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  const token = useRef("");
  const code = useRef<string | null>(null);
  const seatRef = useRef<number | null>(null);
  const statusRef = useRef<DuoStatus>("ok");
  const clock = useRef({ offset: 0, rtt: 0, samples: 0 });
  const [phase, setPhase] = useState<DuoPhase>("setup");
  const [roomCode, setRoomCode] = useState("");
  const [seat, setSeat] = useState<number | null>(null);
  const [notice, setNotice] = useState("Create a private room or enter a friend’s code.");
  const [ping, setPing] = useState(0);
  const [status, setStatusState] = useState<DuoStatus>("ok");
  const [resuming, setResuming] = useState(false);

  useEffect(() => { handlersRef.current = handlers; });

  const setStatus = useCallback((next: DuoStatus) => { statusRef.current = next; setStatusState(next); }, []);
  const setSeatBoth = useCallback((next: number | null) => { seatRef.current = next; setSeat(next); }, []);

  const applyRoom = useCallback((room: RoomInfo) => {
    const both = room.players.length === 2;
    if (statusRef.current !== "reconnecting") setStatus(both && !room.players.every((p) => p.connected) ? "partner-away" : "ok");
    setRoomCode(room.code);
    if (room.playing) { setPhase("playing"); return; }
    setPhase(both ? "ready" : "waiting");
    setNotice(both
      ? seatRef.current === 0 ? "Friend connected. Start when you are both ready." : "Connected. Waiting for the host to start."
      : "Share this four-letter room code.");
  }, [setStatus]);

  const reset = useCallback((message: string) => {
    code.current = null; store.set(`${prefix}-room`, null);
    setSeatBoth(null); setStatus("ok"); setPhase("setup"); setRoomCode(""); setNotice(message);
  }, [prefix, setSeatBoth, setStatus]);

  const joined = useCallback((reply: Reply) => {
    if (!reply.room || reply.seat === undefined) return;
    code.current = reply.room.code;
    store.set(`${prefix}-room`, reply.room.code);
    setSeatBoth(reply.seat);
    setStatus("ok");
    applyRoom(reply.room);
  }, [applyRoom, prefix, setSeatBoth, setStatus]);

  const connect = useCallback(() => {
    if (socket.current) return socket.current;
    // WebSocket first; polling only if a network blocks sockets.
    const client = io(SERVER, { transports: ["websocket", "polling"], reconnectionDelay: 400, reconnectionDelayMax: 2500 });
    socket.current = client;
    const sample = () => {
      const sent = Date.now();
      client.timeout(3000).emit(`${prefix}:ping`, null, (err: Error | null, serverNow: number) => {
        if (err || typeof serverNow !== "number") return;
        const c = clock.current, now = Date.now(), rtt = now - sent, offset = serverNow + rtt / 2 - now;
        // Fast round trips give the most trustworthy clock samples.
        if (c.samples === 0) { c.offset = offset; c.rtt = rtt; }
        else { c.offset += (offset - c.offset) * (rtt <= c.rtt * 1.25 ? 0.35 : 0.08); c.rtt += (rtt - c.rtt) * 0.25; }
        c.samples++;
        setPing((p) => (Math.abs(p - Math.round(c.rtt)) < 4 ? p : Math.round(c.rtt)));
      });
    };
    let timer = 0;
    client.on("connect", () => {
      window.clearInterval(timer);
      setNotice(n => n === WAKING ? "Connected. Create a private room or enter a friend’s code." : n);
      sample(); window.setTimeout(sample, 250); window.setTimeout(sample, 600);
      timer = window.setInterval(sample, 2000);
      if (!code.current) return;
      client.emit(`${prefix}:resume`, { code: code.current, token: token.current }, (reply: Reply) => {
        setResuming(false);
        if (reply.error) reset(reply.error);
        else joined(reply);
      });
    });
    client.on("disconnect", () => {
      window.clearInterval(timer);
      if (code.current) setStatus("reconnecting");
    });
    // socket.io keeps retrying; a sleeping server usually answers within a minute
    client.on("connect_error", () => { if (!code.current) setNotice(WAKING); });
    client.on(`${prefix}:room`, applyRoom);
    client.on(`${prefix}:hostChanged`, () => { setSeatBoth(0); setNotice("Your friend left. Share the code to invite someone new."); });
    client.on(`${prefix}:start`, () => { setPhase("playing"); handlersRef.current.onStart?.(); });
    client.on(`${prefix}:s`, (snap: S) => {
      if (statusRef.current === "reconnecting") setStatus("ok");
      handlersRef.current.onSnapshot(snap);
    });
    return client;
  }, [applyRoom, joined, prefix, reset, setSeatBoth, setStatus]);

  useEffect(() => {
    token.current = store.get(`${prefix}-token`) ?? newToken();
    store.set(`${prefix}-token`, token.current);
    // A phone that reloaded the tab mid-match drops straight back into it.
    const saved = store.get(`${prefix}-room`);
    if (!saved) return;
    code.current = saved;
    const t = window.setTimeout(() => { setResuming(true); setPhase("waiting"); setNotice("Rejoining your match…"); connect(); }, 0);
    return () => window.clearTimeout(t);
  }, [connect, prefix]);
  useEffect(() => () => { socket.current?.disconnect(); }, []);

  const create = useCallback(() => {
    setSeatBoth(0);
    connect().emit(`${prefix}:create`, { token: token.current }, (reply: Reply) => {
      if (reply.error) setNotice(reply.error); else { joined(reply); setNotice("Share this code with your partner."); }
    });
  }, [connect, joined, prefix, setSeatBoth]);
  const join = useCallback((joinCode: string) => {
    connect().emit(`${prefix}:join`, { code: joinCode, token: token.current }, (reply: Reply) => {
      if (reply.error) setNotice(reply.error); else joined(reply);
    });
  }, [connect, joined, prefix]);
  const start = useCallback((options?: Record<string, unknown>) => { if (seatRef.current === 0) socket.current?.emit(`${prefix}:start`, options ?? {}); }, [prefix]);
  const leave = useCallback(() => {
    if (code.current) socket.current?.emit(`${prefix}:leave`);
    reset("Create a private room or enter a friend’s code.");
  }, [prefix, reset]);
  /** Best estimate of the server's clock, in ms. */
  const serverNow = useCallback(() => Date.now() + clock.current.offset, []);
  const emit = useCallback((event: string, payload?: unknown, volatile = false) => {
    const s = socket.current;
    if (!s) return;
    if (volatile) s.volatile.emit(event, payload); else s.emit(event, payload);
  }, []);

  return { phase, roomCode, seat, seatRef, notice, ping, status, statusRef, resuming, create, join, start, leave, serverNow, emit, open: connect };
}
