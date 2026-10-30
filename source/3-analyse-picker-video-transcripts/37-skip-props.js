return {
  json: {
    video_id: $json.video_id,
    event_key: $json.event_key,
    spreadsheet_id: $json.spreadsheet_id,
    branch_name: 'props',
    branch_status: 'SKIPPED',
    row_count: 0
  }
};
