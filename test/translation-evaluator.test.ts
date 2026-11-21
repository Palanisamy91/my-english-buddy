import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateTranslation, normaliseTranslation } from '../src/app/core/translation-evaluator';

test('translation evaluator accepts punctuation and contraction variants', () => {
  assert.equal(evaluateTranslation('I am learning English every day.', "I'm learning English every day!").status, 'correct');
  assert.equal(normaliseTranslation("Could you please help me?") , 'could you please help me');
});

test('translation evaluator accepts explicitly listed natural alternatives', () => {
  assert.equal(evaluateTranslation('I learn English every day.', 'I study English every day.', ['I study English every day.']).status, 'correct');
});

test('translation evaluator marks a close attempt as close, not correct', () => {
  const result = evaluateTranslation('I went to the office yesterday.', 'I went office yesterday.');
  assert.equal(result.status, 'close');
  assert.ok(result.missing.length > 0);
});

test('translation evaluator identifies unrelated answers for review', () => {
  assert.equal(evaluateTranslation('I went to the office yesterday.', 'My brother likes cricket.').status, 'review');
});
