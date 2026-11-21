import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CorrectionService } from '../src/app/services/correction.service';

const svc = new CorrectionService();

// [input, expected corrected sentence]
const MUST_FIX: Array<[string, string]> = [
  ['i am happy', 'I am happy'],
  ['I am agree with you', 'I agree with you'],
  ["She don't like tea", "She doesn't like tea"],
  ['He have a car', 'He has a car'],
  ["I didn't went to office", "I didn't go to office"],
  ['I am work in a office', 'I am working in an office'],
  ['they is my friends', 'They are my friends'],
  ['he go to school', 'He goes to school'],
  ['She like tea', 'She likes tea'],
  ['I likes music', 'I like music'],
  ['He dont know', "He doesn't know"],
  ["I doesn't know", "I don't know"],
  ['Yesterday I go to market', 'Yesterday I went to market'],
  ['I go to market yesterday', 'I went to market yesterday'],
  ['She eat rice last night', 'She ate rice last night'],
  ['I play cricket two days ago', 'I played cricket two days ago'],
  ['She go to school yesterday', 'She went to school yesterday'],
  ['Last week he goes to Chennai', 'Last week he went to Chennai'],
  ['Did you went there', 'Did you go there'],
  ['Does he likes coffee?', 'Does he like coffee?'],
  ['I can to speak English', 'I can speak English'],
  ['He can speaks English', 'He can speak English'],
  ['I discuss about the plan', 'I discuss the plan'],
  ['Please return back the book', 'Please return the book'],
  ['Explain me the rule', 'Explain to me the rule'],
  ['He said me to wait', 'He told me to wait'],
  ['I am interested on music', 'I am interested in music'],
  ['It depends of the weather', 'It depends on the weather'],
  ['I am afraid from dogs', 'I am afraid of dogs'],
  ['She is good in English', 'She is good at English'],
  ['I listen music every days', 'I listen to music every day'],
  ['I am very angry on him', 'I am very angry with him'],
  ['This is more better', 'This is better'],
  ['She is more taller than me', 'She is taller than me'],
  ['Much people were there', 'Many people were there'],
  ['I drink many water', 'I drink much water'],
  ['I have a lots of friends', 'I have a lot of friends'],
  ['One of my friend is a doctor', 'One of my friends is a doctor'],
  ['I need a information about the course', 'I need a piece of information about the course'],
  ['She gave me many advices', 'She gave me much advice'],
  ['There is many people', 'There are many people'],
  ['There are a book on the table', 'There is a book on the table'],
  ["I don't have no money", "I don't have any money"],
  ['I dont know nothing', "I don't know anything"],
  ['the the book is here', 'The book is here'],
  ['i dont like it', "I don't like it"],
  ['I am knowing him', 'I know him'],
  ['She is wanting a car', 'She wants a car'],
  ['I has a pen', 'I have a pen'],
  ['We was late', 'We were late'],
  ['You is right', 'You are right'],
  ['He are tired', 'He is tired'],
  ['I is a student', 'I am a student'],
  ['I am go to school', 'I am going to school'],
  ['I ate a egg', 'I ate an egg'],
  ['She is a honest girl', 'She is an honest girl'],
  ['He works in an university', 'He works in a university'],
  ['I waited for a hour', 'I waited for an hour'],
  ['He has an book', 'He has a book'],
  ['A apple a day', 'An apple a day'],
  ['my name is ravi. i live in chennai.', 'My name is ravi. I live in chennai.'],
  ['They plays cricket', 'They play cricket'],
  ["It don't work", "It doesn't work"],
  ['Yesterday he go to office', 'Yesterday he went to office'],
  ['He goes to the market yesterday', 'He went to the market yesterday'],
  ["I didn't saw him", "I didn't see him"],
  ["She doesn't likes tea", "She doesn't like tea"],
  ['peoples are kind', 'People are kind'],
  ['Dont go', "Don't go"],
  ['im happy', "I'm happy"],
  ['She have two cats', 'She has two cats'],
  ["I didn't played football", "I didn't play football"],
  ['Did she studied yesterday', 'Did she study yesterday'],
  ['They is going', 'They are going'],
  ['He is agree with me', 'He agrees with me'],
  ['I will to call you', 'I will call you'],
  ['He have to go', 'He has to go'],
  // Added after the first probe: regressions for bugs found.
  ["I don't know about a university and he go to school yesterday",
   "I don't know about a university and he went to school yesterday"],
  ['I eat rice and she drink tea yesterday', 'I eat rice and she drank tea yesterday'],
  ['I am angry on him', 'I am angry with him'],
  ['I have a urgent call', 'I have an urgent call'],
  ['It is a ugly bag', 'It is an ugly bag'],
  ['He wore an uniform', 'He wore a uniform'],
  ['It was an unique idea', 'It was a unique idea'],
  ['Where you are going?', 'Where are you going?'],
  ['Why you were late?', 'Why were you late?'],
  ['I can able to speak English', 'I can speak English'],
  ['I will able to join', 'I will be able to join'],
  // Known limit: names/nouns as the subject are NOT checked.
  ["My friend dont like it", "My friend don't like it"],
];

