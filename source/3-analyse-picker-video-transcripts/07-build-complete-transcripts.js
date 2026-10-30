// Reassemble chunked transcript rows into one complete transcript per video.

const rows = $input.all().map((item) => item.json);
const grouped = new Map();

for (const row of rows) {
  const videoId = String(row.video_id || '').trim();
  const transcriptText = String(row.transcript_text || '').trim();

  if (!videoId || !transcriptText) {
    continue;
  }

  if (!grouped.has(videoId)) {
    grouped.set(videoId, {
      video_id: videoId,
      channel_name: row.channel_name || '',
      video_title: row.video_title || '',
      video_url: row.video_url || '',
      published_at: row.published_at || '',
      parts: [],
    });
  }

  grouped.get(videoId).parts.push({
    part_number: Number(row.part_number || 1),
    text: transcriptText,
  });
}

const output = [];

for (const video of grouped.values()) {
  video.parts.sort((a, b) => a.part_number - b.part_number);

  const fullTranscript = video.parts
    .map((part) => part.text)
    .join('\n\n');

  output.push({
    json: {
      video_id: video.video_id,
      channel_name: video.channel_name,
      video_title: video.video_title,
      video_url: video.video_url,
      published_at: video.published_at,
      transcript_part_count: video.parts.length,
      transcript_text: fullTranscript,
      input_characters: fullTranscript.length,
    },
  });
}

return output;
