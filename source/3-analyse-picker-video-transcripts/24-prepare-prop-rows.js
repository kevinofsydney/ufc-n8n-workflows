const source = $input.first().json;

const rows = Array.isArray(source.prop_rows)
  ? source.prop_rows
  : [];

// Always return at least one item.
// Otherwise a video with zero props silently ends this branch.
if (rows.length === 0) {
  return [
    {
      json: {
        has_prop_rows: false,
        video_id: source.video_id,
        event_key: source.event_key,
        spreadsheet_id: source.spreadsheet_id,
        prop_row_count: 0
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
    has_prop_rows: true
  },
  pairedItem: {
    item: 0
  }
}));
