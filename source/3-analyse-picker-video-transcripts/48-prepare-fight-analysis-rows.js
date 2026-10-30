const source = $json;

const rows =
  Array.isArray(source.fight_analysis_rows)
    ? source.fight_analysis_rows
    : [];

if (rows.length === 0) {
  return [
    {
      json: {
        has_fight_analysis_rows: false,
        video_id: source.video_id,
        event_key: source.event_key,
        spreadsheet_id: source.spreadsheet_id,
        fight_analysis_row_count: 0,
      },
    },
  ];
}

return rows.map((row) => ({
  json: {
    ...row,
    has_fight_analysis_rows: true,
  },
}));
