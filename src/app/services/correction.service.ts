import { Injectable } from '@angular/core';
import {
  CorrectionCategory,
  CorrectionChange,
  CorrectionIssue,
  CorrectionResult,
  LimitationNote,
} from '../models/chat.models';

/*
 * ENGLISH CORRECTION SERVICE: a transparent, RULE-BASED checker.
 *
 * It is NOT artificial intelligence. It does not understand meaning.
 * It only looks for the specific patterns written in the RULES list
 * below. Every rule has: a pattern, a fix, an English explanation,
 * a Tamil explanation and an example, so you can read exactly what
 * it does. A rule only changes a sentence when its pattern matches.
 */

type Groups = string[];

interface RuleContext {
  /** Text before the match (used to skip risky matches). */
  before: string;
  /** Text after the match. */
  after: string;
}

interface Rule {
  id: string;
  category: CorrectionCategory;
  /** Must have the "g" flag. */
  pattern: RegExp;
  /** Returns the replacement text, or null to leave this match alone. */
  fix: (g: Groups, ctx: RuleContext) => string | null;
  english: string;
  tamil: string;
  example: string;
}

// ---------------------------------------------------------------
// Word lists
// ---------------------------------------------------------------

/**
 * A dictionary with NO inherited keys. A normal object would answer "constructor" or
 * "toString" with a built-in function, so a typed word like "constructor" could be mistaken
 * for a verb and its text replaced by "function Object() { [native code] }".
 */
function dict(entries: Record<string, string>): Record<string, string> {
  return Object.assign(Object.create(null) as Record<string, string>, entries);
}

/** he/she/it form -> base form of the verb. */
const SG_TO_BASE = dict({
  goes: 'go', has: 'have', does: 'do', likes: 'like', wants: 'want', needs: 'need',
  plays: 'play', works: 'work', lives: 'live', knows: 'know', speaks: 'speak',
  studies: 'study', watches: 'watch', reads: 'read', writes: 'write', gets: 'get',
  makes: 'make', takes: 'take', gives: 'give', sees: 'see', loves: 'love',
  helps: 'help', thinks: 'think', comes: 'come', eats: 'eat', drinks: 'drink',
  sleeps: 'sleep', agrees: 'agree', disagrees: 'disagree', understands: 'understand',
  says: 'say', buys: 'buy', meets: 'meet', leaves: 'leave', finds: 'find',
  brings: 'bring', keeps: 'keep', starts: 'start', finishes: 'finish', stays: 'stay',
  walks: 'walk', believes: 'believe', hates: 'hate', teaches: 'teach', tries: 'try',
  uses: 'use',
});

const BASE_TO_SG = dict(
  Object.fromEntries(Object.entries(SG_TO_BASE).map(([sg, base]) => [base, sg]))
);

/** "read" looks the same in the past tense, so we never guess about it. */
const HE_VERBS = Object.values(SG_TO_BASE).filter((v) => v !== 'read');

/** base -> irregular past tense. */
const IRREGULAR_PAST = dict({
  go: 'went', come: 'came', eat: 'ate', see: 'saw', take: 'took', make: 'made',
  get: 'got', give: 'gave', buy: 'bought', meet: 'met', speak: 'spoke',
  write: 'wrote', drink: 'drank', sleep: 'slept', leave: 'left', find: 'found',
  bring: 'brought', keep: 'kept', say: 'said', tell: 'told', run: 'ran', sit: 'sat',
  stand: 'stood', begin: 'began', forget: 'forgot', pay: 'paid', send: 'sent',
  lose: 'lost', win: 'won', wear: 'wore', have: 'had', do: 'did', teach: 'taught',
  think: 'thought', know: 'knew',
});

const PAST_TO_BASE = dict(
  Object.fromEntries(Object.entries(IRREGULAR_PAST).map(([base, past]) => [past, base]))
);

/** Regular verbs the checker knows. Anything else is left alone. */
const REGULAR_VERBS = new Set([
  'play', 'work', 'watch', 'visit', 'call', 'talk', 'walk', 'study', 'learn', 'clean',
  'cook', 'help', 'wait', 'want', 'need', 'like', 'love', 'live', 'stay', 'start',
  'finish', 'open', 'close', 'ask', 'listen', 'use', 'try', 'stop', 'plan', 'agree',
  'enjoy', 'happen', 'look', 'move', 'change', 'believe', 'decide', 'arrive', 'show',
  'cry', 'dance', 'jump', 'miss', 'offer', 'order', 'pass', 'pick', 'rain', 'remember',
  'reply', 'return', 'save', 'smile', 'thank', 'touch', 'travel', 'turn', 'wash',
  'wish', 'wonder', 'answer', 'brush', 'carry', 'check', 'chat', 'climb', 'complete',
  'count', 'cover', 'create', 'discuss', 'drop', 'earn', 'end', 'explain', 'fill',
  'fix', 'follow', 'hate', 'hope', 'invite', 'join', 'laugh', 'mix', 'notice', 'paint',
  'park', 'practise', 'practice', 'prepare', 'promise', 'receive', 'relax', 'repeat',
  'rest', 'shout', 'shop', 'smell', 'taste', 'trust', 'type', 'vote', 'worry',
  'disagree', 'attend', 'celebrate', 'collect', 'continue', 'develop', 'improve',
]);

/** Verbs that are rarely used in the past just because of a time word. */
const TIME_RULE_SKIP = new Set([
  'have', 'do', 'think', 'know', 'like', 'love', 'hate', 'want', 'need', 'believe',
  'understand', 'agree', 'disagree', 'remember', 'wish', 'hope', 'wonder', 'trust',
]);

const DOUBLE_FINAL = new Set(['stop', 'plan', 'drop', 'chat', 'shop']);

const UNCOUNTABLE = ['information', 'advice', 'furniture', 'equipment', 'homework'];

const SINGULAR_TO_PLURAL = dict({
  friend: 'friends', brother: 'brothers', sister: 'sisters', teacher: 'teachers',
  colleague: 'colleagues', student: 'students', cousin: 'cousins', uncle: 'uncles',
  aunt: 'aunts', neighbour: 'neighbours', neighbor: 'neighbors', classmate: 'classmates',
  book: 'books', reason: 'reasons', way: 'ways', thing: 'things', place: 'places',
  day: 'days', man: 'men', woman: 'women', child: 'children', member: 'members',
});

