import { useState, useEffect } from "react";
import Login from "../Login";

const dayLabel = (d) => {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((d - t) / 864e5);
  return diff === 0 ? "Today" : diff === 1 ? "Tomorrow"
    : d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
};

export default function CalendarTile() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const run = () => {
      const token = localStorage.getItem("gtoken");
      if (!token) return setError("Sign in with Google to see events");
      const url =
        "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
        `?timeMin=${new Date().toISOString()}&maxResults=15&singleEvents=true&orderBy=startTime`;
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => alive && (setEvents(d.items ?? []), setError("")))
        .catch(() => alive && setError("Session expired"));
    };
    run();
    const id = setInterval(run, 5 * 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (error)
    return (
      <div className="cal cal-empty">
        <span className="sub">{error}</span>
        <Login />
      </div>
    );
  if (!events) return <div className="cal cal-empty"><span className="sub">Loading...</span></div>;
  if (!events.length) return <div className="cal cal-empty"><span className="sub">Nothing coming up</span></div>;

  // group by day
  const days = [];
  events.forEach((e) => {
    const start = new Date(e.start.dateTime ?? e.start.date + "T00:00");
    const key = start.toDateString();
    let g = days.find((d) => d.key === key);
    if (!g) days.push((g = { key, date: start, items: [] }));
    g.items.push({
      id: e.id,
      title: e.summary || "(no title)",
      time: e.start.dateTime
        ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "All day",
      now: e.start.dateTime && start <= new Date() && new Date(e.end.dateTime) > new Date(),
    });
  });

  return (
    <div className="cal">
      {days.map((d) => (
        <div key={d.key} className="cal-day">
          <div className="cal-head">{dayLabel(d.date)}</div>
          {d.items.map((e) => (
            <div key={e.id} className={"cal-ev" + (e.now ? " now" : "")}>
              <span className="cal-time">{e.time}</span>
              <span className="cal-title">{e.title}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}