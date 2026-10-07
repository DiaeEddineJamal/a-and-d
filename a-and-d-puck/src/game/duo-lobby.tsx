"use client";
/**
 * SHARED FILE: lobby pieces for the duo games. Canonical copy lives in
 * /shared; `npm run sync:cores` copies it into each game.
 */
import { useState } from "react";
import type { useDuoRoom } from "./duo-room";

export type PlayMode = "local" | "cpu" | "online";
export type Difficulty = "easy" | "normal" | "hard";

/** Short names shown on phones, where the mode buttons share a row with the difficulty. */
const SHORT: Record<PlayMode, string> = { local: "2P", cpu: "CPU", online: "ONLINE" };

export function ModeSwitch({ mode, onChange, labels }: { mode: PlayMode; onChange: (mode: PlayMode) => void; labels?: Partial<Record<PlayMode, string>> }) {
  const names = { local: "2 PLAYERS", cpu: "VS CPU", online: "ONLINE", ...labels };
  return (
    <div className="play-switch" role="group" aria-label="Game mode">
      {(["local", "cpu", "online"] as const).map((m) => (
        <button key={m} className={mode === m ? "active" : ""} aria-pressed={mode === m} aria-label={names[m]} onClick={() => onChange(m)}><span className="lbl-long">{names[m]}</span><span className="lbl-short" aria-hidden="true">{SHORT[m]}</span></button>
      ))}
    </div>
  );
}

export function DifficultyPicker({ value, onChange, label = "CPU" }: { value: Difficulty; onChange: (d: Difficulty) => void; label?: string }) {
  return (
    <div className="difficulty" role="group" aria-label={`${label} difficulty`}>
      <span>{label}</span>
      {(["easy", "normal", "hard"] as const).map((d) => (
        <button key={d} className={value === d ? "active" : ""} aria-pressed={value === d} onClick={() => onChange(d)}>{d.toUpperCase()}</button>
      ))}
    </div>
  );
}

type Room = ReturnType<typeof useDuoRoom<unknown>>;

export function DuoLobby({ room, seatNames, startExtra, onStart }: {
  room: Room; seatNames: [string, string]; startExtra?: React.ReactNode; onStart: () => void;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const hosting = room.seat === 0 && room.roomCode;
  const copy = async () => {
    try { await navigator.clipboard.writeText(room.roomCode); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <div className="online-lobby">
      <header className="lobby-intro"><b>PRIVATE MATCH</b><p>{copied ? "Code copied. Send it to your partner." : room.notice}</p></header>
      <section className="room-panel">
        <span className="room-step">01 / HOST</span>
        <h3>CREATE A ROOM</h3>
        <p>Generate a private code, then send it to your partner. You play {seatNames[0]}.</p>
        {hosting
          ? <div className="room-code"><span>YOUR ROOM CODE</span><output>{room.roomCode}</output><button onClick={copy}>COPY CODE</button></div>
          : <button onClick={room.create}>CREATE PRIVATE ROOM</button>}
      </section>
      <section className="room-panel">
        <span className="room-step">02 / GUEST</span>
        <h3>JOIN A ROOM</h3>
        <p>Enter the four-character code your partner sent you. You play {seatNames[1]}.</p>
        {room.seat === 1 && room.roomCode
          ? <div className="room-code"><span>JOINED ROOM</span><output>{room.roomCode}</output></div>
          : <>
            <label><span>ROOM CODE</span><input aria-label="Four-character room code" autoComplete="off" maxLength={4} value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="ABCD" /></label>
            <button disabled={joinCode.length !== 4} onClick={() => room.join(joinCode)}>JOIN ROOM</button>
          </>}
      </section>
      {room.seat === 0 && room.phase === "ready" && <div className="start-row">{startExtra}<button className="start-button" onClick={onStart}>PARTNER CONNECTED: START ↗</button></div>}
    </div>
  );
}
