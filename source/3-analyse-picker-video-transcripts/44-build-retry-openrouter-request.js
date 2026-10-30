const source = $json;

/*
Reuse the exact prompt, official card, transcript and JSON schema
already created by Build OpenRouter Request.

Only change the model and add a short retry instruction.
*/
const original =
  $('Build OpenRouter Request').item.json
    .openrouter_payload;

if (
  !original ||
  typeof original !== 'object'
) {
  throw new Error(
    'Could not retrieve the original OpenRouter payload.'
  );
}

const payload =
  JSON.parse(JSON.stringify(original));

/*
Use a different cheap model for the retry.

Model diversity is useful here because the first model has already
produced a suspiciously incomplete extraction.
*/
payload.model =
  'deepseek/deepseek-v4.1-flash-1017';

/*
Do not carry a models fallback array if one happens to exist.
*/
delete payload.models;

// A retry starts directly on DeepSeek, with dynamic price filtering.
payload.provider = {
  max_price: {
    completion: 0.66
  },
  require_parameters: true,
  allow_fallbacks: true
};

/*
Add explicit context explaining why this is a retry.

The original transcript and official fight card remain untouched.
*/
payload.messages.push({
  role: 'user',
  content:
    `RETRY INSTRUCTION:\n\n` +
    `The previous extraction produced suspiciously low coverage: ` +
    `${source.extraction_coverage?.winner_pick_count ?? 0} winner picks ` +
    `from ${source.extraction_coverage?.official_fight_count ?? 'unknown'} ` +
    `official fights.\n\n` +
    `Re-read the COMPLETE transcript carefully from beginning to end. ` +
    `Do not assume the previous extraction was complete. ` +
    `Extract every fight that the speaker actually discusses and every ` +
    `clear final winner pick and prop. ` +
    `Do not invent picks for fights the speaker does not discuss.`
});

return {
  json: {
    ...source,

    retry_attempt:
      1,

    original_extraction_model:
      source.openrouter_model ?? null,

    retry_openrouter_payload:
      payload
  }
};
