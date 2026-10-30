const videos=$input.all().map(i=>i.json);
if(!videos.length||videos.some(v=>!/^[A-Za-z0-9_-]{11}$/.test(String(v.video_id||''))))throw new Error('Duration check requires valid video IDs.');
const unique=[...new Map(videos.map(v=>[v.video_id,v])).values()];
const batches=[];
for(let offset=0;offset<unique.length;offset+=50){
 const rows=unique.slice(offset,offset+50);
 batches.push({json:{video_ids:rows.map(v=>v.video_id).join(','),videos:rows}});
}
return batches;
