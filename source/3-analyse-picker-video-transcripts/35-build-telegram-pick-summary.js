const prepared =
  $('Prepare Extraction Rows').first().json;

const validated =
  $('Validate and Sort Extraction').first().json;

const picks = Array.isArray(prepared.pick_rows)
  ? prepared.pick_rows
  : [];

const props = Array.isArray(prepared.prop_rows)
  ? prepared.prop_rows
  : [];

const videoId =
  prepared.video_id ||
  validated.video_id ||
  '';

const channelName =
  prepared.channel_name ||
  validated.channel_name ||
  'Unknown picker';

const videoTitle =
  prepared.video_title ||
  validated.video_title ||
  '';

const eventName =
  prepared.event_name ||
  validated.event_name ||
  prepared.event_key ||
  validated.event_key ||
  '';

const eventKey =
  prepared.event_key ||
  validated.event_key ||
  '';

const spreadsheetId =
  prepared.spreadsheet_id ||
  validated.spreadsheet_id ||
  '';

const spreadsheetUrl =
  prepared.spreadsheet_url ||
  validated.spreadsheet_url ||
  (
    spreadsheetId
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
      : ''
  );

const extractionRetryUsed =
  prepared.extraction_retry_used === true;

const extractionRetryModel =
  prepared.extraction_retry_model ||
  null;

const originalExtractionModel =
  prepared.original_extraction_model ||
  null;

/*
Telegram HTML escaping.
*/
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/*
Keep reasoning short enough for Telegram.
*/
function conciseReason(
  value,
  maxLength = 190
) {
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) {
    return '';
  }

  const sentenceMatch =
    text.match(/^.*?[.!?](?:\s|$)/);

  const firstSentence =
    sentenceMatch
      ? sentenceMatch[0].trim()
      : text;

  if (
    firstSentence.length <= maxLength
  ) {
    return firstSentence;
  }

  return (
    `${firstSentence
      .slice(0, maxLength - 1)
      .trim()}…`
  );
}

/*
Describe predicted method of victory.
*/
function describeWinningMethod(prop) {
  if (!prop) {
    return 'to win';
  }

  const roundText =
    prop.round
      ? ` in R${prop.round}`
      : prop.round_range
        ? ` in ${prop.round_range}`
        : '';

  switch (prop.market) {
    case 'method_and_round':
    case 'method_of_victory': {
      if (
        prop.method === 'KO_TKO'
      ) {
        return `by KO/TKO${roundText}`;
      }

      if (
        prop.method === 'submission'
      ) {
        return `by submission${roundText}`;
      }

      if (
        prop.method === 'decision'
      ) {
        return 'by decision';
      }

      return prop.selection
        ? String(prop.selection)
        : 'to win';
    }

    case 'inside_distance':
      return (
        `inside the distance${roundText}`
      );

    case 'winning_round':
      return prop.round
        ? `to win in R${prop.round}`
        : prop.round_range
          ? `to win in ${prop.round_range}`
          : 'to win';

    default:
      return 'to win';
  }
}

/*
Find the most useful method prop for the winner.
*/
function findWinningMethodProp(pick) {
  const matchingProps =
    props.filter((prop) => {
      return (
        Number(prop.fight_order) ===
          Number(pick.fight_order) &&
        prop.fighter ===
          pick.picked_fighter
      );
    });

  const marketPriority = [
    'method_and_round',
    'method_of_victory',
    'inside_distance',
    'winning_round',
  ];

  for (
    const market
    of marketPriority
  ) {
    const match =
      matchingProps.find(
        (prop) =>
          prop.market === market
      );

    if (match) {
      return match;
    }
  }

  return null;
}

/*
Official fight-card order.
*/
const orderedPicks =
  [...picks].sort((a, b) => {
    return (
      Number(a.fight_order || 999) -
      Number(b.fight_order || 999)
    );
  });

const fightSections =
  orderedPicks.flatMap((pick) => {
    const opponent =
      pick.picked_fighter ===
        pick.fighter_a
        ? pick.fighter_b
        : pick.fighter_a;

    const methodProp =
      findWinningMethodProp(pick);

    const methodDescription =
      describeWinningMethod(
        methodProp
      );

    const confidenceLabel =
      String(
        pick.confidence_label ||
        'unknown'
      );

    const confidenceScore =
      Number(
        pick.confidence_score || 0
      );

    const reasoning =
      conciseReason(
        pick.reasoning_summary
      );

    const predictionLine =
      `<b>${Number(
        pick.fight_order
      )}. ` +
      `${escapeHtml(
        pick.picked_fighter
      )} ` +
      `${escapeHtml(
        methodDescription
      )} ` +
      `over ${escapeHtml(
        opponent || ''
      )}</b>` +
      ` — ${escapeHtml(
        confidenceLabel
      )} ` +
      `(${confidenceScore}/10)`;

    const lines = [
      predictionLine,
    ];

    if (reasoning) {
      lines.push(
        `↳ ${escapeHtml(reasoning)}`
      );
    }

    return lines;
  });

