// Format the weighted consensus for Telegram.

const base = $('Build Weighted Consensus').first().json;

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

if (base.no_picks) {
  return [
    {
      json: {
        chat_id: base.chat_id,
        text:
          `<b>${escapeHtml(base.event_name)}</b>\n\n` +
          'No analysed picks yet. Send /analyse to process the captured videos.',
      },
    },
  ];
}

let explanations = base.explanations;
let generatedCostUsd = null;
let explanationError = '';
let freshlyGenerated = false;

try {
  const generated = $('Parse Explanations').first().json;

  if (generated) {
    if (generated.ok) {
      explanations = generated.explanations;
      generatedCostUsd = generated.cost_usd;
      freshlyGenerated = true;
    } else {
      explanationError = generated.error || 'unknown error';
    }
  }
} catch {
  // Explanations came from the cache, or this is a plain vote.
}

const lines = [
  base.is_digest
    ? '<b>Pre-event digest — weighted consensus</b>'
    : base.plain
      ? '<b>Plain-vote consensus</b>'
      : '<b>Weighted consensus</b>',
  `<b>${escapeHtml(base.event_name)}</b>`,
  `${base.picker_count} pickers, ${base.video_count} videos analysed`,
  base.plain
    ? 'Every pick counts equally.'
    : 'Weights: pick confidence (main factor), with a small nudge for each picker’s graded record.',
  '',
];

for (const fight of base.fights) {
  let tag = '';

  if (fight.isTie) tag = ' ⚖️ toss-up';
  else if (fight.share >= 0.8 && fight.total >= 4) tag = ' 🔒 strong';
  else if (fight.share < 0.6) tag = ' ⚖️ close';

  const shareText = base.plain
    ? `${fight.count}/${fight.total} pickers`
    : `${Math.round(fight.share * 100)}% weighted · ${fight.count}/${fight.total} pickers`;

  const methodPart = fight.methodText ? ` · ${fight.methodText}` : '';
  const flipNote = fight.flipped
    ? ` (plain vote: ${escapeHtml(fight.plainWinner)})`
    : '';

  lines.push(
    `${fight.order}. <b>${escapeHtml(fight.winner)}</b> over ${escapeHtml(fight.loser)} — ` +
    `${shareText}${methodPart}${tag}${flipNote}`
  );

  const explanation = explanations?.[String(fight.order)];

  if (explanation) {
    lines.push(`   ${escapeHtml(explanation)}`);
  }

  lines.push('');
}

const flips = base.fights.filter((fight) => fight.flipped);

if (!base.plain && flips.length > 0) {
  lines.push(
    `<i>Weighting changed the call in ${flips.length} fight${flips.length > 1 ? 's' : ''} ` +
    `compared with a plain vote.</i>`
  );
}

if (!base.plain) {
  if (explanationError) {
    lines.push(`<i>Explanations unavailable this time (${escapeHtml(explanationError)}).</i>`);
  } else if (freshlyGenerated) {
    lines.push(
      `<i>Explanations generated now${generatedCostUsd !== null ? ` for $${generatedCostUsd.toFixed(4)} (${(generatedCostUsd * 100).toFixed(2)} cents)` : ''}; ` +
      `saved until new picks arrive.</i>`
    );
  } else if (explanations) {
    lines.push('<i>Explanations saved from earlier (no new picks since), so this cost nothing.</i>');
  }
}

const messages = [];
let current = '';

for (const line of lines) {
  if (current && current.length + line.length + 1 > 3800) {
    messages.push(current.trim());
    current = '';
  }

  current = current ? `${current}\n${line}` : line;
}

if (current.trim()) messages.push(current.trim());

return messages.map((text) => ({ json: { chat_id: base.chat_id, text } }));
