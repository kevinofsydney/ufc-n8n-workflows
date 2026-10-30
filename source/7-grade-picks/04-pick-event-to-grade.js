// Choose the event to grade.
// - Scheduled run: the most recent finished event that has not been graded yet.
// - On demand (/grade [text]): the most recent finished event, or the one matching the text.

const OWNER_CHAT_ID = 0;
const ENDED_AFTER_HOURS = 4;
const BACKFILL_DAYS = 180;
const NOTIFY_WITHIN_DAYS = 3;

const nowMs = Date.now();

let trigger = {};

try {
  trigger = $('Grade On Demand').first().json || {};
} catch {
  // Scheduled run: the on-demand trigger did not fire.
}

const forced = Object.keys(trigger).length > 0;
const chatId = trigger.chat_id || OWNER_CHAT_ID;

const normalise = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const needle = normalise(trigger.args);

const candidates = $input
  .all()
  .map((item) => item.json)
  .filter((row) => row.event_key && row.spreadsheet_id && row.event_datetime_local)
  .map((row) => ({ row, startMs: Date.parse(row.event_datetime_local) }))
  .filter((entry) => Number.isFinite(entry.startMs))
  .filter((entry) => nowMs - entry.startMs >= ENDED_AFTER_HOURS * 3600 * 1000);

let pool;

if (forced) {
  pool = needle
    ? candidates.filter((entry) =>
        normalise(`${entry.row.event_key} ${entry.row.event_name}`).includes(needle)
      )
    : candidates;
} else {
  pool = candidates.filter(
    (entry) =>
      !entry.row.graded_at &&
      nowMs - entry.startMs <= BACKFILL_DAYS * 24 * 3600 * 1000
  );
}

pool.sort((a, b) => b.startMs - a.startMs);

if (pool.length === 0) {
  return forced
    ? [
        {
          json: {
            abort: true,
            chat_id: chatId,
            message: needle
              ? `No finished event matched "${trigger.args}".`
              : 'No finished event to grade yet.',
          },
        },
      ]
    : [];
}

const chosen = pool[0];

return [
  {
    json: {
      ...chosen.row,
      abort: false,
      forced,
      chat_id: chatId,
      notify: forced || nowMs - chosen.startMs <= NOTIFY_WITHIN_DAYS * 24 * 3600 * 1000,
    },
  },
];
