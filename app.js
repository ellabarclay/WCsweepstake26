const PARTICIPANT_FALLBACK = [
  {team:"Algeria",participant:"Ella",code:"DZA",group:"J",flag:"🇩🇿"},{team:"Egypt",participant:"Lauren",code:"EGY",group:"G",flag:"🇪🇬"},{team:"Congo DR",participant:"Paul",code:"COD",group:"K",flag:"🇨🇩"},{team:"Paraguay",participant:"Chloe",code:"PAR",group:"D",flag:"🇵🇾"},{team:"New Zealand",participant:"Peach",code:"NZL",group:"G",flag:"🇳🇿"},{team:"Canada",participant:"Matt N",code:"CAN",group:"B",flag:"🇨🇦"},{team:"Ecuador",participant:"Barry",code:"ECU",group:"E",flag:"🇪🇨"},{team:"Tunisia",participant:"Rachel W-A",code:"TUN",group:"F",flag:"🇹🇳"},{team:"Saudi Arabia",participant:"Matt H",code:"KSA",group:"H",flag:"🇸🇦"},{team:"Côte d'Ivoire",participant:"Samm",code:"CIV",group:"E",flag:"🇨🇮"},{team:"Austria",participant:"Steph",code:"AUT",group:"J",flag:"🇦🇹"},{team:"Germany",participant:"Lucy",code:"GER",group:"E",flag:"🇩🇪"},{team:"Morocco",participant:"Jess",code:"MAR",group:"C",flag:"🇲🇦"},{team:"South Africa",participant:"Holly",code:"RSA",group:"A",flag:"🇿🇦"},{team:"Portugal",participant:"Sue",code:"POR",group:"K",flag:"🇵🇹"},{team:"France",participant:"Daniel",code:"FRA",group:"I",flag:"🇫🇷"},{team:"Panama",participant:"Stu Mc",code:"PAN",group:"L",flag:"🇵🇦"},{team:"Ghana",participant:"Lou Mc",code:"GHA",group:"L",flag:"🇬🇭"},{team:"Senegal",participant:"Bartlett",code:"SEN",group:"I",flag:"🇸🇳"},{team:"Uzbekistan",participant:"Jim",code:"UZB",group:"K",flag:"🇺🇿"},{team:"Haiti",participant:"Tom",code:"HTI",group:"C",flag:"🇭🇹"},{team:"Korea Republic",participant:"Maisie",code:"KOR",group:"A",flag:"🇰🇷"},{team:"Switzerland",participant:"Emily",code:"SUI",group:"B",flag:"🇨🇭"},{team:"Croatia",participant:"Mia",code:"CRO",group:"L",flag:"🇭🇷"},{team:"Bosnia and Herzegovina",participant:"Albertine",code:"BIH",group:"B",flag:"🇧🇦"},{team:"Uruguay",participant:"Mike",code:"URU",group:"H",flag:"🇺🇾"},{team:"Brazil",participant:"Matt P",code:"BRA",group:"C",flag:"🇧🇷"}
];
const COLOURS = ["#2563eb","#059669","#dc2626","#7c3aed","#ea580c","#0891b2","#be123c","#4f46e5","#16a34a","#c2410c"];
const ALIASES = new Map(Object.entries({"Ivory Coast":"Côte d'Ivoire","Cote d'Ivoire":"Côte d'Ivoire","Côte d’Ivoire":"Côte d'Ivoire","DR Congo":"Congo DR","Democratic Republic of the Congo":"Congo DR","South Korea":"Korea Republic","Korea":"Korea Republic","USA":"United States"}));
let state = {participants: [], results: {matches: []}, cards: {teams: {}}, fixtureFilter: ""};
const $ = (id) => document.getElementById(id);
function normaliseTeam(team){ return ALIASES.get(team) || team; }
function cacheUrl(path){ return `${path}?v=${Date.now()}`; }
async function loadJson(path, fallback){ try { const res = await fetch(cacheUrl(path), {cache:"no-store"}); if(!res.ok) throw new Error(res.status); return await res.json(); } catch(e){ console.warn(`Using fallback for ${path}`, e); return fallback; } }
function participantFor(team){ return state.participants.find(p => p.team === normaliseTeam(team)); }
function isAssigned(team){ return !!participantFor(team); }
function completed(match){ return match.status === "FT" || match.status === "AET" || match.status === "PEN" || match.status === "Full Time" || match.status === "Final"; }
function formatDate(iso){ if(!iso) return "TBC"; return new Intl.DateTimeFormat("en-GB", {dateStyle:"medium", timeStyle:"short"}).format(new Date(iso)); }
function escapeHtml(v){ return String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }
function teamCell(participant){ return `<div class="team-block"><span class="flag">${participant?.flag || "🏳️"}</span><div><div class="name-line">${escapeHtml(participant?.participant || "Unassigned")}</div><div class="sub-line">${escapeHtml(participant?.team || "Unknown team")}</div></div></div>`; }
function buildStats(){
  const map = new Map(state.participants.map((p,i) => [p.team, {...p, colour: COLOURS[i % COLOURS.length], played:0, conceded:0, scored:0, reds:0, active:true}]));
  for(const match of state.results.matches || []){
    const home = normaliseTeam(match.home), away = normaliseTeam(match.away);
    if(!completed(match) || match.homeScore == null || match.awayScore == null) continue;
    if(map.has(home)){ const s = map.get(home); s.played++; s.scored += Number(match.homeScore); s.conceded += Number(match.awayScore); }
    if(map.has(away)){ const s = map.get(away); s.played++; s.scored += Number(match.awayScore); s.conceded += Number(match.homeScore); }
  }
  for(const s of map.values()){
    const cardRow = state.cards?.teams?.[s.team] || state.cards?.teams?.[normaliseTeam(s.team)] || {};
    s.reds = Number(cardRow.redCards ?? cardRow.RC ?? cardRow.red ?? 0);
    if(state.results.eliminated?.includes(s.team)) s.active = false;
  }
  return [...map.values()];
}
function rankRows(rows, key, dir="desc"){
  const sorted = [...rows].sort((a,b) => dir === "desc" ? b[key] - a[key] || a.participant.localeCompare(b.participant) : a[key] - b[key]);
  let prev, rank = 0, seen = 0;
  return sorted.map(r => { seen++; if(r[key] !== prev){ rank = seen; prev = r[key]; } return {...r, rank, isLeader: rank === 1}; });
}
function table(rows, columns){
  return `<div class="table-wrap"><table><thead><tr>${columns.map(c=>`<th>${c.label}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr class="${r.isLeader ? "is-leader" : ""}">${columns.map(c=>`<td>${c.render(r)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function renderLeaderPills(rows, valueLabel){
  const leaders = rows.filter(r => r.isLeader);
  return leaders.map(r => `<div class="leader-pill"><div class="team-block"><span class="flag">${r.flag}</span><div><div class="name-line">${escapeHtml(r.participant)}</div><div class="sub-line">${escapeHtml(r.team)}</div></div></div><span class="badge">${escapeHtml(valueLabel(r))}</span></div>`).join("");
}
function maxVal(rows,key){ return Math.max(1, ...rows.map(r => Number(r[key]) || 0)); }
function render(){
  const stats = buildStats();
  const goalsRows = rankRows(stats, "conceded");
  const redRows = rankRows(stats, "reds");
  const champion = state.results.champion ? normaliseTeam(state.results.champion) : null;
  const winnerRows = stats.map(s => ({...s, winnerScore: champion ? (s.team === champion ? 1 : 0) : (s.active ? 1 : 0)})).sort((a,b)=>b.winnerScore-a.winnerScore || a.participant.localeCompare(b.participant)).map((r,i)=>({...r, rank: champion ? (r.team===champion ? 1 : i+1) : (r.active ? 1 : i+1), isLeader: champion ? r.team===champion : r.active}));
  const gMax = maxVal(goalsRows,"conceded"), rMax = maxVal(redRows,"reds");
  $("lastUpdated").textContent = state.results.updatedAt ? `Updated ${formatDate(state.results.updatedAt)}` : "Local data loaded";
  $("dataSource").textContent = state.results.source || "Data loaded from repository files";
  $("summaryGrid").innerHTML = [
    {title:"World Cup winner", metric:winnerRows.filter(r=>r.isLeader).length, text: champion ? `Champion: ${champion}` : "Teams still in contention", accent:"#2563eb"},
    {title:"Most goals conceded", metric:goalsRows[0]?.conceded ?? 0, text:`${goalsRows.filter(r=>r.isLeader).length} current leader(s)`, accent:"#059669"},
    {title:"Most red cards", metric:redRows[0]?.reds ?? 0, text:`${redRows.filter(r=>r.isLeader).length} current leader(s)`, accent:"#dc2626"}
  ].map(c=>`<article class="summary-card" style="--accent:${c.accent}"><h3>${c.title}</h3><div class="metric">${c.metric}</div><p>${c.text}</p></article>`).join("");
  $("leadersStrip").innerHTML = `<div class="leader-card"><h3>🏆 Winner</h3>${renderLeaderPills(winnerRows, r => champion ? "Champion" : (r.active ? "Active" : "Out"))}</div><div class="leader-card"><h3>🥅 Goals conceded</h3>${renderLeaderPills(goalsRows, r => `${r.conceded}`)}</div><div class="leader-card"><h3>🟥 Red cards</h3>${renderLeaderPills(redRows, r => `${r.reds}`)}</div>`;
  $("winnerTable").innerHTML = table(winnerRows, [
    {label:"Rank", render:r=>`<span class="rank">${r.rank}</span>`}, {label:"Participant", render:teamCell},
    {label:"Group", render:r=>r.group}, {label:"Status", render:r=>`<span class="status ${r.active ? "live" : "out"}">${champion ? (r.team===champion ? "Champion" : "Not winner") : (r.active ? "Still in" : "Out")}</span>`},
    {label:"Played", render:r=>r.played}
  ]);
  $("goalsTable").innerHTML = table(goalsRows, [
    {label:"Rank", render:r=>`<span class="rank">${r.rank}</span>`}, {label:"Participant", render:teamCell},
    {label:"Goals conceded", render:r=>`<strong>${r.conceded}</strong>`}, {label:"Visual", render:r=>`<div class="bar-cell"><div class="bar"><span style="width:${(r.conceded/gMax)*100}%;--accent:${r.colour}"></span></div></div>`},
    {label:"Played", render:r=>r.played}
  ]);
  $("redsTable").innerHTML = table(redRows, [
    {label:"Rank", render:r=>`<span class="rank">${r.rank}</span>`}, {label:"Participant", render:teamCell},
    {label:"Red cards", render:r=>`<strong>${r.reds}</strong>`}, {label:"Visual", render:r=>`<div class="bar-cell"><div class="bar"><span style="width:${(r.reds/rMax)*100}%;--accent:${r.colour}"></span></div></div>`},
    {label:"Source", render:r=>"cards.json"}
  ]);
  renderFixtures(); renderParticipants(stats);
}
function renderFixtures(){
  const q = state.fixtureFilter.trim().toLowerCase();
  const matches = (state.results.matches || []).filter(m => isAssigned(m.home) || isAssigned(m.away)).filter(m => {
    const text = [m.home,m.away,m.stage,participantFor(m.home)?.participant,participantFor(m.away)?.participant].join(" ").toLowerCase();
    return !q || text.includes(q);
  }).sort((a,b)=>new Date(a.date)-new Date(b.date));
  $("fixturesTable").innerHTML = `<div class="table-wrap">${matches.map(m=>{
    const hp = participantFor(m.home), ap = participantFor(m.away);
    const score = m.homeScore == null ? "v" : `${m.homeScore}–${m.awayScore}`;
    return `<div class="fixture-card"><div><div class="fixture-team">${hp?.flag || ""} ${escapeHtml(m.home)}</div><div class="sub-line">${escapeHtml(hp?.participant || "Unassigned")}</div></div><div class="fixture-score">${score}</div><div><div class="fixture-team">${ap?.flag || ""} ${escapeHtml(m.away)}</div><div class="sub-line">${escapeHtml(ap?.participant || "Unassigned")}</div></div><div class="fixture-meta">${escapeHtml(m.stage)}<br>${formatDate(m.date)}<br>${escapeHtml(m.status)}</div></div>`;
  }).join("") || `<div class="empty">No fixtures match that filter.</div>`}</div>`;
}
function renderParticipants(stats){
  $("participantCount").textContent = `${stats.length} assigned teams`;
  $("participantGrid").innerHTML = stats.sort((a,b)=>a.participant.localeCompare(b.participant)).map(s=>`<article class="participant-card" style="--colour:${s.colour}"><div class="flag">${s.flag}</div><h3>${escapeHtml(s.participant)}</h3><p><strong>${escapeHtml(s.team)}</strong> · Group ${escapeHtml(s.group)}</p><p class="sub-line">${s.conceded} conceded · ${s.reds} red cards</p></article>`).join("");
}
function setupTabs(){ document.querySelectorAll(".nav__button").forEach(btn => btn.addEventListener("click", () => { document.querySelectorAll(".nav__button").forEach(b=>b.classList.remove("is-active")); document.querySelectorAll(".tab").forEach(t=>t.classList.remove("is-active")); btn.classList.add("is-active"); $(btn.dataset.tab).classList.add("is-active"); })); }
async function init(){ setupTabs(); $("fixtureFilter").addEventListener("input", e => { state.fixtureFilter = e.target.value; renderFixtures(); }); state.participants = await loadJson("participants.json", PARTICIPANT_FALLBACK); state.results = await loadJson("results.json", {matches:[], updatedAt:null, source:"No results data loaded"}); state.cards = await loadJson("cards.json", {teams:{}, updatedAt:null}); render(); setInterval(async()=>{ state.results = await loadJson("results.json", state.results); state.cards = await loadJson("cards.json", state.cards); render(); }, 5*60*1000); }
init();
