const source = $('Prepare Extraction Rows').first().json;
const processedItems = $input.all().length;

if (processedItems !== 1) {
  throw new Error(
    `Extraction Log write count mismatch: expected 1, ` +
    `processed ${processedItems}`
  );
}

return [
  {
    json: {
      video_id: source.video_id,
      branch: 'extraction_log',
      status: 'COMPLETED',
      expected_rows: 1,
      processed_items: processedItems,
    },
  },
];
