// Grade each picker's winner picks against the fight results.

const evt = $('Pick Event To Grade').first().json;
const results = $('Build Fight Results').all().map((item) => item.json);
const gradedAt = new Date().toISOString();

const normaliseText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function nameTokens(value) {
  return normaliseText(value)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2 && !['jr', 'sr', 'ii', 'iii', 'iv'].includes(token));
}

function namesMatch(a, b) {
  const tokensA = nameTokens(a);
  const tokensB = nameTokens(b);

  if (tokensA.length === 0 || tokensB.length === 0) return false;
  if (tokensA[tokensA.length - 1] === tokensB[tokensB.length - 1]) return true;

  const shared = tokensA.filter((token) => tokensB.includes(token));

  return shared.length >= 2 || (shared.length >= 1 && (tokensA.length === 1 || tokensB.length === 1));
}

function findResult(fighterA, fighterB) {
  return results.find(
    (result) =>
      (namesMatch(fighterA, result.fighter_a) && namesMatch(fighterB, result.fighter_b)) ||
      (namesMatch(fighterA, result.fighter_b) && namesMatch(fighterB, result.fighter_a))
  );
}

// One pick per picker per fight (latest extraction wins).
const latestByKey = new Map();

for (const item of $('Read Picks').all().filter((i) => !String(i.json.review_status || '').startsWith('VOID'))) {
  const row = item.json;

  if (!row.pick_id || !row.picked_fighter || !row.channel_name) continue;
  if (row.event_key && row.event_key !== evt.event_key) continue;
  if (String(row.is_official_pick).toLowerCase() === 'false') continue;

  const key = `${row.channel_name}|${row.fight_order}`;
  const existing = latestByKey.get(key);

  if (!existing || String(row.extracted_at || '') > String(existing.extracted_at || '')) {
    latestByKey.set(key, row);
  }
}

const output = [];

for (const pick of latestByKey.values()) {
  const result = findResult(pick.fighter_a, pick.fighter_b);

  let grade = 'UNMATCHED';

  if (result) {
    if (!result.winner || result.winner === 'DRAW' || result.winner === 'NO_CONTEST') {
      grade = 'VOID';
    } else {
      grade = namesMatch(pick.picked_fighter, result.winner) ? 'CORRECT' : 'INCORRECT';
    }
  }

  output.push({
    json: {
      pick_id: pick.pick_id,
      event_key: evt.event_key,
      channel_name: pick.channel_name,
      video_id: pick.video_id,
      fight_order: Number(pick.fight_order),
      fighter_a: pick.fighter_a,
      fighter_b: pick.fighter_b,
      picked_fighter: pick.picked_fighter,
      confidence_score: Number.isFinite(Number(pick.confidence_score))
        ? Number(pick.confidence_score)
        : null,
      result: grade,
      winner: result?.winner ?? '',
      graded_at: gradedAt,
    },
  });
}

return output.length > 0 ? output : [{ json: { row_type: 'none' } }];
