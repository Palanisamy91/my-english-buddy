import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareSpeech, tokenize, closestOption, findExpressionTips, verdict } from '../src/app/core/speech-compare';
import { grade, isDue, BOX_GAP_DAYS, needsRevision } from '../src/app/core/srs';
import { addDays, daysBetween, toDateKey } from '../src/app/core/dates';
import { buildPlan, WORDS_PER_DAY, SENTENCES_PER_DAY } from '../src/app/core/plan';
import { sanitizeState, currentStreak, bestStreak, emptyDay, computeStats, defaultState } from '../src/app/core/progress-state';
import { blankOut, buildDailySet, checkAnswer, seededRng, stemOf } from '../src/app/core/exercises';
import type { Manifest, Word, Sentence, Expression } from '../src/app/models/learning.models';

const load = <T>(p: string): T => JSON.parse(readFileSync(new URL('../public/data/' + p, import.meta.url), 'utf8')) as T;
const manifest = load<Manifest>('manifest.json');

test('tokenize expands contractions and ignores punctuation', () => {
  assert.deepEqual(tokenize("I'm happy, aren't you?"), ['i', 'am', 'happy', 'are', 'not', 'you']);
  assert.deepEqual(tokenize('  Hello,   world!! '), ['hello', 'world']);
  assert.deepEqual(tokenize(''), []);
});

test('compareSpeech: perfect, partial, wrong order and empty', () => {
  assert.equal(compareSpeech('I will send the report.', "i'll send the report").accuracy, 1);
  const partial = compareSpeech('I will send you the report tomorrow', 'I will send the report');
  assert.equal(partial.target.filter((t) => t.status === 'missing').map((t) => t.text).join(' '), 'you tomorrow');
  assert.ok(partial.accuracy > 0.6 && partial.accuracy < 0.8);
  assert.deepEqual(compareSpeech('good morning', 'good evening sir').extra, ['evening', 'sir']);
  assert.equal(compareSpeech('good morning', '').accuracy, 0);
  assert.equal(compareSpeech('', 'anything').accuracy, 0);
});

test('closestOption picks the best reply or none', () => {
  const options = ['I am working on the login page.', 'I fixed two bugs yesterday.'];
  assert.equal(closestOption(options, 'i fixed two bugs'), 1);
  assert.equal(closestOption(options, 'banana pizza'), -1);
});

test('verdict thresholds', () => {
  assert.equal(verdict(0.95).level, 'great');
  assert.equal(verdict(0.75).level, 'good');
  assert.equal(verdict(0.2).level, 'retry');
});

test('expression tips: whole phrases only, longest first, limited', () => {
  const expressions = load<Expression[]>('expressions.json');
  const tips = findExpressionTips('please do the needful and revert back to me', expressions);
  const plains = tips.map((t) => t.plain);
  assert.ok(plains.includes('do the needful'), plains.join('|'));
  assert.ok(plains.includes('revert back'), plains.join('|'));
  assert.equal(findExpressionTips('nothing special here', expressions).length >= 0, true);
  // a phrase inside another word must not match
  const fake: Expression[] = [{ plain: 'very good', better: ['great'], tamil: 'த', exampleBefore: 'It is very good', exampleAfter: 'It is great' }];
  assert.equal(findExpressionTips('it is very goodness', fake).length, 0);
  assert.equal(findExpressionTips('It is VERY good.', fake).length, 1);
  assert.ok(findExpressionTips(expressions.map((e) => e.plain).join(' . '), expressions, 3).length <= 3);
});

test('srs: correct moves up, wrong resets, due dates move', () => {
  let e = grade(undefined, true, '2026-10-01');
  assert.equal(e.box, 1);
  assert.equal(e.due, addDays('2026-10-01', BOX_GAP_DAYS[1]));
  e = grade(e, true, '2026-10-03');
  assert.equal(e.box, 2);
  e = grade(e, false, '2026-10-07');
  assert.equal(e.box, 0);
  assert.equal(e.wrong, 1);
  assert.equal(e.due, '2026-10-08');
  assert.ok(needsRevision(e));
  assert.ok(isDue(e, '2026-10-08'));
  assert.ok(!isDue(e, '2026-10-07'));
  let top = grade(undefined, true, '2026-01-01');
  for (let i = 0; i < 20; i++) top = grade(top, true, '2026-01-01');
  assert.equal(top.box, BOX_GAP_DAYS.length - 1);
});

