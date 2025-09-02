'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase-browser';

export default function RegisterPage(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [displayName,setDisplayName]=useState('');
  const [nickname,setNickname]=useState('');
  const [msg,setMsg]=useState('');

  async function register(e){
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if(error){ setMsg('Błąd rejestracji: ' + error.message); return; }
    // profil
    const user = data.user;
    if(user){
      await supabase.from('profiles').insert({ id:user.id, display_name: displayName, nickname });
    }
    setMsg('Konto utworzone. Sprawdź e-mail (jeśli włączone potwierdzenia).');
  }

  return (
    <div style={{maxWidth:520, margin:'0 auto'}}>
      <h2>Rejestracja</h2>
      <form onSubmit={register} className="grid">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail" required/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Hasło" required/>
        <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Imię / Pseudonim" required/>
        <input value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="Ksywka (opcjonalnie)"/>
        <button className="btn btn-primary" type="submit">Utwórz konto</button>
      </form>
      {msg && <div className="muted" style={{marginTop:8}}>{msg}</div>}
    </div>
  );
}
