import fs from "node:fs/promises";

const API_KEY = process.env.API_FOOTBALL_KEY;

const PARTICIPANTS_PATH = "data/participants.json";
const RESULTS_PATH = "data/results.json";
const CARDS_PATH = "data/cards.json";

// You may need to change this if API-Football uses a different World Cup league id.
// API-Football uses structured endpoints for fixtures and events. 
const LEAGUE_ID = 1;
const SEASON = 2026;

if (!API_KEY) {
  throw new Error("Missing API_FOOTBALL_KEY GitHub secret");
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function api(path) {
  const res = await fetch(`https://v3.football.api-sports.io${path}`, {
    headers: { "x-apisports-key": API_KEY }
  });

  if (!res.ok) {
    throw new Error(`API request failed ${res.status}: ${await res.text()}`);
  }

  return res.json();
}

function teamName(name) {
  const aliases = {
    "Bosnia-Herzegovina": "Bosnia and Herzegovina",
    "Bosnia & Herzegovina": "Bosnia and Herzegovina",
    "Ivory Coast": "Côte d'Ivoire",
    "Cote d'Ivoire": "Côte d'Ivoire",
    "South Korea": "Korea Republic",
    "Korea Republic": "Korea Republic",
    "DR Congo": "Congo DR",
    "Congo DR": "Congo DR"
  };

  return aliases[name] || name;
}

async function main() {
  const participants = await readJson(PARTICIPANTS_PATH, []);
  const assignedTeams = new Set(participants.map(p => p.team));

  const fixtureData = await api(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
  const fixtures = fixtureData.response || [];

  const goalsConceded = {};
  const redCards = {};

  for (const p of participants) {
    goalsConceded[p.team] = 0;
    redCards[p.team] = 0;
  }

  for (const item of fixtures) {
    const status = item.fixture?.status?.short;
    const isFinished = ["FT", "AET", "PEN"].includes(status);
    if (!isFinished) continue;

    const home = teamName(item.teams?.home?.name);
    const away = teamName(item.teams?.away?.name);

    const homeGoals = Number(item.goals?.home ?? 0);
    const awayGoals = Number(item.goals?.away ?? 0);

    if (assignedTeams.has(home)) goalsConceded[home] += awayGoals;
    if (assignedTeams.has(away)) goalsConceded[away] += homeGoals;

    const fixtureId = item.fixture?.id;
    if (!fixtureId) continue;

    const eventData = await api(`/fixtures/events?fixture=${fixtureId}`);
    const events = eventData.response || [];

    for (const event of events) {
      const type = event.type;
      const detail = event.detail;
      const eventTeam = teamName(event.team?.name);

      if (!assignedTeams.has(eventTeam)) continue;

      if (type === "Card" && String(detail).toLowerCase().includes("red")) {
        redCards[eventTeam] += 1;
      }
    }
  }

  await fs.writeFile(
    RESULTS_PATH,
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      source: "API-Football fixtures",
      teams: Object.fromEntries(
        participants.map(p => [
          p.team,
          { goalsConceded: goalsConceded[p.team] || 0 }
        ])
      )
    }, null, 2) + "\n"
  );

  await fs.writeFile(
    CARDS_PATH,
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      source: "API-Football fixture events",
      teams: Object.fromEntries(
        participants.map(p => [
          p.team,
          { redCards: redCards[p.team] || 0 }
        ])
      )
    }, null, 2) + "\n"
  );
}

main();
