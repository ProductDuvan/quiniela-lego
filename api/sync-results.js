// ============================================================
//  /api/sync-results.js  —  Serverless function (Vercel)
//
//  Qué hace:
//   1. Llama a football-data.org (WC) con la API key OCULTA en el server.
//   2. Mapea cada partido de la API a nuestros IDs de bracket (73–88)
//      usando el nombre de los equipos.
//   3. Escribe el ganador en la tabla `results` de Supabase usando la
//      service_role key (que NUNCA toca el navegador).
//
//  Se puede llamar:
//   - Manualmente:  GET /api/sync-results
//   - Por cron:     configurado en vercel.json (cada 10 min)
//
//  Variables de entorno necesarias (Vercel → Settings → Environment Variables):
//   FOOTBALL_DATA_TOKEN     -> tu API key de football-data.org
//   SUPABASE_URL            -> https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY    -> service_role key (secreta, solo backend)
// ============================================================

// Mapeo: nombre del equipo en la API  ->  lado en nuestro bracket.
// La API usa nombres en inglés. Mapeamos por el "tla"/nombre del equipo
// a nuestro id de partido + lado ('a' local, 'b' visitante).
//
// Nota: los nombres exactos de la API pueden variar ("USA" vs "United States").
// Por eso normalizamos y usamos coincidencia flexible (incluye varias formas).
const BRACKET = [
  { id: 73, a: ["south africa"],            b: ["canada"] },
  { id: 74, a: ["brazil"],                  b: ["japan"] },
  { id: 75, a: ["germany"],                 b: ["paraguay"] },
  { id: 76, a: ["netherlands"],             b: ["morocco"] },
  { id: 77, a: ["ivory coast", "cote d'ivoire", "côte d'ivoire"], b: ["norway"] },
  { id: 78, a: ["france"],                  b: ["sweden"] },
  { id: 79, a: ["mexico"],                  b: ["ecuador"] },
  { id: 80, a: ["england"],                 b: ["congo dr", "dr congo", "democratic republic of the congo", "congo"] },
  { id: 81, a: ["belgium"],                 b: ["senegal"] },
  { id: 82, a: ["united states", "usa", "us"], b: ["bosnia", "bosnia and herzegovina", "bosnia-herzegovina"] },
  { id: 83, a: ["spain"],                   b: ["austria"] },
  { id: 84, a: ["portugal"],                b: ["croatia"] },
  { id: 85, a: ["switzerland"],             b: ["algeria"] },
  { id: 86, a: ["australia"],               b: ["egypt"] },
  { id: 87, a: ["argentina"],               b: ["cape verde", "cabo verde"] },
  { id: 88, a: ["colombia"],                b: ["ghana"] },
];

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z\s']/g, "").trim();

function matchTeamToSide(homeName, awayName) {
  const h = norm(homeName);
  const a = norm(awayName);
  for (const m of BRACKET) {
    const homeIsA = m.a.some((n) => h.includes(norm(n)) || norm(n).includes(h));
    const awayIsB = m.b.some((n) => a.includes(norm(n)) || norm(n).includes(a));
    const homeIsB = m.b.some((n) => h.includes(norm(n)) || norm(n).includes(h));
    const awayIsA = m.a.some((n) => a.includes(norm(n)) || norm(n).includes(a));
    // Caso normal: home=lado a, away=lado b
    if (homeIsA && awayIsB) return { matchId: m.id, homeSide: "a", awaySide: "b" };
    // Por si la API invierte local/visitante
    if (homeIsB && awayIsA) return { matchId: m.id, homeSide: "b", awaySide: "a" };
  }
  return null;
}

export default async function handler(req, res) {
  const TOKEN = process.env.FOOTBALL_DATA_TOKEN;
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!TOKEN || !SB_URL || !SB_KEY) {
    return res.status(500).json({ error: "Faltan variables de entorno" });
  }

  try {
    // 1. Traer partidos del Mundial
    const apiRes = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches",
      { headers: { "X-Auth-Token": TOKEN } }
    );

    if (!apiRes.ok) {
      const txt = await apiRes.text();
      return res.status(apiRes.status).json({ error: "API football-data falló", detail: txt });
    }

    const data = await apiRes.json();
    const matches = data.matches || [];
    const updates = [];

    for (const fx of matches) {
      const home = fx.homeTeam?.name;
      const away = fx.awayTeam?.name;
      const mapped = matchTeamToSide(home, away);
      if (!mapped) continue; // partido que no es de nuestro R32

      // score.winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null
      // En knockouts no hay empate final: si hay penales, el winner ya refleja el avance.
      const w = fx.score?.winner;
      let winner = null;
      if (w === "HOME_TEAM") winner = mapped.homeSide;
      else if (w === "AWAY_TEAM") winner = mapped.awaySide;

      // Solo guardamos si ya terminó (o ganador definido)
      if (winner && (fx.status === "FINISHED" || fx.status === "AWARDED")) {
        updates.push({ match_id: mapped.matchId, winner, status: fx.status });
      }
    }

    // 2. Upsert a Supabase (tabla results) con service_role key
    if (updates.length > 0) {
      const upRes = await fetch(`${SB_URL}/rest/v1/results`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SB_KEY,
          "Authorization": `Bearer ${SB_KEY}`,
          "Prefer": "resolution=merge-duplicates", // upsert
        },
        body: JSON.stringify(updates.map((u) => ({ ...u, updated_at: new Date().toISOString() }))),
      });
      if (!upRes.ok) {
        const txt = await upRes.text();
        return res.status(500).json({ error: "Supabase upsert falló", detail: txt });
      }
    }

    return res.status(200).json({ ok: true, partidos_actualizados: updates.length, updates });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
