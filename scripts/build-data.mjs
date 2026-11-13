#!/usr/bin/env node
/**
 * Validates the learning content in data-src/ and builds the app's data files in public/data/.
 *
 *   node scripts/build-data.mjs                 validate everything + write public/data
 *   node scripts/build-data.mjs --check         validate everything only (no files written)
 *   node scripts/build-data.mjs --file <path>   validate ONE source file (shape only, no global rules)
 *
 * No dependencies. Exit code 1 when any error is found.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'data-src');
const OUT = path.join(root, 'public', 'data');

export const VOCAB_CATEGORIES = [
  { id: 'daily-life', prefix: 'dl', label: 'Daily life', labelTamil: 'அன்றாட வாழ்க்கை' },
  { id: 'office', prefix: 'of', label: 'Office', labelTamil: 'அலுவலகம்' },
  { id: 'software-development', prefix: 'sd', label: 'Software development', labelTamil: 'மென்பொருள் உருவாக்கம்' },
  { id: 'interviews', prefix: 'iv', label: 'Interviews', labelTamil: 'நேர்காணல்' },
  { id: 'meetings', prefix: 'mt', label: 'Meetings', labelTamil: 'கூட்டங்கள்' },
  { id: 'telephone', prefix: 'tp', label: 'Telephone', labelTamil: 'தொலைபேசி உரையாடல்' },
  { id: 'travel', prefix: 'tr', label: 'Travel', labelTamil: 'பயணம்' },
  { id: 'general', prefix: 'ge', label: 'General English', labelTamil: 'பொது ஆங்கிலம்' },
  // ---- added later (item 12): 10 groups x 50 = exactly 500 new words; they also need a simple English "meaning" ----
  { id: 'everyday-things', prefix: 'wy', label: 'Everyday things', labelTamil: 'அன்றாடப் பொருட்கள்', added: 50 },
  { id: 'action-verbs', prefix: 'wa', label: 'Action verbs', labelTamil: 'செயல் வினைச்சொற்கள்', added: 50 },
  { id: 'adjectives', prefix: 'wj', label: 'Adjectives', labelTamil: 'பெயரடைகள்', added: 50 },
  { id: 'workplace-words', prefix: 'ww', label: 'Workplace words', labelTamil: 'பணியிடச் சொற்கள்', added: 50 },
  { id: 'travel-words', prefix: 'wt', label: 'Travel words', labelTamil: 'பயணச் சொற்கள்', added: 50 },
  { id: 'feelings-words', prefix: 'wf', label: 'Feelings', labelTamil: 'உணர்வுகள்', added: 50 },
  { id: 'conversation-words', prefix: 'wc', label: 'Conversation words', labelTamil: 'உரையாடல் சொற்கள்', added: 50 },
  { id: 'food-home', prefix: 'wh', label: 'Food and home', labelTamil: 'உணவு மற்றும் வீடு', added: 50 },
  { id: 'shopping-money', prefix: 'ws', label: 'Shopping and money', labelTamil: 'பொருட்கள் வாங்குதல், பணம்', added: 50 },
  { id: 'health-body', prefix: 'wb', label: 'Health and body', labelTamil: 'உடல்நலம்', added: 50 },
  // ---- added later (item 13): 10 groups x 100 = exactly 1,000 more words ("batch: 2") ----
  { id: 'daily-conversation-words', prefix: 'xd', label: 'Daily conversation vocabulary', labelTamil: 'அன்றாட உரையாடல் சொற்கள்', added: 100, batch: 2 },
  { id: 'office-vocabulary', prefix: 'xo', label: 'Office vocabulary', labelTamil: 'அலுவலகச் சொற்கள்', added: 100, batch: 2 },
  { id: 'emotions-vocabulary', prefix: 'xe', label: 'Emotions vocabulary', labelTamil: 'உணர்ச்சிச் சொற்கள்', added: 100, batch: 2 },
  { id: 'travel-vocabulary', prefix: 'xt', label: 'Travel vocabulary', labelTamil: 'பயணச் சொற்கள் (மேலும்)', added: 100, batch: 2 },
  { id: 'shopping-vocabulary', prefix: 'xs', label: 'Shopping vocabulary', labelTamil: 'கடை, வாங்குதல் சொற்கள்', added: 100, batch: 2 },
  { id: 'more-action-verbs', prefix: 'xv', label: 'More action verbs', labelTamil: 'மேலும் செயல் வினைகள்', added: 100, batch: 2 },
  { id: 'describing-words', prefix: 'xa', label: 'Describing words', labelTamil: 'விவரிக்கும் சொற்கள்', added: 100, batch: 2 },
  { id: 'communication-words', prefix: 'xc', label: 'Communication words', labelTamil: 'தொடர்புச் சொற்கள்', added: 100, batch: 2 },
  { id: 'technology-words', prefix: 'xk', label: 'Technology words', labelTamil: 'தொழில்நுட்பச் சொற்கள்', added: 100, batch: 2 },
  { id: 'advanced-vocabulary', prefix: 'xz', label: 'Advanced vocabulary', labelTamil: 'மேம்பட்ட சொற்கள்', added: 100, batch: 2 },
  // ---- added later (item 14): 20 groups x 100 = exactly 2,000 more words ("batch: 3") ----
  { id: 'workplace-essentials', prefix: 'ya', label: 'Workplace essentials', labelTamil: 'பணியிட அடிப்படைச் சொற்கள்', added: 100, batch: 3 },
  { id: 'business-vocabulary', prefix: 'yb', label: 'Business vocabulary', labelTamil: 'வணிகச் சொற்கள்', added: 100, batch: 3 },
  { id: 'digital-life-words', prefix: 'yc', label: 'Digital life', labelTamil: 'டிஜிட்டல் வாழ்க்கை', added: 100, batch: 3 },
  { id: 'feelings-expressions', prefix: 'yd', label: 'Feelings and moods', labelTamil: 'உணர்வுகள், மனநிலை', added: 100, batch: 3 },
  { id: 'travel-and-tourism', prefix: 'ye', label: 'Travel and tourism', labelTamil: 'பயணம், சுற்றுலா', added: 100, batch: 3 },
  { id: 'money-and-shopping', prefix: 'yf', label: 'Money and shopping', labelTamil: 'பணம், கடைக்குச் செல்லுதல்', added: 100, batch: 3 },
  { id: 'health-and-fitness', prefix: 'yg', label: 'Health and fitness', labelTamil: 'உடல்நலம், உடற்பயிற்சி', added: 100, batch: 3 },
  { id: 'education-and-study', prefix: 'yh', label: 'Education and study', labelTamil: 'கல்வி, படிப்பு', added: 100, batch: 3 },
  { id: 'everyday-verbs', prefix: 'yi', label: 'Everyday verbs', labelTamil: 'அன்றாட வினைச்சொற்கள்', added: 100, batch: 3 },
  { id: 'useful-adjectives', prefix: 'yj', label: 'Useful adjectives', labelTamil: 'பயனுள்ள பெயரடைகள்', added: 100, batch: 3 },
  { id: 'phrasal-verbs-1', prefix: 'yk', label: 'Phrasal verbs 1', labelTamil: 'சொற்றொடர் வினைகள் 1', added: 100, batch: 3 },
  { id: 'phrasal-verbs-2', prefix: 'yl', label: 'Phrasal verbs 2', labelTamil: 'சொற்றொடர் வினைகள் 2', added: 100, batch: 3 },
  { id: 'idioms-1', prefix: 'ym', label: 'Idioms 1', labelTamil: 'மரபுத்தொடர்கள் 1', added: 100, batch: 3 },
  { id: 'idioms-2', prefix: 'yn', label: 'Idioms 2', labelTamil: 'மரபுத்தொடர்கள் 2', added: 100, batch: 3 },
  { id: 'advanced-words-2', prefix: 'yo', label: 'Advanced words 2', labelTamil: 'மேம்பட்ட சொற்கள் 2', added: 100, batch: 3 },
  { id: 'everyday-talk-words', prefix: 'yp', label: 'Everyday talk', labelTamil: 'அன்றாடப் பேச்சுச் சொற்கள்', added: 100, batch: 3 },
  { id: 'home-and-family-words', prefix: 'yq', label: 'Home and family', labelTamil: 'வீடு, குடும்பம்', added: 100, batch: 3 },
  { id: 'food-and-cooking', prefix: 'yr', label: 'Food and cooking', labelTamil: 'உணவு, சமையல்', added: 100, batch: 3 },
  { id: 'social-life-words', prefix: 'ys', label: 'Social life', labelTamil: 'சமூக வாழ்க்கை', added: 100, batch: 3 },
  { id: 'news-and-society', prefix: 'yt', label: 'News and society', labelTamil: 'செய்தி, சமூகம்', added: 100, batch: 3 },
];
export const SENTENCE_CATEGORIES = [
  { id: 'daily-conversation', prefix: 'dc', label: 'Daily conversation', labelTamil: 'அன்றாட உரையாடல்' },
  { id: 'office-communication', prefix: 'oc', label: 'Office communication', labelTamil: 'அலுவலக தொடர்பு' },
  { id: 'interview-answers', prefix: 'ia', label: 'Interview answers', labelTamil: 'நேர்காணல் பதில்கள்' },
  { id: 'requesting-help', prefix: 'rh', label: 'Requesting help', labelTamil: 'உதவி கேட்டல்' },
  { id: 'technical-issues', prefix: 'ti', label: 'Explaining technical issues', labelTamil: 'தொழில்நுட்பச் சிக்கல்களை விளக்குதல்' },
  { id: 'asking-questions', prefix: 'aq', label: 'Asking questions', labelTamil: 'கேள்விகள் கேட்டல்' },
  { id: 'professional-communication', prefix: 'pc', label: 'Professional communication', labelTamil: 'தொழில்முறை தொடர்பு' },
  // ---- added later (item 12): 12 groups = exactly 500 new sentences; each also needs "explain" and "words" ----
  { id: 'daily-talk', prefix: 'kd', label: 'Daily conversations', labelTamil: 'அன்றாட உரையாடல்கள்', added: 42 },
  { id: 'home-family', prefix: 'kh', label: 'Home and family', labelTamil: 'வீடும் குடும்பமும்', added: 42 },
  { id: 'workplace', prefix: 'kw', label: 'Office and workplace', labelTamil: 'அலுவலகம், பணியிடம்', added: 42 },
  { id: 'shopping', prefix: 'ks', label: 'Shopping', labelTamil: 'பொருட்கள் வாங்குதல்', added: 42 },
  { id: 'travel-transport', prefix: 'kt', label: 'Travel and transportation', labelTamil: 'பயணம், போக்குவரத்து', added: 42 },
  { id: 'restaurants-food', prefix: 'kf', label: 'Restaurants and food', labelTamil: 'உணவகம், உணவு', added: 42 },
  { id: 'phone-calls', prefix: 'kp', label: 'Phone conversations', labelTamil: 'தொலைபேசி உரையாடல்', added: 42 },
  { id: 'friends-relationships', prefix: 'kr', label: 'Friends and relationships', labelTamil: 'நண்பர்கள், உறவுகள்', added: 42 },
  { id: 'feelings-emotions', prefix: 'ke', label: 'Feelings and emotions', labelTamil: 'உணர்வுகள்', added: 41 },
  { id: 'questions-answers', prefix: 'kq', label: 'Questions and answers', labelTamil: 'கேள்வி பதில்', added: 41 },
  { id: 'tenses-practice', prefix: 'kn', label: 'Past, present and future', labelTamil: 'இறந்த, நிகழ், எதிர்காலம்', added: 41 },
  { id: 'common-mistakes', prefix: 'km', label: 'Common English mistakes', labelTamil: 'பொதுவான ஆங்கிலத் தவறுகள்', added: 41 },
  // ---- added later (item 14): 20 groups x 100 = exactly 2,000 more sentences ("batch: 3"); each also needs usage, leelaQ and answer ----
  { id: 'daily-routines', prefix: 'ja', label: 'Daily routines', labelTamil: 'அன்றாடப் பழக்கங்கள்', added: 100, batch: 3 },
  { id: 'natural-conversations', prefix: 'jb', label: 'Natural conversations', labelTamil: 'இயல்பான உரையாடல்கள்', added: 100, batch: 3 },
  { id: 'workplace-discussions', prefix: 'jc', label: 'Workplace discussions', labelTamil: 'பணியிட விவாதங்கள்', added: 100, batch: 3 },
  { id: 'job-interviews', prefix: 'jd', label: 'Job interviews', labelTamil: 'வேலை நேர்காணல்', added: 100, batch: 3 },
  { id: 'travel-situations', prefix: 'je', label: 'Travel situations', labelTamil: 'பயணச் சூழல்கள்', added: 100, batch: 3 },
  { id: 'shopping-situations', prefix: 'jf', label: 'Shopping situations', labelTamil: 'கடைச் சூழல்கள்', added: 100, batch: 3 },
  { id: 'social-situations', prefix: 'jg', label: 'Social situations', labelTamil: 'சமூகச் சூழல்கள்', added: 100, batch: 3 },
  { id: 'everyday-questions', prefix: 'jh', label: 'Everyday questions', labelTamil: 'அன்றாடக் கேள்விகள்', added: 100, batch: 3 },
  { id: 'giving-answers', prefix: 'ji', label: 'Giving answers', labelTamil: 'பதில் சொல்லுதல்', added: 100, batch: 3 },
  { id: 'grammar-in-use', prefix: 'jj', label: 'Grammar in use', labelTamil: 'இலக்கணப் பயன்பாடு', added: 100, batch: 3 },
  { id: 'advanced-communication', prefix: 'jk', label: 'Advanced communication', labelTamil: 'மேம்பட்ட தொடர்பு', added: 100, batch: 3 },
  { id: 'health-and-doctor', prefix: 'jl', label: 'Health and the doctor', labelTamil: 'உடல்நலம், மருத்துவர்', added: 100, batch: 3 },
  { id: 'education-and-study-talk', prefix: 'jm', label: 'Education and study', labelTamil: 'கல்வி, படிப்பு', added: 100, batch: 3 },
  { id: 'money-and-banking', prefix: 'jn', label: 'Money and banking', labelTamil: 'பணம், வங்கி', added: 100, batch: 3 },
  { id: 'technology-talk', prefix: 'jo', label: 'Technology talk', labelTamil: 'தொழில்நுட்பப் பேச்சு', added: 100, batch: 3 },
  { id: 'opinions-and-agreeing', prefix: 'jp', label: 'Opinions and agreeing', labelTamil: 'கருத்துகள், உடன்படுதல்', added: 100, batch: 3 },
  { id: 'problems-and-solutions', prefix: 'jq', label: 'Problems and solutions', labelTamil: 'சிக்கல்களும் தீர்வுகளும்', added: 100, batch: 3 },
  { id: 'plans-and-invitations', prefix: 'jr', label: 'Plans and invitations', labelTamil: 'திட்டங்கள், அழைப்புகள்', added: 100, batch: 3 },
  { id: 'polite-requests', prefix: 'js', label: 'Polite requests', labelTamil: 'பணிவான கோரிக்கைகள்', added: 100, batch: 3 },
  { id: 'storytelling-past', prefix: 'jt', label: 'Telling past events', labelTamil: 'கடந்த நிகழ்வுகள்', added: 100, batch: 3 },
];
const POS = ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection', 'phrasal verb', 'phrase'];
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const TENSES = ['present', 'present-continuous', 'past', 'future', 'present-perfect', 'modal', 'imperative'];
const TYPES = ['statement', 'question', 'negative', 'request'];
const GRAMMAR_TOPICS = ['tense', 'question', 'negative', 'modal', 'other'];
const RP_GROUPS = ['office-meeting', 'interview', 'everyday'];

// Minimum sizes the finished dataset must reach (the user's requirements).
const MIN = { vocabTotal: 2000, sentenceTotal: 1000, sentencePerCategory: 140, alternatives: 250,
  perTense: { present: 150, past: 150, future: 150 }, questions: 200, negatives: 150,
  grammar: 12, roleplays: 12, expressions: 60 };

const TAMIL = /[஀-௿]/;
const words = (s) => s.trim().split(/\s+/).filter(Boolean);

// ---------- validators: each returns a list of problem strings ----------
function checkText(o, key, problems, where, { tamil = false, min = 1, max = 400 } = {}) {
  const v = o[key];
  if (typeof v !== 'string' || v.trim() !== v || v.length < min || v.length > max) {
    problems.push(`${where}: "${key}" must be a trimmed string (${min}-${max} chars)`);
    return;
  }
  if (/[\u0000-\u001f]/.test(v)) problems.push(`${where}: "${key}" has control characters`);
  if (tamil && !TAMIL.test(v)) problems.push(`${where}: "${key}" must be written in Tamil script`);
}
function noExtraKeys(o, allowed, problems, where) {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) problems.push(`${where}: unknown key "${k}"`);
}
function stemOf(word) {
  let w = word.toLowerCase().split(/[\s-]+/)[0];
  if (w.length > 4 && w.endsWith('e')) w = w.slice(0, -1);
  else if (w.length > 3 && w.endsWith('y')) w = w.slice(0, -1);
  return w;
}

export function checkVocab(e, where, opts = {}) {
  const p = [];
  if (!e || typeof e !== 'object' || Array.isArray(e)) return [`${where}: not an object`];
  noExtraKeys(e, ['word', 'meaning', 'tamil', 'pos', 'pron', 'example', 'exampleTamil', 'synonyms', 'level'], p, where);
  if (opts.needMeaning) {
    checkText(e, 'meaning', p, where, { min: 6, max: 110 });
    if (typeof e.meaning === 'string' && TAMIL.test(e.meaning)) p.push(`${where}: meaning must be English`);
  } else if (e.meaning !== undefined) checkText(e, 'meaning', p, where, { max: 110 });
  checkText(e, 'word', p, where, { max: 30 });
  if (typeof e.word === 'string') {
    if (!/^[a-z][a-z'-]*( [a-z][a-z'-]*){0,2}$/.test(e.word)) p.push(`${where}: word "${e.word}" must be lowercase letters, 1-3 tokens`);
  }
  checkText(e, 'tamil', p, where, { tamil: true, max: 90 });
  if (!POS.includes(e.pos)) p.push(`${where}: pos must be one of ${POS.join('|')}`);
  checkText(e, 'pron', p, where, { max: 40 });
  if (typeof e.pron === 'string' && !/^[A-Za-z'’ -]+$/.test(e.pron)) p.push(`${where}: pron "${e.pron}" must use letters, '-' and spaces only`);
  if (typeof e.pron === 'string' && !/[A-Z]{2,}|^[A-Z]+$|[A-Z]{1}[a-z]*-?[a-z]*/.test(e.pron)) p.push(`${where}: pron needs a CAPITAL stressed syllable`);
  checkText(e, 'example', p, where, { max: 140 });
  checkText(e, 'exampleTamil', p, where, { tamil: true, max: 220 });
  if (typeof e.example === 'string') {
    const n = words(e.example).length;
    if (n < 4 || n > 18) p.push(`${where}: example must have 4-18 words (has ${n})`);
    if (!/[.?!]$/.test(e.example)) p.push(`${where}: example must end with . ? or !`);
    if (typeof e.word === 'string') {
      const stem = stemOf(e.word);
      if (!new RegExp(`(^|[^a-z])${stem.replace(/[^a-z'-]/g, '')}[a-z']*`, 'i').test(e.example)) {
        p.push(`${where}: example must contain "${e.word}" (or a regular form starting with "${stem}")`);
      }
    }
  }
  if (!Array.isArray(e.synonyms) || e.synonyms.length < 1 || e.synonyms.length > 4 ||
      e.synonyms.some((s) => typeof s !== 'string' || !s.trim() || s.length > 30 || TAMIL.test(s))) {
    p.push(`${where}: synonyms must be 1-4 short English strings`);
  } else if (e.synonyms.some((s) => s.toLowerCase() === e.word)) p.push(`${where}: a word cannot be its own synonym`);
  if (!LEVELS.includes(e.level)) p.push(`${where}: level must be ${LEVELS.join('|')}`);
  return p;
}

