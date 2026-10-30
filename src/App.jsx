import { useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { TILE_TYPES } from "./tiles";
import { supabase } from "./supabase";
import Login from "./Login";
import { getRects, neighbor, insert, remove, fit } from "./tiling";
import "./App.css";

const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  // ---------- state ----------
  const [tiles, setTiles] = useState(() => load("tiles", []));
  const [tree, setTree] = useState(() => load("tree", null));
  const [theme, setTheme] = useState(() => load("theme", "light"));
  const [animate, setAnimate] = useState(() => load("animate", true));
  const [uid, setUid] = useState(null);
  const [synced, setSynced] = useState(false);
  const [focus, setFocus] = useState(null);
  const [full, setFull] = useState(false);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");

  // ---------- save to localStorage ----------
  useEffect(() => {
    localStorage.setItem("tiles", JSON.stringify(tiles));
  }, [tiles]);

  useEffect(() => {
    localStorage.setItem("tree", JSON.stringify(tree));
  }, [tree]);

  useEffect(() => {
    localStorage.setItem("theme", JSON.stringify(theme));
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("animate", JSON.stringify(animate));
  }, [animate]);

  // ---------- cloud sync ----------
  // 1. Track who is logged in
  useEffect(() => {
    const nameOf = (u) => u?.user_metadata?.full_name ?? u?.email ?? "";
    const picOf = (u) => u?.user_metadata?.avatar_url ?? u?.user_metadata?.picture ?? "";
    supabase.auth.getSession().then(({ data }) => {
      setUid(data.session?.user.id ?? null);
      setName(nameOf(data.session?.user));
      setAvatar(picOf(data.session?.user));
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setUid(s?.user.id ?? null);
      setName(nameOf(s?.user));
      setAvatar(picOf(s?.user));
      if (s?.provider_token) localStorage.setItem("gtoken", s.provider_token);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // 2. On login, load the cloud copy
  useEffect(() => {
    setSynced(false);
    if (!uid) return;
    supabase
      .from("dashboards")
      .select("data")
      .eq("user_id", uid)
      .maybeSingle()
      .then(({ data }) => {
        const d = data?.data;
        if (d && localStorage.getItem("dirty") !== "1") {
          setTiles(d.tiles ?? []);
          setTheme(d.theme ?? "light");
          setAnimate(d.animate ?? true);
          setTree(d.tree ?? null);
        }
        setSynced(true);
      });
  }, [uid]);

  // 3. Save to the cloud 0.8s after any change
  useEffect(() => {
    if (!uid || !synced) return;
    localStorage.setItem("dirty", "1"); // unsaved until the cloud confirms
    const id = setTimeout(() => {
      supabase
        .from("dashboards")
        .upsert({
          user_id: uid,
          data: { tiles, theme, animate, tree },
          updated_at: new Date().toISOString(),
        })
        .then(({ error }) => {
          if (error) console.error("Save failed:", error);
          else localStorage.setItem("dirty", "0");
        });
    }, 800);
    return () => clearTimeout(id);
  }, [tiles, theme, animate, tree, uid, synced]);

  // ---------- layout ----------
  const aspect = window.innerWidth / window.innerHeight;
  const layout = fit(tree, tiles.map((t) => t.id), aspect);
  const cur = tiles.find((t) => t.id === focus)?.id ?? tiles[0]?.id;

  // ---------- tile actions ----------
  const addTile = (type) => {
    const id = crypto.randomUUID();
    setTree(insert(layout, cur, id, aspect));
    setTiles([...tiles, { id, type, data: {} }]);
    setFocus(id);
    setFull(false);
  };

  const removeTile = (id) => {
    const i = tiles.findIndex((t) => t.id === id);
    const rest = tiles.filter((t) => t.id !== id);
    setTree(remove(layout, id));
    setTiles(rest);
    setFocus(rest[Math.max(0, i - 1)]?.id ?? null);
    setFull(false);
  };

  const updateTile = (id, data) =>
    setTiles((prev) => prev.map((t) => (t.id === id ? { ...t, data: { ...t.data, ...data } } : t)));

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) {
        if (e.key === "Escape") e.target.blur();
        return;
      }
      const k = e.key;
      const types = Object.keys(TILE_TYPES);
      const dirs = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
      };
      
      if (dirs[k]) {
        e.preventDefault();
        const to = neighbor(getRects(layout), cur, dirs[k]);
        if (to) setFocus(to);
      } 
      else if (/^[1-9]$/.test(k) && types[k - 1]) addTile(types[k - 1]);
      else if (k.toLowerCase() === "x" && cur) removeTile(cur);
      else if (k.toLowerCase() === "f") setFull(!full);
      else if (k.toLowerCase() === "t") setTheme(theme === "light" ? "dark" : "light");
      else if (k.toLowerCase() === "m") setAnimate(!animate);
      else if (k === "Enter") {
        e.preventDefault();
        document
          .querySelector(`[data-id="${cur}"] textarea, [data-id="${cur}"] input`)
          ?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---------- render ----------
  const rects = getRects(layout);
  const pos = (r) => ({
    left: `${r.x}%`,
    top: `${r.y}%`,
    width: `${r.w}%`,
    height: `${r.h}%`,
  });

  return (
    <div className="app">
      <MotionConfig transition={animate ? { duration: 0.25 } : { duration: 0 }}>
        <main className="screen">
          {tiles.length === 0 && (
            <p className="empty">
              Press{" "}
              {Object.values(TILE_TYPES)
                .map((t, i) => `${i + 1} ${t.label}`)
                .join("  ·  ")}
            </p>
          )}
          <AnimatePresence>
            {tiles.map((tile) => {
              const Tile = TILE_TYPES[tile.type].component;
              const isCur = tile.id === cur;
              const hidden = full && !isCur;
              const r = full && isCur ? { x: 0, y: 0, w: 100, h: 100 } : rects[tile.id];
              if (!r) return null;
              return (
                <motion.div
                  key={tile.id}
                  data-id={tile.id}
                  className="slot"
                  onDoubleClick={() => { setFocus(tile.id); setFull(full && isCur ? false : true); }}
                  initial={{ opacity: 0, scale: 0.9, ...pos(r) }}
                  animate={{ opacity: hidden ? 0 : 1, scale: 1, ...pos(r) }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  style={{
                    zIndex: full && isCur ? 5 : 1,
                    pointerEvents: hidden ? "none" : "auto",
                  }}
                  onMouseDown={() => setFocus(tile.id)}
                >
                  <div className={"tile" + (isCur ? " focus" : "")}>
                    <button
                      className="fs"
                      onClick={() => {
                        setFocus(tile.id);
                        setFull(full && isCur ? false : true);
                      }}
                    >
                      {full && isCur ? "🗗" : "⛶"}
                    </button>
                    <button className="x" onClick={() => removeTile(tile.id)}>✕</button>
                    <Tile data={tile.data} onChange={(d) => updateTile(tile.id, d)} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </main>
      </MotionConfig>

      <footer className="bar">
        <select
          value=""
          onChange={(e) => {
            e.target.value && addTile(e.target.value);
            e.target.blur();
          }}
        >
          <option value="" disabled hidden>Add Tile</option>
          {Object.entries(TILE_TYPES).map(([key, t], i) => (
            <option key={key} value={key}>{i + 1} · {t.label}</option>
          ))}
        </select>
        <button
          onClick={() => {
            if (confirm("Remove all tiles?")) {
              setTiles([]);
              setTree(null);
              setFocus(null);
            }
          }}
        >
          Clear
        </button>
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>Theme: {theme === "light" ? "Light" : "Dark"}</button>
        <button onClick={() => setAnimate(!animate)}>Animation: {animate ? "On" : "Off"}</button>
        {uid ? (
          <>
            {avatar ? (<img className="avatar" src={avatar} alt={name} title={name} referrerPolicy="no-referrer" />) : (
              <span className="avatar" title={name}>{name[0]?.toUpperCase()}</span>
            )}
            <button onClick={() => supabase.auth.signOut()}>Sign out</button>
          </>
        ) : (
          <Login />
        )}
        <span className="hint">
          1-9 = add · arrows = move · x = close · f = fullscreen · Enter = edit · Esc = leave · t = theme · m = animation
        </span>
      </footer>
    </div>
  );
}