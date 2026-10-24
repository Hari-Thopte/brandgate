import test from 'node:test';
import assert from 'node:assert/strict';
import { appendAuditEvent, verifyAuditChain } from '../src/lib/auditChain.js';

test('audit chain verifies and reports the first tampered event', async () => {
  let events=[];
  events=await appendAuditEvent(events,'Item created','', '2026-10-24T00:00:00.000Z');
  events=await appendAuditEvent(events,'Finding dismissed','Not applicable', '2026-10-24T00:01:00.000Z');
  assert.deepEqual(await verifyAuditChain(events),{ok:true,checked:2,broken_at:null});
  events[0].detail='tampered';
  assert.deepEqual(await verifyAuditChain(events),{ok:false,checked:0,broken_at:0});
});
