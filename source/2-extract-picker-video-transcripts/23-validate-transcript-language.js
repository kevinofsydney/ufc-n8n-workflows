const row = $json;

const returnedLang = String(
  row.lang ??
  row.transcript_lang ??
  ''
)
  .trim()
  .toLowerCase();

const availableLangs = Array.isArray(row.availableLangs)
  ? row.availableLangs.map((lang) =>
      String(lang).trim().toLowerCase()
    )
  : [];

let transcriptText = '';

if (typeof row.content === 'string') {
  transcriptText = row.content
    .replace(/\s+/g, ' ')
    .trim();
} else if (Array.isArray(row.content)) {
  transcriptText = row.content
    .map((segment) => {
      if (typeof segment === 'string') {
        return segment;
      }

      if (
        segment &&
        typeof segment === 'object'
      ) {
        return String(
          segment.text ??
          segment.content ??
          ''
        );
      }

      return '';
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const transcriptReceived =
  transcriptText.length > 0;

// Only English transcripts are accepted.
const transcriptIsEnglish =
  returnedLang === 'en';

return {
  json: {
    ...row,

    transcript_text:
      transcriptText,

    transcript_lang:
      returnedLang || null,

    transcript_available_langs:
      availableLangs,

    transcript_received:
      transcriptReceived,

    transcript_is_english:
      transcriptIsEnglish,

    transcript_character_count:
      transcriptText.length,
  },
};
