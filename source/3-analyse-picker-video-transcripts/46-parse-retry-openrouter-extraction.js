const inputItems = $input.all();

if (inputItems.length !== 1) {
  throw new Error(
    `Parse Retry OpenRouter Extraction expected exactly 1 input item, received ${inputItems.length}`
  );
}

const response =
  inputItems[0].json;

const source =
  $('Build Retry OpenRouter Request').item.json;

if (response?.error) {
  throw new Error(
    `OpenRouter retry error: ${JSON.stringify(response.error).slice(0, 3000)}`
  );
}

const choice =
  response?.choices?.[0];

if (!choice) {
  throw new Error(
    `OpenRouter retry returned no choices. ` +
    `Response: ${JSON.stringify(response).slice(0, 3000)}`
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

if (finishReason !== 'stop') {
  throw new Error(
    `Retry extraction did not finish normally. ` +
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
    'OpenRouter retry returned empty content.'
  );
}

let extracted;

if (
  typeof content === 'object' &&
  content !== null
) {
  extracted = content;
} else {
  const cleaned =
    String(content)
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');

  try {
    extracted =
      JSON.parse(cleaned);
  } catch (error) {
    throw new Error(
      `Could not parse retry JSON: ${error.message}. ` +
      `Response begins: ${cleaned.slice(0, 2000)}`
    );
  }
}

if (
  !extracted ||
  typeof extracted !== 'object' ||
  Array.isArray(extracted)
) {
  throw new Error(
    'Parsed retry extraction is not a JSON object'
  );
}

if (!Array.isArray(extracted.fights)) {
  throw new Error(
    'Parsed retry extraction does not contain a fights array'
  );
}

const fights =
  extracted.fights.map(
    (fight, index) => {
      if (
        !fight ||
        typeof fight !== 'object' ||
        Array.isArray(fight)
      ) {
        throw new Error(
          `Retry fight at array index ${index} is not a valid object`
        );
      }

      const normalizedFight = {
        ...fight
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
          `Retry fight ${
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

return [
  {
    json: {
      ...source,

      output: {
        fights
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

      extraction_retry_used:
        true,

      extraction_retry_model:
        response.model ?? null
    }
  }
];
