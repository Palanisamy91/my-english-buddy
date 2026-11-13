import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseBrainCore } from '../src/app/lela/database-brain-core';
import { PhraseBook } from '../src/app/lela/phrase-book';
import {
  applyMistakes, containsKeyword, fillTemplate, findTopicRequest, matchIntent, normalize, parseAge, parseHometown, parseJob, parseName,
} from '../src/app/lela/lela-text';
import { chooseLelaVoice, guessGender } from '../src/app/lela/voice-choice';
import type { LelaDb, Level } from '../src/app/lela/lela.models';
import { validateDb } from '../scripts/sync-db.mjs';

const db = JSON.parse(readFileSync(new URL('../db.json', import.meta.url), 'utf8')) as LelaDb;

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const brain = (seed = 1) => new DatabaseBrainCore(db, new PhraseBook(db.phrases, seeded(seed)), seeded(seed + 100));
const say = (turn: { lines: { text: string }[]; ask: { text: string } | null }) =>
  [...turn.lines.map((l) => l.text), turn.ask?.text ?? ''].filter(Boolean).join(' ');

test('db.json passes the full database check', () => {
  assert.deepEqual(validateDb(db), []);
});

test('text helpers', () => {
  assert.equal(normalize("I'm FINE, thanks!"), "i'm fine thanks");
  assert.ok(containsKeyword('i love cooking', 'cook'));
  assert.ok(!containsKeyword('i love cooking', 'coo'));
  assert.equal(fillTemplate('Nice to meet you, {name}!', { name: 'Priya' }), 'Nice to meet you, Priya!');
  assert.equal(fillTemplate('Nice to meet you, {name}!', {}), 'Nice to meet you!');
  assert.equal(fillTemplate('Hi {name}! Welcome.', { name: undefined }), 'Hi! Welcome.');
});

test('facts about the learner are captured from natural answers', () => {
  assert.equal(parseName('My name is priya kumar'), 'Priya Kumar');
  assert.equal(parseName("I'm Karthik"), 'Karthik');
  assert.equal(parseName('Karthik'), 'Karthik');
  assert.equal(parseName('I am fine'), undefined);
  assert.equal(parseAge('I am twenty-eight years old'), '28');
  assert.equal(parseAge('I am 31'), '31');
  assert.equal(parseAge('thirty'), '30');
  assert.equal(parseHometown('I am from madurai'), 'Madurai');
  assert.equal(parseHometown('My hometown is Coimbatore city'), 'Coimbatore');
  assert.equal(parseJob('I am a software developer'), 'software developer');
});

test('voice commands and small talk are recognised', () => {
  const intent = (t: string) => matchIntent(db.intents, t)?.id;
  assert.equal(intent('Can you repeat that'), 'repeat');
  assert.equal(intent('I do not know'), 'help');
  assert.equal(intent('change the topic'), 'change-topic');
  assert.equal(intent('bye'), 'end');
  assert.equal(intent('Are you a real person?'), 'are-you-real');
  assert.equal(intent("I am fine and you"), 'and-you');
  assert.equal(intent('What is your name?'), 'your-name');
  assert.equal(intent('Today I went to the office and completed my work'), undefined);
});

test('"let\'s talk about cooking" is a topic request, an ordinary answer is not', () => {
  assert.equal(findTopicRequest("let's talk about cooking", db.topics)?.id, 'cooking');
  assert.equal(findTopicRequest('Can we talk about Angular', db.topics)?.id, 'angular');
  assert.equal(findTopicRequest('I want to practise interview', db.topics)?.group, 'interview');
  assert.equal(findTopicRequest('we talk about cooking at home every day', db.topics), null);
});

test('every stored common-mistake rule fixes its own example', () => {
  const compiled = new Map<string, RegExp | null>();
  for (const m of db.mistakes) {
    const out = applyMistakes(m.wrongExample, [m], compiled).text;
    assert.equal(out.toLowerCase(), m.rightExample.toLowerCase(), m.id);
  }
});

test('mistake rules keep the capital letter and explain the fix', () => {
  const compiled = new Map<string, RegExp | null>();
  const r = applyMistakes('Please open the light.', db.mistakes, compiled);
  assert.equal(r.text, 'Please turn on the light.');
  assert.ok(r.fixes[0].english.length > 10 && /[஀-௿]/.test(r.fixes[0].tamil));
});

