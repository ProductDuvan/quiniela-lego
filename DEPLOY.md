# DEPLOY.md — Instrucciones de despliegue para Claude Code

> Este archivo está escrito para que un agente (Claude Code) ejecute el despliegue
> a producción de principio a fin. Sigue los pasos en orden y pausa donde se indique.

## Contexto del proyecto

Quiniela familiar en React para el Mundial 2026 (Round of 32). El ganador —quien más
aciertos acumule— se lleva un LEGO a su elección.

**Stack:**
- Vite + React (frontend estático)
- Supabase (Postgres + Realtime) como base de datos compartida
- Función serverless en Vercel (`api/sync-results.js`) que sincroniza resultados
  oficiales desde football-data.org mediante un cron cada 10 minutos

**Objetivo:** desplegar gratis y terminar con una URL pública para compartir por WhatsApp.

**Antes de nada:** lee el `README.md`. Tiene la arquitectura completa, las 5 variables
de entorno y el detalle de cada servicio. Este DEPLOY.md es el checklist ejecutable.

---

## Paso 1 — Verificación inicial

- [ ] Instala dependencias (`npm install`) y corre `npm run build`. Debe compilar sin errores.
- [ ] Confirma que existen estos archivos:
      `src/App.jsx`, `api/sync-results.js`, `supabase-schema.sql`, `vercel.json`, `.env.example`
- [ ] Verifica si están instaladas las CLIs `vercel`, `gh` y `supabase`.
      Si falta alguna, instálala antes de continuar.

## Paso 2 — Ajuste obligatorio antes de desplegar ⚠️

- [ ] En `src/App.jsx` existe la constante `LOCK_TIME`, que define cuándo se cierra el
      registro de quinielas (el arranque del primer partido). **Puede estar apuntando a
      una fecha en el pasado**, lo que dejaría la quiniela bloqueada desde el inicio.

> **PAUSA AQUÍ.** Pregunta al usuario qué fecha y hora de cierre quiere.
> Actualiza `LOCK_TIME` en formato ISO UTC (ej. `new Date("2026-07-10T18:00:00Z")`).
> NO continúes con el despliegue hasta tener esta fecha confirmada.

## Paso 3 — Supabase (base de datos)

- [ ] Guía al usuario para crear un proyecto en https://supabase.com (lo hace él con su cuenta).
- [ ] Aplica el esquema `supabase-schema.sql`, por la vía más confiable:
      - con la CLI `supabase` si está autenticada, **o**
      - entregando el SQL para que el usuario lo pegue en **SQL Editor → New query → Run**.
- [ ] Pide y registra estos tres valores (de **Project Settings → API**):
      - **Project URL** → `SUPABASE_URL` y `VITE_SUPABASE_URL`
      - **anon public key** → `VITE_SUPABASE_ANON_KEY`
      - **service_role key** (la secreta) → `SUPABASE_SERVICE_KEY`
- [ ] Verifica que Realtime esté activo para las tablas `players`, `picks`, `results`
      (Database → Replication). Si no, actívalo.

## Paso 4 — football-data.org (resultados)

- [ ] Recuerda al usuario registrarse en https://www.football-data.org/client/register
      (este servicio **no tiene CLI**; el token se obtiene del dashboard).
- [ ] Pide el **API token** → `FOOTBALL_DATA_TOKEN`.

## Paso 5 — Vercel (deploy + URL)

- [ ] Inicializa git si hace falta. Confirma que `.env` está en `.gitignore`.
- [ ] Crea un repo nuevo en GitHub y sube el proyecto (`gh repo create` + push).
- [ ] Despliega con `vercel`. Configura las 5 variables con `vercel env add`
      (para Production):
      - `VITE_SUPABASE_URL` (pública)
      - `VITE_SUPABASE_ANON_KEY` (pública)
      - `FOOTBALL_DATA_TOKEN` (secreta)
      - `SUPABASE_URL` (secreta)
      - `SUPABASE_SERVICE_KEY` (secreta)
- [ ] Despliega a producción: `vercel --prod`. Entrega la URL final al usuario.

## Paso 6 — Verificación final

- [ ] Llama a `https://<tu-app>.vercel.app/api/sync-results`. Debe responder sin error
      de credenciales (un JSON con `partidos_actualizados`).
- [ ] Confirma que el cron de `vercel.json` quedó registrado en el dashboard de Vercel.
- [ ] Entrega la **URL pública lista para compartir**.

---

## Reglas para el agente

- Donde el usuario deba autenticarse (`vercel login`, `gh auth login`, `supabase login`)
  o crear una cuenta: **DETENTE** y dile exactamente qué hacer. No inventes credenciales.
- **Nunca** subas claves secretas al repo de GitHub. Las claves viven solo en las
  variables de entorno de Vercel. Verifica `.gitignore` antes del primer push.
- Antes de cada comando que modifique algo o gaste cuota, explica qué vas a hacer.
- Si un paso falla, muestra el error y propón el arreglo antes de reintentar.

## Recordatorios de costos / límites

- Vercel Hobby, Supabase Free y football-data.org Free cubren este proyecto a **$0**.
- El cron hace ~144 peticiones/día (1 cada 10 min), debajo del límite de 10/min.
- El plan gratis de football-data.org es para **uso no comercial** — una quiniela
  familiar por un LEGO califica.
