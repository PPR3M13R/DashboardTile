import { useState, useEffect } from "react";

// "current.temperature_2m" -> json.current.temperature_2m
const dig = (obj, path) => (path ? path.split(".").reduce((o, k) => o?.[k], obj) : obj);

const isImg = (v) =>
  typeof v === "string" && /^https?:\/\/\S+\.(gif|png|jpe?g|webp)(\?\S*)?$/i.test(v);

export default function ApiTile({ data, onChange }) {
  const { url = "", path = "", label = "", hide = !!data.url } = data;
  const [value, setValue] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!url) return;
    let alive = true;
    const run = () =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j) => {
          if (alive) {
            setValue(path.split(",").map((p) => dig(j, p.trim())));
            setError("");
          }
        })
        .catch(() => alive && setError("Could not load (bad URL, or blocked by CORS)"));
    run();
    const id = setInterval(run, 60000); // refresh every minute
    return () => { alive = false; clearInterval(id); };
  }, [url, path]);

  const field = (key, ph, val) => (
    <input
      key={key + val}
      placeholder={ph}
      defaultValue={val}
      onBlur={(e) => onChange({ [key]: e.target.value.trim() })}
      style={{ width: "100%", marginBottom: 4 }}
    />
  );

  return (
    <div>
      <button
        className="edit"
        onClick={() => onChange({ hide: !hide })}
        title={hide ? "Show settings" : "Hide settings"}
      >
        {hide ? "⚙ Edit" : "▲ Hide"}
      </button>
      {!hide && (
        <>
          {field("label", "Label (optional)", label)}
          {field("url", "https://api...", url)}
          {field("path", "Field, e.g. current.temperature_2m", path)}
        </>
      )}
      {label && <small>{label}</small>}
      {error ? (
        <h2>{error}</h2>
      ) : value === null ? (
        <h2>...</h2>
      ) : (
        value.map((v, i) =>
          isImg(v) ? (
            <img
              key={i}
              src={v}
              alt=""
              style={{ display: "block", maxWidth: "100%", maxHeight: "60%", borderRadius: 8 }}
            />
          ) : (
            <h2 key={i}>{typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}</h2>
          )
        )
      )}
    </div>
  );
}