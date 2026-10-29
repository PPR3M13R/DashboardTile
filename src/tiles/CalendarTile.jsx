import { useState, useEffect } from "react";
import Login from "../Login";

export default function CalendarTile() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("gtoken");
    if (!token) return setError("Sign in with Google first");
    const url =
      "https://www.googleapis.com/calendar/v3/calendars/primary/events" +
      `?timeMin=${new Date().toISOString()}&maxResults=5&singleEvents=true&orderBy=startTime`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setEvents(d.items))
      .catch(() => setError("Session expired"));
  }, []);

  if (error) return <div><p>{error}</p><Login /></div>;
  if (!events) return <p>Loading...</p>;
  if (!events.length) return <p>No upcoming events</p>;

  return (
    <div style={{ fontSize: ".85rem" }}>
      {events.map((e) => (
        <div key={e.id}>
          {new Date(e.start.dateTime ?? e.start.date).toLocaleString([], {
            weekday: "short", hour: "numeric", minute: "2-digit",
          })}{" "}
          {e.summary}
        </div>
      ))}
    </div>
  );
}