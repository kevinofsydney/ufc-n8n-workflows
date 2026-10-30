const s=$('Select Incidents To Diagnose').first().json;
return [{json:{count:s.count,incidents:s.incidents}}];
