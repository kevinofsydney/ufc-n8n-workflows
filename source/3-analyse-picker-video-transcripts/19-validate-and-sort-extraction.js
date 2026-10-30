const source = $json;

const extracted =
  source.output || source;

const rawFights =
  Array.isArray(extracted.fights)
    ? extracted.fights
    : [];

const validationErrors = [];
const seenFightOrders = new Set();

function normalizeFight(rawFight) {
  const fight = {
    ...rawFight,
  };

  let fighterA =
    String(fight.fighter_a || '').trim();

  let fighterB =
    String(fight.fighter_b || '').trim();

  if (
    (!fighterA || !fighterB) &&
    fight.matchup
  ) {
    const matchup =
      String(fight.matchup).trim();

    const parts =
      matchup.split(/\s+vs\.?\s+/i);

    if (parts.length === 2) {
      fighterA =
        fighterA || parts[0].trim();

      fighterB =
        fighterB || parts[1].trim();
    }
  }

  let winnerPick =
    fight.winner_pick ?? null;

  if (
    winnerPick &&
    typeof winnerPick === 'object'
  ) {
    winnerPick = {
      ...winnerPick,

      odds_mentioned:
        winnerPick.odds_mentioned ??
        winnerPick.odds ??
        null,
    };

    delete winnerPick.odds;
  }

  const props =
    Array.isArray(fight.props)
      ? fight.props.map((rawProp) => {
          const prop = {
            ...rawProp,

            odds_mentioned:
              rawProp.odds_mentioned ??
              rawProp.odds ??
              null,

            round_range:
              rawProp.round_range ??
              null,
          };

          delete prop.odds;

          return prop;
        })
      : [];

  return {
    ...fight,

    fighter_a:
      fighterA,

    fighter_b:
      fighterB,

    winner_pick:
      winnerPick,

    props,
  };
}

const fights =
  rawFights.map(normalizeFight);

for (const fight of fights) {
  const fightOrder =
    Number(fight.fight_order);

  if (
    !Number.isInteger(fightOrder) ||
    fightOrder < 1
  ) {
    validationErrors.push(
      `Invalid fight_order: ${fight.fight_order}`
    );

    continue;
  }

  if (
    Number.isInteger(Number(source.fight_count)) &&
    fightOrder > Number(source.fight_count)
  ) {
    validationErrors.push(
      `fight_order ${fightOrder} exceeds fight_count ${source.fight_count}`
    );
  }

  if (
    seenFightOrders.has(fightOrder)
  ) {
    validationErrors.push(
      `Duplicate fight_order: ${fightOrder}`
    );
  }

  seenFightOrders.add(
    fightOrder
  );

  if (!fight.fighter_a) {
    validationErrors.push(
      `Fight ${fightOrder} is missing fighter_a`
    );
  }

  if (!fight.fighter_b) {
    validationErrors.push(
      `Fight ${fightOrder} is missing fighter_b`
    );
  }

  if (!Array.isArray(fight.props)) {
    validationErrors.push(
      `Fight ${fightOrder} does not contain a props array`
    );
  }

  if (
    fight.winner_pick !== null &&
    fight.winner_pick !== undefined &&
    typeof fight.winner_pick !== 'object'
  ) {
    validationErrors.push(
      `Fight ${fightOrder} has an invalid winner_pick`
    );
  }
}

fights.sort((a, b) => {
  return (
    Number(a.fight_order ?? 999) -
    Number(b.fight_order ?? 999)
  );
});

const winnerPickCount =
  fights.filter((fight) => {
    return Boolean(
      fight.winner_pick &&
      typeof fight.winner_pick === 'object' &&
      String(
        fight.winner_pick.picked_fighter || ''
      ).trim()
    );
  }).length;

if (winnerPickCount === 0) {
  validationErrors.push(
    'Extraction contained zero winner picks.'
  );
}

if (
  validationErrors.length > 0
) {
  throw new Error(
    `Extraction validation failed: ${validationErrors.join(' | ')}`
  );
}

return {
  json: {
    ...source,

    output: {
      fights,
    },

    fights,

    extracted_fight_count:
      fights.length,

    extracted_winner_pick_count:
      winnerPickCount,

    validation_status:
      'PASSED',

    validation_errors:
      [],
  },
};
