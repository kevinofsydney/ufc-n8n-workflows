const items = $input.all();

const source =
  $('Prepare Extraction Rows').first().json;

const expectedBranches = [
  'picks',
  'props',
  'extraction_log',
];

const received =
  items.map((item) => ({
    branch:
      String(item.json?.branch || ''),

    status:
      String(item.json?.status || ''),

    expected_rows:
      Number(item.json?.expected_rows || 0),

    processed_items:
      Number(item.json?.processed_items || 0),
  }));

const errors = [];

for (
  const expectedBranch
  of expectedBranches
) {
  const matches =
    received.filter(
      (result) =>
        result.branch === expectedBranch
    );

  if (matches.length === 0) {
    errors.push(
      `Missing completion signal for branch: ${expectedBranch}`
    );

    continue;
  }

  if (matches.length > 1) {
    errors.push(
      `Duplicate completion signals for branch: ${expectedBranch}`
    );

    continue;
  }

  const result =
    matches[0];

  if (
    ![
      'COMPLETED',
      'SKIPPED',
    ].includes(result.status)
  ) {
    errors.push(
      `Invalid status for ${expectedBranch}: ${result.status || 'missing'}`
    );
  }

  if (
    result.status === 'COMPLETED' &&
    result.processed_items !==
      result.expected_rows
  ) {
    errors.push(
      `${expectedBranch} count mismatch: expected ` +
      `${result.expected_rows}, processed ` +
      `${result.processed_items}`
    );
  }

  if (
    result.status === 'SKIPPED' &&
    result.expected_rows !== 0
  ) {
    errors.push(
      `${expectedBranch} was skipped despite expecting ` +
      `${result.expected_rows} rows`
    );
  }
}

if (items.length !== 3) {
  errors.push(
    `Expected 3 branch completion items, received ${items.length}`
  );
}

if (errors.length > 0) {
  throw new Error(
    `Spreadsheet write verification failed: ${errors.join(' | ')}`
  );
}

return [
  {
    json: {
      video_id:
        source.video_id,

      event_key:
        source.event_key,

      spreadsheet_id:
        source.spreadsheet_id,

      model_name:
        source.model_name,

      prompt_version:
        source.prompt_version,

      write_status:
        'COMPLETED',

      completed_branch_count:
        3,

      pick_rows_written:
        Number(
          source.pick_row_count || 0
        ),

      prop_rows_written:
        Number(
          source.prop_row_count || 0
        ),

      branch_results:
        received,
    },
  },
];
