import '../styles/globals.css'; // ochronnie, gdyby Netlify budował ten plik osobno
import Countdown from './Countdown';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// mapowanie dni PL → indeks (Pon=0 … Nd=6)
const DAY_INDEX = { 'Pon':0, 'Wt':1, 'Śr':2, 'Sro':2, 'Czw':3, 'Pt':4, 'Sob':5, 'Nd':6, 'Ndz':6 };
const INDEX_TO_DAY = ['Pon','Wt','Śr','Czw','Pt','Sob','Nd'];

// „Teraz” w strefie Europe/Warsaw (żeby nocne godziny działały poprawnie)
function nowInWarsaw() {
  const now = new Date();
  const warsaw = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
  // getDay: Nd=0…Sob=6 → zamieniamy na Pon=0…Nd=6
  const dayIndex = (warsaw.getDay() + 6) % 7;
  const minutes = warsaw.getHours() * 60 + warsaw.getMinutes();
  return { dayIndex, minutes, warsaw };
}

// „Pon 19:00-23:00, Pt 20:00-02:00” → [{day,start,end,crosses}]
function parseSchedule(s) {
  if (!s) return [];
  return s.split(',').map(x => x.trim()).map(part => {
    const m = part.match(/^([A-Za-zĄĆĘŁŃÓŚŹŻąęółńćźż]{2,3})\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/u);
    if (!m) return null;
    const dayStr = m[1];
    const day = DAY_INDEX[dayStr];
    if (day == null) return null;
    const [h1, mi1] = m[2].split(':').map(Number);
    const [h2, mi2] = m[3].split(':').map(Number);
    let start = h1 * 60 + mi1;
    let end = h2 * 60 + mi2;
    let crosses = false;
    if (end <= start) { end += 1440; crosses = true; } // przez północ
    return { day, start, end, crosses, raw: part };
  }).filter(Boolean);
}

// znajdź aktywną lub najbliższą sesję
function findCurrentOrNext(sessions, nowDay, nowMin) {
  // aktywna dziś
  for (const s of sessions) {
    if (s.day === nowDay && nowMin >= s.start && nowMin < s.end) {
      return { status: 'active', minutesLeft: s.end - nowMin, session: s };
    }
  }
  // aktywna z dnia poprzedniego, która przeszła przez północ
  const prevDay = (nowDay + 6) % 7;
  for (const s of sessions) {
    if (s.day === prevDay && s.end > 1440 && nowMin < (s.end - 1440)) {
      return { status: 'active', minutesLeft: (s.end - 1440) - nowMin, session: s };
    }
  }
  // najbliższa (w horyzoncie 7 dni)
  let bestDist = Infinity, best = null;
  for (const s of sessions) {
    let dayDelta = s.day - nowDay;
    if (dayDelta < 0) dayDelta += 7;
    let dist = dayDelta * 1440 + (s.start - nowMin);
    if (dist <= 0) dist += 7 * 1440;
    if (dist < bestDist) { bestDist = dist; best = s; }
  }
  return { status: 'upcoming', minutesUntil: bestDist, session: best };
}

function fmtHM(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}`;
}

export default async function VenuePage({ params }) {
  const { data: venue, error } = await supabase
    .from('venues')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !venue) {
    return (
      <div className="container">
        <h1>Nie znaleziono lokalu</h1>
        <p>Spróbuj wrócić do listy i wybrać inny lokal.</p>
      </div>
    );
  }

  const sessions = parseSchedule(venue.schedule);
  const { dayIndex, minutes } = nowInWarsaw();
  const info = sessions.length ? findCurrentOrNext(sessions, dayIndex, minutes) : null;

  return (
    <div className="container">
      <h1 style={{marginBottom: 8}}>{venue.name}</h1>
      <div className="row" style={{gap: 12, marginBottom: 12}}>
        <span className="badge">karaoke</span>
        <span>{venue.address}</span>
      </div>

      {venue.thumb && (
        <img
          src={venue.thumb}
          alt={venue.name}
          style={{width: '100%', maxWidth: 900, borderRadius: 12, marginBottom: 16}}
        />
      )}

      <div className="card" style={{marginBottom: 12}}>
        <div><strong>Godziny karaoke:</strong> {venue.schedule || 'brak danych'}</div>
        {info && info.status === 'active' && (
          <div style={{marginTop: 8}}>
            <div className="row" style={{gap: 10}}>
              <span className="badge">TRWA TERAZ</span>
              <span>
                Zakończenie: {fmtHM((info.session.end > 1440 ? info.session.end - 1440 : info.session.end))}
                {' '}({INDEX_TO_DAY[info.session.day]})
              </span>
            </div>
            <div style={{marginTop: 8}}>
              <Countdown initialMinutesLeft={info.minutesLeft} />
            </div>
          </div>
        )}
        {info && info.status === 'upcoming' && info.session && (
          <div style={{marginTop: 8}}>
            <div className="row" style={{gap: 10}}>
              <span className="badge">NAJBLIŻSZE</span>
              <span>
                {INDEX_TO_DAY[info.session.day]} {fmtHM(info.session.start)} – {fmtHM(info.session.end > 1440 ? info.session.end - 1440 : info.session.end)}
              </span>
              <span>(za ~{Math.floor(info.minutesUntil/60)}h {info.minutesUntil%60}m)</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid" style={{gap: 12}}>
        <div className="card">
          <div><strong>Telefon:</strong> {venue.phone || '—'}</div>
          <div><strong>E-mail:</strong> {venue.email || '—'}</div>
          <div><strong>Miejsca siedzące:</strong> {venue.seats ?? '—'}</div>
        </div>
        <div className="card">
          <div><strong>Opis:</strong></div>
          <p style={{marginTop: 4}}>{venue.desc || '—'}</p>
        </div>
      </div>
    </div>
  );
}