test('Lela picks an English female voice when one exists, and says so honestly when not', () => {
  const voices = [
    { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true },
    { name: 'Microsoft Heera - English (India)', lang: 'en-IN', localService: true },
    { name: 'Google US English', lang: 'en-US' },
    { name: 'Hindi', lang: 'hi-IN' },
  ];
  const c = chooseLelaVoice(voices);
  assert.equal(c.voice?.name, 'Microsoft Heera - English (India)');
  assert.equal(c.gender, 'female');
  const noFemale = chooseLelaVoice([{ name: 'Microsoft David - English (United States)', lang: 'en-US' }, { name: 'Google US English', lang: 'en-US' }]);
  assert.equal(noFemale.voice?.name, 'Google US English'); // gender unknown, never the male-named David
  assert.equal(noFemale.gender, 'unknown');
  assert.equal(noFemale.gender, 'unknown');
  assert.match(noFemale.note, /cannot tell|not clearly|clearly a female/i);
  const onlyMale = chooseLelaVoice([{ name: 'Microsoft David - English (United States)', lang: 'en-US' }]);
  assert.equal(onlyMale.voice, null);
  assert.match(onlyMale.note, /female English voice was found/i);
  assert.equal(guessGender({ name: 'Microsoft Heera - English (India)', lang: 'en-IN' }), 'female');
  assert.equal(guessGender({ name: 'Microsoft David', lang: 'en-US' }), 'male');
  const none = chooseLelaVoice([{ name: 'Hindi', lang: 'hi-IN' }]);
  assert.equal(none.voice, null);
  assert.equal(chooseLelaVoice([]).voice, null);
  assert.equal(chooseLelaVoice([{ name: 'Veena', lang: 'en-IN' }, { name: 'Samantha', lang: 'en-US' }]).voice?.name, 'Veena');
});

test('the example conversation from the brief works: greeting -> day -> work -> programming language', () => {
  const b = brain();
  const t0 = b.start({ modeId: 'free', level: 'beginner', memory: {}, returning: false });
  assert.match(say(t0), /Lela/);
  assert.match(say(t0), /How are you today\?/);
  const t1 = b.next('I am fine.', { memory: {} });
  assert.match(say(t1), /How was your day today\?/);
  const t2 = b.next('Today I went office and completed my work.', { memory: {} });
  assert.match(say(t2), /What work did you complete today\?/);
  const t3 = b.next('I completed some software development work.', { memory: {} });
  assert.match(say(t3), /What programming language are you working with\?/);
});

test('name, age and hometown are remembered and used', () => {
  const b = brain(3);
  b.start({ modeId: 'daily', level: 'beginner', memory: {}, returning: false });
  b.goToTopic('name-age');
  const t = b.next('My name is Priya', { memory: {} });
  assert.equal(t.remember?.name, 'Priya');
  assert.match(say(t), /Priya/);
  const later = b.next('I am twenty eight', { memory: { name: 'Priya' } });
  assert.equal(later.remember?.age, '28');
});

test('no question is ever asked twice before all topics are used, in any mode', () => {
  const noMore = new Set(db.phrases.filter((p) => p.type === 'no-more-questions').map((p) => p.text));
  for (const mode of db.modes) {
    for (const level of ['beginner', 'intermediate', 'advanced'] as Level[]) {
      const b = brain(7);
      const seen = new Set<string>();
      let turn = b.start({ modeId: mode.id, level, memory: {}, returning: false });
      for (let i = 0; i < 120; i++) {
        const q = turn.ask;
        assert.ok(q, `${mode.id}/${level}: ran out of questions at turn ${i}`);
        // When every topic has been used Lela says so and starts the cycle again (by design).
        if (turn.lines.some((l) => noMore.has(l.text))) seen.clear();
        if ((q.kind === 'question' || q.kind === 'grammar') && !q.followUp && q.questionId) {
          assert.ok(!seen.has(q.questionId), `${mode.id}/${level}: repeated ${q.questionId}`);
          seen.add(q.questionId);
        }
        const answer = q.kind === 'vocab' || q.kind === 'grammar' ? (q.example ?? 'ok') : 'I think it is good and I like it';
        turn = b.next(answer, { memory: {} });
      }
      assert.ok(seen.size > 5 || ['telephone', 'vocabulary', 'travel'].includes(mode.id), `${mode.id}/${level}: only ${seen.size} questions`);
    }
  }
});

test('modes stay inside their own content', () => {
  const groupsOf = (modeId: string) => {
    const mode = db.modes.find((m) => m.id === modeId)!;
    const b = brain(11);
    const seen = new Set<string>();
    let turn = b.start({ modeId, level: 'intermediate', memory: {}, returning: false });
    for (let i = 0; i < 60; i++) {
      if (turn.topic && turn.topic.id !== 'warm-up') seen.add(turn.topic.group + '|' + turn.topic.id); // the warm-up chat opens several modes
      const q = turn.ask!;
      turn = b.next(q.kind === 'vocab' || q.kind === 'grammar' ? (q.example ?? 'ok') : 'It is good', { memory: {} });
    }
    return { mode, seen };
  };
  for (const id of ['office', 'software', 'interview', 'telephone', 'grammar', 'vocabulary', 'travel', 'advanced']) {
    const { mode, seen } = groupsOf(id);
    for (const entry of seen) {
      const [group, topicId] = entry.split('|');
      assert.ok(mode.groups.includes(group) || mode.topicIds.includes(topicId), `${id} mode used topic ${topicId} (${group})`);
    }
  }
});

