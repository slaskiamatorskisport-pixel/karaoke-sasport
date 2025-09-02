# Karaoke-SASPORT — MVP (Next.js + Supabase)

**Cel:** działające MVP z wyszukiwarką karaoke "dzisiaj / kolejne dni", profilami lokali, rejestracją/logowaniem (Supabase), ocenami/komentarzami oraz panelem admina do zarządzania lokalami i zamówieniami piosenek.

## 1) Wymagania
- Konto na **GitHub**, **Vercel** i **Supabase** (darmowe).
- Node.js LTS 18+ (opcjonalnie tylko do uruchomienia lokalnie).

## 2) Supabase — konfiguracja (10–15 min)
1. Wejdź na **app.supabase.com** → Create project.
2. W Project Settings → API skopiuj:
   - `Project URL`
   - `anon public` (Anon key)
3. W zakładce **SQL** → wklej zawartość `supabase/schema.sql` i uruchom.
   - To utworzy tabele, RLS i dane przykładowe (10 lokali w Warszawie).
4. (Opcjonalnie) W **Authentication → Providers**:
   - Włącz e-mail/password (domyślnie włączone).
5. Utwórz konto administratora:
   - W **Authentication → Users** dodaj użytkownika z e-mailem **sasport@karaoke.local**
   - Ustaw hasło: **Fafrokita85!**
   - W **Table editor → profiles** ustaw kolumnę `role` na `"admin"` i `display_name` na `"SASPORT"` dla tego użytkownika.

## 3) Next.js — zmienne środowiskowe
Skopiuj `.env.local.example` do `.env.local` i wklej wartości z Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=...           # Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # anon public key
NEXT_PUBLIC_ADMIN_ALIAS_EMAIL=sasport@karaoke.local
```

## 4) Uruchom lokalnie
```bash
npm install
npm run dev
```

## 5) Deploy na Vercel (bardzo prosto)
1. Zaloguj się na **vercel.com**, kliknij **New Project** i zaimportuj repo (albo przeciągnij ten folder).
2. W **Environment Variables** dodaj:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_ALIAS_EMAIL`  → `sasport@karaoke.local`
3. Deploy. Po chwili adres będzie działał online.

## Logowanie admina
- W aplikacji wejdź w **/admin**. Formularz ma pole **Login**.
- Wpisz **SASPORT** jako login i **Fafrokita85!** jako hasło.
- Aplikacja zamieni login `SASPORT` na e-mail `NEXT_PUBLIC_ADMIN_ALIAS_EMAIL` i zaloguje przez Supabase.

## Uwaga bezpieczeństwo
- Hasła nie trzymamy w kodzie. To Supabase przechowuje je bezpiecznie.
- Dane (komentarze, oceny, zamówienia) zabezpiecza RLS — użytkownicy mogą edytować tylko swoje wpisy, admin ma pełen dostęp.

Powodzenia! ✨
