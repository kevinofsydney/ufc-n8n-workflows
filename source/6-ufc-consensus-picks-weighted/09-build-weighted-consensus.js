// Weighted consensus.
// Pick weight = confidence (main factor) x a small nudge for the picker's graded record.
// A leave-one-event-out backtest on graded history showed confidence helps while record
// weighting is mostly noise, so the record nudge is capped to +/-15%.

const OWNER_CHAT_ID = 0;
const CONSENSUS_VERSION = 'consensus_v1';
const EXPLANATION_MODEL = 'openai/gpt-6-luna';
const DIGEST_MIN_HOURS = 1;
const DIGEST_MAX_HOURS = 30;
const RECORD_PRIOR_PICKS = 100;
const RECORD_SLOPE = 2;
const RECORD_MIN_FACTOR = 0.85;
const RECORD_MAX_FACTOR = 1.15;
const REASONING_CHARS = 420;
const OUTLOOK_CHARS = 320;

const event = $('Get Active Event').first().json;
const eventKey = event.event_key;
const eventName = event.event_name || eventKey || 'Active event';

let trigger = null;

try {
  trigger = $('When Called').first().json || {};
} catch {
  // Scheduled digest: the on-demand trigger did not fire.
}

const isDigest = trigger === null;
const chatId = trigger?.chat_id || OWNER_CHAT_ID;
const plain = String(trigger?.args ?? '').trim().toLowerCase().startsWith('plain');

if (isDigest) {
  const hoursToStart = (Date.parse(event.event_datetime_local) - Date.now()) / 3600000;

  if (!(hoursToStart >= DIGEST_MIN_HOURS && hoursToStart <= DIGEST_MAX_HOURS)) {
    return [];
  }
}

const clip = (value, low, high) => Math.min(high, Math.max(low, value));
const isTrue = (value) => String(value).toLowerCase() !== 'false';

// --- Picker track records from graded history ---------------------------
const records = new Map();
let gradedCorrect = 0;
let gradedTotal = 0;

for (const item of $('Get Pick Grades').all()) {
  const grade = item.json;

  if (!grade.pick_id) continue;
  if (grade.result !== 'CORRECT' && grade.result !== 'INCORRECT') continue;

  const record = records.get(grade.channel_name) || { c: 0, n: 0 };
  record.n += 1;
  gradedTotal += 1;

  if (grade.result === 'CORRECT') {
    record.c += 1;
    gradedCorrect += 1;
  }

  records.set(grade.channel_name, record);
}

const baseline = gradedTotal > 0 ? gradedCorrect / gradedTotal : null;

function recordFactor(picker) {
  const record = records.get(picker);

  if (baseline === null || !record) return 1;

  const shrunk = (record.c + RECORD_PRIOR_PICKS * baseline) / (record.n + RECORD_PRIOR_PICKS);

  return clip(1 + RECORD_SLOPE * (shrunk - baseline), RECORD_MIN_FACTOR, RECORD_MAX_FACTOR);
}

// --- Picks: one per picker per fight (latest extraction wins) -----------
const latestPick = new Map();

for (const item of $('Read Picks').all().filter((i) => !String(i.json.review_status || '').startsWith('VOID'))) {
  const row = item.json;

  if (!row.picked_fighter || !row.channel_name) continue;
  if (row.event_key && row.event_key !== eventKey) continue;
  if (!isTrue(row.is_official_pick)) continue;

  const key = `${row.channel_name}|${row.fight_order}`;
  const existing = latestPick.get(key);

  if (!existing || String(row.extracted_at || '') > String(existing.extracted_at || '')) {
    latestPick.set(key, row);
  }
}

const picks = [...latestPick.values()];

if (picks.length === 0) {
  return [
    {
      json: {
        chat_id: chatId,
        event_key: eventKey,
        event_name: eventName,
        no_picks: true,
        needs_llm: false,
      },
    },
  ];
}

// --- Fight analysis (one outlook per picker per fight) ------------------
const latestOutlook = new Map();

for (const item of $('Read Fight Analysis').all().filter((i) => !String(i.json.review_status || '').startsWith('VOID'))) {
  const row = item.json;

  if (!row.channel_name || !row.fight_outlook) continue;
  if (row.event_key && row.event_key !== eventKey) continue;

  const key = `${row.channel_name}|${row.fight_order}`;
  const existing = latestOutlook.get(key);

  if (!existing || String(row.extracted_at || '') > String(existing.extracted_at || '')) {
    latestOutlook.set(key, row);
  }
}

// --- Method mix from props ----------------------------------------------
const methodLabels = { ko_tko: 'KO/TKO', submission: 'SUB', decision: 'DEC' };
const methodVotes = new Map();
const seenVotes = new Set();

for (const item of $('Read Props').all().filter((i) => !String(i.json.review_status || '').startsWith('VOID'))) {
  const row = item.json;

  if (!row.channel_name || !String(row.market || '').includes('method')) continue;

  const method = String(row.method || '').toLowerCase();

  if (!methodLabels[method]) continue;

  const voteKey = `${row.channel_name}|${row.fight_order}|${row.fighter}|${method}`;

  if (seenVotes.has(voteKey)) continue;

  seenVotes.add(voteKey);

  const mapKey = `${row.fight_order}|${row.fighter}`;
  const tally = methodVotes.get(mapKey) || {};
  tally[method] = (tally[method] || 0) + 1;
  methodVotes.set(mapKey, tally);
}

// --- Group by fight ------------------------------------------------------
const byFight = new Map();

