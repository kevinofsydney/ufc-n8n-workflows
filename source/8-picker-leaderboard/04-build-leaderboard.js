// All-time picker leaderboard from the graded picks and props.

const MIN_PICKS_TO_RANK = 15;
const HIGH_CONFIDENCE = 7;
const OWNER_CHAT_ID = 0;

let chatId = OWNER_CHAT_ID;

try {
  chatId = $('When Called').first().json.chat_id || OWNER_CHAT_ID;
} catch {
  // Not called from the router.
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const percent = (correct, total) => (total > 0 ? Math.round((correct / total) * 100) : 0);

const pickGrades = $('Get Pick Grades').all().map((item) => item.json).filter((row) => row.pick_id);
const propGrades = $('Get Prop Grades').all().map((item) => item.json).filter((row) => row.prop_id);

const pickers = new Map();
const events = new Set();

const statsFor = (name) => {
  if (!pickers.has(name)) {
    pickers.set(name, {
      name,
      events: new Set(),
      correct: 0,
      total: 0,
      highCorrect: 0,
      highTotal: 0,
      propCorrect: 0,
      propTotal: 0,
    });
  }

  return pickers.get(name);
};

for (const grade of pickGrades) {
  if (grade.result !== 'CORRECT' && grade.result !== 'INCORRECT') continue;

  const stats = statsFor(grade.channel_name);
  const isCorrect = grade.result === 'CORRECT';

  events.add(grade.event_key);
  stats.events.add(grade.event_key);
  stats.total += 1;
  if (isCorrect) stats.correct += 1;

  if (Number(grade.confidence_score) >= HIGH_CONFIDENCE) {
    stats.highTotal += 1;
    if (isCorrect) stats.highCorrect += 1;
  }
}

for (const grade of propGrades) {
  if (grade.result !== 'CORRECT' && grade.result !== 'INCORRECT') continue;

  const stats = statsFor(grade.channel_name);
  stats.propTotal += 1;
  if (grade.result === 'CORRECT') stats.propCorrect += 1;
}

if (pickers.size === 0) {
  return [
    {
      json: {
        chat_id: chatId,
        text: 'No graded picks yet. Grading runs automatically after each card, or send /grade.',
      },
    },
  ];
}

const all = [...pickers.values()];
const ranked = all
  .filter((stats) => stats.total >= MIN_PICKS_TO_RANK)
  .sort((a, b) => percent(b.correct, b.total) - percent(a.correct, a.total) || b.total - a.total);
const small = all
  .filter((stats) => stats.total < MIN_PICKS_TO_RANK)
  .sort((a, b) => b.total - a.total);

const formatRow = (stats, rank) => {
  const high =
    stats.highTotal > 0
      ? ` · high-confidence ${stats.highCorrect}/${stats.highTotal} (${percent(stats.highCorrect, stats.highTotal)}%)`
      : '';
  const props =
    stats.propTotal > 0
      ? ` · props ${stats.propCorrect}/${stats.propTotal} (${percent(stats.propCorrect, stats.propTotal)}%)`
      : '';

  return (
    `${rank ? `${rank}. ` : '• '}${escapeHtml(stats.name)} — ${stats.correct}/${stats.total} ` +
    `(${percent(stats.correct, stats.total)}%), ${stats.events.size} events${high}${props}`
  );
};

const lines = [
  '<b>Picker leaderboard</b>',
  `${events.size} events graded, ${pickGrades.length} picks`,
  '',
];

ranked.forEach((stats, index) => lines.push(formatRow(stats, index + 1)));

if (small.length > 0) {
  lines.push('', `<b>Small sample (under ${MIN_PICKS_TO_RANK} picks)</b>`);
  small.forEach((stats) => lines.push(formatRow(stats, null)));
}

const messages = [];
let current = '';

for (const line of lines) {
  if (current && current.length + line.length + 1 > 3800) {
    messages.push(current);
    current = '';
  }

  current = current ? `${current}\n${line}` : line;
}

if (current) messages.push(current);

return messages.map((text) => ({ json: { chat_id: chatId, text } }));
