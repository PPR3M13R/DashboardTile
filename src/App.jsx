import { supabase } from "./supabase";
import Login from "./login";
import { useState, useEffect } from "react";
import { TILE_TYPES } from "./tiles";
import "./App.css";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";


const load = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};

export default function App() {
  const [tiles, setTiles] = useState(() => load("tiles", []));
  const [theme, setTheme] = useState(() => load("theme", "light"));
  const [animate, setAnimate] = useState(() => load("animate", true));

  useEffect(() => {
    localStorage.setItem("tiles", JSON.stringify(tiles));
  }, [tiles]);

  useEffect(() => {
    localStorage.setItem("theme", JSON.stringify(theme));
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("animate", JSON.stringify(animate));
  }, [animate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setUid(s?.user.id ?? null);
      if (s?.provider_token) localStorage.setItem("gtoken", s.provider_token);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const [uid, setUid] = useState(null);
  const [synced, setSynced] = useState(false);

  // 1. Track who is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // 2. On login, load the cloud copy
  useEffect(() => {
    setSynced(false);
    if (!uid) return;
    supabase.from("dashboards").select("data").eq("user_id", uid).maybeSingle()
      .then(({ data }) => {
        const d = data?.data;
        if (d) {
          setTiles(d.tiles ?? []);
          setTheme(d.theme ?? "light");
          setAnimate(d.animate ?? true);
        }
        setSynced(true);
      });
  }, [uid]);

  // 3. Save to the cloud 
  useEffect(() => {
    if (!uid || !synced) return;
    const id = setTimeout(() => {
      supabase.from("dashboards").upsert({
        user_id: uid,
        data: { tiles, theme, animate },
        updated_at: new Date().toISOString(),
      }).then(({ error }) => error && console.error("Save failed:", error));
    }, 800);
    return () => clearTimeout(id);
  }, [tiles, theme, animate, uid, synced]);

  const addTile = (type) =>
    setTiles([...tiles, { id: crypto.randomUUID(), type, data: {} }]);

  const removeTile = (id) => setTiles(tiles.filter((t) => t.id !== id));

  const updateTile = (id, data) =>
    setTiles(tiles.map((t) => (t.id === id ? { ...t, data: { ...t.data, ...data } } : t)));

  return (
    <div className="app">
      <header> {uid ? <button onClick={() => supabase.auth.signOut()}>Sign out</button> : <Login />}
        <select value="" onChange={(e) => e.target.value && addTile(e.target.value)}>
          <option value="">+ Add tile</option>
          {Object.entries(TILE_TYPES).map(([key, t]) => (
            <option key={key} value={key}>{t.label}</option>
          ))}
        </select>
        <button onClick={() => confirm("Remove all tiles?") && setTiles([])}>Clear all</button>
        <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? "🌙" : "☀️"}</button>
        <button onClick={() => setAnimate(!animate)}>Animations: {animate ? "On" : "Off"}</button>
      </header>

      <MotionConfig transition={animate ? { duration: 0.25 } : { duration: 0 }}>
        <main className="grid">
          <AnimatePresence>
            {tiles.map((tile) => {
              const Tile = TILE_TYPES[tile.type].component;
              return (
                <motion.div
                  className="tile"
                  key={tile.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <button className="x" onClick={() => removeTile(tile.id)}>✕</button>
                  <Tile data={tile.data} onChange={(d) => updateTile(tile.id, d)} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </main>
      </MotionConfig>
    </div>
  );
}