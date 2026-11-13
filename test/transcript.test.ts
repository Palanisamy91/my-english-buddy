import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTranscript, collapseRepeatedPhrases, mergeTranscripts, stripUnclear, type RawResult } from '../src/app/core/transcript';

const fin = (text: string, confidence = 0.9, extra: { t: string; c: number }[] = []): RawResult => ({ isFinal: true, alternatives: [{ transcript: text, confidence }, ...extra.map((x) => ({ transcript: x.t, confidence: x.c }))] });
const interim = (text: string): RawResult => ({ isFinal: false, alternatives: [{ transcript: text, confidence: 0 }] });

test('final and interim text are kept apart, and earlier final text is preserved', () => {
  const t = buildTranscript([fin('I went to the office'), interim('and then I')]);
  assert.equal(t.finalClean, 'I went to the office');
  assert.equal(t.interim, 'and then I');
  assert.equal(t.live, 'I went to the office and then I');
  const done = buildTranscript([fin('I went to the office'), fin('and then I came home')]);
  assert.equal(done.finalClean, 'I went to the office and then I came home');
  assert.equal(done.interim, '');
});

test('the original wording is never corrected', () => {
  const t = buildTranscript([fin('yesterday I go to office and meet my friends')]);
  assert.equal(t.finalClean, 'yesterday I go to office and meet my friends');
});

test('duplicated results are removed (exact copy, and a longer growing copy)', () => {
  assert.equal(buildTranscript([fin('how are you today'), fin('how are you today')]).finalClean, 'how are you today');
  assert.equal(buildTranscript([fin('how are you'), fin('how are you today my friend')]).finalClean, 'how are you today my friend');
  assert.equal(collapseRepeatedPhrases('how are you how are you'), 'how are you');
  assert.equal(collapseRepeatedPhrases('it is very very good'), 'it is very very good'); // short repeats are real speech
  assert.equal(collapseRepeatedPhrases('no no I said no'), 'no no I said no');
});

test('a very unsure result is shown as [Unclear], a middling one is kept but flagged', () => {
  const t = buildTranscript([fin('I am a software developer'), fin('mumble grumble', 0.12)]);
  assert.equal(t.finalMarked, 'I am a software developer [Unclear]');
  assert.equal(t.finalClean, 'I am a software developer');
  assert.ok(t.hasUnclear);
  const mid = buildTranscript([fin('I like cooking', 0.45)]);
  assert.equal(mid.finalClean, 'I like cooking');
  assert.ok(mid.hasCheck && !mid.hasUnclear);
  const unknown = buildTranscript([fin('hello there', 0)]); // an engine that gives no confidence is trusted
  assert.ok(!unknown.hasUnclear && !unknown.hasCheck);
});

test('the best alternative wins only when clearly more confident', () => {
  assert.equal(buildTranscript([fin('their going home', 0.5, [{ t: "they're going home", c: 0.9 }])]).finalClean, "they're going home");
  assert.equal(buildTranscript([fin('I want tea', 0.8, [{ t: 'I want key', c: 0.85 }])]).finalClean, 'I want tea');
});

test('merging a restarted session never repeats words', () => {
  assert.equal(mergeTranscripts('I went to the market', 'and I bought vegetables'), 'I went to the market and I bought vegetables');
  assert.equal(mergeTranscripts('I went to the market', 'I went to the market'), 'I went to the market');
  assert.equal(mergeTranscripts('I went to the market', 'I went to the market and bought rice'), 'I went to the market and bought rice');
  assert.equal(mergeTranscripts('', 'hello'), 'hello');
});

test('stripUnclear removes only the markers', () => {
  assert.equal(stripUnclear('I like [Unclear] very much'), 'I like very much');
});

// ---------- Android microphone permission rules (core/native-mic.ts) ----------
import { nativeErrorCode, outcomeAfterRequest, permissionPlan, toMicPermission } from '../src/app/core/native-mic';

test('permission plan: granted listens, never-asked or denied-once shows the popup, denied-for-good goes to Settings', () => {
  assert.equal(permissionPlan('granted'), 'granted');
  assert.equal(permissionPlan('prompt'), 'ask');
  assert.equal(permissionPlan('prompt-with-rationale'), 'ask');
  assert.equal(permissionPlan('denied'), 'settings');
  assert.equal(permissionPlan(undefined), 'ask');
});

test('after the popup: Allow works, Deny asks again later, "Don\'t ask again" goes to Settings', () => {
  assert.equal(outcomeAfterRequest('granted'), 'granted');
  assert.equal(outcomeAfterRequest('prompt-with-rationale'), 'ask-again');
  assert.equal(outcomeAfterRequest('prompt'), 'ask-again');
  assert.equal(outcomeAfterRequest('denied'), 'settings');
  assert.equal(toMicPermission('prompt-with-rationale'), 'prompt');
  assert.equal(toMicPermission('denied'), 'denied');
});

test('plugin errors become clear error codes', () => {
  assert.equal(nativeErrorCode(new Error('Missing permission RECORD_AUDIO')), 'not-allowed');
  assert.equal(nativeErrorCode({ message: 'Network error' }), 'network');
  assert.equal(nativeErrorCode('Recognizer busy'), 'busy');
  assert.equal(nativeErrorCode(new Error('No match')), 'no-speech');
  assert.equal(nativeErrorCode(new Error('Speech recognition not available')), 'service-not-allowed');
  assert.equal(nativeErrorCode(new Error('something odd')), 'start-failed');
});
