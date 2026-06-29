-- ============================================================
--  Quiniela LEGO · Esquema de base de datos (Supabase / Postgres)
--  Ejecuta esto en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Jugadores registrados (uno por dispositivo)
create table if not exists players (
  id          text primary key,           -- generado en el cliente (device id)
  name        text not null,
  avatar      text not null,
  color       text not null,
  created_at  timestamptz default now()
);

-- Predicciones: una fila por (jugador, partido)
create table if not exists picks (
  player_id   text references players(id) on delete cascade,
  match_id    int  not null,
  side        text not null check (side in ('a','b')),
  created_at  timestamptz default now(),
  primary key (player_id, match_id)
);

-- Resultados reales (los llena el cron desde la API, o un admin a mano)
create table if not exists results (
  match_id    int primary key,
  winner      text check (winner in ('a','b')),   -- 'a' = local, 'b' = visitante
  status      text,                                -- FINISHED, IN_PLAY, etc.
  updated_at  timestamptz default now()
);

-- ============================================================
--  Row Level Security (RLS)
--  Permitimos lectura pública y escritura pública controlada.
--  Para una quiniela entre amigos esto es suficiente: la
--  identidad por dispositivo evita que edites la quiniela de otro
--  (la lógica vive en el cliente). Si quieres blindarlo más,
--  pásate a Supabase Auth anónima.
-- ============================================================

alter table players enable row level security;
alter table picks   enable row level security;
alter table results enable row level security;

-- Lectura abierta para todos
create policy "lectura publica players" on players for select using (true);
create policy "lectura publica picks"   on picks   for select using (true);
create policy "lectura publica results" on results for select using (true);

-- Inserción/edición abierta de jugadores y picks (cliente anónimo con la anon key)
create policy "alta players"   on players for insert with check (true);
create policy "borrar players" on players for delete using (true);

create policy "alta picks"     on picks for insert with check (true);
create policy "editar picks"   on picks for update using (true) with check (true);
create policy "borrar picks"   on picks for delete using (true);

-- Los resultados NO se editan desde el cliente: solo el backend con la service_role key.
-- (No creamos policy de escritura pública para results a propósito.)
