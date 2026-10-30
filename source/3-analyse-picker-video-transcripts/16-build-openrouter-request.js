const source = $('Loop Over Videos').item.json;

const officialCard = String(
  source.fight_card_context ??
  source.officialCard ??
  source.official_card ??
  ''
).trim();

const transcript = String(
  source.transcript_text ??
  source.transcript ??
  source.complete_transcript ??
  ''
).trim();

if (!officialCard) {
  throw new Error(
    'Build OpenRouter Request could not find the official fight card. ' +
    `Available fields: ${Object.keys(source).join(', ')}`
  );
}

if (!transcript) {
  throw new Error(
    'Build OpenRouter Request could not find the transcript. ' +
    `Available fields: ${Object.keys(source).join(', ')}`
  );
}

const SYSTEM_PROMPT = String.raw`
ROLE

You extract a fight-picker's UFC winner picks, betting props, fighter analysis, matchup analysis, and supporting reasoning from a YouTube transcript and return one JSON object matching the supplied JSON Schema.

The transcript is auto-generated and may contain misspelled fighter names, missing punctuation, repeated sections, advertisements, and rambling discussion.

Extract only what the speaker actually states or clearly communicates.

Never invent:
- a pick
- a prop
- a method
- a round
- odds
- a stake
- a confidence statement
- a fighter's record
- a winning or losing streak
- recent results
- skills or weaknesses
- injury information
- supporting reasoning

Do not supplement the transcript with your own MMA knowledge or prior knowledge about the fighters.


INPUTS

You will receive:

1. OFFICIAL_CARD

The authoritative list of fights, canonical fighter names, fight_order values, aliases, and scheduled rounds.

2. TRANSCRIPT

The possibly messy auto-generated transcript.

OFFICIAL_CARD is the ground truth for:
- fighter names
- matchups
- fight ordering


OUTPUT CONTRACT

- Return one JSON object only.
- Do not return markdown.
- Do not return code fences.
- Do not return commentary.
- Do not return working notes.
- Match the supplied schema exactly.
- Include every required field.
- Use null for an absent nullable value.
- Use an empty props array when no qualifying props exist.
- Do not add fields outside the schema.


EXTRACTION PROCESS

For every fight meaningfully discussed by the speaker:

1. Identify Fighter A using OFFICIAL_CARD.
2. Identify Fighter B using OFFICIAL_CARD.
3. Summarize what the speaker says about Fighter A.
4. Summarize what the speaker says about Fighter B.
5. Summarize how the speaker expects the fight itself to unfold.
6. Determine the speaker's final winner pick, if one exists.
7. Identify the concise reasons supporting that winner pick.
8. Identify every clear method, round, distance, total, duration, double-chance, odds, stake, or other prop prediction.
9. Identify whether each prop is merely a prediction, a lean, a recommended wager, or a best bet.

Do not output internal working notes.


FIGHTER CONTEXT

For each discussed fight, return:

fighter_a_context
fighter_b_context

Each should be a thorough 3–4 sentence summary of what the speaker says about that fighter, including the specific strengths, weaknesses, statistics, recent results and concerns the speaker actually cites.

Useful information may include, when actually mentioned:

- recent form
- winning or losing streaks
- recent performances
- quality of opposition
- UFC experience
- age or physical attributes
- athleticism
- durability
- cardio
- pace
- power
- striking
- boxing
- kicking
- wrestling
- takedowns
- takedown defense
- grappling
- submission ability
- positional control
- defensive weaknesses
- offensive strengths
- stylistic tendencies
- improvements or regression
- concerns raised by the speaker

IMPORTANT:

- Do not invent a fighter biography.
- Do not state a winning streak unless the speaker says or clearly describes one.
- Do not state recent results unless the speaker provides them.
- Do not introduce facts from your own knowledge.
- If the speaker gives very little information about one fighter, summarize only what was actually said.
- If essentially no meaningful fighter-specific analysis is provided, use null.


FIGHT OUTLOOK

For each discussed fight, return:

fight_outlook

This should be a thorough 3–5 sentence summary of how the speaker thinks the matchup will play out, including the key factors the speaker says will decide it.

It should explain things such as:

- which fighter is expected to control the range
- who is expected to pressure
- whether wrestling or grappling is expected to matter
- whether one fighter is expected to have a speed, power, cardio, or technical advantage
- where each fighter may have success
- what the key matchup dynamic is
- whether the speaker expects a competitive fight
- whether the speaker expects a finish or decision
- how the selected winner is expected to get the better of the opponent

Do not force a winner into fight_outlook if the speaker does not choose one.

Do not invent tactical analysis that the speaker did not provide.


FIGHT INCLUSION

- Include a fight only when the speaker discusses or analyses it.
- Omit fights that are not discussed.
- Include an analysed fight even when no final winner is chosen.
- For such a fight, output winner_pick = null.
- Return fights in ascending canonical fight_order.
- Do not create a fight object for a matchup absent from OFFICIAL_CARD.


FIGHTER NAME NORMALIZATION

- Map nicknames, first-name-only references, phonetic spellings, and ASR errors to the relevant canonical fighter from OFFICIAL_CARD.
- Use the exact canonical fighter spelling in every structured fighter field.
- Also normalize fighter names inside:
  - evidence_quote
  - reasoning_summary
  - fighter_a_context
  - fighter_b_context
  - fight_outlook
  - selection
- Ignore a fighter or matchup when it cannot be reliably mapped to OFFICIAL_CARD.
- Never invent a mapping when uncertain.


WINNER PICK RULES

- winner_pick contains only the speaker's final selected winner and the reasons that fighter wins.
- Do not store method, round, total, duration, or distance predictions only inside winner_pick. Those belong in props.
- If the speaker changes their mind, keep only the final position.
- If the speaker discusses the fight but does not choose a winner, use winner_pick = null.
- A winner pick can be official even when the speaker says they will not bet it.
- reasoning_summary must contain only reasons the speaker actually stated.
- reasoning_summary should be 3–5 sentences: the main reasons the speaker gives, the specific factors or statistics the speaker cites, and any concerns or risks the speaker raises about the pick.


PROP RULES

A prop is any clear non-moneyline prediction or wager, including:

- method of victory
- method plus a round or round range
- winning round
- inside the distance
- goes the distance
- over or under a round line
- fight duration
- double chance
- another clearly stated fight market

Capture a clear specific outcome even when the speaker describes it as a prediction rather than a wager.

Do not create a prop merely because a winner was selected.

There must be a stated:
- method
- round
- range
- distance
- total
- duration
- or another specific market

Multiple distinct props for one fight are allowed.

Examples:

- Fighter by submission plus Under 1.5 rounds = two distinct props.
- Fighter by KO in Round 2 = one method_and_round prop, not separate method and round props.

When a prop names a winning fighter, prop.fighter should normally equal winner_pick.picked_fighter.

Only differ when the speaker genuinely predicts a prop involving the other fighter.


MARKET ENCODING

method_of_victory

- Use when a named fighter and method are stated, with no round or round range.
- fighter = canonical fighter.
- method = KO_TKO, submission, or decision.
- round = null.
- round_range = null.


method_and_round

- Use when a named fighter and method are stated together with either a single round or a round range.
- For a single round: round = 1–5 and round_range = null.
- For a range: round = null and round_range uses a compact value such as R2-R3.
- For "within two rounds": use round = null and round_range = R1-R2.


inside_distance

- Use when a named fighter is predicted to finish, but KO versus submission is unclear.
- fighter = canonical fighter.
- method = inside_distance.
- If a single round is stated, populate round.
- If a range is stated, populate round_range.


winning_round

- Use when an ending round is predicted but no method is specified.
- Populate fighter only if a fighter is named.
- method = unknown or null.


goes_distance

- Use when the fight is predicted to reach the scorecards but no decision winner is named.
- fighter = null.
- method = null.
- round = null.
- round_range = null.
- If a named fighter is predicted to win by decision, use method_of_victory with method = decision instead.


over_under_rounds

- Use for explicit over or under round lines.
- Put the line in selection, such as Under 1.5 rounds.
- fighter = null.
- method = null.
- round = null.
- round_range = null.


fight_duration

- Use for an explicit time or duration market that is not a normal round over/under.


double_chance

- Use for combinations such as Fighter A or the fight goes to decision.
- Describe the complete combination in selection.


other

- Use only when no defined market fits.


Selection should be short and human-readable.


ODDS AND STAKES

- Capture odds only when explicitly stated.
- Preserve the spoken form, such as -125, +250, pick 'em, or even money.
- Do not calculate, convert, or infer odds.
- Put odds on the object to which they apply.
- Capture stake_units only when the speaker explicitly gives a unit size.
- Do not convert currency into units.
- Otherwise output null.


CONFIDENCE

Use confidence_score as the primary value:

- 1–2 = very_low
- 3–4 = low
- 5–6 = medium
- 7–8 = high
- 9–10 = very_high

Keep confidence_label and confidence_score consistent on every winner_pick and prop.

confidence_basis:

explicit
- The speaker uses confidence language such as:
  - lock
  - easy
  - confident
  - low confidence
  - torn
  - coin flip
  - no idea

inferred
- The score is estimated from wording and context without explicit confidence language.


OFFICIAL PICKS AND RECOMMENDATION STRENGTH

is_official_pick = true when the speaker commits to the winner.

Examples:
- my pick is
- I am taking
- give me
- I am going with
- my official prediction
- equivalent clear commitment

is_official_pick = false for:
- unresolved thinking
- hypothetical discussion
- noncommittal preference


For props:

prediction_only

A clear forecast not framed as betting advice.


lean

Tentative betting interest.


recommended_bet

Explicitly recommended as a wager.


best_bet

Called a:
- lock
- hammer
- safest play
- strongest play
- easiest money
- best bet


EVIDENCE AND REASONING

evidence_quote is a short normalized evidence excerpt or close paraphrase of what the speaker said.

- It may correct ASR mistakes and fighter names.
- It must preserve the speaker's actual meaning.
- It must not introduce new information.
- A winner_pick evidence_quote should support why the fighter wins.
- A prop evidence_quote should support the specific method, round, total, or other market.

reasoning_summary:

- Use only reasoning stated by the speaker.
- Do not add independent MMA analysis.
- For a winner_pick, be specific rather than brief: include the concrete factors the speaker cites (3–5 sentences).
- For a prop, keep it to one or two sentences.


IGNORE

Ignore:

- sponsor reads
- advertisements
- giveaways
- channel promotion
- requests to like or subscribe
- off-topic discussion
- picks attributed only to another person
- betting lines mentioned without a corresponding prediction or recommendation


FINAL SELF-CHECK

Before returning, silently verify:

1. The response is one JSON object with no surrounding text.
2. Every required schema field is present.
3. Every absent nullable field is null.
4. No additional fields are present.
5. Every fighter name matches OFFICIAL_CARD exactly.
6. Every fight was actually discussed.
7. Fights are ordered by ascending fight_order.
8. fighter_a_context describes only Fighter A and only information provided by the speaker.
9. fighter_b_context describes only Fighter B and only information provided by the speaker.
10. fight_outlook summarizes the speaker's expected matchup dynamics without inventing analysis.
11. winner_pick contains only the final winner and supporting reasoning.
12. Every stated method, round, round range, total, odds, and stake appearing in evidence is represented in the structured fields.
13. round and round_range are not both populated on the same prop.
14. Confidence label and score agree.
15. No prop was invented.
`;

