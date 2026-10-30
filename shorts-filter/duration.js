function durationSeconds(value) {
 const match=/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(String(value||''));
 if(!match||!match.slice(1).some(v=>v!==undefined))return null;
 const seconds=Number(match[1]||0)*86400+Number(match[2]||0)*3600+Number(match[3]||0)*60+Number(match[4]||0);
 return Number.isFinite(seconds)&&seconds>0?seconds:null;
}