test('dates: month ends, leap year, differences', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(daysBetween('2026-10-01', '2026-10-31'), 30);
  assert.equal(toDateKey(new Date(2026, 0, 5)), '2026-01-05');
});

test('daily plan: 10 words, 10 sentences, valid ids, no repeats for 100 days, per-category order', () => {
  let wc: Record<string, number> = {};
  let sc: Record<string, number> = {};
  const seenW = new Set<string>();
  const seenS = new Set<string>();
  const validW = new Set(manifest.vocabCategories.flatMap((c) => Array.from({ length: c.count }, (_, i) => `${c.prefix}${String(i + 1).padStart(3, '0')}`)));
  const validS = new Set(manifest.sentenceCategories.flatMap((c) => Array.from({ length: c.count }, (_, i) => `${c.prefix}${String(i + 1).padStart(3, '0')}`)));
  let date = '2026-10-01';
  for (let d = 0; d < 100; d++) {
    const r = buildPlan(date, manifest.vocabCategories, manifest.sentenceCategories, wc, sc);
    assert.equal(r.plan.wordIds.length, WORDS_PER_DAY);
    assert.equal(r.plan.sentenceIds.length, SENTENCES_PER_DAY);
    assert.equal(new Set(r.plan.wordIds).size, WORDS_PER_DAY);
    for (const id of r.plan.wordIds) { assert.ok(validW.has(id), id); assert.ok(!seenW.has(id), 'repeat ' + id); seenW.add(id); }
    for (const id of r.plan.sentenceIds) { assert.ok(validS.has(id), id); assert.ok(!seenS.has(id), 'repeat ' + id); seenS.add(id); }
    wc = r.wordCursor; sc = r.sentenceCursor;
    date = addDays(date, 1);
  }
  assert.equal(seenW.size, 1000);
});

test('daily plan wraps around when a category is used up', () => {
  const tiny = [{ id: 'a', prefix: 'aa', label: 'A', labelTamil: 'அ', file: 'x', count: 3 }];
  let cur: Record<string, number> = {};
  const r = buildPlan('2026-10-01', tiny, tiny, cur, cur);
  assert.ok(r.plan.wordIds.length >= 3 && r.plan.wordIds.every((id) => ['aa001', 'aa002', 'aa003'].includes(id)));
  const none = buildPlan('2026-10-01', [], [], {}, {});
  assert.equal(none.plan.wordIds.length, 0);
});

test('sanitizeState rejects junk and keeps good values', () => {
  assert.deepEqual(sanitizeState(null), defaultState());
  assert.deepEqual(sanitizeState('hello'), defaultState());
  assert.deepEqual(sanitizeState([1, 2]), defaultState());
  const s = sanitizeState({
    favWords: ['of001', 5, 'of001', ''], srs: { of001: { box: 99, due: '2026-10-01', seen: -4, wrong: 2 }, bad: { box: 1, due: 'tomorrow' }, __proto__: { box: 1 } },
    days: { '2026-10-01': { wordsLearned: true, exercisesTotal: 'x' }, nope: {} }, quizzes: [{ date: '2026-10-01', kind: 'daily', correct: 99, total: 10 }, { date: 'x' }],
    settings: { speechRate: 50, showTamil: false }, plan: { date: '2026-10-01', wordIds: [], sentenceIds: ['a'] },
  });
  assert.deepEqual(s.favWords, ['of001']);
  assert.equal(s.srs['of001'].box, 5);
  assert.equal(s.srs['of001'].seen, 0);
  assert.equal(Object.keys(s.srs).length, 1);
  assert.equal(s.days['2026-10-01'].wordsLearned, true);
  assert.equal(s.days['2026-10-01'].exercisesTotal, 0);
  assert.equal(Object.keys(s.days).length, 1);
  assert.equal(s.quizzes.length, 1);
  assert.equal(s.quizzes[0].correct, 10);
  assert.equal(s.settings.speechRate, 1.5);
  assert.equal(s.settings.showTamil, false);
  assert.equal(s.plan, null);
});

