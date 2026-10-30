// Keep only recent UFC prediction/breakdown videos about the active event
// and normalise the RSS fields into one consistent structure.

const sixDaysAgo = Date.now() - (6 * 24 * 60 * 60 * 1000);

const predictionTerms = [
  'prediction',
  'predictions',
  'picks',
  'breakdown',
  'full card',
  'overview',
  'all predictions',
  'betting picks',
  'fight picks',
  // 'ufc',
];

//make sure all terms are lowercase
const excludedTerms = [
  'results',
  'post fight',
  'post-fight',
  'reaction',
  'recap',
  'watchalong',
  'watch along',
  'highlights',
  'press conference',
  'weigh-in',
  'weigh ins',
  'shorts',
  'live chat',
  'dfs',
  'live',
  'draftkings',
  'draft kings',   //filtering out last week's fight card
  'early',
  'road to ufc',
  'contender series',
  'dwcs',
];

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
const activeEvent=$('Event Ready').first().json;
const knownEvents=$('Get UFC Events For Matching').all().map(item=>item.json);

const seenInThisRun = new Set();
const output = [];

const apiVideos=[];
for(const page of $input.all()){
 for(const video of (Array.isArray(page.json.items)?page.json.items:[])){
  const id=video.contentDetails?.videoId||video.snippet?.resourceId?.videoId;
  if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))continue;
  apiVideos.push({json:{id:'yt:video:'+id,title:video.snippet?.title,link:'https://www.youtube.com/watch?v='+id,creator:video.snippet?.videoOwnerChannelTitle||video.snippet?.channelTitle,isoDate:video.contentDetails?.videoPublishedAt||video.snippet?.publishedAt}});
 }
}
for (const item of apiVideos) {
  const source = item.json;

  const title = String(source.title || '').trim();
  const lowerTitle = title.toLowerCase();

  const publishedRaw =
    source.isoDate ||
    source.pubDate ||
    source.published ||
    source.updated;

  const publishedTimestamp = Date.parse(publishedRaw);

  // Skip entries with an invalid or old publication date.
  if (
    !Number.isFinite(publishedTimestamp) ||
    publishedTimestamp < sixDaysAgo
  ) {
    continue;
  }

  const hasUfc = lowerTitle.includes('ufc');

  const hasPredictionTerm = predictionTerms.some((term) =>
    lowerTitle.includes(term)
  );

  const hasExcludedTerm = excludedTerms.some((term) =>
    lowerTitle.includes(term)
  );

  if (!hasUfc || !hasPredictionTerm || hasExcludedTerm) {
    continue;
  }

  // Skip videos about other events (e.g. last week's card).
  const match=classifyUfcVideo(title,activeEvent,knownEvents);
  if (match.event_match_status !== 'MATCHED') {
    continue;
  }

  // YouTube RSS IDs commonly look like "yt:video:VIDEO_ID".
  let videoId = String(source.id || '').split(':').pop();

  let videoUrl = '';

  if (typeof source.link === 'string') {
    videoUrl = source.link;
  } else if (Array.isArray(source.link)) {
    videoUrl =
      source.link.find((entry) => entry?.href)?.href ||
      source.link[0]?.href ||
      '';
  } else if (source.link?.href) {
    videoUrl = source.link.href;
  }

  // Fallback: derive the ID from a standard YouTube URL.
  if ((!videoId || videoId === source.id) && videoUrl) {
    try {
      const parsedUrl = new URL(videoUrl);

      videoId =
        parsedUrl.searchParams.get('v') ||
        parsedUrl.pathname.split('/').filter(Boolean).pop();
    } catch {
      // Leave the existing value unchanged if URL parsing fails.
    }
  }

  // Exclude YouTube Shorts.
  if (/\/shorts\//i.test(videoUrl)) {
    continue;
  }

  if (!videoId || !videoUrl || seenInThisRun.has(videoId)) {
    continue;
  }

  seenInThisRun.add(videoId);

  output.push({
    json: {
      ...match,
      channel_name:
        source.creator ||
        source.author ||
        source['media:group']?.['media:credit'] ||
        'Unknown channel',
      video_id: videoId,
      video_title: title,
      video_url: videoUrl,
      published_at: new Date(publishedTimestamp).toISOString(),
      discovered_at: new Date().toISOString(),

      analysis_profile:
        String(
          source.creator ||
          source.author ||
          source['media:group']?.['media:credit'] ||
          ''
        )
          .toLowerCase()
          .includes('ufc predictions tracker')
          ? 'predictions_tracker'
          : 'standard_capper',
    },
  });
}

return output.length ? output : [{json:{__no_capture_work:true}}];
