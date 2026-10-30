const inputItems = $input.all();

if (inputItems.length !== 1) {
  throw new Error(
    `Parse OpenRouter Extraction expected exactly 1 input item, received ${inputItems.length}`
  );
}

const response = inputItems[0].json;

const source =
  $('Loop Over Videos').item.json;

/*
Handle OpenRouter API-level errors.
*/
if (response?.error) {
  throw new Error(
    `OpenRouter error: ${JSON.stringify(response.error).slice(0, 3000)}`
  );
}

/*
A normal Chat Completions response should contain at least one choice.
*/
const choice =
  response?.choices?.[0];

if (!choice) {
  throw new Error(
    `OpenRouter returned no choices. Response: ${JSON.stringify(response).slice(0, 3000)}`
  );
}

const finishReason =
  String(choice.finish_reason || '');

const nativeFinishReason =
  String(choice.native_finish_reason || '');

const reasoningTokens =
  response?.usage?.completion_tokens_details?.reasoning_tokens ??
  response?.usage?.reasoning_tokens ??
  null;

/*
Reject truncated/incomplete model responses.
*/
if (finishReason !== 'stop') {
  throw new Error(
    `Extraction did not finish normally. ` +
    `finish_reason=${finishReason || 'missing'}, ` +
    `native_finish_reason=${nativeFinishReason || 'missing'}, ` +
    `completion_tokens=${response?.usage?.completion_tokens ?? 'unknown'}, ` +
    `reasoning_tokens=${reasoningTokens ?? 'unknown'}`
  );
}

const content =
  choice?.message?.content;

if (
  content == null ||
  String(content).trim() === ''
) {
  throw new Error(
    `OpenRouter returned empty content. ` +
    `finish_reason=${finishReason}, ` +
    `reasoning_tokens=${reasoningTokens ?? 'unknown'}`
  );
}

/*
Parse the model response.
*/
let extracted;

if (
  typeof content === 'object' &&
  content !== null
) {
  extracted = content;
} else {
  const cleaned = String(content)
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    extracted =
      JSON.parse(cleaned);
  } catch (error) {
    throw new Error(
      `Could not parse OpenRouter JSON: ${error.message}. ` +
      `Response begins: ${cleaned.slice(0, 2000)}`
    );
  }
}

/*
Top-level result must be a JSON object.
*/
if (
  !extracted ||
  typeof extracted !== 'object' ||
  Array.isArray(extracted)
) {
  throw new Error(
    'Parsed extraction is not a JSON object'
  );
}

/*
The ONLY required top-level extraction field is fights.

Parlays are no longer part of this workflow.
*/
if (!Array.isArray(extracted.fights)) {
  throw new Error(
    'Parsed extraction does not contain a fights array'
  );
}

/*
Normalize each fight.

No props is valid, so missing props becomes [].
No winner pick is valid, so missing winner_pick becomes null.
*/
const fights =
  extracted.fights.map(
    (fight, index) => {
      if (
        !fight ||
        typeof fight !== 'object' ||
        Array.isArray(fight)
      ) {
        throw new Error(
          `Fight at array index ${index} is not a valid object`
        );
      }

      const normalizedFight = {
        ...fight,
      };

      if (
        normalizedFight.props === undefined ||
        normalizedFight.props === null
      ) {
        normalizedFight.props = [];
      }

      if (
        !Array.isArray(normalizedFight.props)
      ) {
        throw new Error(
          `Fight ${
            normalizedFight.fight_order ?? index + 1
          } contains an invalid props value`
        );
      }

      if (
        normalizedFight.winner_pick === undefined
      ) {
        normalizedFight.winner_pick = null;
      }

      return normalizedFight;
    }
  );

/*
Return source metadata plus the normalized extraction.

No parlays field is created or expected anywhere here.
*/
return [
  {
    json: {
      ...source,

      output: {
        fights,
      },

      fights,

      openrouter_model:
        response.model ?? null,

      openrouter_provider:
        response.provider ?? null,

      openrouter_finish_reason:
        finishReason,

      openrouter_native_finish_reason:
        nativeFinishReason || null,

      openrouter_prompt_tokens:
        response?.usage?.prompt_tokens ?? null,

      openrouter_completion_tokens:
        response?.usage?.completion_tokens ?? null,

      openrouter_reasoning_tokens:
        reasoningTokens,

      openrouter_total_tokens:
        response?.usage?.total_tokens ?? null,

      openrouter_cost:
        response?.usage?.cost ?? null,

      openrouter_metadata:
        response?.openrouter_metadata ?? null,
    },
  },
];