const NEGATIVE_TO_POSITIVE = dict({
  no: 'any', nothing: 'anything', nobody: 'anybody', nowhere: 'anywhere', 'no one': 'anyone',
});

const ING_TO_BASE = dict({
  knowing: 'know', wanting: 'want', liking: 'like', needing: 'need',
  believing: 'believe', hating: 'hate',
});

const BASE_TO_ING = dict({
  go: 'going', come: 'coming', eat: 'eating', drink: 'drinking', sleep: 'sleeping',
  learn: 'learning', wait: 'waiting', sit: 'sitting', stand: 'standing', walk: 'walking',
  run: 'running', speak: 'speaking', listen: 'listening', watch: 'watching',
  work: 'working', play: 'playing', study: 'studying',
});

const CONTRACTIONS = dict({
  dont: "don't", doesnt: "doesn't", didnt: "didn't", cant: "can't", couldnt: "couldn't",
  wouldnt: "wouldn't", shouldnt: "shouldn't", isnt: "isn't", arent: "aren't",
  wasnt: "wasn't", werent: "weren't", havent: "haven't", hasnt: "hasn't",
  hadnt: "hadn't", im: "I'm", ive: "I've", youre: "you're", theyre: "they're",
  thats: "that's", whats: "what's",
});

/** Words that may be repeated on purpose, so we never flag them. */
const REPEAT_OK = new Set([
  'had', 'that', 'no', 'so', 'very', 'really', 'bye', 'ha', 'yes', 'well', 'there',
  'many', 'much', 'more', 'knock', 'blah',
]);

const AUXILIARY_BEFORE =
  /\b(?:did|does|do|don't|doesn't|didn't|will|would|can|could|should|may|might|must|shall|let|let's|is|are|am|was|were|has|have|had|to|please)\s+$/i;

const SUBJUNCTIVE_BEFORE =
  /\b(?:suggest|suggested|recommend|recommended|insist|insisted|demand|demanded|require|required|request|requested|ask|asked|wish)\s+(?:that\s+)?$/i;

const NOUN_BEFORE = /\b(?:the|a|an|my|your|his|her|their|our|its|free|last|strong|good)\s+$/i;

// Words that start with a vowel LETTER but a consonant SOUND ("university" = "yoo-...").
// "uni" is not used for "unidentified", "unimportant", "unintended" (they sound like "un-").
const VOWEL_LETTER_CONSONANT_SOUND = /^(uni(?![dmn])|unan|use|usu|uti|ura|uro|ubi|eu|one|once|ewe)/i;
// Words that start with a consonant LETTER but a vowel SOUND (silent "h").
const SILENT_H = /^(hour|honest|honou?r|heir)/i;
// "a herb" (UK) and "an herb" (US) are both used, so we never change it.
const EITHER_ARTICLE = /^herb/i;

const DAYS = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday';
const PAST_TIME =
  `yesterday|last\\s+(?:night|week|month|year|weekend|${DAYS})` +
  `|(?:\\d+|a|one|two|three|four|five|six|seven|eight|nine|ten)\\s+(?:days?|weeks?|months?|years?)\\s+ago`;

/** A tense rule must not reach across these words into another clause. */
const CLAUSE_WORDS = 'that|what|if|when|because|who|which|how|and|but|so|where|why|whether|while|until|before|after|than';

/** Abbreviations whose full stop does not end a sentence. */
const ABBREVIATION_BEFORE = /\b(?:e\.g|i\.e|etc|mr|mrs|ms|dr|vs|prof|st|no)$/i;

/** Text that starts like the rest of "i.e." or "e.g." (a full stop and one letter). */
const IS_ABBREVIATION_LETTER = /^\.[a-z]\b/i;

// ---------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------

const alt = (words: string[]): string => words.join('|');

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function toPast(base: string): string {
  const irregular = IRREGULAR_PAST[base];
  if (irregular) {
    return irregular;
  }
  if (base.endsWith('e')) {
    return base + 'd';
  }
  if (/[^aeiou]y$/.test(base)) {
    return base.slice(0, -1) + 'ied';
  }
  if (DOUBLE_FINAL.has(base)) {
    return base + base.charAt(base.length - 1) + 'ed';
  }
  return base + 'ed';
}