const SCHEMA = {
  type: 'object',

  properties: {
    fights: {
      type: 'array',

      items: {
        type: 'object',

        properties: {
          fight_order: {
            type: 'integer',
            minimum: 1,
          },

          fighter_a: {
            type: 'string',
          },

          fighter_b: {
            type: 'string',
          },

          fighter_a_context: {
            type: ['string', 'null'],
            maxLength: 1100,
          },

          fighter_b_context: {
            type: ['string', 'null'],
            maxLength: 1100,
          },

          fight_outlook: {
            type: ['string', 'null'],
            maxLength: 1300,
          },

          winner_pick: {
            anyOf: [
              {
                type: 'object',

                properties: {
                  picked_fighter: {
                    type: 'string',
                  },

                  confidence_label: {
                    type: 'string',
                    enum: [
                      'very_low',
                      'low',
                      'medium',
                      'high',
                      'very_high',
                    ],
                  },

                  confidence_score: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                  },

                  confidence_basis: {
                    type: 'string',
                    enum: [
                      'explicit',
                      'inferred',
                    ],
                  },

                  is_official_pick: {
                    type: 'boolean',
                  },

                  odds_mentioned: {
                    type: [
                      'string',
                      'null',
                    ],
                    maxLength: 50,
                  },

                  evidence_quote: {
                    type: 'string',
                    maxLength: 300,
                  },

                  reasoning_summary: {
                    type: 'string',
                    maxLength: 900,
                  },
                },

                required: [
                  'picked_fighter',
                  'confidence_label',
                  'confidence_score',
                  'confidence_basis',
                  'is_official_pick',
                  'odds_mentioned',
                  'evidence_quote',
                  'reasoning_summary',
                ],

                additionalProperties: false,
              },

              {
                type: 'null',
              },
            ],
          },

          props: {
            type: 'array',

            items: {
              type: 'object',

              properties: {
                market: {
                  type: 'string',
                  enum: [
                    'method_of_victory',
                    'method_and_round',
                    'inside_distance',
                    'goes_distance',
                    'fight_duration',
                    'over_under_rounds',
                    'double_chance',
                    'winning_round',
                    'other',
                  ],
                },

                selection: {
                  type: 'string',
                  maxLength: 160,
                },

                fighter: {
                  type: [
                    'string',
                    'null',
                  ],
                },

                method: {
                  type: [
                    'string',
                    'null',
                  ],

                  enum: [
                    'KO_TKO',
                    'submission',
                    'decision',
                    'inside_distance',
                    'unknown',
                    null,
                  ],
                },

                round: {
                  type: [
                    'integer',
                    'null',
                  ],

                  minimum: 1,
                  maximum: 5,
                },

                round_range: {
                  type: [
                    'string',
                    'null',
                  ],
                  maxLength: 20,
                },

                odds_mentioned: {
                  type: [
                    'string',
                    'null',
                  ],
                  maxLength: 50,
                },

                stake_units: {
                  type: [
                    'number',
                    'null',
                  ],
                  minimum: 0.5,
                  multipleOf: 0.5,
                },

                confidence_label: {
                  type: 'string',
                  enum: [
                    'very_low',
                    'low',
                    'medium',
                    'high',
                    'very_high',
                  ],
                },

                confidence_score: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 10,
                },

                confidence_basis: {
                  type: 'string',
                  enum: [
                    'explicit',
                    'inferred',
                  ],
                },

                recommendation_strength: {
                  type: 'string',
                  enum: [
                    'prediction_only',
                    'lean',
                    'recommended_bet',
                    'best_bet',
                  ],
                },

                evidence_quote: {
                  type: 'string',
                  maxLength: 300,
                },

                reasoning_summary: {
                  type: 'string',
                  maxLength: 400,
                },
              },

              required: [
                'market',
                'selection',
                'fighter',
                'method',
                'round',
                'round_range',
                'odds_mentioned',
                'stake_units',
                'confidence_label',
                'confidence_score',
                'confidence_basis',
                'recommendation_strength',
                'evidence_quote',
                'reasoning_summary',
              ],

              additionalProperties: false,
            },
          },
        },

        required: [
          'fight_order',
          'fighter_a',
          'fighter_b',
          'fighter_a_context',
          'fighter_b_context',
          'fight_outlook',
          'winner_pick',
          'props',
        ],

        additionalProperties: false,
      },
    },
  },

  required: [
    'fights',
  ],

  additionalProperties: false,
};

