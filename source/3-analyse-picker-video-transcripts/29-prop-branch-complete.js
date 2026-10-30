const source = $('Prepare Extraction Rows').first().json;
const expectedRows = Number(source.prop_row_count || 0);
const inputItems = $input.all();

if (expectedRows === 0) {
  return [
    {
      json: {
        video_id: source.video_id,
        branch: 'props',
        status: 'SKIPPED',
        expected_rows: 0,
        processed_items: 0
      }
    }
  ];
}

const processedItems = inputItems.length;

if (processedItems !== expectedRows) {
  throw new Error(
    `Prop write count mismatch: expected ${expectedRows}, ` +
    `processed ${processedItems}`
  );
}

return [
  {
    json: {
      video_id: source.video_id,
      branch: 'props',
      status: 'COMPLETED',
      expected_rows: expectedRows,
      processed_items: processedItems
    }
  }
];
