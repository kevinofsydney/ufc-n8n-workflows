const source = $json;

// Rows are keyed by the stable bout_id, so re-ordering the card never re-points an ID.
const boutIds =
  $('Build Fight Card Context').first().json.fight_bout_ids || {};

const fights =
  Array.isArray(source.fights)
    ? source.fights
    : Array.isArray(source.output?.fights)
      ? source.output.fights
      : [];

const extractedAt =
  new Date().toISOString();

const promptVersion =
  'ufc_extract_v5_rich_summaries_2026-10-15';

const modelName =
  source.openrouter_model ||
  'openai/gpt-6-luna-pro';

const reviewStatus =
  'PENDING_REVIEW';

const extractionRetryUsed =
  source.extraction_retry_used === true;

const extractionRetryModel =
  source.extraction_retry_model ??
  (
    extractionRetryUsed
      ? source.openrouter_model ?? null
      : null
  );

const originalExtractionModel =
  source.original_extraction_model ??
  null;

function toKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._+-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const pickRows = [];
const propRows = [];
const fightAnalysisRows = [];

/*
Create one fight-level analysis row per discussed fight.
*/
for (const fight of fights) {
  const fightOrder =
    Number(fight.fight_order);

  const boutId =
    boutIds[fightOrder];

  if (!boutId) {
    throw new Error(
      `No bout_id on the Fight Card for fight_order ${fightOrder}`
    );
  }

  fightAnalysisRows.push({
    fight_analysis_id:
      `${source.video_id}|fight|${boutId}`,

    spreadsheet_id:
      source.spreadsheet_id,

    event_key:
      source.event_key,

    channel_name:
      source.channel_name,

    video_id:
      source.video_id,

    video_title:
      source.video_title,

    fight_order:
      fightOrder,

    bout_id:
      boutId,

    fighter_a:
      fight.fighter_a,

    fighter_b:
      fight.fighter_b,

    fighter_a_context:
      fight.fighter_a_context ?? null,

    fighter_b_context:
      fight.fighter_b_context ?? null,

    fight_outlook:
      fight.fight_outlook ?? null,

    extracted_at:
      extractedAt,

    model_name:
      modelName,

    prompt_version:
      promptVersion,

    review_status:
      reviewStatus,
  });

  const winner =
    fight.winner_pick;

  if (
    winner &&
    typeof winner === 'object'
  ) {
    pickRows.push({
      pick_id:
        `${source.video_id}|pick|${boutId}`,

      spreadsheet_id:
        source.spreadsheet_id,

      event_key:
        source.event_key,

      channel_name:
        source.channel_name,

      video_id:
        source.video_id,

      video_title:
        source.video_title,

      fight_order:
        fightOrder,

      bout_id:
        boutId,

      fighter_a:
        fight.fighter_a,

      fighter_b:
        fight.fighter_b,

      picked_fighter:
        winner.picked_fighter,

      confidence_label:
        winner.confidence_label,

      confidence_score:
        winner.confidence_score,

      confidence_basis:
        winner.confidence_basis,

      is_official_pick:
        winner.is_official_pick,

      odds_mentioned:
        winner.odds_mentioned ?? null,

      evidence_quote:
        winner.evidence_quote,

      reasoning_summary:
        winner.reasoning_summary,

      review_status:
        reviewStatus,

      extracted_at:
        extractedAt,

      model_name:
        modelName,

      prompt_version:
        promptVersion,
    });
  }

  const props =
    Array.isArray(fight.props)
      ? fight.props
      : [];

  for (const prop of props) {
    let opponent = null;

    if (
      prop.fighter === fight.fighter_a
    ) {
      opponent =
        fight.fighter_b;
    } else if (
      prop.fighter === fight.fighter_b
    ) {
      opponent =
        fight.fighter_a;
    }

    const propId = [
      source.video_id,
      'prop',
      boutId,
      toKey(prop.market),
      toKey(prop.selection),
    ].join('|');

    propRows.push({
      prop_id:
        propId,

      spreadsheet_id:
        source.spreadsheet_id,

      event_key:
        source.event_key,

      channel_name:
        source.channel_name,

      video_id:
        source.video_id,

      video_title:
        source.video_title,

      fight_order:
        fightOrder,

      bout_id:
        boutId,

      fighter_a:
        fight.fighter_a,

      fighter_b:
        fight.fighter_b,

      fighter:
        prop.fighter ?? null,

      opponent,

      market:
        prop.market,

      selection:
        prop.selection,

      method:
        prop.method ?? null,

      round:
        prop.round ?? null,

      round_range:
        prop.round_range ?? null,

      odds_mentioned:
        prop.odds_mentioned ?? null,

      stake_units:
        prop.stake_units ?? null,

      confidence_label:
        prop.confidence_label,

      confidence_score:
        prop.confidence_score,

      confidence_basis:
        prop.confidence_basis,

      recommendation_strength:
        prop.recommendation_strength,

      evidence_quote:
        prop.evidence_quote,

      reasoning_summary:
        prop.reasoning_summary,

      review_status:
        reviewStatus,

      extracted_at:
        extractedAt,

      model_name:
        modelName,

      prompt_version:
        promptVersion,
    });
  }
}

const extractionLogRow = {
  extraction_id:
    source.video_id,

  spreadsheet_id:
    source.spreadsheet_id,

  video_id:
    source.video_id,

  channel_name:
    source.channel_name,

  video_title:
    source.video_title,

  transcript_part_count:
    source.transcript_part_count,

  analysis_status:
    'COMPLETED',

  model_name:
    modelName,

  provider:
    source.openrouter_provider ?? null,

  prompt_version:
    promptVersion,

  input_characters:
    source.input_characters,

  prompt_tokens:
    source.openrouter_prompt_tokens ?? null,

  completion_tokens:
    source.openrouter_completion_tokens ?? null,

  reasoning_tokens:
    source.openrouter_reasoning_tokens ?? null,

  total_tokens:
    source.openrouter_total_tokens ?? null,

  cost_usd:
    source.openrouter_cost ?? null,

  output_pick_count:
    pickRows.length,

  output_prop_count:
    propRows.length,

  output_fight_analysis_count:
    fightAnalysisRows.length,

  validation_status:
    source.validation_status,

  validation_error:
    Array.isArray(source.validation_errors)
      ? source.validation_errors.join(' | ')
      : '',

  extraction_retry_used:
    extractionRetryUsed,

  extraction_retry_model:
    extractionRetryModel,

  original_extraction_model:
    originalExtractionModel,

  extracted_at:
    extractedAt,
};

return {
  json: {
    video_id:
      source.video_id,

    channel_name:
      source.channel_name,

    video_title:
      source.video_title,

    event_key:
      source.event_key,

    event_name:
      source.event_name,

    spreadsheet_id:
      source.spreadsheet_id,

    spreadsheet_url:
      source.spreadsheet_url,

    model_name:
      modelName,

    prompt_version:
      promptVersion,

    extraction_retry_used:
      extractionRetryUsed,

    extraction_retry_model:
      extractionRetryModel,

    original_extraction_model:
      originalExtractionModel,

    pick_rows:
      pickRows,

    prop_rows:
      propRows,

    fight_analysis_rows:
      fightAnalysisRows,

    extraction_log_row:
      extractionLogRow,

    pick_row_count:
      pickRows.length,

    prop_row_count:
      propRows.length,

    fight_analysis_row_count:
      fightAnalysisRows.length,
  },
};
