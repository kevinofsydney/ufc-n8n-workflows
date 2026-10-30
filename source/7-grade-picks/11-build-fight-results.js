// Combine each fight's scoreboard entry with its ESPN result.

const comps = $('Match ESPN Event').all().map((item) => item.json);
const statuses = $input.all().map((item) => item.json);
const recordedAt = new Date().toISOString();

function mapMethod(name) {
  const value = String(name ?? '').toLowerCase();

  if (value === 'kotko' || value === 'ko' || value === 'tko') return 'KO_TKO';
  if (value.startsWith('submission')) return 'SUBMISSION';
  if (value.startsWith('decision')) return 'DECISION';
  if (value === 'draw') return 'DRAW';
  if (value === 'dq') return 'DQ';
  if (value === 'nc' || value.includes('no-contest') || value.includes('no contest')) {
    return 'NO_CONTEST';
  }

  return 'OTHER';
}

const rows = [];

statuses.forEach((status, index) => {
  const comp = comps[index];

  if (!comp || status?.type?.name !== 'STATUS_FINAL') return;

  const method = mapMethod(status.result?.name);
  const winnerName = comp.competitors.find((competitor) => competitor.winner)?.name ?? null;

  let winner = winnerName;

  if (method === 'DRAW') winner = 'DRAW';
  if (method === 'NO_CONTEST') winner = 'NO_CONTEST';

  const period = Number(status.period) || 0;
  const [minutes, seconds] = String(status.displayClock || '0:00')
    .split(':')
    .map((part) => Number(part) || 0);
  const clockSeconds = minutes * 60 + seconds;

  rows.push({
    json: {
      event_key: comp.event_key,
      espn_event_id: comp.espn_event_id,
      espn_competition_id: comp.espn_competition_id,
      fighter_a: comp.competitors[0]?.name ?? '',
      fighter_b: comp.competitors[1]?.name ?? '',
      winner,
      method,
      method_detail: status.result?.description || status.result?.displayName || '',
      round: period,
      clock: status.displayClock || '',
      elapsed_rounds: Math.round(((period - 1) + clockSeconds / 300) * 100) / 100,
      elapsed_minutes: Math.round(((period - 1) * 5 + clockSeconds / 60) * 100) / 100,
      scheduled_rounds: comp.scheduled_rounds,
      weight_class: comp.weight_class,
      recorded_at: recordedAt,
    },
  });
});

return rows;