/*
Actual betting recommendations.
*/
const recommendedProps =
  props
    .filter((prop) =>
      [
        'lean',
        'recommended_bet',
        'best_bet',
      ].includes(
        prop.recommendation_strength
      )
    )
    .sort((a, b) => {
      return (
        Number(
          a.fight_order || 999
        ) -
        Number(
          b.fight_order || 999
        )
      );
    });

const propLines =
  recommendedProps.map((prop) => {
    const oddsText =
      prop.odds_mentioned
        ? ` at ${escapeHtml(
            prop.odds_mentioned
          )}`
        : '';

    const strengthText =
      String(
        prop.recommendation_strength ||
        ''
      ).replace(/_/g, ' ');

    return (
      `• Fight ${Number(
        prop.fight_order
      )}: ` +
      `${escapeHtml(
        prop.selection || ''
      )}` +
      `${oddsText}` +
      ` — ${escapeHtml(
        strengthText
      )}`
    );
  });

const lines = [
  `✅ <b>Picker video processed</b>`,
  ``,
  `<b>Picker:</b> ${escapeHtml(
    channelName
  )}`,
];

if (videoTitle) {
  lines.push(
    `<b>Video:</b> ${escapeHtml(
      videoTitle
    )}`
  );
}

if (eventName) {
  lines.push(
    `<b>Event:</b> ${escapeHtml(
      eventName
    )}`
  );
}

lines.push(
  `<b>Results:</b> ` +
    `${picks.length} picks, ` +
    `${props.length} props`
);

/*
Model and cost of the analysis. When the retry safeguard fired, the cost is
the sum of both model calls.
*/
const logRow =
  prepared.extraction_log_row || {};

const finalModel =
  prepared.model_name ||
  logRow.model_name ||
  'unknown';

let totalCostUsd =
  Number.isFinite(Number(logRow.cost_usd)) &&
  logRow.cost_usd !== null
    ? Number(logRow.cost_usd)
    : null;

if (extractionRetryUsed) {
  const firstCostUsd =
    Number(validated.openrouter_cost);

  if (
    totalCostUsd !== null &&
    Number.isFinite(firstCostUsd)
  ) {
    totalCostUsd += firstCostUsd;
  }
}

function formatCost(usd) {
  if (usd === null) {
    return 'n/a';
  }

  return usd >= 1
    ? `$${usd.toFixed(2)}`
    : `${(usd * 100).toFixed(2)}¢`;
}

function formatTokens(count) {
  const number = Number(count);

  if (!Number.isFinite(number)) {
    return '?';
  }

  return number >= 1000
    ? `${(number / 1000).toFixed(1)}k`
    : String(number);
}

const modelText =
  extractionRetryUsed &&
  originalExtractionModel &&
  extractionRetryModel
    ? `${originalExtractionModel} + ${extractionRetryModel}`
    : finalModel;

lines.push(
  `<b>Model:</b> ${escapeHtml(modelText)}`,
  `<b>Cost:</b> ${formatCost(totalCostUsd)} ` +
    `(${formatTokens(logRow.prompt_tokens)} in / ` +
    `${formatTokens(logRow.completion_tokens)} out)`
);

/*
Show retry warning only when the automatic retry safeguard fired.
*/
if (extractionRetryUsed) {
  lines.push(
    ``,
    `⚠️ <b>Automatic extraction retry used</b>`
  );

  if (
    originalExtractionModel &&
    extractionRetryModel
  ) {
    lines.push(
      `${escapeHtml(
        originalExtractionModel
      )} → ${escapeHtml(
        extractionRetryModel
      )}`
    );
  } else if (
    extractionRetryModel
  ) {
    lines.push(
      `Retry model: ${escapeHtml(
        extractionRetryModel
      )}`
    );
  }
}

lines.push(
  ``,
  `<b>Fight-card picks</b>`,
  ...fightSections
);

if (
  propLines.length > 0
) {
  lines.push(
    ``,
    `<b>Betting leans and recommendations</b>`,
    ...propLines
  );
}

if (spreadsheetUrl) {
  lines.push(
    ``,
    `<a href="${escapeHtml(
      spreadsheetUrl
    )}">Open event spreadsheet</a>`
  );
}

/*
Telegram has a ~4096-character limit.
*/
let telegramMessage =
  lines.join('\n');

if (
  telegramMessage.length > 3900
) {
  telegramMessage =
    `${telegramMessage
      .slice(0, 3780)
      .trim()}\n\n` +
    `<i>Message shortened. Open the spreadsheet for the full extraction.</i>`;

  if (spreadsheetUrl) {
    telegramMessage +=
      `\n<a href="${escapeHtml(
        spreadsheetUrl
      )}">Open event spreadsheet</a>`;
  }
}

return {
  json: {
    video_id:
      videoId,

    event_key:
      eventKey,

    spreadsheet_id:
      spreadsheetId,

    extraction_retry_used:
      extractionRetryUsed,

    extraction_retry_model:
      extractionRetryModel,

    telegram_message:
      telegramMessage,
  },
};
