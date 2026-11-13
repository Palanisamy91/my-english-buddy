import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVocabIndex, findVocab, formsOf } from '../src/app/core/vocab-index';
import { sanitizeState, defaultState } from '../src/app/core/progress-state';

const words = [
  { id: 'a1', word: 'walk' }, { id: 'a2', word: 'happy' }, { id: 'a3', word: 'schedule' },
  { id: 'a4', word: 'stop' }, { id: 'a5', word: 'take off' }, { id: 'a6', word: 'screen-share' }, { id: 'a7', word: 'go' },
];
const idx = buildVocabIndex(words);

test('finds inflected forms but not look-alikes', () => {
  assert.deepEqual(findVocab('She walked and he is walking. Walks are fun.', idx), ['a1']);
  assert.deepEqual(findVocab('The runway is long', buildVocabIndex([{ id: 'r', word: 'run' }])), []);
  assert.deepEqual(findVocab('He was happier, happily.', idx), ['a2']);
  assert.deepEqual(findVocab('I scheduled it; scheduling is hard', idx), ['a3']);
  assert.deepEqual(findVocab('We stopped, stopping now', idx), ['a4']);
});
test('phrases and hyphenated words; very short words are ignored', () => {
  assert.deepEqual(findVocab('The plane will take off soon', idx), ['a5']);
  assert.deepEqual(findVocab('Please screen share your window', idx), ['a6']);
  assert.deepEqual(findVocab('Let us go', idx), []);
});
test('each word once, in order of appearance', () => {
  assert.deepEqual(findVocab('happy walk happy walk', idx), ['a2', 'a1']);
  assert.ok(formsOf('study').includes('studied'));
});
test('chatWords survive sanitising; bad entries are dropped', () => {
  const st = sanitizeState({ chatWords: { xd001: { date: '2026-11-08', how: 'taught' }, xd002: { date: 'bad' }, xd003: { date: '2026-11-08', how: '??' } } });
  assert.deepEqual(st.chatWords, { xd001: { date: '2026-11-08', how: 'taught' }, xd003: { date: '2026-11-08', how: 'seen' } });
  assert.deepEqual(defaultState().chatWords, {});
});