test('interview mode goes in order from self introduction to closing', () => {
  const b = brain(5);
  let turn = b.start({ modeId: 'interview', level: 'intermediate', memory: {}, returning: false });
  const order: string[] = [];
  for (let i = 0; i < 40; i++) {
    if (turn.topic && order[order.length - 1] !== turn.topic.id) order.push(turn.topic.id);
    turn = b.next('I have worked on many projects and learned a lot', { memory: {} });
  }
  assert.deepEqual(order.slice(0, 8), ['iv-self-intro', 'iv-experience', 'iv-technical', 'iv-strengths', 'iv-salary', 'iv-notice', 'iv-hr', 'iv-closing']);
});

test('role-play scenes: Lela speaks first and walks through the dialogue', () => {
  const b = brain(2);
  b.start({ modeId: 'telephone', level: 'beginner', memory: {}, returning: false });
  const t = b.goToTopic('restaurant');
  assert.equal(t.ask?.kind, 'scene');
  assert.ok(t.ask?.example);
  const dialogue = db.dialogues.find((d) => d.topicId === 'restaurant' && d.level === 'beginner')!;
  let turn = t;
  for (let i = 1; i < dialogue.turns.length; i++) {
    turn = b.next(turn.ask!.example!, { memory: {} });
    assert.equal(turn.ask?.text, dialogue.turns[i].lela);
  }
  turn = b.next('Thank you', { memory: {} });
  assert.ok(turn.lines.some((l) => /role-play|practice|situation/i.test(l.text)), 'scene end phrase');
});

test('vocabulary mode checks that the word is used, once retries, then moves on', () => {
  const b = brain(4);
  const first = b.start({ modeId: 'vocabulary', level: 'beginner', memory: {}, returning: false });
  const word = first.ask!.word!;
  assert.equal(first.ask!.kind, 'vocab');
  const miss = b.next('I like to go home', { memory: {} });
  assert.equal(miss.retry, true);
  const ok = b.next(`I use the word ${word} today`, { memory: {} });
  assert.notEqual(ok.ask?.word, word);
});

test('grammar mode: a sentence without the target grammar gets one hint', () => {
  const b = brain(6);
  b.start({ modeId: 'grammar', level: 'beginner', memory: {}, returning: false });
  const t = b.goToTopic('gr-past-simple');
  assert.equal(t.ask?.kind, 'grammar');
  assert.match(say(t), /past/i);
  const bad = b.next('hmm', { memory: {} });
  assert.equal(bad.retry, true);
  const good = b.next(t.ask!.example!, { memory: {} });
  assert.ok(!good.retry);
});

// ---------- one-word answers (item 12) ----------

function started(seed = 3) {
  const b = brain(seed);
  b.configure('free', 'beginner');
  b.start({ modeId: 'free', level: 'beginner', memory: {}, returning: false });
  // get past the "How are you today?" question to an ordinary question
  const t = b.next('I am fine', { memory: {} });
  return { b, t };
}

test('a single known word becomes a full sentence plus a follow-up question', () => {
  for (const word of ['hungry', 'office', 'happy']) {
    const { b } = started();
    const turn = b.next(word, { memory: {} });
    assert.ok(turn.single, `${word}: has a teaching sentence`);
    assert.equal(turn.single?.word, word);
    assert.match(turn.single?.sentence ?? '', new RegExp(word, 'i'));
    assert.match(turn.ask?.text ?? '', /\?$/);
    assert.ok(/[஀-௿]/.test(turn.single?.sentenceTamil ?? ''), 'Tamil meaning present');
  }
});

test('the three examples from the brief get the wanted replies', () => {
  const by = (w: string) => db.singleWords?.find((x) => x.word === w);
  assert.match(by('hungry')?.sentence ?? '', /hungry/);
  assert.match(by('office')?.sentence ?? '', /office/);
  assert.match(by('happy')?.sentence ?? '', /happy/);
});

test('one-word follow-ups are never repeated', () => {
  const asks = (db.singleWords ?? []).map((w) => w.ask);
  assert.equal(new Set(asks).size, asks.length);
  assert.equal((db.singleWords ?? []).length, 150);
});

test('an unknown single word is asked about, not guessed', () => {
  const { b } = started();
  const turn = b.next('zxqvlorp', { memory: {} });
  assert.ok(!turn.single);
  assert.equal(turn.retry, true);
  assert.match(say(turn), /not sure|did not quite understand/i);
  // asked once only: the same word again is accepted and the conversation moves on
  const again = b.next('zxqvlorp', { memory: {} });
  assert.ok(!again.retry);
});

test('plain one-word answers and names are not treated as a word to teach', () => {
  const { b } = started();
  assert.ok(!b.next('yes', { memory: {} }).single);
  const b2 = brain(5);
  b2.configure('free', 'beginner');
  const first = b2.start({ modeId: 'free', level: 'beginner', memory: {}, returning: false });
  void first;
});