const userMessage = [
  'OFFICIAL_CARD',
  '',
  officialCard,
  '',
  'TRANSCRIPT',
  '',
  transcript,
].join('\n');

return {
  json: {
    ...source,

    openrouter_payload: {
      /*
      GPT-6 Luna Pro is the same underlying GPT-6 Luna model
      served with reasoning.mode=pro.

      The dedicated OpenRouter slug applies Pro reasoning
      automatically.
      */
      model: 'openai/gpt-6-luna-pro',

      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],

      /*
      Increased from 8k because we now request:
      - Fighter A context
      - Fighter B context
      - Fight outlook

      for every discussed fight.
      */
      max_tokens: 20000,

      stream: false,

      /*
      Allow schema-capable providers under the output-price ceiling,
      including the DeepSeek fallback. Do not disable Pro reasoning
      on the primary model.
      */
      // OpenRouter tries DeepSeek if the GPT model cannot serve the request.
      models: [
        'openai/gpt-6-luna-pro',
        'deepseek/deepseek-v4.1-flash-1017',
      ],

      // Cap every eligible provider's output rate at $0.66 per million tokens.
      provider: {
        max_price: {
          completion: 0.66,
        },
        require_parameters: true,
        allow_fallbacks: true,
      },

      response_format: {
        type: 'json_schema',

        json_schema: {
          name: 'ufc_pick_extraction',
          strict: true,
          schema: SCHEMA,
        },
      },
    },
  },
};
