let request=null;try {request=$('Prepare Retry Dispatch').first().json;}catch{}
return request?.accepted?[{json:request}]:[];
