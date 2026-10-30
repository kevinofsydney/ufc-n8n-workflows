const v=$('Plan Card Changes').first().json.videos;
return v.length?v.map(x=>({json:x})):[{json:{video_id:null}}];
