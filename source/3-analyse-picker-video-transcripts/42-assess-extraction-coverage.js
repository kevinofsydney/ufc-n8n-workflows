const source = $json;

const fights = Array.isArray(source.fights)
  ? source.fights
  : Array.isArray(source.output?.fights)
    ? source.output.fights
    : [];

const officialFightCount = Number(
  source.fight_count || 0
);

const extractedFightCount =
  fights.length;

const winnerPickCount =
  fights.filter((fight) => {
    return Boolean(
      fight?.winner_pick &&
      typeof fight.winner_pick === 'object' &&
      String(
        fight.winner_pick.picked_fighter || ''
      ).trim()
    );
  }).length;

/*
Anomaly rule.

Retry only when BOTH are true:

1. Fewer than 3 winner picks were extracted.
2. Those picks cover less than 30% of the official card.

This catches pathological results such as 1/12 without treating
ordinary partial-coverage videos as failures.
*/
const coverageRatio =
  officialFightCount > 0
    ? winnerPickCount / officialFightCount
    : 1;

const isBingoFormat = /\bbingo\b/i.test(String(source.video_title || ''));

const suspiciouslyLowCoverage =
  !isBingoFormat &&
  officialFightCount >= 5 &&
  winnerPickCount < 3 &&
  coverageRatio < 0.30;

return {
  json: {
    ...source,

    extraction_coverage: {
      official_fight_count:
        officialFightCount,

      extracted_fight_count:
        extractedFightCount,

      winner_pick_count:
        winnerPickCount,

      winner_pick_coverage_ratio:
        coverageRatio,

      suspiciously_low:
        suspiciouslyLowCoverage
    },

    retry_needed:
      suspiciouslyLowCoverage,

    retry_reason:
      suspiciouslyLowCoverage
        ? (
            `Suspiciously low extraction coverage: ` +
            `${winnerPickCount} winner picks from ` +
            `${officialFightCount} official fights`
          )
        : null
  }
};
