const source = $input.first().json;

const rows = Array.isArray(source.pick_rows)
  ? source.pick_rows
  : [];

if (rows.length === 0) {
  return [
    {
      json: {
        has_pick_rows: false,
        video_id: source.video_id,
        event_key: source.event_key,
        spreadsheet_id: source.spreadsheet_id,
        pick_row_count: 0
      },
      pairedItem: {
        item: 0
      }
    }
  ];
}

return rows.map((row) => ({
  json: {
    ...row,
    has_pick_rows: true
  },
  pairedItem: {
    item: 0
  }
}));