for (const pick of picks) {
  const order = Number(pick.fight_order);
  const fight = byFight.get(order) || { order, a: pick.fighter_a, b: pick.fighter_b, entries: [] };
  const score = Number.isFinite(Number(pick.confidence_score)) ? Number(pick.confidence_score) : 5;
  const weight = plain ? 1 : (score / 5) * recordFactor(pick.channel_name);
  const outlook = latestOutlook.get(`${pick.channel_name}|${order}`)?.fight_outlook ?? '';

  fight.entries.push({
    picker: pick.channel_name,
    side: pick.picked_fighter,
    score,
    weight,
    reasoning: String(pick.reasoning_summary || '').trim(),
    outlook: String(outlook).trim(),
  });

  byFight.set(order, fight);
}

const fights = [];

for (const fight of [...byFight.values()].sort((x, y) => x.order - y.order)) {
  const sides = new Map();

  for (const entry of fight.entries) {
    const side = sides.get(entry.side) || { side: entry.side, weight: 0, count: 0, scoreSum: 0 };
    side.weight += entry.weight;
    side.count += 1;
    side.scoreSum += entry.score;
    sides.set(entry.side, side);
  }

  const ranked = [...sides.values()].sort((x, y) => y.weight - x.weight || y.count - x.count);
  const byCount = [...sides.values()].sort((x, y) => y.count - x.count || y.weight - x.weight);
  const totalWeight = ranked.reduce((sum, side) => sum + side.weight, 0);
  const winner = ranked[0];
  const isTie =
    ranked.length > 1 && Math.abs(ranked[0].weight - ranked[1].weight) < 1e-9;

  const tally = methodVotes.get(`${fight.order}|${winner.side}`) || {};
  const methodText = Object.keys(tally)
    .sort((x, y) => tally[y] - tally[x])
    .map((method) => `${methodLabels[method]} ${tally[method]}`)
    .join(', ');

  fights.push({
    order: fight.order,
    winner: winner.side,
    loser: winner.side === fight.a ? fight.b : fight.a,
    share: winner.weight / totalWeight,
    count: winner.count,
    total: fight.entries.length,
    avgConfidence: winner.scoreSum / winner.count,
    isTie,
    plainWinner: byCount[0].side,
    flipped: byCount[0].side !== winner.side,
    methodText,
    entries: fight.entries,
  });
}

// --- Cache lookup and explanation request -------------------------------
function hashText(text) {
  let hash = 5381;

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  }

  return (hash >>> 0).toString(16);
}

const inputHash = hashText(
  [
    CONSENSUS_VERSION,
    EXPLANATION_MODEL,
    ...picks
      .map((pick) => `${pick.channel_name}|${pick.fight_order}|${pick.picked_fighter}|${pick.confidence_score}|${pick.extracted_at}`)
      .sort(),
  ].join('\n')
);

let explanations = null;

if (!plain) {
  const cache = $('Get Consensus Cache').first()?.json ?? {};

  if (cache.input_hash === inputHash && cache.explanations_json) {
    try {
      explanations = JSON.parse(cache.explanations_json);
    } catch {
      explanations = null;
    }
  }
}

const needsLlm = !plain && explanations === null;

const clipText = (text, max) =>
  text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;

const llmInput = fights.map((fight) => ({
  fight_order: fight.order,
  fighters: [fight.winner, fight.loser],
  weighted_lean: `${fight.winner} (${Math.round(fight.share * 100)}%)`,
  plain_vote: `${fight.count} of ${fight.total} pickers chose ${fight.winner}`,
  picker_views: fight.entries.map((entry) => ({
    picker: entry.picker,
    picked: entry.side,
    confidence: entry.score,
    weight: Math.round(entry.weight * 100) / 100,
    reasoning: clipText(entry.reasoning, REASONING_CHARS),
    matchup_outlook: clipText(entry.outlook, OUTLOOK_CHARS),
  })),
}));

const SYSTEM_PROMPT =
  'You summarise the rough consensus of a panel of YouTube MMA pickers for each fight on a UFC card.\n\n' +
  'For every fight, write 2 to 3 sentences (at most 90 words) that say: who the panel favours, the main ' +
  'reasons they give, and where they disagree. Mention the weighted lean only when it differs from the ' +
  'plain vote or the fight is close.\n\n' +
  'Rules:\n' +
  '- Use only the material provided. Do not add your own MMA knowledge, stats or odds.\n' +
  '- Pickers with a higher weight count for more, so lean on their reasoning when pickers disagree.\n' +
  '- Write plain, neutral prose. No bullet points, no markdown, no betting advice.\n' +
  '- Return one explanation for every fight_order provided.';

const SCHEMA = {
  type: 'object',
  properties: {
    fights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fight_order: { type: 'integer' },
          explanation: { type: 'string', maxLength: 600 },
        },
        required: ['fight_order', 'explanation'],
        additionalProperties: false,
      },
    },
  },
  required: ['fights'],
  additionalProperties: false,
};

return [
  {
    json: {
      chat_id: chatId,
      event_key: eventKey,
      event_name: eventName,
      plain,
      is_digest: isDigest,
      no_picks: false,
      fights,
      picker_count: new Set(picks.map((pick) => pick.channel_name)).size,
      video_count: new Set(picks.map((pick) => pick.video_id)).size,
      explanations,
      needs_llm: needsLlm,
      input_hash: inputHash,
      explanation_model: EXPLANATION_MODEL,
      openrouter_payload: {
        model: EXPLANATION_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(llmInput) },
        ],
        max_tokens: 8000,
        stream: false,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'consensus_explanations', strict: true, schema: SCHEMA },
        },
      },
    },
  },
];
