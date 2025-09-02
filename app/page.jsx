'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase-browser';
import { computeNextOccurrence, haversine, DAY_NAMES } from '../lib/schedule';

export default function HomePage(){
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function findKaraoke(){
    setLoading(true); setError('');
    let { data: venues, error } = await supabase.from('venues').select('*');
    if(error){ setError('Błąd pobierania lokali'); setLoading(false); return; }

    const now = new Date();
    let userPos = null;
    try{
      userPos = await new Promise((res)=>navigator.geolocation.getCurrentPosition(p=>res({lat:p.coords.latitude,lng:p.coords.longitude}), _=>res(null), {enableHighAccuracy:true,timeout:6000}));
    }catch(e){ userPos = null; }

    const enriched = venues.map(v=>{
      const occ = computeNextOccurrence(v.schedule, now);
      return { venue:v, occ };
    }).filter(x=>x.occ);

    const cat = x => x.occ.status==='ongoing'?0:(x.occ.status==='today-upcoming'?1:2);
    enriched.forEach(x=>{
      if(userPos) x.distanceKm = haversine(userPos.lat,userPos.lng,x.venue.lat,x.venue.lng);
      else x.distanceKm = null;
    });
    enriched.sort((a,b)=>{
      const ca=cat(a), cb=cat(b);
      if(ca!==cb) return ca-cb;
      if(a.distanceKm!=null && b.distanceKm!=null) return a.distanceKm-b.distanceKm;
      if(a.distanceKm!=null) return -1;
      if(b.distanceKm!=null) return 1;
      return a.occ.start - b.occ.start;
    });
    setItems(enriched.slice(0,10));
    setLoading(false);
  }

  useEffect(()=>{
    // nic na starcie; czeka na klik
  },[]);

  return (
    <div>
      <div className="center">
        <h1 className="headline">Znajdź karaoke w pobliżu</h1>
        <p className="muted">Najpierw pokażemy dzisiejsze (trwające → zbliżające), potem kolejne dni. W każdej grupie od najbliższego.</p>
        <div className="card" style={{width:'min(760px,96vw)'}}>
          <button className="btn btn-primary" onClick={findKaraoke} disabled={loading}>
            {loading ? 'Szukam…' : '🎤 Znajdź karaoke'}
          </button>
          <div className="list">
            {items.length===0 && <div className="muted">Kliknij „Znajdź karaoke”.</div>}
            {items.map((entry)=>{
              const v=entry.venue, occ=entry.occ;
              const dayLabel = (occ.status==='ongoing'||occ.status==='today-upcoming')?'Dziś':DAY_NAMES[occ.day];
              const pad = n=>String(n).padStart(2,'0');
              const when = `${dayLabel} ${pad(occ.start.getHours())}:${pad(occ.start.getMinutes())}–${pad(occ.end.getHours())}:${pad(occ.end.getMinutes())}`;
              return (
                <a className="card row" key={v.id} href={`/venue/${v.id}`} style={{alignItems:'center'}}>
                  <img className="thumb" src={v.thumb||'https://via.placeholder.com/240x160'} alt="miniatura"/>
                  <div style={{flex:1}}>
                    <div className="row" style={{justifyContent:'space-between'}}>
                      <div style={{fontWeight:800}}>{v.name}</div>
                      <span className="chip">{occ.status==='ongoing'?'TRWA':(occ.status==='today-upcoming'?'DZIŚ':DAY_NAMES[occ.day])}</span>
                    </div>
                    <div className="muted">{v.address}</div>
                    <div className="row" style={{justifyContent:'space-between'}}>
                      <div>{when}</div>
                      <div>{entry.distanceKm!=null? <strong>{entry.distanceKm.toFixed(1)} km</strong> : <span className="muted">brak dystansu</span>}</div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
          {error && <div className="muted">Błąd: {error}</div>}
        </div>
      </div>
    </div>
  );
}
