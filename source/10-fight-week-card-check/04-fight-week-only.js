// Check the card every two hours in the 72 hours before the event, so last-minute changes land before
// new picks are extracted. Skip while an analysis run is checking the same card.
const events=$('Get Active UFC Event').all().map(i=>i.json).filter(e=>e.event_key);
if(events.length!==1)return [];
const event=events[0];
const now=Date.now(),start=Date.parse(event.event_datetime_local);
if(!Number.isFinite(start)||start<=now||start-now>72*3600e3)return [];
const busy=$('Get Running Analysis').all().map(i=>i.json).some(r=>r.state==='running'&&now-Date.parse(r.started_at)<3600e3);
if(busy)return [];
return [{json:event}];
