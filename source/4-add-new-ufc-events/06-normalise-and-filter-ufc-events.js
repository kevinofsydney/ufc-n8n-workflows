const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

const nowMs = Date.now();
const cutoffMs = nowMs + THREE_WEEKS_MS;

function clean(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function melbourneIso(timestampMs) {
  return DateTime
    .fromMillis(timestampMs, { zone: 'utc' })
    .setZone('Australia/Melbourne')
    .toISO({
      suppressMilliseconds: false,
      includeOffset: true,
    });
}

// Used for events that should include their city in the event name.
const venueToCity = {
  'Etihad Arena': 'Abu Dhabi',
  'Belgrade Arena': 'Belgrade',
  'Galaxy Arena': 'Macao',
};

// Meta APEX and UFC APEX should be named "UFC Fight Night",
// rather than "UFC Las Vegas".
const apexVenues = new Set([
  'Meta APEX',
  'UFC APEX',
]);

const output = [];

for (const item of $input.all()) {
  const headline = clean(item.json.headline);
  const eventPath = clean(item.json.event_path);
  const venue = clean(item.json.venue);
  const locality = clean(item.json.locality);
  const administrativeArea = clean(item.json.administrative_area);
  const country = clean(item.json.country);

  const timestampSeconds = Number(item.json.main_card_timestamp);

  // Skip malformed records.
  if (
    !headline ||
    !eventPath ||
    !Number.isFinite(timestampSeconds)
  ) {
    continue;
  }

  const eventTimeMs = timestampSeconds * 1000;

  // Keep only future events occurring within the next 21 days.
  if (eventTimeMs <= nowMs || eventTimeMs > cutoffMs) {
    continue;
  }

  let city =
    venueToCity[venue] ||
    locality ||
    administrativeArea ||
    country ||
    'Unknown Location';

  // UFC currently returns "BG" instead of "Belgrade".
  if (city === 'BG') {
    city = 'Belgrade';
  }

  // Detect numbered events such as /event/ufc-330.
  const numberedMatch = eventPath.match(
    /\/event\/ufc-(\d+)(?:$|[/?#])/i
  );

  let eventName;

  if (numberedMatch) {
    // Example: UFC 330: Makhachev vs Machado Garry
    eventName = `UFC ${numberedMatch[1]}: ${headline}`;
  } else if (apexVenues.has(venue)) {
    // Example: UFC Fight Night: Gamrot vs Salkilld
    eventName = `UFC Fight Night: ${headline}`;
  } else {
    // Example: UFC Abu Dhabi: Ankalaev vs Guskov
    eventName = `UFC ${city}: ${headline}`;
  }

  const sourceEventId = eventPath
    .replace(/^https?:\/\/(?:www\.)?ufc\.com/i, '')
    .replace(/[?#].*$/, '')
    .replace(/^\/+|\/+$/g, '');

  const sourceUrl = eventPath.startsWith('http')
    ? eventPath
    : `https://www.ufc.com${eventPath.startsWith('/') ? '' : '/'}${eventPath}`;

  output.push({
    json: {
      source_event_id: sourceEventId,
      source_url: sourceUrl,
      event_key: slugify(eventName),
      event_name: eventName,
      event_datetime_local: melbourneIso(eventTimeMs),
      scraped_at: new Date().toISOString(),
    },
  });
}

output.sort(
  (a, b) =>
    new Date(a.json.event_datetime_local).getTime() -
    new Date(b.json.event_datetime_local).getTime()
);

return output;
