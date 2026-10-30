// Select videos that:
// 0. Are about the active event (title mentions its city/number or fighters).
// 1. Have never been analysed.
// 2. Previously failed and still have retry attempts remaining.
// 3. Were explicitly marked RETRY and still have attempts remaining.
// 4. Were left stuck in PROCESSING by an interrupted workflow and are stale.
//
// analysis_attempt_count should be incremented only by
// the node named "Mark Analysis Processing".

const MAX_ANALYSIS_ATTEMPTS = 3;

// A PROCESSING record older than this is considered abandoned.
const STALE_PROCESSING_HOURS = 1;

const nowMs = Date.now();
const staleThresholdMs =
  STALE_PROCESSING_HOURS * 60 * 60 * 1000;

function ufcText(value) {
 return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function ufcHas(text, phrase) { return phrase && (' '+text+' ').includes(' '+phrase+' '); }
function ufcEventSignals(event, title) {
 const name=ufcText(event.event_name);
 const split=String(event.event_name || '').split(':');
 const prefix=ufcText(split[0]);
 const number=(prefix.match(/\bufc\s+(\d{2,4})\b/) || [])[1];
 const pair=String(split.slice(1).join(':') || '').split(/\s+v(?:s)?\.?\s+/i);
 const surname=value=>ufcText(value).split(' ').filter(word=>!['jr','sr','ii','iii','iv'].includes(word)).slice(-1)[0] || '';
 const a=surname(pair[0]), b=surname(pair[1]);
 const matchup=pair.length===2 && a.length>=3 && b.length>=3 && ufcHas(title,a) && ufcHas(title,b);
 const numbered=Boolean(number && new RegExp('\\bufc\\s+'+number+'\\b').test(title));
 const venue=prefix.replace(/\bufc\b/g,' ').replace(/\bfight\s+night\b/g,' ').replace(/\b\d+\b/g,' ').trim().replace(/\s+/g,' ');
 const location=venue.length>=3 && ufcHas(title,venue);
 return {event, score: matchup || numbered ? 10 : location ? 4 : 0, reason: matchup ? 'main-event surnames' : numbered ? 'UFC event number' : location ? 'event location' : ''};
}
function classifyUfcVideo(title, active, events) {
 const text=ufcText(title);
 const pool=[...new Map([...(events||[]),active].filter(event=>event?.event_key&&event.event_name).map(event=>[event.event_key,event])).values()];
 const matches=pool.map(event=>ufcEventSignals(event,text)).filter(match=>match.score>0);
 const strong=matches.filter(match=>match.score===10);
 const candidates=strong.length ? strong : matches;
 if(candidates.length!==1) return {event_match_status:candidates.length>1?'AMBIGUOUS':'UNCONFIRMED',event_match_reason:candidates.length>1?'Title identifies more than one known UFC event':'Title does not clearly identify a known UFC event',matched_event_key:'',event_match_version:'ufc-event-match-v2'};
 const match=candidates[0];
 return {event_match_status:match.event.event_key===active.event_key?'MATCHED':'OTHER_EVENT',event_match_reason:'Matched '+match.event.event_name+' by '+match.reason,matched_event_key:match.event.event_key,event_match_version:'ufc-event-match-v2'};
}
const activeEvent=$('One Active Event Only').first().json;
const knownEvents=$('Get UFC Events For Matching').all().map(item=>item.json);
let request={}; try {request=$('When Executed by Another Workflow').first().json;} catch {}
const target=request.manual_retry===true ? String(request.target_video_id || '') : '';
const selected = $input.all().filter((item) => {
  const row = item.json;

  if (!row.video_id || (target && row.video_id !== target) || classifyUfcVideo(row.video_title,activeEvent,knownEvents).event_match_status !== 'MATCHED') {
    return false;
  }

  const status = String(
    row.analysis_status || ''
  )
    .trim()
    .toUpperCase();

  const attempts = Number(
    row.analysis_attempt_count || 0
  );

  const validAttempts =
    Number.isFinite(attempts) && attempts >= 0
      ? attempts
      : 0;

  const hasAttemptsRemaining =
    validAttempts < MAX_ANALYSIS_ATTEMPTS || Boolean(target);

  /*
  Prefer last_attempt_at because it records when analysis began.
  Fall back to updatedAt for older rows.
  */
  const processingTimestamp =
    row.last_attempt_at ||
    row.updatedAt ||
    null;

  const processingTimeMs =
    processingTimestamp
      ? Date.parse(processingTimestamp)
      : NaN;

  const processingIsStale =
    status === 'PROCESSING' &&
    (
      !Number.isFinite(processingTimeMs) ||
      nowMs - processingTimeMs >= staleThresholdMs
    );

  const neverAnalysed =
    status === '';

  const retryableFailure =
    status === 'FAILED' &&
    hasAttemptsRemaining;

  const markedForRetry =
    status === 'RETRY' &&
    hasAttemptsRemaining;

  // Flagged by svc.apply_card_changes after the fight card changed; re-analysed whatever its attempt count.
  const cardChanged =
    status === 'CARD_CHANGED';

  const retryableStaleProcessing =
    processingIsStale &&
    hasAttemptsRemaining;

  return (
    (target && status === 'RETRY_REQUESTED') || neverAnalysed || cardChanged ||
    retryableFailure ||
    markedForRetry ||
    retryableStaleProcessing
  );
});

return selected.length ? selected : [{json:{__no_analysis_work:true}}];
