import { useState, useEffect } from "react";

export default function TimeTile() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <h2>{now.toLocaleTimeString()}</h2>;
}