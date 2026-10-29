import { useState, useEffect } from "react";

const icon = (c) =>
  c === 0 ? "☀️" : c <= 3 ? "⛅" : c <= 48 ? "🌫️" : c <= 67 ? "🌧️" : c <= 77 ? "❄️" : c <= 82 ? "🌦️" : "⛈️";

export default function WeatherTile() {
  const [w, setW] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}` +
            `&longitude=${coords.longitude}&current=temperature_2m,weather_code` +
            `&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`;
          const res = await fetch(url);
          setW(await res.json());
        } catch {
          setError("Could not load weather");
        }
      },
      () => setError("Location blocked. Allow it in the browser.")
    );
  }, []);

  if (error) return <p>{error}</p>;
  if (!w) return <p>Loading...</p>;

  return (
    <div>
      <h2>{icon(w.current.weather_code)} {Math.round(w.current.temperature_2m)}°C</h2>
      {w.daily.time.slice(1, 4).map((day, i) => (
        <div key={day} style={{ fontSize: ".85rem" }}>
          {new Date(day).toLocaleDateString([], { weekday: "short" })}{" "}
          {icon(w.daily.weather_code[i + 1])}{" "}
          {Math.round(w.daily.temperature_2m_min[i + 1])}° / {Math.round(w.daily.temperature_2m_max[i + 1])}°
        </div>
      ))}
    </div>
  );
}