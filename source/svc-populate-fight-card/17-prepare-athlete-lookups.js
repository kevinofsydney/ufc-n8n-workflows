
const candidate=$('Build Verified UFC Card').first().json;
return candidate.card.flatMap(b=>['a','b'].map(side=>({json:{fighter_name:b['fighter_'+side],profile_url:b['fighter_'+side+'_url']}})));
