# 🎁 Quiniela LEGO · FIFA World Cup 2026 — Round of 32

Quiniela compartida para que varias personas predigan los ganadores de la Round of 32
del Mundial 2026, compitiendo por **un LEGO a elección**. Cada quien se registra desde
su teléfono, todos ven la misma tabla de posiciones en tiempo real, y los resultados
oficiales se sincronizan solos desde la API.

**Costo de operar: $0** (Vercel free + Supabase free + football-data.org free).

---

## Qué hace

- **Premio destacado** ("Un LEGO a tu elección") arriba de todo.
- **Registro por dispositivo:** cada persona abre el link, pone su nombre y avatar.
  Su teléfono recuerda quién es, así que **solo puede editar su propia quiniela**.
- **Countdown** al primer partido. Al llegar a cero, el registro y la edición se **cierran**.
- **Posiciones en vivo** con corona para el líder, actualizadas en tiempo real (Supabase Realtime).
- **Resultados automáticos:** un cron llama a football-data.org cada 10 min y marca
  los ganadores reales. Nadie los edita a mano.

---

## Arquitectura ($0)

```
  Teléfonos ─────► Vercel (React estático)
                      │
                      ├──► Supabase  (Postgres + Realtime)   ← jugadores, picks, resultados
                      │
                      └──► /api/sync-results (cron 10 min)
                              │
                              └──► football-data.org (WC)  ← resultados oficiales
```

La API key de football-data.org y la service_role de Supabase **viven solo en el
backend de Vercel**, nunca en el navegador.

---

## Pasos para desplegarlo (≈20 min)

### 1. Supabase (base de datos)
1. Crea cuenta gratis en https://supabase.com y un proyecto nuevo.
2. Ve a **SQL Editor → New query**, pega todo el contenido de `supabase-schema.sql` y ejecútalo.
3. Ve a **Project Settings → API** y copia:
   - **Project URL** → será `SUPABASE_URL` y `VITE_SUPABASE_URL`
   - **anon public key** → será `VITE_SUPABASE_ANON_KEY`
   - **service_role key** (sección "Project API keys", la secreta) → será `SUPABASE_SERVICE_KEY`
4. (Realtime ya viene activo; si no, actívalo en **Database → Replication** para las 3 tablas.)

### 2. football-data.org (resultados)
1. Regístrate gratis en https://www.football-data.org/client/register
2. Copia tu **API token** → será `FOOTBALL_DATA_TOKEN`.
3. El Mundial (código `WC`) está incluido en el plan gratis (10 req/min). Uso no comercial.

### 3. Vercel (hosting)
1. Sube esta carpeta a un repo de GitHub.
2. En https://vercel.com → **Add New → Project** → importa el repo.
3. En **Settings → Environment Variables** agrega las 5 variables (ver `.env.example`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `FOOTBALL_DATA_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
4. **Deploy.** Vercel detecta Vite automáticamente.
5. El cron de `vercel.json` empieza a correr solo cada 10 minutos.

### 4. Probar
- Abre la URL que te da Vercel, regístrate, comparte el link con los demás.
- Para forzar una sincronización de resultados manual: visita `https://TU-APP.vercel.app/api/sync-results`

---

## Ajustes rápidos

- **Mover el cierre del registro:** edita `LOCK_TIME` en `src/App.jsx` (formato ISO UTC).
- **Cambiar el premio:** edita el bloque "PREMIO" en `src/App.jsx`.
- **Frecuencia de sincronización:** edita el `schedule` en `vercel.json` (formato cron).

---

## Sobre los costos

| Servicio            | Plan usado | Límite relevante                  | ¿Suficiente? |
|---------------------|-----------|-----------------------------------|--------------|
| Vercel              | Hobby     | Proyectos personales              | Sí           |
| Supabase            | Free      | 500MB DB, Realtime incluido       | De sobra     |
| football-data.org   | Free      | 10 req/min, Mundial incluido      | Sí (1 req/10min) |

El cron hace **1 petición cada 10 minutos** (~144/día), muy por debajo del límite.
Saldrías del free tier solo con tráfico de miles de usuarios simultáneos.

> ⚠️ El plan gratis de football-data.org es para **uso no comercial**. Una quiniela
> entre amigos por un LEGO califica. Si lo monetizas, contacta a football-data.org.

---

## Nota sobre la identidad por dispositivo

Cada teléfono guarda un id estable en `localStorage` y solo puede editar la quiniela
ligada a ese id. Es el modelo correcto para un grupo de confianza. Si en el futuro
quieres blindarlo (que nadie pueda suplantar a otro ni con trucos de navegador),
el siguiente paso es **Supabase Auth anónima**, que ata cada jugador a una sesión
verificada sin pedir contraseña. No es necesario para empezar.
