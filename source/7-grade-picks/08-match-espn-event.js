// Find the event on ESPN's scoreboard and list its finished fights.

const evt = $('Pick Event To Grade').first().json;
const nowMs = Date.now();
const startMs = Date.parse(evt.event_datetime_local);

const scoreboard = $input.first().json || {};
const espnEvents = Array.isArray(scoreboard.events) ? scoreboard.events : [];

const abort = (message) =>
  evt.forced ? [{ json: { abort: true, chat_id: evt.chat_id, message } }] : [];

function normaliseText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function buildEventKeywords(eventName) {
  const [head, ...rest] = normaliseText(eventName).split(':');
  const keywords = new Set();

  head
    .replace(/\bufc\b/g, ' ')
    .replace(/\bfight night\b/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3)
    .forEach((word) => keywords.add(word));

  rest
    .join(':')
    .split(/[^a-z0-9'-]+/)
    .filter((word) => word.length >= 4 && word !== 'vs')
    .forEach((word) => keywords.add(word));

  return [...keywords];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const keywords = buildEventKeywords(evt.event_name);

let best = null;
let bestScore = 0;

for (const espnEvent of espnEvents) {
  const name = normaliseText(espnEvent.name);
  const score = keywords.filter((keyword) =>
    new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(name)
  ).length;

  if (score > bestScore) {
    best = espnEvent;
    bestScore = score;
  }
}

if (!best) {
  return abort(`Could not find ${evt.event_name} on ESPN.`);
}

const competitions = Array.isArray(best.competitions) ? best.competitions : [];
const finished = competitions.filter((comp) => comp.status?.type?.completed === true);

if (finished.length === 0) {
  return abort(`${evt.event_name} has no finished fights on ESPN yet.`);
}

if (finished.length < competitions.length && nowMs - startMs < 24 * 3600 * 1000) {
  return abort(
    `${evt.event_name}: ${finished.length} of ${competitions.length} fights are final. Try again later.`
  );
}

return finished.map((comp) => ({
  json: {
    event_key: evt.event_key,
    espn_event_id: best.id,
    espn_competition_id: comp.id,
    weight_class: comp.type?.abbreviation || comp.type?.text || '',
    scheduled_rounds: comp.format?.regulation?.periods ?? null,
    competitors: (comp.competitors || [])
      .map((competitor) => ({
        name: competitor.athlete?.displayName || '',
        winner: competitor.winner === true,
        order: Number(competitor.order),
      }))
      .sort((a, b) => a.order - b.order),
  },
}));
