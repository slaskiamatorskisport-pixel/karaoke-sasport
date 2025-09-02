'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LoginPage() {
  const [email, setEmail] = useState('sasport@karaoke.local');
  const [password, setPassword] = useState('Fafrokita85!');
  const [msg, setMsg] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg('Logowanie…');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMsg('Błąd: ' + error.message); return; }
    setMsg('OK. Przechodzę do /admin…');
    window.location.href = '/admin';
  };

  return (
    <div className="container">
      <h1>Logowanie</h1>
      <form className="card" onSubmit={onSubmit}>
        <div className="grid" style={{gap:12}}>
          <div>
            <label>E-mail</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label>Hasło</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button className="btn" type="submit">Zaloguj</button>
          {msg && <small>{msg}</small>}
        </div>
      </form>
    </div>
  );
}
