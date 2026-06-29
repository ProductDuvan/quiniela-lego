import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Check, Lock, UserPlus, Clock, RefreshCw, Pencil } from "lucide-react";
import { supabase } from "./supabaseClient";

// Cada partido lleva su hora de inicio UTC. El bloqueo es por partido:
// un partido se cierra individualmente cuando arranca, y el registro
// permanece abierto mientras haya al menos un partido futuro.
// startUTC tomados directamente de football-data.org. Horas CDMX = UTC-6.
const MATCHES = [
  { id: 73, startUTC: "2026-06-28T19:00:00Z", date: "Dom 28 Jun", time: "13:00 CDMX", venue: "Los Angeles",      a: "Sudáfrica",        b: "Canadá",     fa: "🇿🇦", fb: "🇨🇦" },
  { id: 74, startUTC: "2026-06-29T17:00:00Z", date: "Lun 29 Jun", time: "11:00 CDMX", venue: "Houston",          a: "Brasil",           b: "Japón",      fa: "🇧🇷", fb: "🇯🇵" },
  { id: 75, startUTC: "2026-06-29T20:30:00Z", date: "Lun 29 Jun", time: "14:30 CDMX", venue: "Boston",           a: "Alemania",         b: "Paraguay",   fa: "🇩🇪", fb: "🇵🇾" },
  { id: 76, startUTC: "2026-06-30T01:00:00Z", date: "Lun 29 Jun", time: "19:00 CDMX", venue: "Monterrey",        a: "Países Bajos",     b: "Marruecos",  fa: "🇳🇱", fb: "🇲🇦" },
  { id: 77, startUTC: "2026-06-30T17:00:00Z", date: "Mar 30 Jun", time: "11:00 CDMX", venue: "Dallas",           a: "Costa de Marfil",  b: "Noruega",    fa: "🇨🇮", fb: "🇳🇴" },
  { id: 78, startUTC: "2026-06-30T21:00:00Z", date: "Mar 30 Jun", time: "15:00 CDMX", venue: "Nueva York/NJ",    a: "Francia",          b: "Suecia",     fa: "🇫🇷", fb: "🇸🇪" },
  { id: 79, startUTC: "2026-07-01T01:00:00Z", date: "Mar 30 Jun", time: "19:00 CDMX", venue: "Ciudad de México", a: "México",           b: "Ecuador",    fa: "🇲🇽", fb: "🇪🇨" },
  { id: 80, startUTC: "2026-07-01T16:00:00Z", date: "Mié 01 Jul", time: "10:00 CDMX", venue: "Atlanta",          a: "Inglaterra",       b: "RD del Congo", fa: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", fb: "🇨🇩" },
  { id: 81, startUTC: "2026-07-01T20:00:00Z", date: "Mié 01 Jul", time: "14:00 CDMX", venue: "Seattle",          a: "Bélgica",          b: "Senegal",    fa: "🇧🇪", fb: "🇸🇳" },
  { id: 82, startUTC: "2026-07-02T00:00:00Z", date: "Mié 01 Jul", time: "18:00 CDMX", venue: "San Francisco Bay",a: "Estados Unidos",   b: "Bosnia",     fa: "🇺🇸", fb: "🇧🇦" },
  { id: 83, startUTC: "2026-07-02T19:00:00Z", date: "Jue 02 Jul", time: "13:00 CDMX", venue: "Los Angeles",      a: "España",           b: "Austria",    fa: "🇪🇸", fb: "🇦🇹" },
  { id: 84, startUTC: "2026-07-02T23:00:00Z", date: "Jue 02 Jul", time: "17:00 CDMX", venue: "Toronto",          a: "Portugal",         b: "Croacia",    fa: "🇵🇹", fb: "🇭🇷" },
  { id: 85, startUTC: "2026-07-03T03:00:00Z", date: "Jue 02 Jul", time: "21:00 CDMX", venue: "Vancouver",        a: "Suiza",            b: "Argelia",    fa: "🇨🇭", fb: "🇩🇿" },
  { id: 86, startUTC: "2026-07-03T18:00:00Z", date: "Vie 03 Jul", time: "12:00 CDMX", venue: "Dallas",           a: "Australia",        b: "Egipto",     fa: "🇦🇺", fb: "🇪🇬" },
  { id: 87, startUTC: "2026-07-03T22:00:00Z", date: "Vie 03 Jul", time: "16:00 CDMX", venue: "Miami",            a: "Argentina",        b: "Cabo Verde", fa: "🇦🇷", fb: "🇨🇻" },
  { id: 88, startUTC: "2026-07-04T01:30:00Z", date: "Vie 03 Jul", time: "19:30 CDMX", venue: "Kansas City",      a: "Colombia",         b: "Ghana",      fa: "🇨🇴", fb: "🇬🇭" },
];

const AVATARS = ["⚽", "🏆", "🦁", "🐉", "🔥", "⭐", "🚀", "🎯", "👑", "🐺", "🦅", "🐲", "💎", "🌟", "⚡", "🎮"];
const COLORS = ["#db2777", "#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#0891b2", "#ca8a04", "#dc2626"];

// Identidad por dispositivo: un id estable guardado en localStorage.
function getDeviceId() {
  let id = localStorage.getItem("quiniela_device_id");
  if (!id) {
    id = "p" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("quiniela_device_id", id);
  }
  return id;
}

// Emblema original de ladrillo (no es una marca registrada).
function BrickEmblem({ size = 46 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Ladrillo de construcción">
      <rect x="13" y="11" width="14" height="9" rx="2" fill="#fff" fillOpacity="0.92" />
      <rect x="37" y="11" width="14" height="9" rx="2" fill="#fff" fillOpacity="0.92" />
      <ellipse cx="20" cy="12" rx="7" ry="4" fill="#fff" />
      <ellipse cx="44" cy="12" rx="7" ry="4" fill="#fff" />
      <rect x="10" y="19" width="44" height="31" rx="3" fill="#fff" />
      <rect x="10" y="43" width="44" height="7" rx="3" fill="#000" fillOpacity="0.12" />
      <circle cx="20" cy="33" r="3.4" fill="#000" fillOpacity="0.10" />
      <circle cx="44" cy="33" r="3.4" fill="#000" fillOpacity="0.10" />
    </svg>
  );
}

export default function App() {
  const deviceId = getDeviceId();
  const [players, setPlayers] = useState([]);
  const [picks, setPicks] = useState({});      // {playerId: {matchId: 'a'|'b'}}
  const [results, setResults] = useState({});  // {matchId: 'a'|'b'}
  const [me, setMe] = useState(null);          // mi jugador (o null si no me he registrado)
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState(AVATARS[0]);
  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem("quiniela_welcome_seen")
  );

  const dismissWelcome = () => {
    localStorage.setItem("quiniela_welcome_seen", "1");
    setShowWelcome(false);
  };

  // Un partido se bloquea individualmente cuando arranca.
  // El registro permanece abierto mientras haya al menos un partido futuro.
  const matchLocked = (m) => now >= new Date(m.startUTC).getTime();
  const nextMatch = MATCHES.find((m) => !matchLocked(m));
  const registrationLocked = !nextMatch;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Carga inicial + suscripción en tiempo real
  const loadAll = useCallback(async () => {
    const [{ data: pl }, { data: pk }, { data: rs }] = await Promise.all([
      supabase.from("players").select("*").order("created_at"),
      supabase.from("picks").select("*"),
      supabase.from("results").select("*"),
    ]);
    const playersList = pl || [];
    setPlayers(playersList);
    setMe(playersList.find((p) => p.id === deviceId) || null);

    const pkMap = {};
    (pk || []).forEach((r) => {
      pkMap[r.player_id] = pkMap[r.player_id] || {};
      pkMap[r.player_id][r.match_id] = r.side;
    });
    setPicks(pkMap);

    const rsMap = {};
    (rs || []).forEach((r) => { if (r.winner) rsMap[r.match_id] = r.winner; });
    setResults(rsMap);

    setLoading(false);
  }, [deviceId]);

  useEffect(() => {
    loadAll();
    // Realtime: cuando alguien más cambia algo, recargamos
    const ch = supabase
      .channel("quiniela")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "picks" }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "results" }, loadAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadAll]);

  const register = async () => {
    const name = newName.trim();
    if (!name || registrationLocked) return;
    const player = {
      id: deviceId,
      name,
      avatar: newAvatar,
      color: COLORS[players.length % COLORS.length],
    };
    await supabase.from("players").upsert(player);
    setShowAdd(false); setNewName("");
    loadAll();
  };

  const setPick = async (match, side) => {
    if (matchLocked(match) || !me) return;
    setPicks((prev) => ({ ...prev, [me.id]: { ...(prev[me.id] || {}), [match.id]: side } }));
    await supabase.from("picks").upsert({ player_id: me.id, match_id: match.id, side });
  };

  const score = (playerId) =>
    MATCHES.reduce((acc, m) => {
      const pick = picks[playerId]?.[m.id];
      const res = results[m.id];
      return acc + (pick && res && pick === res ? 1 : 0);
    }, 0);

  const decided = Object.keys(results).length;
  const ranked = [...players].sort((a, b) => score(b.id) - score(a.id));
  const topScore = ranked.length ? score(ranked[0].id) : 0;

  // Progreso de MI quiniela: cuántos de los 16 ya elegí
  const myPicksCount = me ? Object.keys(picks[me.id] || {}).length : 0;
  const myComplete = myPicksCount === MATCHES.length;

  // ¿Terminó todo el bracket? (los 16 partidos definidos)
  const tournamentOver = decided === MATCHES.length && players.length > 0;
  // Ganador(es): puede haber empate en el primer lugar
  const winners = tournamentOver
    ? ranked.filter((p) => score(p.id) === topScore && topScore > 0)
    : [];

  const fmt = () => {
    let d = Math.max(0, nextMatch ? new Date(nextMatch.startUTC).getTime() - now : 0);
    const dd = Math.floor(d / 86400000); d -= dd * 86400000;
    const hh = Math.floor(d / 3600000); d -= hh * 3600000;
    const mm = Math.floor(d / 60000); d -= mm * 60000;
    const ss = Math.floor(d / 1000);
    const p = (n) => String(n).padStart(2, "0");
    return { dd, hh: p(hh), mm: p(mm), ss: p(ss) };
  };
  const c = fmt();

  if (loading) {
    return <div style={S.loading}><RefreshCw size={20} style={{ animation: "spin 1s linear infinite" }} /> Cargando Faminiela…</div>;
  }

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}} *{box-sizing:border-box}`}</style>

      {/* PANTALLA DE BIENVENIDA */}
      {showWelcome && (
        <div style={S.overlay} onClick={dismissWelcome}>
          <div style={S.welcomeCard} onClick={(e) => e.stopPropagation()}>
            <div style={S.welcomeEmoji}>🏆</div>
            <h2 style={S.welcomeTitle}>¡Bienvenido a la Faminiela!</h2>
            <p style={S.welcomeIntro}>Adivina quién gana cada partido de la Round of 32 del Mundial. El que más le atine se lleva el premio.</p>
            <div style={S.welcomeRules}>
              <div style={S.welcomeRule}><span style={S.ruleNum}>1</span> Regístrate con tu nombre y un avatar.</div>
              <div style={S.welcomeRule}><span style={S.ruleNum}>2</span> Elige al ganador de los 16 partidos.</div>
              <div style={S.welcomeRule}><span style={S.ruleNum}>3</span> Cada partido se cierra individualmente al arrancar — el resto sigue abierto.</div>
              <div style={S.welcomeRule}><span style={S.ruleNum}>4</span> Cada acierto suma un punto. ¡Sigue la tabla en vivo!</div>
            </div>
            <div style={S.welcomePrize}><BrickEmblem size={20} /> Premio: un set de LEGO a elección del ganador</div>
            <button style={S.welcomeBtn} onClick={dismissWelcome}>¡Vamos!</button>
          </div>
        </div>
      )}

      <div style={S.wrap}>

        {/* ANUNCIO DEL GANADOR (cuando terminan los 16 partidos) */}
        {tournamentOver && winners.length > 0 && (
          <div style={S.champion}>
            <div style={S.championConfetti}>🎉🎊🏆🎊🎉</div>
            <div style={S.championLabel}>
              {winners.length === 1 ? "¡Tenemos ganador!" : "¡Empate en el primer lugar!"}
            </div>
            <div style={S.championNames}>
              {winners.map((w) => (
                <span key={w.id} style={{ color: "#fff" }}>{w.avatar} {w.name}</span>
              ))}
            </div>
            <div style={S.championPrize}>
              {winners.length === 1 ? "se lleva el LEGO 🎁" : "comparten el primer lugar 🎁"}
              {" "}· {topScore} aciertos
            </div>
          </div>
        )}

        {/* PREMIO */}
        <div style={S.prize}>
          <div style={S.prizeBrick}><BrickEmblem size={52} /></div>
          <div style={S.prizeText}>
            <div style={S.prizeEyebrow}>Premio del ganador</div>
            <div style={S.prizeTitle}>Un set de LEGO a tu elección</div>
            <div style={S.prizeSub}>Quien acumule más aciertos hasta la final del mundial, se lo lleva.</div>
          </div>
        </div>

        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={S.eyebrow}><Trophy size={15} /> FIFA World Cup 2026</div>
          <h1 style={S.h1}>Faminiela · Round of 32</h1>
        </div>

        {/* COUNTDOWN / LOCK */}
        <div style={{ ...S.countdown, background: registrationLocked ? "#3f1d1d" : "#1e293b", borderColor: registrationLocked ? "#ef4444" : "#334155" }}>
          {registrationLocked ? (
            <div style={S.lockRow}><Lock size={18} /> Todos los partidos han iniciado · Faminiela cerrada</div>
          ) : (
            <>
              <div style={S.countLabel}><Clock size={13} /> Próximo partido cierra en</div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
                {nextMatch.fa} {nextMatch.a} vs {nextMatch.fb} {nextMatch.b} · {nextMatch.date} {nextMatch.time}
              </div>
              <div style={S.countRow}>
                {[[c.dd, "días"], [c.hh, "hrs"], [c.mm, "min"], [c.ss, "seg"]].map(([v, l], i) => (
                  <div key={i} style={{ minWidth: 48 }}>
                    <div style={S.countNum}>{v}</div>
                    <div style={S.countUnit}>{l}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* POSICIONES */}
        {players.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={S.sectionLabel}>Posiciones</div>

            {/* Podio top 3 — orden visual: 2º · 1º · 3º */}
            {(() => {
              const top = ranked.slice(0, 3);
              // Si hay 3+, ordenamos para el podio: [2º, 1º, 3º]
              const podiumOrder = top.length === 3 ? [top[1], top[0], top[2]]
                : top.length === 2 ? [top[1], top[0]]
                : top;
              const heights = { 0: 64, 1: 92, 2: 48 }; // por lugar real
              const realRank = (p) => ranked.indexOf(p); // 0,1,2
              const medal = ["🥇", "🥈", "🥉"];
              return (
                <div style={S.podium}>
                  {podiumOrder.map((p) => {
                    const r = realRank(p);
                    const s = score(p.id);
                    const isMe = p.id === deviceId;
                    return (
                      <div key={p.id} style={S.podiumCol}>
                        <div style={{ fontSize: r === 0 ? 30 : 24 }}>{p.avatar}</div>
                        <div style={{ ...S.podiumName, color: p.color }}>
                          {p.name}{isMe && <span style={S.youTag}>tú</span>}
                        </div>
                        <div style={S.podiumScore}>{s}</div>
                        <div style={{
                          ...S.podiumBlock,
                          height: heights[r],
                          background: `linear-gradient(180deg, ${p.color}, ${p.color}99)`,
                        }}>
                          <span style={S.podiumMedal}>{medal[r]}</span>
                          <span style={S.podiumPlace}>{r + 1}º</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Resto (4º en adelante) como lista */}
            {ranked.length > 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                {ranked.slice(3).map((p, idx) => {
                  const s = score(p.id);
                  const isMe = p.id === deviceId;
                  return (
                    <div key={p.id} style={S.rankRow}>
                      <span style={S.rankPos}>{idx + 4}</span>
                      <span style={{ fontSize: 22 }}>{p.avatar}</span>
                      <span style={{ flex: 1, fontWeight: 700, color: p.color }}>
                        {p.name}{isMe && <span style={S.youTag}>tú</span>}
                      </span>
                      <span style={S.rankScore}>{s}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={S.decidedNote}>Aciertos de {decided} partidos definidos</div>
          </div>
        )}

        {/* REGISTRO (solo si no me he registrado y hay partidos futuros) */}
        {!me && !registrationLocked && (
          <div style={{ marginBottom: 16 }}>
            {showAdd ? (
              <div style={S.card}>
                <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && register()}
                  placeholder="Tu nombre" style={S.input} />
                <div style={S.miniLabel}>Elige tu avatar</div>
                <div style={S.avatarGrid}>
                  {AVATARS.map((a) => (
                    <button key={a} onClick={() => setNewAvatar(a)}
                      style={{ ...S.avatarBtn, background: newAvatar === a ? "#2563eb" : "#0f172a", borderColor: newAvatar === a ? "#2563eb" : "#334155" }}>{a}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={register} style={S.primaryBtn}>Registrarme</button>
                  <button onClick={() => setShowAdd(false)} style={S.ghostBtn}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAdd(true)} style={S.addBtn}>
                <UserPlus size={16} /> Registrarme en la Faminiela
              </button>
            )}
          </div>
        )}

        {me && !registrationLocked && (
          <div style={S.meBanner}>
            <div style={S.meTop}>
              <span>
                Juegas como <strong style={{ color: me.color }}>{me.avatar} {me.name}</strong>
              </span>
              <button onClick={() => { setNewName(me.name); setNewAvatar(me.avatar); setShowAdd(true); }}
                style={S.editBtn}>
                <Pencil size={12} /> Editar
              </button>
            </div>
            {/* Progreso X de 16 */}
            <div style={S.progressLabel}>
              {myComplete
                ? <span style={{ color: "#22c55e", fontWeight: 700 }}>✓ ¡Faminiela completa! Ya elegiste los {MATCHES.length} partidos.</span>
                : <>Llevas <strong>{myPicksCount}</strong> de {MATCHES.length} partidos elegidos.</>}
            </div>
            <div style={S.progressTrack}>
              <div style={{ ...S.progressFill, width: `${(myPicksCount / MATCHES.length) * 100}%`, background: myComplete ? "#22c55e" : me.color }} />
            </div>
          </div>
        )}

        {/* EDITAR PERFIL (reusa el formulario, cuando ya estoy registrado) */}
        {me && !registrationLocked && showAdd && (
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={S.miniLabel}>Editar tu perfil</div>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && register()}
              placeholder="Tu nombre" style={S.input} />
            <div style={S.miniLabel}>Tu avatar</div>
            <div style={S.avatarGrid}>
              {AVATARS.map((a) => (
                <button key={a} onClick={() => setNewAvatar(a)}
                  style={{ ...S.avatarBtn, background: newAvatar === a ? me.color : "#0f172a", borderColor: newAvatar === a ? me.color : "#334155" }}>{a}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={register} style={S.primaryBtn}>Guardar cambios</button>
              <button onClick={() => setShowAdd(false)} style={S.ghostBtn}>Cancelar</button>
            </div>
          </div>
        )}

        {players.length === 0 && (
          <div style={S.empty}>
            Aún no hay jugadores. {registrationLocked ? "El registro ya cerró." : "Sé el primero en registrarte."}
          </div>
        )}

        {/* PARTIDOS */}
        {players.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {MATCHES.map((m) => {
              const res = results[m.id];
              const myPick = me ? picks[me.id]?.[m.id] : null;
              const mLocked = matchLocked(m);
              return (
                <div key={m.id} style={{ ...S.matchCard, borderLeft: mLocked ? "3px solid #334155" : "3px solid #2563eb" }}>
                  <div style={S.matchMeta}>
                    <span>{m.date} · {m.time}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {mLocked ? <><Lock size={10} /> Cerrado</> : m.venue}
                    </span>
                  </div>

                  {/* Mi elección (editable solo si el partido no ha iniciado y estoy registrado) */}
                  <div style={{ display: "flex", gap: 8, marginBottom: res ? 10 : 0 }}>
                    {["a", "b"].map((side) => {
                      const active = myPick === side;
                      const isWinner = res === side;
                      return (
                        <button key={side} onClick={() => setPick(m, side)}
                          disabled={mLocked || !me}
                          style={{
                            ...S.pickBtn,
                            cursor: (mLocked || !me) ? "default" : "pointer",
                            background: active ? (me?.color || "#2563eb") : "#0f172a",
                            borderColor: isWinner ? "#22c55e" : (active ? (me?.color || "#2563eb") : "#334155"),
                            opacity: (mLocked && !active) ? 0.55 : 1,
                          }}>
                          <span style={{ fontSize: 20 }}>{side === "a" ? m.fa : m.fb}</span>
                          {side === "a" ? m.a : m.b}
                          {isWinner && <Check size={15} color="#22c55e" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Resultado oficial */}
                  {res && (
                    <div style={S.resultRow}>
                      Resultado oficial: <strong>{res === "a" ? m.a : m.b}</strong>
                      {myPick && (myPick === res
                        ? <span style={{ color: "#22c55e" }}> · acertaste ✓</span>
                        : <span style={{ color: "#ef4444" }}> · fallaste ✕</span>)}
                    </div>
                  )}

                  {/* Quién eligió qué — visible cuando el partido ya inició */}
                  {mLocked && (
                    <div style={S.allPicks}>
                      {["a", "b"].map((side) => {
                        const fans = players.filter((p) => picks[p.id]?.[m.id] === side);
                        const isWin = res === side;
                        return (
                          <div key={side} style={{ ...S.pickSide, borderColor: isWin ? "#22c55e" : "#334155" }}>
                            <span style={S.pickSideName}>{side === "a" ? m.fa + " " + m.a : m.fb + " " + m.b}</span>
                            <span style={S.pickFans}>
                              {fans.length ? fans.map((p) => (
                                <span key={p.id} style={{ ...S.fanChip, background: p.color + "22", borderColor: p.color + "66", color: p.color }}>
                                  <span style={{ fontSize: 13 }}>{p.avatar}</span>{p.name}
                                </span>
                              )) : <span style={S.fanNone}>Nadie</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p style={S.footer}>
          Resultados oficiales sincronizados automáticamente desde football-data.org.
          Cada partido se cierra individualmente al arrancar; los demás siguen abiertos.
        </p>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: "100vh", background: "#0f172a", fontFamily: "system-ui, sans-serif", padding: "16px 12px 60px", color: "#e2e8f0" },
  wrap: { maxWidth: 720, margin: "0 auto" },
  loading: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "system-ui", color: "#94a3b8", background: "#0f172a" },
  prize: { display: "flex", alignItems: "center", gap: 14, background: "linear-gradient(135deg,#f59e0b,#ef4444)", borderRadius: 16, padding: "16px 18px", marginBottom: 14, color: "#fff", boxShadow: "0 8px 24px rgba(245,158,11,.25)" },
  prizeBrick: { flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(0,0,0,.2))" },
  prizeText: { minWidth: 0 },
  prizeEyebrow: { fontSize: 12, fontWeight: 700, letterSpacing: 1, opacity: .9, textTransform: "uppercase" },
  prizeTitle: { fontSize: 22, fontWeight: 900, lineHeight: 1.1, marginTop: 2 },
  prizeSub: { fontSize: 13, opacity: .92, marginTop: 4 },
  eyebrow: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, letterSpacing: 1, color: "#94a3b8", textTransform: "uppercase" },
  h1: { fontSize: 24, fontWeight: 800, margin: "4px 0 2px", color: "#fff" },
  countdown: { border: "1px solid", borderRadius: 14, padding: "12px 16px", marginBottom: 16, textAlign: "center" },
  lockRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: "#fca5a5", fontWeight: 700 },
  countLabel: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 },
  countRow: { display: "flex", justifyContent: "center", gap: 10, fontVariantNumeric: "tabular-nums" },
  countNum: { fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1 },
  countUnit: { fontSize: 10, color: "#64748b", textTransform: "uppercase" },
  sectionLabel: { fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  podium: { display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8 },
  podiumCol: { flex: 1, maxWidth: 130, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  podiumName: { fontSize: 13, fontWeight: 700, textAlign: "center", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 },
  podiumScore: { fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1.1 },
  podiumBlock: { width: "100%", borderRadius: "10px 10px 0 0", marginTop: 4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", paddingTop: 8, gap: 2 },
  podiumMedal: { fontSize: 22 },
  podiumPlace: { fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.85)" },
  rankRow: { display: "flex", alignItems: "center", gap: 10, background: "#1e293b", borderRadius: 12, padding: "10px 14px", border: "2px solid transparent" },
  rankPos: { fontSize: 13, color: "#64748b", width: 16 },
  rankScore: { fontSize: 22, fontWeight: 800, color: "#fff" },
  youTag: { fontSize: 10, background: "#334155", color: "#cbd5e1", borderRadius: 5, padding: "1px 5px", marginLeft: 6, textTransform: "uppercase", letterSpacing: .5 },
  decidedNote: { fontSize: 11, color: "#64748b", textAlign: "right", marginTop: 6 },
  card: { background: "#1e293b", borderRadius: 14, padding: 16 },
  input: { width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 15, marginBottom: 12 },
  miniLabel: { fontSize: 11, color: "#94a3b8", marginBottom: 8 },
  avatarGrid: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  avatarBtn: { fontSize: 20, width: 40, height: 40, borderRadius: 8, cursor: "pointer", border: "1px solid" },
  primaryBtn: { flex: 1, background: "#2563eb", border: "none", color: "#fff", borderRadius: 8, padding: "10px", fontWeight: 700, cursor: "pointer" },
  ghostBtn: { background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "10px 16px", cursor: "pointer" },
  addBtn: { width: "100%", background: "#1e293b", border: "1px dashed #475569", color: "#cbd5e1", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  meBanner: { background: "#13243f", border: "1px solid #1e40af", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#cbd5e1", marginBottom: 16 },
  meTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  editBtn: { display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "1px solid #334155", color: "#94a3b8", borderRadius: 7, padding: "4px 8px", fontSize: 11, cursor: "pointer", flexShrink: 0 },
  progressLabel: { fontSize: 12, color: "#94a3b8", margin: "10px 0 6px" },
  progressTrack: { height: 7, background: "#0f172a", borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4, transition: "width .3s ease" },

  // Overlay + bienvenida
  overlay: { position: "fixed", inset: 0, background: "rgba(2,6,23,.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 },
  welcomeCard: { background: "#1e293b", borderRadius: 18, padding: "26px 22px", maxWidth: 420, width: "100%", textAlign: "center", animation: "pop .25s ease", border: "1px solid #334155" },
  welcomeEmoji: { fontSize: 44 },
  welcomeTitle: { fontSize: 21, fontWeight: 800, color: "#fff", margin: "8px 0 6px" },
  welcomeIntro: { fontSize: 14, color: "#cbd5e1", lineHeight: 1.5, margin: "0 0 16px" },
  welcomeRules: { textAlign: "left", display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 },
  welcomeRule: { display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "#e2e8f0" },
  ruleNum: { flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" },
  welcomePrize: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 700, marginBottom: 18 },
  welcomeBtn: { width: "100%", background: "#2563eb", border: "none", color: "#fff", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 800, cursor: "pointer" },

  // Anuncio del ganador
  champion: { background: "linear-gradient(135deg,#16a34a,#0891b2)", borderRadius: 16, padding: "18px 18px 20px", marginBottom: 14, textAlign: "center", color: "#fff", boxShadow: "0 8px 28px rgba(22,163,74,.3)", animation: "pop .3s ease" },
  championConfetti: { fontSize: 22, letterSpacing: 2, marginBottom: 4 },
  championLabel: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, opacity: .9 },
  championNames: { fontSize: 26, fontWeight: 900, lineHeight: 1.15, margin: "4px 0", display: "flex", flexDirection: "column", gap: 2 },
  championPrize: { fontSize: 14, opacity: .95, fontWeight: 600 },
  allPicks: { display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid #334155" },
  pickSide: { flex: 1, border: "1px solid", borderRadius: 8, padding: "6px 8px", minHeight: 52, display: "flex", flexDirection: "column", gap: 6 },
  pickSideName: { fontSize: 11, color: "#94a3b8", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pickFans: { display: "flex", flexWrap: "wrap", gap: 4 },
  fanChip: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, border: "1px solid", borderRadius: 999, padding: "2px 8px 2px 6px", lineHeight: 1.4 },
  fanNone: { color: "#475569", fontSize: 11, fontStyle: "italic" },
  empty: { textAlign: "center", color: "#64748b", fontSize: 14, padding: "20px 0" },
  matchCard: { background: "#1e293b", borderRadius: 14, padding: 14 },
  matchMeta: { fontSize: 11, color: "#64748b", marginBottom: 10, display: "flex", justifyContent: "space-between" },
  pickBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "1px solid", borderRadius: 10, padding: "10px 8px", color: "#fff", fontWeight: 700, fontSize: 15 },
  resultRow: { fontSize: 12, color: "#94a3b8", paddingTop: 8, borderTop: "1px solid #334155" },
  footer: { fontSize: 11, color: "#475569", textAlign: "center", marginTop: 24, lineHeight: 1.5 },
};
