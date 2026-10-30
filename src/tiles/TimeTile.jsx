import { useState, useEffect, useRef } from "react";

const pad = (n) => String(n).padStart(2, "0");

const ZONES = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : [];

const fmt = (ms, cs = false) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const base = `${h ? pad(h) + ":" : ""}${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return cs ? `${base}.${pad(Math.floor((ms % 1000) / 10))}` : base;
};

// ---------- beep (Web Audio, no file needed) ----------
let ctx;
const audio = () => {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
};
const beep = () => {
  const c = audio();
  [0, 0.25, 0.5].forEach((d) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.15;
    o.connect(g);
    g.connect(c.destination);
    o.start(c.currentTime + d);
    o.stop(c.currentTime + d + 0.15);
  });
};

export default function TimeTile({ data, onChange }) {
  const { mode = "clock", tz = "", swStart = null, swElapsed = 0, timerEnd = null, timerLeft = null } = data;
  const timerSecs = data.timerSecs ?? (data.timerLen ?? 5) * 60; // old tiles were in minutes
  const [now, setNow] = useState(Date.now());
  const fired = useRef(null);
  const box = useRef({});

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  // stopwatch
  const sw = swElapsed + (swStart ? now - swStart : 0);

  // timer
  const left = timerEnd ? Math.max(0, timerEnd - now) : timerLeft ?? timerSecs * 1000;
  const done = timerLeft === 0 && !timerEnd;

  useEffect(() => {
    if (timerEnd && now >= timerEnd && fired.current !== timerEnd) {
      fired.current = timerEnd;
      if (now - timerEnd < 3000) beep(); // only beep if it ended just now
      onChange({ timerEnd: null, timerLeft: 0 });
    }
  });

  // hours / minutes / seconds boxes
  const h = Math.floor(timerSecs / 3600);
  const m = Math.floor((timerSecs % 3600) / 60);
  const s = timerSecs % 60;

  const setLen = (unit, v) => {
    const p = { h, m, s, [unit]: Math.max(0, Math.floor(+v) || 0) };
    const total = p.h * 3600 + p.m * 60 + p.s;
    onChange({ timerSecs: total || 1, timerEnd: null, timerLeft: null });
  };

  const unit = (u, val, label) => (
    <span className="unit">
      <input
        ref={(el) => (box.current[u] = el)}
        type="number" min="0" key={u + val} defaultValue={val}
        disabled={!!timerEnd}
        onBlur={(e) => setLen(u, e.target.value)}
        style={{ width: 44 }}
      />
      <span className="sub">{label}</span>
    </span>
  );

  const tab = (mm, label) => (
    <button className={"tab" + (mode === mm ? " on" : "")} onClick={() => onChange({ mode: mm })}>
      {label}
    </button>
  );

  return (
    <div className="time">
      <div className="tabs">
        {tab("clock", "Clock")}
        {tab("timer", "Timer")}
        {tab("stopwatch", "Stopwatch")}
      </div>

      {mode === "clock" && (
        <>
          <div className="big">
            {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz || undefined })}
          </div>
          <div className="sub">
            {new Date(now).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", timeZone: tz || undefined })}
          </div>
          <select value={tz} onChange={(e) => onChange({ tz: e.target.value })}>
            <option value="">Local time</option>
            {ZONES.map((z) => (
              <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
            ))}
          </select>
        </>
      )}

      {mode === "timer" && (
        <>
          <div className={"big" + (done ? " done" : "")}>{done ? "Done" : fmt(left + 999)}</div>
          <div className="row">
            {timerEnd ? (
              <button onClick={() => onChange({ timerEnd: null, timerLeft: left })}>Pause</button>
            ) : (
              <button
                onClick={() => {
                  audio(); // unlocks sound
                  const val = (k) => Math.max(0, Math.floor(+box.current[k]?.value) || 0);
                  const typed = val("h") * 3600 + val("m") * 60 + val("s") || 1;
                  const ms = typed !== timerSecs || done || left === 0 ? typed * 1000 : left;
                  onChange({ timerSecs: typed, timerEnd: Date.now() + ms, timerLeft: null });
                }}
              >
                Start
              </button>
            )}
            <button onClick={() => onChange({ timerEnd: null, timerLeft: null })}>Reset</button>
          </div>
          <div className="row">
            {unit("h", h, "h")}
            {unit("m", m, "m")}
            {unit("s", s, "s")}
          </div>
        </>
      )}

      {mode === "stopwatch" && (
        <>
          <div className="big">{fmt(sw, true)}</div>
          <div className="row">
            {swStart ? (
              <button onClick={() => onChange({ swStart: null, swElapsed: sw })}>Stop</button>
            ) : (
              <button onClick={() => onChange({ swStart: Date.now() })}>Start</button>
            )}
            <button onClick={() => onChange({ swStart: null, swElapsed: 0 })}>Reset</button>
          </div>
        </>
      )}
    </div>
  );
}