import { useState, useEffect } from "react";

const info = (c) =>
  c === 0 ? ["Clear", "☀️"] : c <= 2 ? ["Partly cloudy", "⛅"] : c === 3 ? ["Overcast", "☁️"] :
  c <= 48 ? ["Fog", "🌫️"] : c <= 57 ? ["Drizzle", "🌦️"] : c <= 67 ? ["Rain", "🌧️"] :
  c <= 77 ? ["Snow", "❄️"] : c <= 82 ? ["Showers", "🌦️"] : c <= 86 ? ["Snow showers", "🌨️"] :
  ["Thunderstorm", "⛈️"];

export default function WeatherTile({ data, onChange }) {
  const { place = null, unit = "C" } = data;
  const [w, setW] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    const go = (lat, lon) =>
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto` +
        `&temperature_unit=${unit === "F" ? "fahrenheit" : "celsius"}` +
        `&wind_speed_unit=${unit === "F" ? "mph" : "kmh"}`
      )
        .then((r) => r.json())
        .then((j) => alive && (setW(j), setError("")))
        .catch(() => alive && setError("Could not load weather"));

    const run = () =>
      place
        ? go(place.lat, place.lon)
        : navigator.geolocation.getCurrentPosition(
            (p) => go(p.coords.latitude, p.coords.longitude),
            () => alive && setError("Location blocked. Search a city instead.")
          );
    run();
    const id = setInterval(run, 15 * 60000);
    return () => { alive = false; clearInterval(id); };
  }, [place?.lat, place?.lon, unit]);

  const search = async (q) => {
    if (!q.trim()) return setEditing(false);
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1`
      );
      const hit = (await r.json()).results?.[0];
      if (!hit) return setError("City not found");
      onChange({ place: { name: hit.name, lat: hit.latitude, lon: hit.longitude } });
      setError("");
      setEditing(false);
    } catch {
      setError("Search failed");
    }
  };

  const head = (
    <div className="wx-head">
      {editing ? (
        <input
          autoFocus placeholder="City, then Enter"
          onKeyDown={(e) => e.key === "Enter" ? search(e.target.value) : e.key === "Escape" && setEditing(false)}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <button className="wx-btn" onClick={() => setEditing(true)} title="Change city">
          {place?.name ?? "My location"}
        </button>
      )}
      {place && !editing && (
        <button className="wx-btn" onClick={() => onChange({ place: null })} title="Use my location">⌖</button>
      )}
      <button className="wx-btn" onClick={() => onChange({ unit: unit === "C" ? "F" : "C" })}>°{unit}</button>
    </div>
  );

  if (!w) return <div className="wx">{head}<p className="sub">{error || "Loading..."}</p></div>;

  const [text, icon] = info(w.current.weather_code);
  const deg = (n) => `${Math.round(n)}°`;
  const wind = unit === "F" ? "mph" : "km/h";

  return (
    <div className="wx">
      {head}
      {error && <p className="sub">{error}</p>}
      <div className="wx-main">
        <span className="wx-icon">{icon}</span>
        <span className="wx-temp">{deg(w.current.temperature_2m)}</span>
      </div>
      <div className="sub">{text} · feels {deg(w.current.apparent_temperature)}</div>
      <div className="wx-stats sub">
        <span>💧 {w.current.relative_humidity_2m}%</span>
        <span>💨 {Math.round(w.current.wind_speed_10m)} {wind}</span>
      </div>
      <div className="wx-days">
        {w.daily.time.slice(1, 6).map((d, i) => (
          <div key={d}>
            <span className="sub">{new Date(d + "T00:00").toLocaleDateString([], { weekday: "short" })}</span>
            <span>{info(w.daily.weather_code[i + 1])[1]}</span>
            <span>{deg(w.daily.temperature_2m_max[i + 1])}</span>
            <span className="sub">{deg(w.daily.temperature_2m_min[i + 1])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}