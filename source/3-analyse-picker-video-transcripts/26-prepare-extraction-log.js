const source = $json;
const row = source.extraction_log_row;

if (!row || typeof row !== 'object') {
  throw new Error(
    `Missing extraction_log_row for video ${source.video_id || 'unknown'}`
  );
}

return {
  json: row
};
