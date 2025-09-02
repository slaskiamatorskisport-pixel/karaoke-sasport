'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

export default function AdminPage(){
  const [session,setSession]=useState(null);
  const [profile,setProfile]=useState(null);
  const [venues,setVenues]=useState([]);
  const [orders,setOrders]=useState([]);
  const [form,setForm]=useState({id:null,name:'',address:'',phone:'',email:'',seats:0,lat:0,lng:0,thumb:'',desc:'',schedule:''});
  const [msg,setMsg]=useState('');

  useEffect(()=>{
    (async()=>{
      const { data: { session } } = await supabase.auth.getSession();
      if(!session){ window.location.href='/login'; return; }
      setSession(session);
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(prof);
      if(prof?.role!=='admin'){ alert('Brak uprawnień'); window.location.href='/'; return; }
      await reload();
    })();
  },[]);

  async function reload(){
    const { data: v } = await supabase.from('venues').select('*').order('created_at', {ascending:false});
    setVenues(v||[]);
    const { data: o } = await supabase.from('song_orders').select('*').order('created_at', {ascending:false});
    setOrders(o||[]);
  }

  function edit(v){
    setForm({ ...v });
  }
  async function del(v){
    if(!confirm('Usunąć lokal?')) return;
    await supabase.from('venues').delete().eq('id', v.id);
    await reload();
  }
  async function save(e){
    e.preventDefault();
    const payload = { ...form, seats: Number(form.seats), lat:Number(form.lat), lng:Number(form.lng) };
    if(form.id){
      const id=form.id; delete payload.id;
      await supabase.from('venues').update(payload).eq('id', id);
      setMsg('Zapisano zmiany.');
    }else{
      await supabase.from('venues').insert(payload);
      setMsg('Dodano lokal.');
    }
    setForm({id:null,name:'',address:'',phone:'',email:'',seats:0,lat:0,lng:0,thumb:'',desc:'',schedule:''});
    await reload();
  }

  return (
    <div>
      <h2>Panel Administratora</h2>
      <div className="grid" style={{gridTemplateColumns:'2fr 1fr'}}>
        <div>
          <h3>Lokale</h3>
          <div className="list">
            {venues.map(v=>(
              <div className="card row" key={v.id}>
                <img className="thumb" src={v.thumb} alt=""/>
                <div style={{flex:1}}>
                  <div className="row" style={{justifyContent:'space-between'}}>
                    <strong>{v.name}</strong>
                    <div className="row">
                      <button className="btn" onClick={()=>edit(v)}>Edytuj</button>
                      <button className="btn" onClick={()=>del(v)}>Usuń</button>
                    </div>
                  </div>
                  <div className="muted">{v.address}</div>
                  <div className="muted">Godziny: {v.schedule}</div>
                </div>
              </div>
            ))}
          </div>
          <h4>Dodaj / Edytuj lokal</h4>
          <form onSubmit={save} className="grid" style={{gap:8}}>
            {form.id && <input value={form.id} disabled/>}
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nazwa" required/>
            <input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="Adres" required/>
            <div className="row" style={{gap:8}}>
              <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Telefon"/>
              <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="E-mail"/>
              <input type="number" value={form.seats} onChange={e=>setForm({...form,seats:e.target.value})} placeholder="Miejsca"/>
            </div>
            <div className="row" style={{gap:8}}>
              <input type="number" step="any" value={form.lat} onChange={e=>setForm({...form,lat:e.target.value})} placeholder="lat" required/>
              <input type="number" step="any" value={form.lng} onChange={e=>setForm({...form,lng:e.target.value})} placeholder="lng" required/>
              <input value={form.thumb} onChange={e=>setForm({...form,thumb:e.target.value})} placeholder="Miniaturka URL"/>
            </div>
            <textarea value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} placeholder="Opis"/>
            <textarea value={form.schedule} onChange={e=>setForm({...form,schedule:e.target.value})} placeholder="Harmonogram (np. Pon 19:00-23:00, Pt 20:00-02:00)"/>
            <div className="row" style={{justifyContent:'flex-end'}}>
              <button className="btn" type="button" onClick={()=>setForm({id:null,name:'',address:'',phone:'',email:'',seats:0,lat:0,lng:0,thumb:'',desc:'',schedule:''})}>Wyczyść</button>
              <button className="btn btn-primary" type="submit">Zapisz</button>
            </div>
          </form>
          {msg && <div className="muted" style={{marginTop:8}}>{msg}</div>}
        </div>
        <div>
          <h3>Zamówione piosenki</h3>
          <div className="list">
            {orders.length===0 && <div className="muted">Brak pozycji.</div>}
            {orders.map(o=>(
              <div className="card" key={o.id}>
                <div><strong>{o.title}</strong> – {o.artist}</div>
                <div className="muted">{o.user_email} • {new Date(o.created_at).toLocaleString()}</div>
                <div className="muted">Lokal: {o.venue_id}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
