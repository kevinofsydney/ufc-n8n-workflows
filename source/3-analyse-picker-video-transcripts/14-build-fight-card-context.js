const fights = $input.all()
  .map((item) => item.json)
  .filter((row) => row.fighter_a && row.fighter_b)
  .sort(
    (a, b) =>
      Number(a.fight_order || 999) -
      Number(b.fight_order || 999)
  );

const missingBoutIds = fights
  .filter((fight) => !String(fight.bout_id || '').trim())
  .map((fight) => fight.fight_order);

if (missingBoutIds.length > 0) {
  throw new Error(
    `Fight Card is missing bout_id for fight ${missingBoutIds.join(', ')}. ` +
    'Run svc.sync_bout_ids before analysis.'
  );
}

const lines = fights.map((fight) => {
  const aliasesA = String(fight.fighter_a_aliases || '').trim();
  const aliasesB = String(fight.fighter_b_aliases || '').trim();

  return [
    `Fight ${fight.fight_order}:`,
    `- Fighter A: ${fight.fighter_a}`,
    aliasesA ? `- Fighter A aliases: ${aliasesA}` : null,
    `- Fighter B: ${fight.fighter_b}`,
    aliasesB ? `- Fighter B aliases: ${aliasesB}` : null,
    fight.weight_class ? `- Weight class: ${fight.weight_class}` : null,
    `- Scheduled rounds: ${fight.scheduled_rounds || 3}`,
    `- Bout type: ${fight.bout_type || ''}`,
  ]
    .filter(Boolean)
    .join('\n');
});

return [
  {
    json: {
      fight_card_context: lines.join('\n\n'),
      fight_count: fights.length,
      fight_bout_ids: Object.fromEntries(
        fights.map((fight) => [
          Number(fight.fight_order),
          String(fight.bout_id).trim(),
        ])
      ),
    },
  },
];