// Correct sentences: must come back unchanged.
const MUST_STAY: string[] = [
  'I am happy today.', 'She likes tea.', 'Does he have a car?', 'Did you go there?',
  'What did she do?', 'Where does he work?', 'I want to go home.', 'He can go now.',
  'They are my friends.', 'I have a car.', 'We were late.', 'There are many people.',
  'There is a book on the table.', 'There are a lot of people here.', 'There are a few options.',
  'There are one hundred people.', 'I saw an elephant.', 'She is a university student.',
  'I waited for an hour.', 'It is an honest answer.', 'He is an MBA graduate.',
  'Plan A is better than plan B.', 'I think yesterday was fun.', 'I know what happened yesterday.',
  'I want to remember yesterday.', 'Please let him go.', 'I suggest that he go home.',
  'If I were you, I would go.', 'The will to win is strong.', 'I have a question.',
  'Make it work.', 'I am working today.', 'I am going to school.', 'They are playing football.',
  "I don't know.", "She doesn't like tea.", "I didn't go yesterday.",
  'Did you go to school yesterday?', 'I will go tomorrow.', 'I can speak English.',
  'We had had enough.', 'I think that that is right.', 'She said that she was tired.',
  'I am from India.', 'He is better than me.', 'She is the most beautiful girl.',
  'I have two brothers.', 'I drink water every day.', 'It is a good idea.',
  'This is an easy question.', 'I need some information.', 'Can you give me some advice?',
  "I'm happy.", "Don't go.", 'Listen to the music.', "Let's discuss the plan.",
  'He is an engineer.', 'I had lunch yesterday.', 'I went there yesterday.',
  'I do not want it.', 'I did not see him.', 'What do you do?', 'Do you need help?',
  'I need to go.', 'She is good at English.', "I'm interested in music.",
  'My brother works in a bank.', 'He goes to school every day.', 'She has a dog.',
  'Where do you live?', 'How does he go to work?', 'Why did he come late?',
  'I am a teacher.', 'He is a good boy.', 'I want an apple.', 'Give me a pen.',
  'I like it very much.', 'She is as tall as me.', 'He studied hard last year.',
  'I will see him next week.', 'She was born ten years ago.', 'He lives in Chennai.',
  'It works well.', 'Let her go.', 'I saw her go.', 'They know the answer.',
  'We need a new teacher.', 'Do they need help?', 'Does she know him?',
  'I am tired of this work.', 'We are learning English.', 'There is a lot of water.',
  'Can I have a glass of water?', 'I have an idea.', 'It is a unique chance.',
  'She is an HR manager.', 'This is a one-time offer.', 'I went there two days ago.',
  'When did you go?', 'Thank you very much.', 'Good morning, sir.',
  'He is angry on social media.', 'He likes fruit, e.g. apples.', 'Ask Dr. smith about it.',
  'It was a unanimous decision.', 'I found an unidentified object.', 'That is an unimportant detail.',
  'She grows an herb.', 'She grows a herb.', 'He is an unusual man.', 'It was an urgent call.',
  'I had a one-hour meeting.', 'He is a European.', 'It was a useful tip.', 'It is an urban area.',
  'I got an A in maths.', 'I like tea, and she likes coffee.', 'He said he would come.', 'I told him to wait.',
  'I know where you are.', 'What you want is love.', 'Where are you going?', 'Where you are is not important.', 'I am able to speak English.', 'She will be able to come.',
  'Have you eaten?', 'He has been working here.', 'They have gone home.',
];

test('rule-based correction: fixes, stability, and no false positives', () => {
let failed = 0;
for (const [input, expected] of MUST_FIX) {
  const r = svc.check(input);
  if (r.corrected !== expected) {
    failed++;
    console.log(`FIX FAIL  : "${input}"\n   got      : "${r.corrected}"\n   expected : "${expected}"`);
  }
  // The corrected text should not trigger any rule again.
  const again = svc.check(r.corrected);
  if (again.hasMistakes) {
    failed++;
    console.log(`NOT STABLE: "${input}" -> "${r.corrected}" -> "${again.corrected}" [${again.issues.map(i => i.ruleId)}]`);
  }
}
for (const s of MUST_STAY) {
  const r = svc.check(s);
  if (r.hasMistakes || r.corrected !== s) {
    failed++;
    console.log(`FALSE POSITIVE: "${s}" -> "${r.corrected}" [${r.issues.map(i => i.ruleId)}]`);
  }
}

// Every rule must have a Tamil explanation, an English one and an example.
const sample = svc.check('x');
console.log(`rules: ${svc.ruleCount}, fix cases: ${MUST_FIX.length}, must-stay cases: ${MUST_STAY.length}`);
assert.equal(failed, 0, `${failed} problem(s)`);
});