/** Past tense -> base form, only for verbs in our lists. */
function pastToBase(word: string): string | null {
  const w = word.toLowerCase();
  const irregular = PAST_TO_BASE[w];
  if (irregular) {
    return irregular;
  }
  if (!/[a-z]{2,}ed$/.test(w)) {
    return null;
  }
  const candidates = [
    w.slice(0, -2),
    w.slice(0, -1),
    w.endsWith('ied') ? w.slice(0, -3) + 'y' : '',
    w.slice(0, -3),
  ];
  for (const candidate of candidates) {
    if (candidate && REGULAR_VERBS.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** Past tense or he/she form -> base form. */
function toBaseForm(word: string): string | null {
  const lower = word.toLowerCase();
  return pastToBase(lower) ?? SG_TO_BASE[lower] ?? null;
}

/** Keeps a capital first letter if the original match had one. */
function matchCase(original: string, replacement: string): string {
  if (/^[A-Z]/.test(original) && /^[a-z]/.test(replacement)) {
    return capitalize(replacement);
  }
  return replacement;
}

function isSentenceStart(before: string): boolean {
  return before.trim() === '' || /[.!?]\s*$/.test(before);
}

// ---------------------------------------------------------------
// The rulebook. Rules run in this order.
// ---------------------------------------------------------------

const RULES: Rule[] = [
  // ----- Spelling and capital letters -----
  {
    id: 'missing-apostrophe',
    category: 'spelling',
    pattern: new RegExp(`\\b(${alt(Object.keys(CONTRACTIONS))})\\b`, 'gi'),
    fix: (g) => CONTRACTIONS[g[0].toLowerCase()] ?? null,
    english: `Short forms such as "don't" and "can't" need an apostrophe (').`,
    tamil: `"don't", "can't" போன்ற சுருக்க வடிவங்களில் ஒற்றை மேற்கோள் குறி (') இருக்க வேண்டும்.`,
    example: `I dont know → I don't know`,
  },
  {
    id: 'lowercase-i',
    category: 'capitalization',
    pattern: /\bi\b/g,
    fix: (_g, ctx) => (IS_ABBREVIATION_LETTER.test(ctx.after) ? null : 'I'), // leave "i.e." alone
    english: `Always write "I" as a capital letter.`,
    tamil: `"I" என்ற சொல்லை எப்போதும் பெரிய எழுத்தில் (capital letter) எழுத வேண்டும்.`,
    example: `i am happy → I am happy`,
  },
  {
    id: 'repeated-word',
    category: 'spelling',
    pattern: /\b([a-z]+)\s+\1\b/gi,
    fix: (g) => (REPEAT_OK.has(g[0].toLowerCase()) ? null : g[0]),
    english: `The same word was repeated. One is enough.`,
    tamil: `ஒரே சொல் தொடர்ந்து இரண்டு முறை வந்துள்ளது. ஒரு முறை மட்டும் போதும்.`,
    example: `the the book → the book`,
  },

  // ----- Plurals and countable / uncountable words -----
  {
    id: 'uncountable-plural',
    category: 'plurals',
    pattern: /\b(informations|advices|furnitures|equipments|homeworks|knowledges|luggages|baggages|childrens)\b/gi,
    fix: (g) => {
      const word = g[0].toLowerCase();
      return word === 'childrens' ? 'children' : word.slice(0, -1);
    },
    english: `These words have no plural form (for example "information", "advice"). "Children" is already plural.`,
    tamil: `"information", "advice", "furniture" போன்ற சொற்களை எண்ண முடியாது; அவற்றுக்கு "s" சேர்க்கக் கூடாது. "children" என்பதே ஏற்கெனவே பன்மை.`,
    example: `many informations → much information`,
  },
  {
    id: 'peoples',
    category: 'plurals',
    pattern: /\bpeoples\b/gi,
    fix: (_g, ctx) => (/\b(indigenous|native|first|different)\s+$/i.test(ctx.before) ? null : 'people'),
    english: `"People" is already plural, so do not add "s".`,
    tamil: `"people" என்பதே ஏற்கெனவே பன்மை. அதனுடன் "s" சேர்க்கக் கூடாது.`,
    example: `peoples are kind → people are kind`,
  },
  {
    id: 'uncountable-article',
    category: 'articles',
    pattern: new RegExp(
      `\\b(a|an)\\s+(${alt(UNCOUNTABLE)})(?=\\s+(?:about|on|for|from|to|of|in|that|which|and|but|please)\\b|\\s*[.!?,]|\\s*$)`,
      'gi'
    ),
    fix: (g) => `a piece of ${g[1].toLowerCase()}`,
    english: `You cannot count these words, so do not use "a" or "an". Say "a piece of ..." or "some ...".`,
    tamil: `இந்தச் சொற்களை எண்ண முடியாது; அதனால் "a / an" பயன்படுத்தக் கூடாது. "a piece of ..." அல்லது "some ..." என்று சொல்லலாம்.`,
    example: `an advice → a piece of advice`,
  },
  {
    id: 'one-of-plural',
    category: 'plurals',
    pattern: new RegExp(
      `\\b(one of (?:my|your|his|her|our|their|the|these|those))\\s+(${alt(Object.keys(SINGULAR_TO_PLURAL))})\\b`,
      'gi'
    ),
    fix: (g) => `${g[0]} ${SINGULAR_TO_PLURAL[g[1].toLowerCase()]}`,
    english: `After "one of my ..." use a plural word.`,
    tamil: `"one of my ..." என்பதற்குப் பிறகு பன்மை (plural) சொல் வர வேண்டும்.`,
    example: `one of my friend → one of my friends`,
  },
  {
    id: 'much-with-countable',
    category: 'word-choice',
    pattern: /\bmuch\s+(people|friends|books|students|things|cars|problems|questions|children|words|days|years|countries|boys|girls|ideas|mistakes)\b/gi,
    fix: (g) => `many ${g[0]}`,
    english: `Use "many" with things you can count (people, books). "Much" is for things you cannot count.`,
    tamil: `எண்ணக்கூடிய பொருட்களுக்கு (people, books) "many" பயன்படுத்த வேண்டும்; "much" அல்ல.`,
    example: `much people → many people`,
  },
  {
    id: 'many-with-uncountable',
    category: 'word-choice',
    pattern: /\bmany\s+(water|money|rice|milk|information|traffic|work|homework|food|sugar|tea|coffee|oil|knowledge|advice|luggage|furniture|equipment)\b/gi,
    fix: (g) => `much ${g[0]}`,
    english: `Use "much" with things you cannot count (water, money). "Many" is for things you can count.`,
    tamil: `எண்ண முடியாத பொருட்களுக்கு (water, money) "much" பயன்படுத்த வேண்டும்; "many" அல்ல.`,
    example: `many water → much water`,
  },
  {
    id: 'many-time',
    category: 'plurals',
    pattern: /\bmany\s+time\b/gi,
    fix: () => 'many times',
    english: `After "many", use a plural word: "many times".`,
    tamil: `"many" என்பதற்குப் பிறகு பன்மை சொல் வர வேண்டும்: "many times".`,
    example: `many time → many times`,
  },
  {
    id: 'a-lots-of',
    category: 'word-choice',
    pattern: /\b(a lots of|alot)\b/gi,
    fix: (g) => (g[0].toLowerCase() === 'alot' ? 'a lot' : 'a lot of'),
    english: `Say "a lot of" or "lots of". "A lots of" and "alot" are not correct.`,
    tamil: `"a lot of" அல்லது "lots of" என்று சொல்ல வேண்டும். "a lots of", "alot" தவறு.`,
    example: `a lots of friends → a lot of friends`,
  },
  {
    id: 'every-plural',
    category: 'plurals',
    pattern: /\bevery\s+(days|weeks|months|years|mornings|evenings|nights)\b/gi,
    fix: (g) => `every ${g[0].toLowerCase().slice(0, -1)}`,
    english: `After "every", use a singular word: "every day".`,
    tamil: `"every" என்பதற்குப் பிறகு ஒருமை (singular) சொல் வர வேண்டும்: "every day".`,
    example: `every days → every day`,
  },
  {
    id: 'double-comparative',
    category: 'word-choice',
    pattern: new RegExp(
      `\\b(?:more|most)\\s+(${alt([
        'better', 'bigger', 'faster', 'easier', 'cheaper', 'taller', 'smaller', 'older',
        'younger', 'stronger', 'harder', 'higher', 'lower', 'longer', 'shorter', 'nicer',
        'cleaner', 'colder', 'warmer', 'richer', 'happier', 'heavier', 'lighter', 'best',
        'biggest', 'fastest', 'easiest', 'cheapest', 'tallest', 'smallest', 'oldest',
        'youngest', 'strongest', 'hardest', 'highest', 'longest', 'shortest', 'nicest',
      ])})\\b`,
      'gi'
    ),
    fix: (g) => g[0],
    english: `Words like "better" or "taller" already mean "more", so do not add "more" or "most".`,
    tamil: `"better", "taller" போன்ற சொற்களிலேயே "மேலும்" என்ற பொருள் உள்ளது; அதற்கு முன் "more" / "most" சேர்க்கக் கூடாது.`,
    example: `more better → better`,
  },

  // ----- Tenses: a time word shows the sentence is in the past -----
  {
    id: 'past-time-at-start',
    category: 'tense',
    pattern: new RegExp(`\\b(${PAST_TIME})(,?)\\s+(I|you|we|they|he|she)\\s+([a-z]+)\\b`, 'gi'),
    fix: (g) => {
      const verb = g[3].toLowerCase();
      const base = SG_TO_BASE[verb] ?? verb;
      if (TIME_RULE_SKIP.has(base) || !(IRREGULAR_PAST[base] || REGULAR_VERBS.has(base))) {
        return null;
      }
      return `${g[0]}${g[1]} ${g[2]} ${toPast(base)}`;
    },
    english: `Words like "yesterday", "last week" and "ago" talk about the past, so use the past tense of the verb.`,
    tamil: `"yesterday", "last week", "ago" போன்ற சொற்கள் இறந்த காலத்தைக் குறிக்கின்றன. அதனால் வினைச்சொல்லை இறந்த கால வடிவத்தில் எழுத வேண்டும்.`,
    example: `Yesterday I go to market → Yesterday I went to market`,
  },
  {
    id: 'past-time-at-end',
    category: 'tense',
    // The words between the verb and the time word may not contain a clause word
    // (and, but, because ...), so the rule stays inside one clause.
    pattern: new RegExp(
      `\\b(I|you|we|they|he|she)\\s+([a-z]+)\\b((?:(?!\\b(?:${CLAUSE_WORDS})\\b)[^.!?;,])*?)\\s+(${PAST_TIME})(?=\\s*(?:[.!?]|$))`,
      'gi'
    ),
    fix: (g, ctx) => {
      if (AUXILIARY_BEFORE.test(ctx.before)) {
        return null;
      }
      const verb = g[1].toLowerCase();
      const base = SG_TO_BASE[verb] ?? verb;
      if (TIME_RULE_SKIP.has(base) || !(IRREGULAR_PAST[base] || REGULAR_VERBS.has(base))) {
        return null;
      }
      return `${g[0]} ${toPast(base)}${g[2]} ${g[3]}`;
    },
    english: `Words like "yesterday", "last week" and "ago" talk about the past, so use the past tense of the verb.`,
    tamil: `"yesterday", "last week", "ago" போன்ற சொற்கள் இறந்த காலத்தைக் குறிக்கின்றன. அதனால் வினைச்சொல்லை இறந்த கால வடிவத்தில் எழுத வேண்டும்.`,
    example: `I go to market yesterday → I went to market yesterday`,
  },

  // ----- Subject and verb agreement -----
  {
    id: 'be-with-i',
    category: 'agreement',
    pattern: /\bI\s+(?:is|are)\b/gi,
    fix: () => 'I am',
    english: `Use "am" with "I".`,
    tamil: `"I" உடன் "am" பயன்படுத்த வேண்டும். உதாரணம்: I am happy.`,
    example: `I is happy → I am happy`,
  },
  {
    id: 'be-with-you-we-they',
    category: 'agreement',
    pattern: /\b(you|we|they)\s+(?:is|am)\b/gi,
    fix: (g) => `${g[0]} are`,
    english: `Use "are" with you, we and they.`,
    tamil: `"you / we / they" உடன் "are" பயன்படுத்த வேண்டும். உதாரணம்: They are my friends.`,
    example: `they is my friends → they are my friends`,
  },
  {
    id: 'be-with-he-she-it',
    category: 'agreement',
    pattern: /\b(he|she|it)\s+(?:are|am)\b/gi,
    fix: (g) => `${g[0]} is`,
    english: `Use "is" with he, she and it.`,
    tamil: `"he / she / it" உடன் "is" பயன்படுத்த வேண்டும். உதாரணம்: She is tired.`,
    example: `she are tired → she is tired`,
  },
  {
    id: 'was-with-plural',
    category: 'agreement',
    pattern: /\b(you|we|they)\s+was\b/gi,
    fix: (g) => `${g[0]} were`,
    english: `Use "were" with you, we and they.`,
    tamil: `"you / we / they" உடன் "were" பயன்படுத்த வேண்டும் (இறந்த காலம்). உதாரணம்: We were late.`,
    example: `we was late → we were late`,
  },
  {
    id: 'he-dont',
    category: 'agreement',
    pattern: /\b(he|she|it)\s+(?:don't|do not)\b/gi,
    fix: (g, ctx) => (AUXILIARY_BEFORE.test(ctx.before) ? null : `${g[0]} doesn't`),
    english: `Use "doesn't" with he, she and it.`,
    tamil: `"he / she / it" உடன் "doesn't" பயன்படுத்த வேண்டும்; "don't" அல்ல. உதாரணம்: She doesn't like tea.`,
    example: `She don't like tea → She doesn't like tea`,
  },
  {
    id: 'i-doesnt',
    category: 'agreement',
    pattern: /\b(I|we|you|they)\s+(?:doesn't|does not)\b/gi,
    fix: (g) => `${g[0]} don't`,
    english: `Use "don't" with I, we, you and they.`,
    tamil: `"I / we / you / they" உடன் "don't" பயன்படுத்த வேண்டும்; "doesn't" அல்ல. உதாரணம்: I don't know.`,
    example: `I doesn't know → I don't know`,
  },
  {
    id: 'he-she-verb-s',
    category: 'agreement',
    pattern: new RegExp(`\\b(he|she)\\s+(${alt(HE_VERBS)})\\b`, 'gi'),
    fix: (g, ctx) => {
      if (AUXILIARY_BEFORE.test(ctx.before) || SUBJUNCTIVE_BEFORE.test(ctx.before)) {
        return null;
      }
      const form = BASE_TO_SG[g[1].toLowerCase()];
      return form ? `${g[0]} ${form}` : null;
    },
    english: `With he and she, add "s" (or "es") to the verb in the present tense. "Have" becomes "has".`,
    tamil: `நிகழ்காலத்தில் "he / she" உடன் வினைச்சொல்லின் முடிவில் "s / es" சேர்க்க வேண்டும். "have" என்பது "has" ஆகும். உதாரணம்: She likes tea.`,
    example: `She like tea → She likes tea`,
  },
  {
    id: 'plural-subject-verb-s',
    category: 'agreement',
    pattern: new RegExp(`\\b(I|we|you|they)\\s+(${alt(Object.keys(SG_TO_BASE))})\\b`, 'gi'),
    fix: (g) => `${g[0]} ${SG_TO_BASE[g[1].toLowerCase()]}`,
    english: `With I, we, you and they, do not add "s" to the verb. "Has" becomes "have".`,
    tamil: `"I / we / you / they" உடன் வினைச்சொல்லில் "s" சேர்க்கக் கூடாது. "has" என்பது "have" ஆகும். உதாரணம்: They play cricket.`,
    example: `They plays cricket → They play cricket`,
  },
  {
    id: 'there-is-plural',
    category: 'agreement',
    pattern: /\bthere\s+is\s+(many|several|two|three|four|five|six|seven|eight|nine|ten|(?:a\s+)?few)\b/gi,
    fix: (g) => `there are ${g[0]}`,
    english: `Use "there are" when you talk about more than one thing.`,
    tamil: `ஒன்றுக்கு மேற்பட்ட பொருட்களைப் பற்றிச் சொல்லும்போது "there are" பயன்படுத்த வேண்டும்.`,
    example: `There is many people → There are many people`,
  },
  {
    id: 'there-are-singular',
    category: 'agreement',
    pattern: /\bthere\s+are\s+(a|an|one)\b/gi,
    fix: (g, ctx) =>
      /^\s+(?:lot|lots|few|couple|number|bunch|handful|great|good|large|small|total|variety|range|series|pair|dozen|hundred|thousand|million)/i.test(
        ctx.after
      )
        ? null
        : `there is ${g[0]}`,
    english: `Use "there is" when you talk about only one thing.`,
    tamil: `ஒரே ஒரு பொருளைப் பற்றிச் சொல்லும்போது "there is" என்று சொல்ல வேண்டும்.`,
    example: `There are a book on the table → There is a book on the table`,
  },

  // ----- Verb forms -----
  {
    id: 'be-before-simple-verb',
    category: 'verb-form',
    pattern: /\b(I|you|we|they|he|she|it)\s+(?:am|is|are)\s+(agree|disagree|understand|know|want|need)\b/gi,
    fix: (g) => {
      const verb = g[1].toLowerCase();
      const third = ['he', 'she', 'it'].includes(g[0].toLowerCase());
      return `${g[0]} ${third ? (BASE_TO_SG[verb] ?? verb) : verb}`;
    },
    english: `"Agree", "understand", "know" and similar words are already verbs. Do not add "am", "is" or "are".`,
    tamil: `"agree", "understand", "know" போன்றவை ஏற்கெனவே வினைச்சொற்கள். அவற்றுடன் "am / is / are" சேர்க்கக் கூடாது. உதாரணம்: I agree.`,
    example: `I am agree → I agree`,
  },
  {
    id: 'stative-verb-ing',
    category: 'verb-form',
    pattern: /\b(I|you|we|they|he|she|it)\s+(?:am|is|are)\s+(knowing|wanting|liking|needing|believing|hating)\b/gi,
    fix: (g) => {
      const base = ING_TO_BASE[g[1].toLowerCase()];
      const third = ['he', 'she', 'it'].includes(g[0].toLowerCase());
      return `${g[0]} ${third ? (BASE_TO_SG[base] ?? base) : base}`;
    },
    english: `Verbs like "know", "want", "like" and "need" are not normally used with "-ing". Use the simple present.`,
    tamil: `"know", "want", "like", "need" போன்ற வினைச்சொற்களுடன் பொதுவாக "-ing" சேர்க்க மாட்டோம். எளிய நிகழ்காலம் பயன்படுத்துங்கள். உதாரணம்: I know him.`,
    example: `I am knowing him → I know him`,
  },
  {
    id: 'be-then-base-verb',
    category: 'verb-form',
    pattern: new RegExp(
      `\\b(I|you|we|they|he|she)\\s+(am|is|are)\\s+(${alt(Object.keys(BASE_TO_ING))})\\b`,
      'gi'
    ),
    fix: (g) => `${g[0]} ${g[1]} ${BASE_TO_ING[g[2].toLowerCase()]}`,
    english: `After am, is or are, add "-ing" to the verb to talk about an action happening now. (This is a best guess.)`,
    tamil: `"am / is / are" க்குப் பிறகு, இப்போது நடக்கும் செயலைச் சொல்ல வினைச்சொல்லுடன் "-ing" சேர்க்க வேண்டும். உதாரணம்: I am going. (இது ஒரு ஊகம் மட்டுமே.)`,
    example: `I am go to school → I am going to school`,
  },
  {
    id: 'modal-then-to',
    category: 'verb-form',
    pattern: /\b(can|could|will|would|should|must|may|might)\s+to\s+(?=[a-z])/gi,
    fix: (g, ctx) => (NOUN_BEFORE.test(ctx.before) ? null : `${g[0]} `),
    english: `Do not use "to" after can, could, will, would, should, must, may or might.`,
    tamil: `"can, will, should, must" போன்றவற்றுக்குப் பிறகு "to" சேர்க்கக் கூடாது. நேரடியாக வினைச்சொல் வர வேண்டும். உதாரணம்: I can speak.`,
    example: `I can to speak → I can speak`,
  },
  {
    id: 'modal-then-verb-s',
    category: 'verb-form',
    pattern: new RegExp(`\\b(can|could|will|would|should|must|may|might)\\s+(${alt(Object.keys(SG_TO_BASE))})\\b`, 'gi'),
    fix: (g, ctx) => (NOUN_BEFORE.test(ctx.before) ? null : `${g[0]} ${SG_TO_BASE[g[1].toLowerCase()]}`),
    english: `After can, could, will, would, should, must, may or might, use the base form of the verb (no "s").`,
    tamil: `"can, will, should" போன்றவற்றுக்குப் பிறகு வினைச்சொல்லின் அடிப்படை வடிவம் வர வேண்டும் ("s" சேர்க்கக் கூடாது). உதாரணம்: He can speak.`,
    example: `He can speaks → He can speak`,
  },
  {
    id: 'question-word-order',
    category: 'verb-form',
    // Only at the start of a sentence and only when it clearly looks like a question
    // ("Where you are going?"), so "I know where you are" and "What you want is love" stay as they are.
    pattern: /(^|[.?!]\s+)(where|what|when|why|how)\s+(you|we|they)\s+(are|were)(?=\s+[a-z]+ing\b|(?:\s+[a-z']+){0,3}\s*\?)/gi,
    fix: (g) => `${g[0]}${g[1]} ${g[3]} ${g[2]}`,
    english: `In a question, put "are" or "were" before the person: "Where are you going?", not "Where you are going?".`,
    tamil: `கேள்வி கேட்கும்போது "are / were" முதலில் வர வேண்டும், அதன் பிறகு நபர் வர வேண்டும். "Where you are going?" அல்ல, "Where are you going?".`,
    example: `Where you are going? → Where are you going?`,
  },
  {
    id: 'can-able-to',
    category: 'verb-form',
    pattern: /\b(can|could|will|would)\s+able\s+to\b/gi,
    fix: (g) => (/^(can|could)$/i.test(g[0]) ? g[0] : `${g[0]} be able to`),
    english: `Use "can" or "be able to", not both together. "I can speak" or "I am able to speak"; for the future, "I will be able to speak".`,
    tamil: `"can" அல்லது "be able to" - இரண்டில் ஒன்றை மட்டும் பயன்படுத்துங்கள். "can able to" என்பது தவறு. சரி: I can speak / I will be able to speak.`,
    example: `I can able to speak → I can speak`,
  },
  {
    id: 'negative-then-base-verb',
    category: 'verb-form',
    pattern: /\b(didn't|did not|don't|do not|doesn't|does not)\s+([a-z]+)\b/gi,
    fix: (g) => {
      const base = toBaseForm(g[1]);
      return base ? `${g[0]} ${base}` : null;
    },
    english: `After "didn't", "don't" or "doesn't", use the base form of the verb.`,
    tamil: `"didn't / don't / doesn't" க்குப் பிறகு வினைச்சொல்லின் அடிப்படை வடிவம் வர வேண்டும். "didn't went" அல்ல, "didn't go". உதாரணம்: I didn't go.`,
    example: `I didn't went → I didn't go`,
  },
  {
    id: 'question-then-base-verb',
    category: 'verb-form',
    pattern: /\b(did|does|do)\s+(I|you|he|she|it|we|they)\s+([a-z]+)\b/gi,
    fix: (g) => {
      const base = toBaseForm(g[2]);
      return base ? `${g[0]} ${g[1]} ${base}` : null;
    },
    english: `In a question with "did", "do" or "does", the main verb uses its base form.`,
    tamil: `"did / do / does" உடன் கேள்வி கேட்கும்போது முக்கிய வினைச்சொல் அடிப்படை வடிவத்தில் இருக்க வேண்டும். "Did you went?" அல்ல, "Did you go?".`,
    example: `Did you went there? → Did you go there?`,
  },
  {
    id: 'double-negative',
    category: 'word-choice',
    pattern: /\b((?:don't|doesn't|didn't|can't|couldn't|won't|haven't|hasn't)\s+(?:have|has|got|know|see|want|need|like|do|find|get|understand))\s+(no one|nothing|nobody|nowhere|no)\b/gi,
    fix: (g) => `${g[0]} ${NEGATIVE_TO_POSITIVE[g[1].toLowerCase()]}`,
    english: `Do not use two negative words together. After "don't", use "any" words (any, anything, anybody).`,
    tamil: `ஒரே வாக்கியத்தில் இரண்டு எதிர்மறைச் சொற்களைப் பயன்படுத்தக் கூடாது. "don't" உடன் "any" சொற்களைப் பயன்படுத்துங்கள். உதாரணம்: I don't have any money.`,
    example: `I don't have no money → I don't have any money`,
  },

  // ----- Word choice and prepositions -----
  {
    id: 'discuss-about',
    category: 'prepositions',
    pattern: /\bdiscuss(es|ed|ing)?\s+about\b/gi,
    fix: (g) => `discuss${g[0]}`,
    english: `"Discuss" does not need "about".`,
    tamil: `"discuss" என்ற சொல்லுக்குப் பிறகு "about" தேவையில்லை. உதாரணம்: Let's discuss the plan.`,
    example: `discuss about the plan → discuss the plan`,
  },
  {
    id: 'return-back',
    category: 'word-choice',
    pattern: /\b(return(?:s|ed|ing)?)\s+back\b/gi,
    fix: (g) => g[0],
    english: `"Return" already means "come or give back", so "back" is not needed.`,
    tamil: `"return" என்ற சொல்லிலேயே "திரும்ப" என்ற பொருள் உள்ளது; "back" தேவையில்லை. உதாரணம்: Please return the book.`,
    example: `return back the book → return the book`,
  },
  {
    id: 'explain-me',
    category: 'prepositions',
    pattern: /\b(explain(?:s|ed|ing)?)\s+(me|us)\b/gi,
    fix: (g) => `${g[0]} to ${g[1]}`,
    english: `Say "explain to me", not "explain me".`,
    tamil: `"explain me" அல்ல, "explain to me" என்று சொல்ல வேண்டும்.`,
    example: `explain me the rule → explain to me the rule`,
  },
  {
    id: 'said-me',
    category: 'word-choice',
    pattern: /\bsaid\s+(me|us)\b/gi,
    fix: (g) => `told ${g[0]}`,
    english: `Say "told me", not "said me".`,
    tamil: `"said me" அல்ல, "told me" என்று சொல்ல வேண்டும். உதாரணம்: He told me to wait.`,
    example: `He said me to wait → He told me to wait`,
  },
  {
    id: 'depend-of',
    category: 'prepositions',
    pattern: /\b(depend|depends|depended|depending)\s+of\b/gi,
    fix: (g) => `${g[0]} on`,
    english: `Say "depend on", not "depend of".`,
    tamil: `"depend" உடன் "on" பயன்படுத்த வேண்டும். உதாரணம்: It depends on the weather.`,
    example: `depends of the weather → depends on the weather`,
  },
  {
    id: 'interested-in',
    category: 'prepositions',
    pattern: /\binterested\s+(?:on|at)\b/gi,
    fix: () => 'interested in',
    english: `Say "interested in".`,
    tamil: `"interested" உடன் "in" பயன்படுத்த வேண்டும். உதாரணம்: I am interested in music.`,
    example: `interested on music → interested in music`,
  },
  {
    id: 'afraid-of',
    category: 'prepositions',
    pattern: /\bafraid\s+from\b/gi,
    fix: () => 'afraid of',
    english: `Say "afraid of".`,
    tamil: `"afraid" உடன் "of" பயன்படுத்த வேண்டும். உதாரணம்: I am afraid of dogs.`,
    example: `afraid from dogs → afraid of dogs`,
  },
  {
    id: 'good-at-subject',
    category: 'prepositions',
    pattern: /\b(good|bad|weak|poor|excellent|great)\s+in\s+(english|maths?|science|tamil|hindi|sports?|cooking|singing|speaking|writing|cricket|football|drawing|dancing|studies)\b/gi,
    fix: (g) => `${g[0]} at ${g[1]}`,
    english: `To talk about a skill, say "good at", not "good in".`,
    tamil: `ஒரு திறமையைச் சொல்லும்போது "good at" பயன்படுத்த வேண்டும்; "good in" அல்ல. உதாரணம்: She is good at English.`,
    example: `good in English → good at English`,
  },
  {
    id: 'listen-to',
    category: 'prepositions',
    pattern: /\b(listen|listens|listened|listening)\s+(music|songs?|radio|news|me|him|them|us|you|the)\b/gi,
    fix: (g) => `${g[0]} to ${g[1]}`,
    english: `Say "listen to", not just "listen".`,
    tamil: `"listen" க்குப் பிறகு "to" சேர்க்க வேண்டும். உதாரணம்: I listen to music.`,
    example: `listen music → listen to music`,
  },
  {
    id: 'different-from',
    category: 'prepositions',
    pattern: /\bdifferent\s+with\b/gi,
    fix: () => 'different from',
    english: `Say "different from".`,
    tamil: `"different from" என்று சொல்ல வேண்டும். உதாரணம்: This is different from that.`,
    example: `different with that → different from that`,
  },
  {
    id: 'angry-with',
    category: 'prepositions',
    pattern: /\bangry\s+on\s+(me|him|her|them|us|you)\b/gi,
    fix: (g) => `angry with ${g[0]}`,
    english: `Say "angry with" a person.`,
    tamil: `ஒருவர் மீது கோபம் என்று சொல்ல "angry with" பயன்படுத்த வேண்டும். உதாரணம்: I am angry with him.`,
    example: `angry on him → angry with him`,
  },

  // ----- Articles (a / an) -----
  {
    id: 'a-to-an',
    category: 'articles',
    pattern: /\b(a)\s+([a-z]+)/gi,
    fix: (g, ctx) => {
      // "Plan A is ..." or "Vitamin A": a capital A in the middle of a sentence is a label.
      if (g[0] === 'A' && !isSentenceStart(ctx.before)) {
        return null;
      }
      const word = g[1];
      const needsAn =
        SILENT_H.test(word) || (/^[aeiou]/i.test(word) && !VOWEL_LETTER_CONSONANT_SOUND.test(word));
      return needsAn ? `an ${word}` : null;
    },
    english: `Use "an" before a word that starts with a vowel sound (a, e, i, o, u), for example "an apple" and "an hour".`,
    tamil: `உயிரெழுத்து ஒலியில் தொடங்கும் சொல்லுக்கு முன் "an" பயன்படுத்த வேண்டும். உதாரணம்: an apple, an hour.`,
    example: `a apple → an apple`,
  },
  {
    id: 'an-to-a',
    category: 'articles',
    pattern: /\b(an)\s+([a-z]+)/gi,
    fix: (g) => {
      const word = g[1];
      if (word.length === 1 || (word.length >= 2 && word === word.toUpperCase())) {
        return null; // letters and short forms such as "an MBA", "an X-ray"
      }
      if (EITHER_ARTICLE.test(word)) {
        return null;
      }
      if (/^[aeiou]/i.test(word)) {
        return VOWEL_LETTER_CONSONANT_SOUND.test(word) ? `a ${word}` : null;
      }
      return SILENT_H.test(word) ? null : `a ${word}`;
    },
    english: `Use "a" before a word that starts with a consonant sound. "University" starts with a "yoo" sound, so it takes "a".`,
    tamil: `மெய்யெழுத்து ஒலியில் தொடங்கும் சொல்லுக்கு முன் "a" பயன்படுத்த வேண்டும். "university" என்பது "யூ" என்ற ஒலியில் தொடங்குவதால் "a university" என்று சொல்ல வேண்டும்.`,
    example: `an book → a book, an university → a university`,
  },

  // ----- Capital letter at the start of a sentence -----
  {
    id: 'capital-at-sentence-start',
    category: 'capitalization',
    pattern: /(^|[.!?]\s+)([a-z][a-z']*)/g,
    fix: (g, ctx) => {
      // "e.g. apples" and "Mr. smith": the full stop is not the end of a sentence.
      if (g[0] !== '' && ABBREVIATION_BEFORE.test(ctx.before)) {
        return null;
      }
      // A sentence that starts with "i.e." or "e.g." keeps its lower case.
      if (IS_ABBREVIATION_LETTER.test(ctx.after) && g[1].length === 1) {
        return null;
      }
      return `${g[0]}${capitalize(g[1])}`;
    },
    english: `Start every sentence with a capital letter.`,
    tamil: `ஒவ்வொரு வாக்கியத்தின் முதல் எழுத்தையும் பெரிய எழுத்தில் எழுத வேண்டும்.`,
    example: `my name is Ravi → My name is Ravi`,
  },
];

const LIMITATIONS: readonly LimitationNote[] = [
  {
    english: `This is a rule-based checker, not AI. It only finds the mistakes written in its rulebook.`,
    tamil: `இது AI அல்ல; விதிகள் அடிப்படையிலான சோதனை மட்டுமே. தன் பட்டியலில் உள்ள தவறுகளை மட்டுமே கண்டுபிடிக்கும்.`,
  },
  {
    english: `"No mistakes found" only means no rule matched. Your sentence may still have errors.`,
    tamil: `"தவறு இல்லை" என்றால் எந்த விதியும் பொருந்தவில்லை என்று மட்டுமே பொருள். வாக்கியத்தில் வேறு தவறுகள் இருக்கலாம்.`,
  },
  {
    english: `It does not understand meaning. It cannot check spelling, word choice, or long and complex sentences, and most rules only work with simple subjects such as I, he, she, we and they (not names like "my friend").`,
    tamil: `இது அர்த்தத்தைப் புரிந்துகொள்ளாது. எழுத்துப்பிழை, சரியான சொல் தேர்வு, நீண்ட சிக்கலான வாக்கியங்களைச் சோதிக்க முடியாது. பெரும்பாலான விதிகள் I, he, she, we, they போன்ற எளிய எழுவாய்களுடன் மட்டுமே வேலை செய்யும்.`,
  },
  {
    english: `Some fixes are guesses (for example "I am work" becomes "I am working"). The right fix may be different.`,
    tamil: `சில திருத்தங்கள் ஊகங்கள் மட்டுமே. சில நேரங்களில் சரியான திருத்தம் வேறாக இருக்கலாம்.`,
  },
  {
    english: `Speech recognition can mishear words, so a "mistake" may be a recognition error and not your grammar.`,
    tamil: `குரல் அங்கீகாரம் சில சொற்களைத் தவறாகக் கேட்கலாம்; அது உங்கள் இலக்கணத் தவறாக இல்லாமல் இருக்கலாம்.`,
  },
  {
    english: `The Tamil explanations were written by hand for each rule. They are meant to be simple and should be reviewed by a Tamil teacher.`,
    tamil: `தமிழ் விளக்கங்கள் ஒவ்வொரு விதிக்கும் கையால் எழுதப்பட்டவை. அவற்றை ஒரு தமிழ் ஆசிரியர் சரிபார்ப்பது நல்லது.`,
  },
];

// ---------------------------------------------------------------
// The service
// ---------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class CorrectionService {
  /** Honest list of what this checker cannot do. Show it in the UI. */
  readonly limitations = LIMITATIONS;

  get ruleCount(): number {
    return RULES.length;
  }

  check(sentence: string): CorrectionResult {
    const original = sentence.trim();
    // Speech engines sometimes return curly apostrophes and extra spaces.
    let corrected = original.replace(/[‘’]/g, "'").replace(/\s+/g, ' ');
    const issues: CorrectionIssue[] = [];

    for (const rule of RULES) {
      const changes: CorrectionChange[] = [];

      corrected = corrected.replace(rule.pattern, (...args: unknown[]): string => {
        const match = args[0] as string;
        const offsetIndex = args.findIndex((value, i) => i > 0 && typeof value === 'number');
        const groups = args.slice(1, offsetIndex).map((value) => (value as string | undefined) ?? '');
        const offset = args[offsetIndex] as number;
        const whole = args[offsetIndex + 1] as string;

        const fixed = rule.fix(groups, {
          before: whole.slice(0, offset),
          after: whole.slice(offset + match.length),
        });
        if (fixed === null) {
          return match;
        }
        const replacement = matchCase(match, fixed);
        if (replacement === match) {
          return match;
        }
        changes.push(this.describeChange(match, replacement));
        return replacement;
      });

      if (changes.length > 0) {
        issues.push({
          ruleId: rule.id,
          category: rule.category,
          changes,
          english: rule.english,
          tamil: rule.tamil,
          example: rule.example,
        });
      }
    }

    return {
      original,
      corrected,
      hasMistakes: issues.length > 0,
      issues,
      rulesChecked: RULES.length,
    };
  }

  /** Shows only the words that really changed, e.g. "don't" -> "doesn't". */
  private describeChange(found: string, replacement: string): CorrectionChange {
    const f = found.trim().split(/\s+/);
    const r = replacement.trim().split(/\s+/);

    let start = 0;
    while (start < f.length && start < r.length && f[start] === r[start]) {
      start++;
    }
    let endF = f.length;
    let endR = r.length;
    while (endF > start && endR > start && f[endF - 1] === r[endR - 1]) {
      endF--;
      endR--;
    }

    const shortFound = f.slice(start, endF).join(' ');
    const shortReplacement = r.slice(start, endR).join(' ');
    if (shortFound && shortReplacement) {
      return { found: shortFound, replacement: shortReplacement };
    }
    return { found: found.trim(), replacement: replacement.trim() };
  }
}
