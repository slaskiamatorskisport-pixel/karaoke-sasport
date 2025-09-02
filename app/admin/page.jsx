'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DAYS = ['Pon','Wt','Śr','Czw','Pt','Sob','Nd'];

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [venues, setVenues] = useState([]);
  const [msg, setMsg] = useState('');

  // ------ Formularz LOKAL ------
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [seats, setSeats] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');
  const [thumbFile, setThumbFile] = useState(null);

  // harmonogram „dni tygodnia” – wygodne wybieraki
  const [entries, setEntries] = useState([]);
  const [day, setDay] = useState('Pon');
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('23:00');

  // ------ Formularz WYDARZENIE (konkretna data) ------
  const [eventVenueId, setEventVenueId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStart, setEventStart] = useState('19:00');
  const [eventEnd, setEventEnd] = useState('23:00');

  // Google Maps Autocomplete (opcjonalnie)
  const addressRef = useRef(null);
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapsEnabled = useMemo(() => !!mapsKey, [mapsKey]);

  // --- sesja + rola
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => {
      if (!session?.user) return;
      const { data, error } = await supabase
        .from('profiles').select('role').eq('id', session.user.id).maybeSingle();
      if (!error && data) setRole(data.role);
    })();
  }, [session]);

  // wczytaj listę lokali
  const loadVenues = async () => {
    const { data, error } = await supabase
      .from('venues').select('*').order('created_at', { ascending: false });
    if (error) console.error(error);
    setVenues(data || []);
  };
  useEffect(() => { loadVenues(); }, []);

  // Google Maps Autocomplete (opcjonalne)
  useEffect(() => {
    if (!mapsEnabled) return;
    if (typeof window === 'undefined') return;

    function init() {
      if (!addressRef.current || !window.google?.maps?.places) return;
      const ac = new window.google.maps.places.Autocomplete(addressRef.current, { types: ['geocode'] });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        const adr = place.formatted_address || addressRef.current.value;
        setAddress(adr);
        if (place.geometry?.location) {
          setLat(place.geometry.location.lat().toFixed(6));
          setLng(place.geometry.location.lng().toFixed(6));
        }
      });
    }

    if (window.google?.maps?.places) { init(); return; }
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${mapsKey}&libraries=places`;
    s.async = true; s.defer = true;
    s.onload = init;
    document.head.appendChild(s);
  }, [mapsEnabled, mapsKey]);

  const addEntry = () => setEntries((arr) => [...arr, { day, start, end }]);
  const removeEntry = (i) => setEntries((arr) => arr.filter((_,idx)=>idx!==i));
  const buildSchedule = () => entries.map(e => `${e.day} ${e.start}-${e.end}`).join(', ');

  const useMyLocation = () => {
    if (!navigator.geolocation) { alert('Twoja przeglądarka nie wspiera geolokalizacji.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
      },
      (err) => alert('Nie udało się pobrać lokalizacji: ' + err.message),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const resetVenueForm = () => {
    setName(''); setAddress(''); setPhone(''); setEmail('');
    setSeats(''); setLat(''); setLng(''); setDescription(''); setThumbFile(null);
    setEntries([]); setDay('Pon'); setStart('19:00'); setEnd('23:00');
  };

  // ZAPIS LOKALU
  const saveVenue = async (e) => {
    e.preventDefault();
    if (role !== 'admin') { alert('Brak uprawnień (wymagany admin).'); return; }

    setMsg('Zapisuję lokal…');

    // 1) upload miniatury do bucketa 'thumbs'
    let thumbUrl = null;
    if (thumbFile) {
      const filePath = `${Date.now()}_${thumbFile.name}`.replace(/\s+/g,'_');
      const { error: upErr } = await supabase.storage.from('thumbs').upload(filePath, thumbFile);
      if (upErr) { alert('Upload miniatury nie powiódł się: ' + upErr.message); setMsg(''); return; }
      const { data } = supabase.storage.from('thumbs').getPublicUrl(filePath);
      thumbUrl = data.publicUrl;
    }

    // 2) zapis do venues
    const schedule = buildSchedule();
    const { error } = await supabase.from('venues').insert([{
      name, address, phone, email,
      seats: seats ? Number(seats) : null,
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      thumb: thumbUrl,
      description,
      schedule
    }]);

    if (error) { alert('Błąd zapisu: ' + error.message); setMsg(''); return; }

    setMsg('Dodano lokal ✔️');
    resetVenueForm();
    await loadVenues();
    setTimeout(()=>setMsg(''), 1500);
  };

  // ZAPIS WYDARZENIA (konkretna data + czas)
  const saveEvent = async (e) => {
    e.preventDefault();
    if (role !== 'admin') { alert('Brak uprawnień (wymagany admin).'); return; }
    if (!eventVenueId) { alert('Wybierz lokal.'); return; }
    if (!eventDate) { alert('Wybierz datę.'); return; }

    setMsg('Zapisuję wydarzenie…');
    const { error } = await supabase.from('events').insert([{
      venue_id: eventVenueId,
      date: eventDate,           // YYYY-MM-DD
      start_time: eventStart,    // HH:MM
      end_time: eventEnd
    }]);

    if (error) { alert('Błąd zapisu wydarzenia: ' + error.message); setMsg(''); return; }
    setMsg('Dodano wydarzenie ✔️');
    setEventDate(''); setEventStart('19:00'); setEventEnd('23:00');
    setTimeout(()=>setMsg(''), 1500);
  };

  if (!session) {
    return (
      <div className="container">
        <h1>Panel administratora</h1>
        <p>Zaloguj się przez <a className="btn" href="/login">/login</a>.</p>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="container">
        <h1>Brak uprawnień</h1>
        <p>To konto nie ma roli <b>admin</b>.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>Panel administratora</h1>
      {msg && <div className="card">{msg}</div>}

      {/* ---- FORMULARZ: DODAJ LOKAL ---- */}
      <form className="card" onSubmit={saveVenue}>
        <h2>Dodaj lokal</h2>
        <div className="grid" style={{gap:12}}>
          <div>
            <label>Nazwa</label>
            <input value={name} onChange={e=>setName(e.target.value)} required />
          </div>

          <div>
            <label>Adres {mapsEnabled ? '(autouzupełnianie Google)' : ''}</label>
            <input ref={addressRef} value={address} onChange={e=>setAddress(e.target.value)} placeholder="ul. i miasto" />
            <div className="row" style={{gap:8, marginTop:6}}>
              <button type="button" className="btn" onClick={useMyLocation}>Użyj mojej lokalizacji</button>
            </div>
          </div>

          <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr', gap:12}}>
            <div>
              <label>Telefon</label>
              <input value={phone} onChange={e=>setPhone(e.target.value)} />
            </div>
            <div>
              <label>E-mail</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} />
            </div>
            <div>
              <label>Miejsca siedzące</label>
              <input type="number" value={seats} onChange={e=>setSeats(e.target.value)} />
            </div>
          </div>

          <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div>
              <label>Lat</label>
              <input type="number" step="0.000001" value={lat} onChange={e=>setLat(e.target.value)} />
            </div>
            <div>
              <label>Lng</label>
              <input type="number" step="0.000001" value={lng} onChange={e=>setLng(e.target.value)} />
            </div>
          </div>

          <div>
            <label>Miniaturka (z dysku)</label>
            <input type="file" accept="image/*" onChange={e=>setThumbFile(e.target.files?.[0] || null)} />
            <small>Zapisywana do bucketa <code>thumbs</code> w Supabase Storage.</small>
          </div>

          <div>
            <label>Opis</label>
            <textarea rows={3} value={description} onChange={e=>setDescription(e.target.value)} />
          </div>

          <div className="card">
            <div className="row" style={{gap:12, alignItems:'end'}}>
              <div>
                <label>Dzień</label>
                <select value={day} onChange={e=>setDay(e.target.value)}>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label>Od</label>
                <input type="time" value={start} onChange={e=>setStart(e.target.value)} />
              </div>
              <div>
                <label>Do</label>
                <input type="time" value={end} onChange={e=>setEnd(e.target.value)} />
              </div>
              <button type="button" className="btn" onClick={addEntry}>Dodaj dzień</button>
            </div>

            {entries.length > 0 && (
              <ul style={{marginTop:12}}>
                {entries.map((e,i)=>(
                  <li key={i} className="row" style={{gap:8}}>
                    {e.day} {e.start}-{e.end}
                    <button type="button" className="btn" onClick={()=>removeEntry(i)}>Usuń</button>
                  </li>
                ))}
              </ul>
            )}
            <small>Zapisywane do pola „schedule” jako tekst, np. „Pon 19:00-23:00, Pt 20:00-02:00”.</small>
          </div>

          <div>
            <button className="btn" type="submit">Zapisz lokal</button>
          </div>
        </div>
      </form>

      {/* ---- FORMULARZ: DODAJ WYDARZENIE (data + czas) ---- */}
      <form className="card" onSubmit={saveEvent}>
        <h2>Dodaj wydarzenie z konkretną datą</h2>
        <div className="grid" style={{gap:12}}>
          <div>
            <label>Lokal</label>
            <select value={eventVenueId} onChange={e=>setEventVenueId(e.target.value)} required>
              <option value="">-- wybierz --</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label>Data</label>
            <input type="date" value={eventDate} onChange={e=>setEventDate(e.target.value)} required />
          </div>
          <div>
            <label>Start</label>
            <input type="time" value={eventStart} onChange={e=>setEventStart(e.target.value)} required />
          </div>
          <div>
            <label>Koniec</label>
            <input type="time" value={eventEnd} onChange={e=>setEventEnd(e.target.value)} required />
          </div>
          <div>
            <button className="btn" type="submit">Zapisz wydarzenie</button>
          </div>
        </div>
      </form>

      <h2 style={{marginTop:24}}>Twoje lokale</h2>
      <div className="grid">
        {venues.map(v => (
          <div key={v.id} className="card">
            <div className="row" style={{gap:12}}>
              <strong>{v.name}</strong>
              <span className="badge">ID: {v.id.slice(0,8)}…</span>
            </div>
            <div>{v.address}</div>
            <div><small>{v.schedule}</small></div>
          </div>
        ))}
      </div>
    </div>
  );
}
