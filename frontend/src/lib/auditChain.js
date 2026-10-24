function eventPayload(event) {
  return JSON.stringify({action:String(event.action||''),at:String(event.at||''),detail:String(event.detail||'')});
}

async function digest(previous, event) {
  const result=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(previous+eventPayload(event)));
  return [...new Uint8Array(result)].map(value=>value.toString(16).padStart(2,'0')).join('');
}

export async function appendAuditEvent(events, action, detail, at=new Date().toISOString()) {
  const previous=events.at(-1)?.hash||'0'.repeat(64);
  const event={at,action,detail,prev_hash:previous};
  event.hash=await digest(previous,event);
  return [...events,event];
}

export async function verifyAuditChain(events) {
  let previous='0'.repeat(64);
  for(let index=0;index<events.length;index+=1){
    const event=events[index];
    const expected=await digest(previous,event);
    if(event.prev_hash!==previous||event.hash!==expected)return {ok:false,checked:index,broken_at:index};
    previous=expected;
  }
  return {ok:true,checked:events.length,broken_at:null};
}