export function checkSentence(e, where, opts = {}) {
  const p = [];
  if (!e || typeof e !== 'object' || Array.isArray(e)) return [`${where}: not an object`];
  noExtraKeys(e, ['en', 'tamil', 'context', 'tense', 'type', 'alt', 'explain', 'words', 'usage', 'leelaQ', 'answer'], p, where);
  if (opts.needExtras) {
    checkText(e, 'explain', p, where, { min: 15, max: 190 });
    if (typeof e.explain === 'string' && TAMIL.test(e.explain)) p.push(`${where}: explain must be simple English`);
    if (!Array.isArray(e.words) || e.words.length < 1 || e.words.length > 4 || e.words.some((w) => typeof w !== 'string' || !/^[a-z][a-z' -]{1,24}$/.test(w))) p.push(`${where}: words must be 1-4 lowercase English words`);
    else if (typeof e.en === 'string') {
      const low = e.en.toLowerCase();
      for (const w of e.words) if (!low.includes(stemOf(w))) p.push(`${where}: vocabulary word "${w}" does not appear in the sentence`);
    }
  } else if (e.explain !== undefined || e.words !== undefined) p.push(`${where}: explain/words are only for the newer sentence groups`);
  if (opts.needLeela) {
    checkText(e, 'usage', p, where, { min: 15, max: 130 });
    checkText(e, 'leelaQ', p, where, { min: 8, max: 120 });
    checkText(e, 'answer', p, where, { min: 6, max: 170 });
    for (const k of ['usage', 'leelaQ', 'answer']) if (typeof e[k] === 'string' && TAMIL.test(e[k])) p.push(`${where}: ${k} must be English`);
    if (typeof e.leelaQ === 'string' && !e.leelaQ.endsWith('?')) p.push(`${where}: leelaQ must be a question ending with "?"`);
    if (typeof e.answer === 'string' && !/[.?!]$/.test(e.answer)) p.push(`${where}: answer must end with . ? or !`);
    if (typeof e.answer === 'string' && words(e.answer).length < 3) p.push(`${where}: answer must be a full sentence`);
    if (typeof e.leelaQ === 'string' && e.leelaQ === e.en) p.push(`${where}: leelaQ must differ from the sentence`);
  } else if (e.usage !== undefined || e.leelaQ !== undefined || e.answer !== undefined) p.push(`${where}: usage/leelaQ/answer are only for the item-14 sentence groups`);
  checkText(e, 'en', p, where, { max: 170 });
  checkText(e, 'tamil', p, where, { tamil: true, max: 260 });
  checkText(e, 'context', p, where, { max: 110 });
  if (typeof e.context === 'string' && TAMIL.test(e.context)) p.push(`${where}: context must be English`);
  if (!TENSES.includes(e.tense)) p.push(`${where}: tense must be ${TENSES.join('|')}`);
  if (!TYPES.includes(e.type)) p.push(`${where}: type must be ${TYPES.join('|')}`);
  if (typeof e.en === 'string') {
    const n = words(e.en).length;
    if (n < 3 || n > 22) p.push(`${where}: en must have 3-22 words (has ${n})`);
    if (!/[.?!]$/.test(e.en)) p.push(`${where}: en must end with . ? or !`);
    if (TAMIL.test(e.en)) p.push(`${where}: en contains Tamil`);
    if (e.type === 'question' && !e.en.endsWith('?')) p.push(`${where}: a question must end with "?" -> ${e.en}`);
    if (e.type === 'negative' && !/\b(not|never|no|nothing|nobody|nowhere|none|neither|nor|cannot)\b|n['’]t/i.test(e.en)) {
      p.push(`${where}: a negative sentence needs a negative word -> ${e.en}`);
    }
    if (e.type !== 'question' && e.type !== 'request' && e.en.endsWith('?')) p.push(`${where}: sentence ends with "?" but type is ${e.type} -> ${e.en}`);
    if (e.tense === 'future' && !/\b(will|shall|going to)\b|['’]ll\b|won['’]t/i.test(e.en)) p.push(`${where}: future needs will/'ll/going to -> ${e.en}`);
  }
  if (e.alt !== undefined) {
    if (!e.alt || typeof e.alt !== 'object') p.push(`${where}: alt must be an object`);
    else {
      noExtraKeys(e.alt, ['en', 'tamil'], p, `${where}.alt`);
      checkText(e.alt, 'en', p, `${where}.alt`, { max: 170 });
      checkText(e.alt, 'tamil', p, `${where}.alt`, { tamil: true, max: 260 });
      if (e.alt.en === e.en) p.push(`${where}: alt.en is identical to en`);
    }
  }
  return p;
}

export function checkGrammar(g, where) {
  const p = [];
  noExtraKeys(g, ['id', 'title', 'titleTamil', 'topic', 'tense', 'summary', 'summaryTamil', 'formula', 'uses', 'examples', 'mistakes'], p, where);
  if (!/^[a-z][a-z0-9-]*$/.test(g.id ?? '')) p.push(`${where}: id must be a kebab-case slug`);
  checkText(g, 'title', p, where, { max: 70 });
  checkText(g, 'titleTamil', p, where, { tamil: true, max: 90 });
  if (!GRAMMAR_TOPICS.includes(g.topic)) p.push(`${where}: topic must be ${GRAMMAR_TOPICS.join('|')}`);
  if (g.tense !== undefined && !TENSES.includes(g.tense)) p.push(`${where}: bad tense`);
  checkText(g, 'summary', p, where, { max: 400 });
  checkText(g, 'summaryTamil', p, where, { tamil: true, max: 600 });
  checkText(g, 'formula', p, where, { max: 160 });
  const pairs = (arr, key, min, max, extra) => {
    if (!Array.isArray(arr) || arr.length < min || arr.length > max) { p.push(`${where}: ${key} needs ${min}-${max} items`); return; }
    arr.forEach((x, i) => extra(x, `${where}.${key}[${i}]`));
  };
  pairs(g.uses, 'uses', 2, 5, (x, w) => { noExtraKeys(x, ['en', 'tamil'], p, w); checkText(x, 'en', p, w, { max: 220 }); checkText(x, 'tamil', p, w, { tamil: true, max: 300 }); });
  pairs(g.examples, 'examples', 5, 9, (x, w) => { noExtraKeys(x, ['en', 'tamil'], p, w); checkText(x, 'en', p, w, { max: 170 }); checkText(x, 'tamil', p, w, { tamil: true, max: 260 }); });
  pairs(g.mistakes, 'mistakes', 2, 5, (x, w) => { noExtraKeys(x, ['wrong', 'right', 'noteTamil'], p, w); checkText(x, 'wrong', p, w, { max: 170 }); checkText(x, 'right', p, w, { max: 170 }); checkText(x, 'noteTamil', p, w, { tamil: true, max: 300 }); });
  return p;
}

export function checkRoleplay(r, where) {
  const p = [];
  noExtraKeys(r, ['id', 'title', 'titleTamil', 'group', 'level', 'setting', 'settingTamil', 'turns'], p, where);
  if (!/^[a-z][a-z0-9-]*$/.test(r.id ?? '')) p.push(`${where}: id must be a kebab-case slug`);
  checkText(r, 'title', p, where, { max: 70 });
  checkText(r, 'titleTamil', p, where, { tamil: true, max: 90 });
  if (!RP_GROUPS.includes(r.group)) p.push(`${where}: group must be ${RP_GROUPS.join('|')}`);
  if (!LEVELS.includes(r.level)) p.push(`${where}: level must be ${LEVELS.join('|')}`);
  checkText(r, 'setting', p, where, { max: 300 });
  checkText(r, 'settingTamil', p, where, { tamil: true, max: 450 });
  if (!Array.isArray(r.turns) || r.turns.length < 5 || r.turns.length > 9) { p.push(`${where}: turns needs 5-9 items`); return p; }
  r.turns.forEach((t, i) => {
    const w = `${where}.turns[${i}]`;
    noExtraKeys(t, ['partner', 'replies', 'tipTamil'], p, w);
    if (!t.partner) { p.push(`${w}: partner missing`); return; }
    noExtraKeys(t.partner, ['en', 'tamil'], p, `${w}.partner`);
    checkText(t.partner, 'en', p, `${w}.partner`, { max: 220 });
    checkText(t.partner, 'tamil', p, `${w}.partner`, { tamil: true, max: 320 });
    const last = i === r.turns.length - 1;
    if (!Array.isArray(t.replies)) { p.push(`${w}: replies must be an array`); return; }
    if (last ? t.replies.length !== 0 : (t.replies.length < 2 || t.replies.length > 3)) {
      p.push(`${w}: ${last ? 'the final turn is the partner closing line and must have replies: []' : 'needs 2-3 replies'}`);
    }
    t.replies.forEach((x, j) => {
      const ww = `${w}.replies[${j}]`;
      noExtraKeys(x, ['en', 'tamil'], p, ww);
      checkText(x, 'en', p, ww, { max: 200 });
      checkText(x, 'tamil', p, ww, { tamil: true, max: 300 });
      if (typeof x.en === 'string' && words(x.en).length > 22) p.push(`${ww}: reply is too long to say aloud (max 22 words)`);
    });
    if (t.tipTamil !== undefined) checkText(t, 'tipTamil', p, w, { tamil: true, max: 300 });
  });
  return p;
}

export function checkExpression(x, where) {
  const p = [];
  noExtraKeys(x, ['plain', 'better', 'tamil', 'exampleBefore', 'exampleAfter'], p, where);
  checkText(x, 'plain', p, where, { max: 40 });
  if (typeof x.plain === 'string' && !/^[a-z][a-z' -]*$/.test(x.plain)) p.push(`${where}: plain must be a lowercase phrase`);
  if (!Array.isArray(x.better) || x.better.length < 1 || x.better.length > 4 || x.better.some((b) => typeof b !== 'string' || !b.trim())) p.push(`${where}: better must be 1-4 strings`);
  checkText(x, 'tamil', p, where, { tamil: true, max: 300 });
  checkText(x, 'exampleBefore', p, where, { max: 140 });
  checkText(x, 'exampleAfter', p, where, { max: 140 });
  if (typeof x.exampleBefore === 'string' && typeof x.plain === 'string' && !x.exampleBefore.toLowerCase().includes(x.plain)) {
    p.push(`${where}: exampleBefore must contain the phrase "${x.plain}"`);
  }
  return p;
}

// ---------- file helpers ----------
function readJson(file, problems) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    problems.push(`${path.relative(root, file)}: cannot read JSON (${err.message})`);
    return undefined;
  }
}
function partFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })).map((f) => path.join(dir, f));
}
function shapeCheckerFor(file) {
  const rel = path.relative(SRC, path.resolve(file)).split(path.sep);
  if (rel[0] === 'vocab') return { fn: checkVocab, list: true };
  if (rel[0] === 'sentences') return { fn: checkSentence, list: true };
  if (rel[0] === 'grammar.json') return { fn: checkGrammar, list: true };
  if (rel[0] === 'roleplays.json') return { fn: checkRoleplay, list: true };
  if (rel[0] === 'expressions.json') return { fn: checkExpression, list: true };
  return undefined;
}

