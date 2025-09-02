'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase-browser';

export default function LoginPage(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [msg,setMsg]=useState('');

  useEffect(()=>{
    // nada
  },[]);

  async function login(e){
    e.preventDefault();
    let userEmail = email;
    if(email.trim().toUpperCase()==='SASPORT'){
      const adminAlias = process.env.NEXT_PUBLIC_ADMIN_ALIAS_EMAIL || 'sasport@karaoke.local';
      userEmail = adminAlias;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email: userEmail, password });
    if(error){ setMsg('Błąd logowania: ' + error.message); return; }
    setMsg('Zalogowano.'); window.location.href='/';
  }

  return (
    <div style={{maxWidth:480, margin:'0 auto'}}>
      <h2>Logowanie</h2>
      <form onSubmit={login} className="grid">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail lub SASPORT"/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Hasło"/>
        <button className="btn btn-primary" type="submit">Zaloguj</button>
      </form>
      {msg && <div className="muted" style={{marginTop:8}}>{msg}</div>}
    </div>
  );
}
