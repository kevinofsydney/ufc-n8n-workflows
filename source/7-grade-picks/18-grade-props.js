// Grade the gradable props: method, method + round, inside the distance,
// over/under rounds and fight duration. Everything else is left UNGRADED.

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

const methodMap = {
  ko_tko: 'KO_TKO',
  submission: 'SUBMISSION',
  decision: 'DECISION',
};

function gradeProp(row, result) {
  const winnerKnown =
    result.winner && result.winner !== 'DRAW' && result.winner !== 'NO_CONTEST';

  if (!winnerKnown) return 'VOID';

  const market = String(row.market || '');
  const selection = String(row.selection || '');
  const fighterWon = row.fighter ? namesMatch(row.fighter, result.winner) : null;

  if (market === 'method_of_victory' || market === 'method_and_round') {
    const method = methodMap[String(row.method || '').toLowerCase()];

    if (!row.fighter || !method) return 'UNGRADED';

    let correct = fighterWon && result.method === method;

    if (market === 'method_and_round') {
      const round = Number(row.round);
      const range = String(row.round_range || '').match(/R?(\d)\s*-\s*R?(\d)/i);

      if (Number.isFinite(round) && row.round !== null && row.round !== '') {
        correct = correct && result.round === round;
      } else if (range) {
        correct = correct && result.round >= Number(range[1]) && result.round <= Number(range[2]);
      }
    }

    return correct ? 'CORRECT' : 'INCORRECT';
  }

  if (market === 'inside_distance') {
    if (!row.fighter) return 'UNGRADED';

    return fighterWon && (result.method === 'KO_TKO' || result.method === 'SUBMISSION')
      ? 'CORRECT'
      : 'INCORRECT';
  }

  if (market === 'over_under_rounds') {
    const match = selection.match(/(over|under)\s*([\d.]+)\s*round/i);

    if (!match) return 'UNGRADED';

    const line = Number(match[2]);
    const isOver = match[1].toLowerCase() === 'over';

    return (isOver ? result.elapsed_rounds > line : result.elapsed_rounds < line)
      ? 'CORRECT'
      : 'INCORRECT';
  }

  if (market === 'fight_duration') {
    const match = selection.match(/(over|under)\s*([\d.]+)\s*min/i);

    if (!match) return 'UNGRADED';

    const line = Number(match[2]);
    const isOver = match[1].toLowerCase() === 'over';

    return (isOver ? result.elapsed_minutes > line : result.elapsed_minutes < line)
      ? 'CORRECT'
      : 'INCORRECT';
  }

  return 'UNGRADED';
}

const seen = new Set();
const output = [];

for (const item of $('Read Props').all().filter((i) => !String(i.json.review_status || '').startsWith('VOID'))) {
  const row = item.json;

  if (!row.prop_id || !row.channel_name || seen.has(row.prop_id)) continue;
  if (row.event_key && row.event_key !== evt.event_key) continue;

  seen.add(row.prop_id);

  const result = findResult(row.fighter_a, row.fighter_b);
  const grade = result ? gradeProp(row, result) : 'UNMATCHED';

  output.push({
    json: {
      prop_id: row.prop_id,
      event_key: evt.event_key,
      channel_name: row.channel_name,
      video_id: row.video_id,
      fight_order: Number(row.fight_order),
      market: row.market,
      selection: row.selection,
      recommendation_strength: row.recommendation_strength || '',
      result: grade,
      graded_at: gradedAt,
    },
  });
}

return output.length > 0 ? output : [{ json: { row_type: 'none' } }];
