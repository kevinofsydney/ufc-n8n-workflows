
const requests=$('Prepare Athlete Lookups').all();
return $input.all().map((item,index)=>({json:{...requests[index].json,data:typeof item.json.data==='string'?item.json.data:'',profile_status:Number(item.json.statusCode||0)}}));