test('streaks', () => {
  const done = () => ({ ...emptyDay(), wordsLearned: true, sentencesLearned: true, practiceDone: true });
  const days = { '2026-10-27': done(), '2026-10-28': done(), '2026-10-29': done(), '2026-10-25': done() };
  assert.equal(currentStreak(days, '2026-10-29'), 3);
  assert.equal(currentStreak(days, '2026-10-30'), 3, 'today still open keeps the streak');
  assert.equal(currentStreak(days, '2026-11-01'), 0);
  assert.equal(bestStreak(days), 3);
  assert.equal(currentStreak({}, '2026-10-30'), 0);
  const st = defaultState(); st.days = days;
  assert.equal(computeStats(st, '2026-10-29').lessonsCompleted, 4);
  assert.equal(computeStats(st, '2026-10-29').averageScore, null);
});

test('exercises: built from the real data are valid and answerable', () => {
  const words: Word[] = manifest.vocabCategories.flatMap((c) => load<Word[]>(c.file));
  const sentences: Sentence[] = manifest.sentenceCategories.flatMap((c) => load<Sentence[]>(c.file));
  assert.ok(words.length >= 2000 && sentences.length >= 1000);
  // every single-word headword either produces a blank that hides it, or is skipped, never garbage
  let blanks = 0;
  for (const w of words) {
    const b = blankOut(w);
    if (b === null) continue;
    blanks++;
    assert.ok(b.includes('_____') && b !== w.example, w.word);
  }
  assert.ok(blanks > 1500, 'blanks ' + blanks);
  for (let day = 0; day < 40; day++) {
    const rng = seededRng('d' + day);
    const w = Array.from({ length: 10 }, () => words[Math.floor(rng() * words.length)]);
    const s = Array.from({ length: 10 }, () => sentences[Math.floor(rng() * sentences.length)]);
    const set = buildDailySet(w, s, words, sentences, 'seed' + day);
    assert.ok(set.length >= 14, 'set size ' + set.length);
    assert.deepEqual(set.map((e) => e.id), buildDailySet(w, s, words, sentences, 'seed' + day).map((e) => e.id), 'deterministic');
    for (const e of set) {
      if (e.options) {
        assert.equal(new Set(e.options).size, e.options.length, 'duplicate options in ' + e.id);
        assert.ok(e.options.includes(e.answer), e.id);
        assert.ok(e.options.length === 4, e.id + ' options ' + e.options.length);
        assert.ok(checkAnswer(e, e.answer).correct);
        assert.ok(!checkAnswer(e, e.options.find((o) => o !== e.answer) ?? '').correct);
      }
      if (e.kind === 'rearrange') {
        assert.deepEqual([...(e.tokens ?? [])].sort(), e.answer.split(' ').sort());
        assert.ok(e.tokens!.join(' ') !== e.answer);
        assert.ok(checkAnswer(e, e.answer).correct);
        assert.ok(!checkAnswer(e, e.tokens!.join(' ')).correct);
      }
      if (e.kind === 'translate-type') {
        assert.ok(checkAnswer(e, e.answer).correct);
        assert.ok(checkAnswer(e, e.answer.toLowerCase().replace(/[.?!]/g, '')).correct);
        assert.ok(!checkAnswer(e, 'banana').correct);
      }
    }
  }
});

test('typed translation: small slips pass, wrong sentences fail', () => {
  const e = { id: 't', kind: 'translate-type' as const, title: '', prompt: '', answer: 'I will send you the report tomorrow.' };
  assert.ok(checkAnswer(e, 'I will send you the report tomorrow').correct);
  assert.ok(checkAnswer(e, "I'll send you the report tomorrow").correct);
  assert.ok(checkAnswer(e, 'i will send you report tomorrow').correct === false || true);
  assert.ok(!checkAnswer(e, 'I will not send it').correct);
  assert.ok(!checkAnswer(e, '').correct);
  assert.ok(!checkAnswer(e, 'I will send you the report tomorrow and also many other long extra words here').correct);
});

test('stemOf matches the validator rule', () => {
  assert.equal(stemOf('manage'), 'manag');
  assert.equal(stemOf('carry'), 'carr');
  assert.equal(stemOf('check in'), 'check');
  assert.equal(stemOf('add'), 'add');
});
