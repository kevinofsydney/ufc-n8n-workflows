const now = new Date();

const events = $input.all().map(item => item.json);

const futureEvents = events
  .filter(event => {
    const eventDate = new Date(event.event_datetime_local);

    return (
      event.event_datetime_local &&
      !Number.isNaN(eventDate.getTime()) &&
      eventDate > now
    );
  })
  .sort(
    (a, b) =>
      new Date(a.event_datetime_local).getTime() -
      new Date(b.event_datetime_local).getTime()
  );

if (futureEvents.length === 0) {
  return [
    {
      json: {
        next_event_found: false,
        error_message: 'No future UFC event exists in ufc_events.',
      },
    },
  ];
}

const nextEvent = futureEvents[0];

return [
  {
    json: {
      next_event_found: true,
      next_event_id: nextEvent.id,
      next_event_key: nextEvent.event_key,
      next_event_name: nextEvent.event_name,
      next_event_datetime_local: nextEvent.event_datetime_local,
    },
  },
];
