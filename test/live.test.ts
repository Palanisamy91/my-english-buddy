import test from 'node:test';
import assert from 'node:assert/strict';
import { isEcho, isInterruptOnly, shouldInterrupt, wordsOf, LIVE_CHECKIN_AFTER, LIVE_PAUSE_AFTER } from '../src/app/lela/live-rules';

const lela = 'Tell me about your morning. What time do you wake up every day?';

test("Lela's own voice coming back through the speaker is not an interruption", () => {
  assert.equal(isEcho('what time do you wake up', lela), true);
  assert.equal(shouldInterrupt('tell me about your morning', lela), false);
  assert.equal(shouldInterrupt('', lela), false);
});
test('the learner speaking over Lela is an interruption', () => {
  assert.equal(shouldInterrupt('I wake up at six', lela), true);
  assert.equal(shouldInterrupt('sorry I did not understand the question', lela), true);
  assert.equal(shouldInterrupt('stop', lela), true);
});
test('"stop"-like words interrupt but are not sent as an answer', () => {
  assert.equal(isInterruptOnly('stop'), true);
  assert.equal(isInterruptOnly('wait a moment please'), true);
  assert.equal(isInterruptOnly('I wake up at six'), false);
  assert.equal(isInterruptOnly(''), false);
});
test('silence thresholds make sense and words are tokenised', () => {
  assert.ok(LIVE_CHECKIN_AFTER < LIVE_PAUSE_AFTER);
  assert.deepEqual(wordsOf("I'm fine, thanks!"), ["i'm", 'fine', 'thanks']);
});