// ---------- main ----------
function main() {
  const args = process.argv.slice(2);
  const problems = [];

  const fi = args.indexOf('--file');
  if (fi >= 0) {
    const file = args[fi + 1];
    const sc = shapeCheckerFor(file);
    if (!sc) { console.error('Not a recognised data-src file: ' + file); process.exit(2); }
    const data = readJson(file, problems);
    if (Array.isArray(data)) {
      const relp = path.relative(SRC, path.resolve(file)).split(path.sep);
      const catDef = (relp[0] === 'vocab' ? VOCAB_CATEGORIES : SENTENCE_CATEGORIES).find((c) => c.id === relp[1]);
      const fopts = { needMeaning: !!catDef?.added, needExtras: !!catDef?.added, needLeela: catDef?.batch === 3 };
      data.forEach((e, i) => problems.push(...sc.fn(e, `${path.basename(file)}[${i}]${e && (e.word || e.en || e.id || e.plain) ? ' ' + (e.word || e.en || e.id || e.plain) : ''}`, fopts)));
      const key = data[0] && (data[0].word !== undefined ? 'word' : data[0].en !== undefined ? 'en' : data[0].id !== undefined ? 'id' : 'plain');
      const seen = new Set();
      data.forEach((e) => { const k = String(e?.[key]).toLowerCase(); if (seen.has(k)) problems.push(`duplicate inside file: ${k}`); seen.add(k); });
    } else if (data !== undefined) problems.push('file must contain a JSON array');
    report(problems, data?.length ?? 0, `entries in ${path.basename(file)}`);
    return;
  }

  const checkOnly = args.includes('--check');
  const stats = {};
  const out = { vocab: {}, sentences: {} };

  // vocabulary
  const seenWords = new Map();
  let multiToken = 0;
  for (const cat of VOCAB_CATEGORIES) {
    const entries = [];
    for (const f of partFiles(path.join(SRC, 'vocab', cat.id))) {
      const data = readJson(f, problems);
      if (!Array.isArray(data)) { if (data !== undefined) problems.push(`${path.relative(root, f)}: must be an array`); continue; }
      data.forEach((e, i) => {
        const where = `${path.relative(SRC, f)}[${i}] ${e?.word ?? ''}`;
        const errs = checkVocab(e, where, { needMeaning: !!cat.added });
        if (errs.length) { problems.push(...errs); return; }
        const prev = seenWords.get(e.word);
        if (prev) { problems.push(`${where}: duplicate word "${e.word}" (also in ${prev})`); return; }
        seenWords.set(e.word, cat.id);
        if (e.word.includes(' ') || e.word.includes('-')) multiToken++;
        entries.push(e);
      });
    }
    const order = { beginner: 0, intermediate: 1, advanced: 2 };
    // easiest first (stable), so daily lessons start simple
    const sorted = entries.map((e, i) => ({ e, i })).sort((a, b) => order[a.e.level] - order[b.e.level] || a.i - b.i).map((x) => x.e);
    out.vocab[cat.id] = sorted.map((e, i) => ({ id: `${cat.prefix}${String(i + 1).padStart(3, '0')}`, ...e }));
    stats['vocab/' + cat.id] = sorted.length;
  }
  const vocabTotal = Object.values(out.vocab).reduce((n, a) => n + a.length, 0);

  // sentences
  const seenSent = new Map();
  const tally = { present: 0, past: 0, future: 0, question: 0, negative: 0, alt: 0 };
  for (const cat of SENTENCE_CATEGORIES) {
    const entries = [];
    for (const f of partFiles(path.join(SRC, 'sentences', cat.id))) {
      const data = readJson(f, problems);
      if (!Array.isArray(data)) { if (data !== undefined) problems.push(`${path.relative(root, f)}: must be an array`); continue; }
      data.forEach((e, i) => {
        const where = `${path.relative(SRC, f)}[${i}]`;
        const errs = checkSentence(e, where, { needExtras: !!cat.added, needLeela: cat.batch === 3 });
        if (errs.length) { problems.push(...errs); return; }
        const key = e.en.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        if (seenSent.has(key)) { problems.push(`${where}: duplicate sentence "${e.en}" (also in ${seenSent.get(key)})`); return; }
        seenSent.set(key, cat.id);
        entries.push(e);
        if (e.tense === 'present' || e.tense === 'present-continuous') tally.present++;
        if (e.tense === 'past') tally.past++;
        if (e.tense === 'future') tally.future++;
        if (e.type === 'question') tally.question++;
        if (e.type === 'negative') tally.negative++;
        if (e.alt) tally.alt++;
      });
    }
    out.sentences[cat.id] = entries.map((e, i) => ({ id: `${cat.prefix}${String(i + 1).padStart(3, '0')}`, ...e }));
    stats['sentences/' + cat.id] = entries.length;
  }
  const sentenceTotal = Object.values(out.sentences).reduce((n, a) => n + a.length, 0);

  // grammar, roleplays, expressions
  const grammar = loadList('grammar.json', checkGrammar, 'id', problems);
  const roleplays = loadList('roleplays.json', checkRoleplay, 'id', problems);
  const expressions = loadList('expressions.json', checkExpression, 'plain', problems);

  // overall requirements (only enforced for a full build)
  const need = (cond, msg) => { if (!cond) problems.push('REQUIREMENT NOT MET: ' + msg); };
  need(vocabTotal >= MIN.vocabTotal, `vocabulary has ${vocabTotal}, needs ${MIN.vocabTotal}`);
  need(sentenceTotal >= MIN.sentenceTotal, `sentences ${sentenceTotal}, needs ${MIN.sentenceTotal}`);
  for (const c of SENTENCE_CATEGORIES.filter((x) => !x.added)) need(out.sentences[c.id].length >= MIN.sentencePerCategory, `sentences/${c.id} has ${out.sentences[c.id].length}, needs ${MIN.sentencePerCategory}`);
  for (const c of VOCAB_CATEGORIES.filter((x) => !x.added)) need(out.vocab[c.id].length >= 200, `vocab/${c.id} has ${out.vocab[c.id].length}, needs at least 200`);
  for (const c of [...VOCAB_CATEGORIES.map((x) => ['vocab', x]), ...SENTENCE_CATEGORIES.map((x) => ['sentences', x])]) {
    const [kind, cat] = c;
    if (cat.added) need(out[kind][cat.id].length === cat.added, `${kind}/${cat.id} has ${out[kind][cat.id].length}, must be exactly ${cat.added}`);
  }
  need(VOCAB_CATEGORIES.filter((x) => x.added && !x.batch).reduce((n, x) => n + out.vocab[x.id].length, 0) === 500, 'the first new vocabulary batch must total exactly 500');
  need(VOCAB_CATEGORIES.filter((x) => x.batch === 2).reduce((n, x) => n + out.vocab[x.id].length, 0) === 1000, 'the second new vocabulary batch must total exactly 1,000');
  need(SENTENCE_CATEGORIES.filter((x) => x.added && !x.batch).reduce((n, x) => n + out.sentences[x.id].length, 0) === 500, 'the first new sentence batch must total exactly 500');
  need(VOCAB_CATEGORIES.filter((x) => x.batch === 3).reduce((n, x) => n + out.vocab[x.id].length, 0) === 2000, 'the third new vocabulary batch must total exactly 2,000');
  need(SENTENCE_CATEGORIES.filter((x) => x.batch === 3).reduce((n, x) => n + out.sentences[x.id].length, 0) === 2000, 'the third new sentence batch must total exactly 2,000');
  checkAgainstDb(out, problems);
  need(tally.alt >= MIN.alternatives, `only ${tally.alt} sentences have an "alt", needs ${MIN.alternatives}`);
  for (const [t, n] of Object.entries(MIN.perTense)) need(tally[t] >= n, `${t} tense sentences: ${tally[t]}, needs ${n}`);
  need(tally.question >= MIN.questions, `question sentences: ${tally.question}, needs ${MIN.questions}`);
  need(tally.negative >= MIN.negatives, `negative sentences: ${tally.negative}, needs ${MIN.negatives}`);
  need(grammar.length >= MIN.grammar, `grammar lessons: ${grammar.length}, needs ${MIN.grammar}`);
  need(roleplays.length >= MIN.roleplays, `role-plays: ${roleplays.length}, needs ${MIN.roleplays}`);
  for (const g of RP_GROUPS) need(roleplays.filter((r) => r.group === g).length >= 3, `role-play group ${g} needs at least 3`);
  need(expressions.length >= MIN.expressions, `expressions: ${expressions.length}, needs ${MIN.expressions}`);

  Object.assign(stats, { 'vocab TOTAL': vocabTotal, 'vocab multi-word/hyphenated': multiToken, 'sentences TOTAL': sentenceTotal,
    ...Object.fromEntries(Object.entries(tally).map(([k, v]) => ['sentences ' + k, v])),
    grammar: grammar.length, roleplays: roleplays.length, expressions: expressions.length });
  console.table(stats);

  if (!problems.length && !checkOnly) {
    // db.json (Lela's data, copied by sync-db.mjs) lives in the same folder: keep it.
    for (const name of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) if (name !== 'db.json') fs.rmSync(path.join(OUT, name), { recursive: true, force: true });
    fs.mkdirSync(path.join(OUT, 'vocab'), { recursive: true });
    fs.mkdirSync(path.join(OUT, 'sentences'), { recursive: true });
    const write = (rel, data) => fs.writeFileSync(path.join(OUT, rel), JSON.stringify(data));
    for (const c of VOCAB_CATEGORIES) write(`vocab/${c.id}.json`, out.vocab[c.id]);
    for (const c of SENTENCE_CATEGORIES) write(`sentences/${c.id}.json`, out.sentences[c.id]);
    write('grammar.json', grammar);
    write('roleplays.json', roleplays);
    write('expressions.json', expressions);
    const manifest = {
      version: new Date().toISOString().slice(0, 10),
      vocabCategories: VOCAB_CATEGORIES.map((c) => ({ ...c, file: `vocab/${c.id}.json`, count: out.vocab[c.id].length })),
      sentenceCategories: SENTENCE_CATEGORIES.map((c) => ({ ...c, file: `sentences/${c.id}.json`, count: out.sentences[c.id].length })),
      totals: { vocab: vocabTotal, sentences: sentenceTotal, grammar: grammar.length, roleplays: roleplays.length, expressions: expressions.length },
    };
    write('manifest.json', manifest);
    console.log(`Wrote ${path.relative(process.cwd(), OUT) || OUT}`);
  }
  report(problems, vocabTotal + sentenceTotal, 'vocabulary + sentences');
}

