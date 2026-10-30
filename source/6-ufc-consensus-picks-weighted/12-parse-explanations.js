// Parse the model's explanations and prepare the cache row.

const base = $('Build Weighted Consensus').first().json;
const response = $input.first().json || {};

let explanations = null;
let error = '';

if (response.error || !response.choices) {
  error = response.error?.message || response.message || 'no response from the model';
}

try {
  if (error) {
    throw new Error(error);
  }

  const content = response.choices?.[0]?.message?.content;
  const parsed = typeof content === 'string' ? JSON.parse(content) : content;
  const map = {};

  for (const entry of parsed?.fights ?? []) {
    if (Number.isFinite(Number(entry.fight_order)) && entry.explanation) {
      map[String(Number(entry.fight_order))] = String(entry.explanation).trim();
    }
  }

  const expected = base.fights.map((fight) => String(fight.order));
  const missing = expected.filter((order) => !map[order]);

  if (missing.length > 0) {
    error = `missing explanations for fights ${missing.join(', ')}`;
  } else {
    explanations = map;
  }
} catch (parseError) {
  if (!error) {
    error = `could not parse model output: ${parseError.message}`;
  }
}

const cost = Number(response.usage?.cost);

return [
  {
    json: {
      ok: explanations !== null,
      error,
      event_key: base.event_key,
      input_hash: base.input_hash,
      explanations,
      explanations_json: explanations ? JSON.stringify(explanations) : '',
      model: response.model || base.explanation_model,
      cost_usd: Number.isFinite(cost) ? cost : null,
      created_at: new Date().toISOString(),
    },
  },
];
