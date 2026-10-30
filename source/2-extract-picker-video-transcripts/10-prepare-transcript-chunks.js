// Split long transcripts into spreadsheet-safe, ordered chunks.

const MAX_CHARS = 49000;
const output = [];

for (const [itemIndex, item] of $input.all().entries()) {
  const data = item.json;
  const fullText = String(data.content || '').trim();

  if (!fullText) {
    continue;
  }

  const chunks = [];
  let remaining = fullText;

  while (remaining.length > MAX_CHARS) {
    let cutPosition = remaining.lastIndexOf('\n', MAX_CHARS);

    // Prefer a paragraph break, but don't create an extremely short chunk.
    if (cutPosition < MAX_CHARS * 0.7) {
      cutPosition = remaining.lastIndexOf('. ', MAX_CHARS);
    }

    // Fall back to a hard character limit.
    if (cutPosition < MAX_CHARS * 0.7) {
      cutPosition = MAX_CHARS;
    }

    chunks.push(remaining.slice(0, cutPosition).trim());
    remaining = remaining.slice(cutPosition).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  chunks.forEach((chunk, chunkIndex) => {
    output.push({
      json: {
        event_key: data.event_key,
        event_match_status: data.event_match_status,
        event_match_reason: data.event_match_reason,
        matched_event_key: data.matched_event_key,
        event_match_version: data.event_match_version,
        event_name: data.event_name,
        spreadsheet_id: data.spreadsheet_id,
        spreadsheet_url: data.spreadsheet_url,

        channel_name: data.channel_name,
        video_id: data.video_id,
        video_title: data.video_title,
        video_url: data.video_url,
        published_at: data.published_at,

        record_id: `${data.video_id}-auto-${chunkIndex + 1}`,
        source: 'automatic',
        status: 'CAPTURED_AUTO',
        part_number: chunkIndex + 1,
        part_count: chunks.length,
        transcript_text: chunk,
        captured_at: new Date().toISOString(),
        notes: 'Retrieved using Supadata native captions',
        analysis_profile: data.analysis_profile

      },
      pairedItem: {
        item: itemIndex,
      },
    });
  });
}

return output;