const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The newer groups must not repeat words or sentences that already exist in db.json (Lela's data). */
function checkAgainstDb(out, problems) {
  const file = path.join(root, 'db.json');
  if (!fs.existsSync(file)) return;
  let db;
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return; }
  // Words in the "vocab-x-*" topics are the item-13 batch itself (copied into db.json by add-vocab-batch2.mjs), not old content.
  const dbVocab = (db.vocabulary ?? []).filter((v) => !/^vocab-[xy]-/.test(String(v.topicId)));
  const oldWords = new Set(dbVocab.map((v) => String(v.word).toLowerCase()));
  const oldText = new Set();
  const add = (t) => { if (typeof t === 'string' && t.trim()) oldText.add(norm(t)); };
  for (const c of db.conversations ?? []) { add(c.en); add(c.reply); }
  for (const q of db.questions ?? []) { add(q.text); add(q.example); }
  for (const d of db.dialogues ?? []) for (const t of d.turns ?? []) { add(t.lela); add(t.example); }
  for (const v of dbVocab) add(v.example);
  for (const ph of db.phrases ?? []) add(ph.text);
  for (const cat of VOCAB_CATEGORIES.filter((x) => x.added)) {
    for (const w of out.vocab[cat.id]) if (oldWords.has(w.word)) problems.push(`vocab/${cat.id}: "${w.word}" already exists in db.json vocabulary`);
  }
  for (const cat of SENTENCE_CATEGORIES.filter((x) => x.added)) {
    for (const x of out.sentences[cat.id]) if (oldText.has(norm(x.en))) problems.push(`sentences/${cat.id}: "${x.en}" already exists in db.json`);
  }
}

function loadList(name, fn, key, problems) {
  const data = readJson(path.join(SRC, name), problems);
  if (!Array.isArray(data)) { if (data !== undefined) problems.push(`${name}: must be an array`); return []; }
  const seen = new Set();
  const good = [];
  data.forEach((e, i) => {
    const where = `${name}[${i}] ${e?.[key] ?? ''}`;
    const errs = fn(e ?? {}, where);
    if (errs.length) { problems.push(...errs); return; }
    if (seen.has(e[key])) { problems.push(`${where}: duplicate ${key}`); return; }
    seen.add(e[key]);
    good.push(e);
  });
  return good;
}

function report(problems, count, what) {
  if (problems.length) {
    const shown = problems.slice(0, 60);
    console.error(shown.join('\n'));
    if (problems.length > shown.length) console.error(`... and ${problems.length - shown.length} more`);
    console.error(`\n${problems.length} problem(s). ${count} ${what} read.`);
    process.exit(1);
  }
  console.log(`OK: ${count} ${what}, no problems.`);
}

// only run main when executed directly (the tests import the validators)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
