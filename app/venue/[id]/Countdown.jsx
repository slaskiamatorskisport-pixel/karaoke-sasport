'use client';

import { useEffect, useState } from 'react';

export default function Countdown({ initialMinutesLeft }) {
  const [minutesLeft, setMinutesLeft] = useState(initialMinutesLeft ?? 0);

  useEffect(() => {
    const id = setInterval(() => {
      setMinutesLeft((m) => (m > 0 ? m - 1 : 0));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!minutesLeft || minutesLeft <= 0) {
    return <div className="card"><strong>Karaoke dziś zakończone.</strong></div>;
  }

  const h = Math.floor(minutesLeft / 60);
  const m = minutesLeft % 60;
  const songs = Math.floor(minutesLeft / 4); // 4 min/utwór

  return (
    <div className="card">
      <div className="row" style={{gap: 12, alignItems: 'baseline'}}>
        <div><strong>Pozostały czas:</strong> {h}h {m}m</div>
        <div><strong>Zmieszczą się ~</strong> {songs} piosenki</div>
      </div>
      <small>Założenie: 4 min/utwór. Odświeża się co minutę.</small>
    </div>
  );
}
