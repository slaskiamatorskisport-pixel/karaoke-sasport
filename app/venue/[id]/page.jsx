'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase-browser';
import { computeNextOccurrence, DAY_NAMES, minutesToHuman } from '../../../lib/schedule';

export default function VenuePage({ params }){
  const { id } = params;
  const [venue, setVenue] = useState(null);
  const [session, setSession] = useState(null);
  const [comments, setComments] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [presenceCount, setPresenceCount] = useState(0);
  const [error, setError] = useState('');

  const pad = n=>String(n).padStart(2,'0');

  useEffect(()=>{
    const run = async()=>{
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      const { data: v, error: e } = await supabase.from('venues').select('*').eq('id', id).single();
      if(e){ setError('Nie znaleziono lokalu'); return; }
      setVenue(v);

      await supabase.from('venues').update({ views: (v.views||0)+1 }).eq('id', id);

      const { data: com } = await supabase.from('comments').select('*').eq('venue_id', id).order('created_at', {ascending:false});
      setComments(com||[]);
      const { data: rat } = await supabase.from('ratings').select('stars').eq('venue_id', id);
      setRatings(rat||[]);

      const { data: pres } = await supabase.rpc('presence_count_now', { p_venue: id });
      setPresenceCount(pres||0);
    };
    run();
  },[id]);

  if(!venue) return <div>Ładowanie…</div>;

  const occ = computeNextOccurrence(venue.schedule, new Date());
  const now = new Date();
  let remaining = 0, canSing = 0, occStr = 'brak danych';
  if(occ){
    occStr = `${(occ.status==='ongoing'?'TRWA – ':'')}${(occ.status==='ongoing'||occ.status==='today-upcoming')?'Dziś':DAY_NAMES[occ.day]} ${pad(occ.start.getHours())}:${pad(occ.start.getMinutes())}–${pad(occ.end.getHours())}:${pad(occ.end.getMinutes())}`;
    if(now>=occ.start && now<=occ.end){
      remaining = Math.max(0, Math.round((occ.end-now)/60000));
      canSing = Math.floor(remaining/4);
    }
  }
  const ratingAvg = ratings.length? (ratings.reduce((a,b)=>a+b.stars,0)/ratings.length).toFixed(1)+' / 5' : 'brak';

  async function submitOrder(e){
    e.preventDefault();
    const fd = new FormData(e.target);
    const title = fd.get('title'), artist = fd.get('artist');
    if(!session){ alert('Zaloguj się.'); return; }
    await supabase.from('song_orders').insert({ venue_id: id, user_id: session.user.id, user_email: session.user.email, title, artist });
    alert('Zamówienie zapisane. Administrator zobaczy je w panelu.');
  }

  async function imHere(){
    if(!session){ alert('Zaloguj się.'); return; }
    await supabase.from('presence_logs').insert({ venue_id:id, user_id:session.user.id });
    const { data: pres } = await supabase.rpc('presence_count_now', { p_venue: id });
    setPresenceCount(pres||0);
  }

  async function rate(e){
    e.preventDefault();
    const fd = new FormData(e.target);
    const stars = parseInt(fd.get('stars'),10);
    const comment = fd.get('comment');
    if(stars>=1 && stars<=5){
      const { error } = await supabase.from('ratings').insert({ venue_id:id, user_id: session.user.id, stars });
      if(!error && comment){
        await supabase.from('comments').insert({ venue_id:id, user_id: session.user.id, user_email: session.user.email, text:comment });
      }
      const { data: rat } = await supabase.from('ratings').select('stars').eq('venue_id', id);
      setRatings(rat||[]);
      const { data: com } = await supabase.from('comments').select('*').eq('venue_id', id).order('created_at', {ascending:false});
      setComments(com||[]);
      (e.target).reset();
    }
  }

  function mailPrize(){
    const sub = encodeURIComponent(`Wygraj nagrodę – ${(session?.user?.email)||'gość'}`);
    const body = encodeURIComponent(`Użytkownik: ${(session?.user?.email)||'gość'}\nLokal: ${venue.name} (${venue.id})\nData: ${new Date().toLocaleString()}`);
    window.location.href = `mailto:tchsasport@gmail.com?subject=${sub}&body=${body}`;
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'2fr 1fr'}}>
      <div>
        <img className="thumb" src={venue.thumb} alt="miniatura" style={{width:'100%',height:220,objectFit:'cover',borderRadius:12}}/>
        <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
          <h2 style={{margin:0}}>{venue.name}</h2>
          <span className="chip">Ocena: {ratingAvg}</span>
        </div>
        <div className="muted">{venue.address}</div>
        <div className="sep"></div>
        <p>{venue.desc||''}</p>
      </div>
      <div>
        <div className="card">
          <div className="row" style={{justifyContent:'space-between'}}>
            <div><div className="muted">Godziny karaoke (następny termin)</div><div className="value">{occStr}</div></div>
            <div><div className="muted">Miejsca</div><div className="value">{venue.seats||'-'}</div></div>
          </div>
          <div className="row" style={{justifyContent:'space-between'}}>
            <div><div className="muted">Telefon</div><div className="value">{venue.phone||'-'}</div></div>
            <div><div className="muted">E-mail</div><div className="value">{venue.email||'-'}</div></div>
          </div>
          <div className="row" style={{justifyContent:'space-between'}}>
            <div><div className="muted">Obecnie na karaoke</div><div className="value">{presenceCount}</div></div>
          </div>
        </div>

        <div className="sep"></div>
        {remaining>0? (
          <div className="card">
            <div><strong>Do końca karaoke dziś:</strong> {minutesToHuman(remaining)}</div>
            <div>Ile piosenek się zmieści (~4 min/utwór): <strong>{canSing}</strong></div>
          </div>
        ) : <div className="muted">Karaoke teraz nie trwa.</div>}

        <div className="sep"></div>
        <div className="card">
          <div className="row" style={{justifyContent:'space-between'}}>
            <strong>Akcje</strong>
            <button className="btn" onClick={imHere}>Jestem na karaoke</button>
          </div>
          <div className="row" style={{justifyContent:'space-between'}}>
            <button className="btn btn-primary" onClick={mailPrize}>Wygraj nagrodę</button>
          </div>
          <div className="sep"></div>
          <form onSubmit={submitOrder} className="grid">
            <div><strong>Zamów piosenkę</strong></div>
            <div className="row" style={{gap:8}}>
              <input name="title" placeholder="Tytuł" required/>
              <input name="artist" placeholder="Wykonawca" required/>
              <button className="btn btn-primary" type="submit">Wyślij</button>
            </div>
            <div className="muted">Zamówienie trafi do panelu administratora.</div>
          </form>
        </div>

        <div className="sep"></div>
        <div>
          <div className="row" style={{justifyContent:'space-between'}}><strong>Oceny i komentarze</strong><span className="muted">{ratings.length} ocen</span></div>
          <form onSubmit={rate} className="row" style={{gap:8, marginTop:8}}>
            <select name="stars" required>
              <option value="">Ocena (1–5)</option>
              <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
            </select>
            <input name="comment" placeholder="Komentarz (opcjonalnie)"/>
            <button className="btn btn-primary" type="submit">Wyślij</button>
          </form>
          <div className="list" style={{marginTop:10}}>
            {comments.length===0 && <div className="muted">Brak komentarzy.</div>}
            {comments.map(c=>(
              <div key={c.id} className="card">
                <div className="row" style={{justifyContent:'space-between'}}>
                  <strong>{c.user_email}</strong>
                  <span className="muted">{new Date(c.created_at).toLocaleString()}</span>
                </div>
                <div style={{marginTop:6}}>{c.text}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
