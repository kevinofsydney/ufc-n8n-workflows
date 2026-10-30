return {
  json: {
    video_id: $json.video_id,
    event_key: $json.event_key,
    spreadsheet_id: $json.spreadsheet_id,
    branch: 'picks',
    status: 'SKIPPED',
    expected_rows: 0,
    processed_items: 0
  }
};
