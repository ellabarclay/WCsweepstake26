import fs from "node:fs/promises";

const RESULTS_PATH = "data/results.json";
const CARDS_PATH = "data/cards.json";
const PARTICIPANTS_PATH = "data/participants.json";
const ESPN_SCOREBOARDS = [
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=500",
  "https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=500"
];
const ALIASES = new Map(Object.entries({
  "Ivory Coast":"Côte d'Ivoire", "Cote d'Ivoire":"Côte d'Ivoire", "Côte d’Ivoire":"Côte d'Ivoire",
  "DR Congo":"Congo DR", "Democratic Republic of the Congo":"Congo DR", "Congo":"Congo DR",
  "South Korea":"Korea Republic", "Korea Republic":"Korea Republic", "Korea":"Korea Republic",
  "United States":"United States", "USA":"United States", "Curacao":"Curaçao"
}));
const norm = (name) => ALIASES.get(name) || name;
async function readJson(path, fallback){ try { return JSON.parse(await fs.readFile(path, "utf8")); } catch { return fallback; } }
async function fetchJson(url){ const res = await fetch(url, {headers:{"user-agent":"Mozilla/5.0 WC26 sweepstake updater"}}); if(!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.json(); }
function statusText(comp){ const type = comp?.status?.type; if(type?.completed) return "FT"; if(type?.state === "in") return "Live"; return type?.description || "Scheduled"; }
function fromEspnEvent(event){
  const comp = event.competitions?.[0]; const competitors = comp?.competitors || [];
  const home = competitors.find(c => c.homeAway === "home") || competitors[0];
  const away = competitors.find(c => c.homeAway === "away") || competitors[1];
  if(!home || !away) return null;
  const homeName = norm(home.team?.displayName || home.team?.shortDisplayName || home.team?.name);
  const awayName = norm(away.team?.displayName || away.team?.shortDisplayName || away.team?.name);
  return {
    id: String(event.id),
    stage: event.season?.slug || event.name || "World Cup",
    date: event.date,
    home: homeName,
    away: awayName,
    homeScore: home.score === undefined || home.score === "" ? null : Number(home.score),
    awayScore: away.score === undefined || away.score === "" ? null : Number(away.score),
    status: statusText(comp)
  };
}
function mergeMatches(existing, fresh){
  const byId = new Map((existing || []).map(m => [String(m.id), m]));
  for(const m of fresh){
    if(!m) continue;
    const old = byId.get(String(m.id));
    byId.set(String(m.id), {...old, ...m});
  }
  return [...byId.values()].sort((a,b)=>new Date(a.date || 0)-new Date(b.date || 0));
}
async function updateResults(){
  const current = await readJson(RESULTS_PATH, {matches:[]});
  const attempts = [];
  let fresh = [];
  for(const url of ESPN_SCOREBOARDS){
    try{
      const json = await fetchJson(url);
      fresh = (json.events || []).map(fromEspnEvent).filter(Boolean);
      attempts.push({url, ok:true, events:fresh.length});
      if(fresh.length) break;
    }catch(error){ attempts.push({url, ok:false, error:String(error.message || error)}); }
  }
  const updated = {
    ...current,
    updatedAt: new Date().toISOString(),
    source: fresh.length ? "ESPN scoreboard via GitHub Actions" : "Previous local results preserved; live fetch failed",
    diagnostics: attempts,
    matches: fresh.length ? mergeMatches(current.matches, fresh) : current.matches
  };
  await fs.writeFile(RESULTS_PATH, JSON.stringify(updated, null, 2) + "\n");
  return updated;
}
async function updateCards(results){
  const cards = await readJson(CARDS_PATH, {teams:{}});
  const participants = await readJson(PARTICIPANTS_PATH, []);
  const teams = {...cards.teams};
  for(const p of participants) teams[p.team] = teams[p.team] || {redCards:0};
  // ESPN does not always expose reliable team red-card aggregates in the simple scoreboard feed.
  // This keeps existing/manual red-card totals safe while still timestamping the file.
  const updated = {
    ...cards,
    updatedAt: new Date().toISOString(),
    source: "Red cards preserved from data/cards.json. Edit manually if ESPN does not expose card totals for this match.",
    teams
  };
  await fs.writeFile(CARDS_PATH, JSON.stringify(updated, null, 2) + "\n");
}
const results = await updateResults();
await updateCards(results);
