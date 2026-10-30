// All events produced by the scraper and 21-day filter.
const scrapedEvents = $('Normalise and Filter UFC Events')
  .all()
  .map(item => item.json);

// All rows currently stored in ufc_events.
// These are the direct inputs to this Code node.
const existingRows = $input
  .all()
  .map(item => item.json)
  .filter(row => row.id !== undefined && row.id !== null);

// Build a lookup keyed by the stable UFC source event ID.
const existingBySourceId = new Map();

for (const row of existingRows) {
  const sourceEventId = String(row.source_event_id ?? '').trim();

  if (sourceEventId) {
    existingBySourceId.set(sourceEventId, row);
  }
}

return scrapedEvents.map(event => {
  const sourceEventId = String(event.source_event_id ?? '').trim();
  const existingRow = existingBySourceId.get(sourceEventId) ?? null;

  return {
    json: {
      ...event,

      // Used by the following IF node.
      event_exists: existingRow !== null,

      // Used by the update branch.
      existing_row_id: existingRow?.id ?? null,

      // Useful for debugging and preserving awareness of current state.
      existing_active: existingRow?.active ?? null,
      existing_event_name: existingRow?.event_name ?? null,
    },
  };
});
