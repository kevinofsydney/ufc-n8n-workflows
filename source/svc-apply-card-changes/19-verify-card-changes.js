// Reads every written column back and confirms it holds exactly the planned values.
const plan=$('Plan Card Changes').first().json;
const text=v=>String(v??'').trim();
const problems=[];
for(const check of plan.expected){
 const rows=$(check.node).first().json.rows||[];
 if(check.rows_exact&&rows.length!==check.rows_exact)problems.push(check.sheet+' has '+rows.length+' rows; expected '+check.rows_exact+'.');
 if(!check.rows_exact&&rows.length!==check.values.length)problems.push(check.sheet+' has '+rows.length+' rows; expected '+check.values.length+'. It changed during the update.');
 check.values.forEach((value,i)=>{
  if(text(rows[i]?.[check.column])!==text(value))problems.push(check.sheet+' row '+(i+1)+' column '+(check.column+1)+' reads "'+text(rows[i]?.[check.column])+'", expected "'+value+'".');
 });
}
if(problems.length)throw new Error('Card change read-back failed: '+problems.slice(0,5).join(' | ')+(problems.length>5?' (+'+(problems.length-5)+' more)':''));
return [{json:{verified:true}}];
