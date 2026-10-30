// Build the post-event scorecard message.

const evt = $('Pick Event To Grade').first().json;
const results = $('Build Fight Results').all().map((item) => item.json);
const pickGrades = $('Grade Picks').all().map((item) => item.json).filter((row) => row.pick_id);
const propGrades = $('Grade Props').all().map((item) => item.json).filter((row) => row.prop_id);

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const percent = (correct, total) => (total > 0 ? Math.round((correct / total) * 100) : 0);

const pickers = new Map();

const statsFor = (name) => {
  if (!pickers.has(name)) {
    pickers.set(name, { name, pickCorrect: 0, pickTotal: 0, propCorrect: 0, propTotal: 0 });
  }

  return pickers.get(name);
};

for (const grade of pickGrades) {
  if (grade.result !== 'CORRECT' && grade.result !== 'INCORRECT') continue;

  const stats = statsFor(grade.channel_name);
  stats.pickTotal += 1;
  if (grade.result === 'CORRECT') stats.pickCorrect += 1;
}

for (const grade of propGrades) {
  if (grade.result !== 'CORRECT' && grade.result !== 'INCORRECT') continue;

  const stats = statsFor(grade.channel_name);
  stats.propTotal += 1;
  if (grade.result === 'CORRECT') stats.propCorrect += 1;
}

const ranked = [...pickers.values()].sort((a, b) => {
  const accuracyDiff = percent(b.pickCorrect, b.pickTotal) - percent(a.pickCorrect, a.pickTotal);

  return accuracyDiff !== 0 ? accuracyDiff : b.pickTotal - a.pickTotal;
});

const lines = [
  '<b>Event results and pick scores</b>',
  `<b>${escapeHtml(evt.event_name)}</b>`,
  `${results.length} fights graded`,
  '',
];

if (ranked.length === 0) {
  lines.push('No picks were available to grade for this event.');
} else {
  ranked.forEach((stats, index) => {
    const props =
      stats.propTotal > 0
        ? ` · props ${stats.propCorrect}/${stats.propTotal} (${percent(stats.propCorrect, stats.propTotal)}%)`
        : '';

    lines.push(
      `${index + 1}. ${escapeHtml(stats.name)} — ${stats.pickCorrect}/${stats.pickTotal} ` +
      `picks (${percent(stats.pickCorrect, stats.pickTotal)}%)${props}`
    );
  });
}

// Fights where nobody (or almost nobody) picked the winner.
const byFight = new Map();

for (const grade of pickGrades) {
  if (grade.result !== 'CORRECT' && grade.result !== 'INCORRECT') continue;

  const entry = byFight.get(grade.fight_order) || { correct: 0, total: 0, winner: grade.winner, a: grade.fighter_a, b: grade.fighter_b };
  entry.total += 1;
  if (grade.result === 'CORRECT') entry.correct += 1;
  byFight.set(grade.fight_order, entry);
}

const missed = [...byFight.values()]
  .filter((entry) => entry.total >= 3 && entry.correct / entry.total <= 0.34)
  .sort((a, b) => a.correct / a.total - b.correct / b.total)
  .slice(0, 3);

if (missed.length > 0) {
  lines.push('', '<b>Fights the pickers missed</b>');

  for (const entry of missed) {
    lines.push(
      `• ${escapeHtml(entry.winner)} won (${entry.correct}/${entry.total} picked it)`
    );
  }
}

const bets = propGrades.filter(
  (grade) =>
    (grade.recommendation_strength === 'best_bet' ||
      grade.recommendation_strength === 'recommended_bet') &&
    (grade.result === 'CORRECT' || grade.result === 'INCORRECT')
);

if (bets.length > 0) {
  lines.push('', '<b>Recommended bets</b>');

  for (const bet of bets.slice(0, 8)) {
    lines.push(
      `${bet.result === 'CORRECT' ? '✅' : '❌'} ${escapeHtml(bet.selection)} ` +
      `(${escapeHtml(bet.channel_name)})`
    );
  }
}

return [{ json: { chat_id: evt.chat_id, notify: evt.notify, text: lines.join('\n') } }];
