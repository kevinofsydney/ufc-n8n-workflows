function readCaptureFeedStats() {
 const names=["YouTube — UFC Predictions Tracker","YouTube — The MMA Guru","YouTube — Lucrative James","YouTube — MMA Lock of the Night","YouTube — Kunath MMA","YouTube — TonyHasDiedMMA","YouTube — MMA Husky Hustler","YouTube — Walk the Line MMA","YouTube — Artem MMA","YouTube — BedtimeMMA","YouTube — BetSam","YouTube — JakeGerberMMA","YouTube — Funky Bunch MMA"];
 const failed=[];let checked=0;
 let root;
 try {root=$('Get YouTube Upload Playlists').first().json;} catch {return {expected:names.length,checked:0,failed_count:0,loaded:0,failed:[]};}
 const channels=Array.isArray(root.items)?root.items:[];
 const ids=["UCaU2fDiT9fCTABiiotiG2aw","UCIhQvpinmS8Eq6PrQ021DKQ","UCrxm8U7aEu18LW3YRFZSvNg","UClwn3zgkfyne2Ecj36Dl7ZQ","UCxl-gwVZTPPhhCbQ5DKTP6Q","UCAELXX1-cUSA5Lc7aDFMZsw","UCFjXgUzCT23D11yF4bcEl2g","UCk9hwi3iECE1Xs-dpdFhXEA","UCpSQhfFzpZ9COp_WiKSUEkQ","UCQAMRRo7fPbQMzlJWOexlZg","UC7LH9bWIKZd82LpdouIBOLw","UCADS14Ed6epGTSy9I3VLxCg","UCwOnVxzxkqDOYnEhhffNMAA"];
 for(let index=0;index<names.length;index++){
  const name=names[index];let rows=[];
  try {rows=$(name).all().map(i=>i.json);} catch {}
  checked++;
  const channel=channels.find(c=>c.id===ids[index]);
  let issue='';
  if(!channel?.contentDetails?.relatedPlaylists?.uploads)issue='Channel uploads unavailable; check YouTube API access.';
  else if(!rows.length)issue='No API response received.';
  else if(rows.some(r=>r.error))issue='YouTube API request failed; check quota and credential restrictions.';
  else if(rows.some(r=>!Array.isArray(r.items)))issue='Unexpected YouTube API response.';
  else {
   const last=rows[rows.length-1];
   const old=last.items.length>0&&last.items.every(v=>Date.parse(v.contentDetails?.videoPublishedAt||v.snippet?.publishedAt)<Date.now()-6*24*60*60*1000);
   if(last.nextPageToken&&!old)issue='Scan reached the 500-video safety limit; channel check is incomplete.';
  }
  if(issue)failed.push({channel:name.replace(/^YouTube — /,''),error:issue});
 }
 return {expected:names.length,checked,failed_count:failed.length,loaded:checked-failed.length,failed};
}
// Build one Telegram summary from all videos processed in this run.

const results = $input.all().map((item) => item.json);

if (results.length === 0) {
  return [];
}

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const MAX_ATTEMPTS = 3;

const captured = results.filter(
  (item) => item.result_type === 'captured'
);

const retrying = results.filter(
  (item) => item.result_type === 'retry'
);

const gaveUp = results.filter(
  (item) => item.result_type === 'gave_up'
);

const eventName =
  results[0]?.event_name || 'UFC event';

const spreadsheetUrl =
  results[0]?.spreadsheet_url || '';

const lines = [
  '<b>UFC transcript run complete</b>',
  '',
  `<b>Event:</b> ${escapeHtml(eventName)}`,
  '',
];

if (captured.length > 0) {
  lines.push(`<b>Captured (${captured.length}):</b>`);

  for (const item of captured) {
    lines.push(
      `• ${escapeHtml(item.channel_name)} — ` +
      `${escapeHtml(item.video_title)}`
    );
  }

  lines.push('');
}

if (retrying.length > 0) {
  lines.push(
    `<b>No English transcript yet — will retry (${retrying.length}):</b>`
  );

  for (const item of retrying) {
    lines.push(
      `• ${escapeHtml(item.channel_name)} — ` +
      `${escapeHtml(item.video_title)} ` +
      `(attempt ${item.attempt_count} of ${MAX_ATTEMPTS})`
    );
  }

  lines.push('');
}

if (gaveUp.length > 0) {
  lines.push(
    `<b>Gave up — no English transcript (${gaveUp.length}):</b>`
  );

  for (const item of gaveUp) {
    lines.push(
      `• ${escapeHtml(item.channel_name)} — ` +
      `${escapeHtml(item.video_title)}`
    );
  }

  lines.push('');
}

const scan=readCaptureFeedStats();
if(scan.checked){
 lines.push('YouTube channels checked: '+scan.checked+'/'+scan.expected+'.');
 if(scan.failed_count){
  lines.push('<b>Warning:</b> '+scan.failed_count+' YouTube channels failed; additional videos may have been missed.');
  for(const failure of scan.failed.slice(0,3))lines.push('• '+escapeHtml(failure.channel)+': '+escapeHtml(failure.error));
  if(scan.failed_count>3)lines.push('… and '+(scan.failed_count-3)+' more channel failures.');
 }
 lines.push('');
}
if (spreadsheetUrl) {
  lines.push(
    `<a href="${escapeHtml(spreadsheetUrl)}">` +
    `Open transcript spreadsheet</a>`
  );
}

return [
  {
    json: {
      telegram_message: lines.join('\n'),
      event_name: eventName,
      spreadsheet_url: spreadsheetUrl,
      capture_run_state: scan.failed_count ? 'error' : 'success',
      feed_failed_count: scan.failed_count,
      captured_count: captured.length,
      retry_count: retrying.length,
      gave_up_count: gaveUp.length,
      total_processed: results.length,
    },
  },
];
