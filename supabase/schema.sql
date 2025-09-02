-- SCHEMA for Karaoke-SASPORT MVP
-- Tables: profiles, venues, ratings, comments, favorites, presence_logs, song_orders

-- Enable Extensions
create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  nickname text,
  avatar_url text,
  role text check (role in ('user','admin')) default 'user',
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Public read profiles" on profiles for select using (true);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);

-- Venues
create table if not exists venues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text not null,
  phone text,
  email text,
  seats int,
  lat double precision not null,
  lng double precision not null,
  thumb text,
  desc text,
  schedule text, -- e.g. "Pon 19:00-23:00, Pt 20:00-02:00"
  views int default 0,
  created_at timestamptz default now()
);
alter table venues enable row level security;
create policy "Public read venues" on venues for select using (true);
create policy "Only admin manage venues" on venues for all using (exists (select 1 from profiles p where p.id=auth.uid() and p.role='admin'));

-- Ratings
create table if not exists ratings (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid references venues(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  stars int check (stars between 1 and 5) not null,
  created_at timestamptz default now()
);
alter table ratings enable row level security;
create policy "Public read ratings" on ratings for select using (true);
create policy "Logged add rating" on ratings for insert with check (auth.uid() = user_id);
create policy "Users update own rating" on ratings for update using (auth.uid() = user_id);

-- Comments
create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid references venues(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  user_email text,
  text text not null,
  created_at timestamptz default now()
);
alter table comments enable row level security;
create policy "Public read comments" on comments for select using (true);
create policy "Logged add comment" on comments for insert with check (auth.uid() = user_id);
create policy "Users update own comment" on comments for update using (auth.uid() = user_id);

-- Favorites
create table if not exists favorites (
  user_id uuid references profiles(id) on delete cascade,
  venue_id uuid references venues(id) on delete cascade,
  primary key (user_id, venue_id)
);
alter table favorites enable row level security;
create policy "Logged manage favorites" on favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Presence logs (one 'I'm here' ping per user per day per venue)
create table if not exists presence_logs (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid references venues(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);
alter table presence_logs enable row level security;
create policy "Public read presence" on presence_logs for select using (true);
create policy "Logged add presence" on presence_logs for insert with check (auth.uid() = user_id);

-- Helper function: count presence for today window
create or replace function presence_count_now(p_venue uuid)
returns int language plpgsql as $$
declare cnt int;
begin
  select count(*) into cnt
  from presence_logs
  where venue_id = p_venue
    and created_at::date = now()::date;
  return cnt;
end $$;

-- Song orders
create table if not exists song_orders (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid references venues(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  user_email text,
  title text not null,
  artist text not null,
  created_at timestamptz default now()
);
alter table song_orders enable row level security;
create policy "Admin read orders" on song_orders for select using (exists (select 1 from profiles p where p.id=auth.uid() and p.role='admin'));
create policy "User insert their order" on song_orders for insert with check (auth.uid() = user_id);

-- INITIAL VENUES (Warsaw area) – 10 examples
insert into venues (id,name,address,phone,email,seats,lat,lng,thumb,desc,schedule) values
  (uuid_generate_v4(),'Bar Mikrofon','ul. Chmielna 12, Warszawa','+48 600 000 001','kontakt@barmikrofon.pl',80,52.2319,21.0106,'https://images.unsplash.com/photo-1551024709-8f23befc6cf7?q=80&w=1200&auto=format&fit=crop','Kameralny bar z klimatem karaoke w tygodniu i w weekendy.','Pon 19:00-23:00, Czw 19:00-23:30, Sob 20:00-01:00'),
  (uuid_generate_v4(),'Karaoke Klub Neon','al. Jana Pawła II 25, Warszawa','+48 600 000 002','neon@karaoke.pl',120,52.2412,21.0011,'https://images.unsplash.com/photo-1519750157634-b6d493a0f77c?q=80&w=1200&auto=format&fit=crop','Duża scena, światła, nagrody dla najlepszych.','Wt 20:00-00:00, Pt 21:00-02:00'),
  (uuid_generate_v4(),'Pub Śpiewajmy','ul. Dobra 44, Warszawa','+48 600 000 003','hello@spiewajmy.pub',60,52.2325,21.0280,'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=1200&auto=format&fit=crop','Rodzinna atmosfera i szeroki wybór utworów.','Śr 18:30-22:30, Nd 19:00-23:00'),
  (uuid_generate_v4(),'Studio Vocal','ul. Hoża 3, Warszawa','+48 600 000 004','kontakt@studiovocal.pl',50,52.2280,21.0110,'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1200&auto=format&fit=crop','Mała scena i świetne nagłośnienie.','Pon 20:00-23:30, Pt 20:30-01:30'),
  (uuid_generate_v4(),'Piwnica Dźwięków','ul. Tamka 20, Warszawa','+48 600 000 005','piwnica@karaoke.pl',70,52.2373,21.0201,'https://images.unsplash.com/photo-1546502203-168a8ad1cf52?q=80&w=1200&auto=format&fit=crop','Klimatyczna piwnica, oldschoolowe hity.','Czw 19:30-23:30, Sob 21:00-02:30'),
  (uuid_generate_v4(),'Cafe Melody','Pl. Zbawiciela 1, Warszawa','+48 600 000 006','melody@cafe.pl',40,52.2197,21.0186,'https://images.unsplash.com/photo-1470337458703-46ad1756a187?q=80&w=1200&auto=format&fit=crop','Przytulnie i blisko metra.','Śr 19:00-22:00, Nd 18:00-22:00'),
  (uuid_generate_v4(),'Klub Echo','ul. Złota 7, Warszawa','+48 600 000 007','echo@klub.pl',150,52.2302,21.0021,'https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?q=80&w=1200&auto=format&fit=crop','Duży klub, scena i konkursy.','Czw 20:00-01:00, Sob 21:30-03:00'),
  (uuid_generate_v4(),'Tawerna Nutka','ul. Solec 5, Warszawa','+48 600 000 008','nutka@tawerna.pl',90,52.2328,21.0412,'https://images.unsplash.com/photo-1512428925546-7c76aaeed60e?q=80&w=1200&auto=format&fit=crop','Śpiew przy gitarze i nowości.','Wt 19:00-23:00, Pt 20:00-01:00'),
  (uuid_generate_v4(),'Loft Harmonia','ul. Prosta 2, Warszawa','+48 600 000 009','harmonia@loft.pl',110,52.2321,20.9949,'https://images.unsplash.com/photo-1506157531507-1348eca1f9b1?q=80&w=1200&auto=format&fit=crop','Industrialny klimat, świeże listy przebojów.','Pon 19:30-23:30, Sob 21:00-02:00'),
  (uuid_generate_v4(),'Scena 4 Minuty','ul. Marszałkowska 100, Warszawa','+48 600 000 010','scena@4minuty.pl',130,52.2235,21.0120,'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1200&auto=format&fit=crop','Nazwa mówi sama za siebie 😉','Nd 19:00-23:00, Pt 20:00-01:30')
;
