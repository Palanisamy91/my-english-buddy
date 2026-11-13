/**
 * Chooses a voice for Lela. A browser gives no "female" flag, so this guesses from the voice name
 * and says honestly when it could not tell. Never assumes a particular voice is installed.
 */
export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
}

export type VoiceGender = 'female' | 'male' | 'unknown';

export interface VoiceChoice<T extends VoiceLike> {
  voice: T | null;
  /** 'female' only when the voice name is a well-known female voice. */
  gender: VoiceGender;
  /** A short, honest sentence for the screen. */
  note: string;
}

const FEMALE =
  /\b(female|woman|zira|heera|hazel|susan|linda|catherine|samantha|karen|moira|tessa|veena|victoria|fiona|serena|kate|allison|ava|jenny|aria|emma|libby|maisie|sonia|natasha|neerja|clara|olivia|michelle|joanna|salli|kendra|kimberly|ivy|amy|nicole|raveena|priya|lekha|swara|kalpana|ruth|stephanie|zoe|sara|sally|elena|laura|isabella|tracy|vicki|grace|mia|ella|eva|molly|jane|nova|shimmer|siri)\b/i;
const MALE =
  /\b(male|man|david|mark|george|james|richard|ravi|hemant|prabhat|rishi|daniel|alex|fred|tom|guy|ryan|eric|brian|christopher|roger|thomas|oliver|arthur|aaron|gordon|rocko|junior|ralph|bruce|albert|lee|diego|jorge|henry|liam|connor|noah|wayne|neil)\b/i;

function langScore(lang: string): number {
  const l = lang.replace('_', '-').toLowerCase();
  if (l === 'en-in') return 30;
  if (l === 'en-us') return 20;
  if (/^en-(gb|au|ca|za|ie|nz|sg|ph)$/.test(l)) return 15;
  if (l.startsWith('en')) return 10;
  return -1000;
}

export function scoreVoice(v: VoiceLike): number {
  let score = langScore(v.lang);
  if (FEMALE.test(v.name)) score += 100;
  else if (MALE.test(v.name)) score -= 100;
  if (/natural|online/i.test(v.name)) score += 8;
  if (/google/i.test(v.name)) score += 3;
  if (v.localService) score += 2;
  return score;
}

/** Best guess from the name only. A browser gives no real gender flag. */
export function guessGender(v: VoiceLike): VoiceGender {
  if (FEMALE.test(v.name) && !MALE.test(v.name)) return 'female';
  if (MALE.test(v.name) && !FEMALE.test(v.name)) return 'male';
  return 'unknown';
}

export function chooseLelaVoice<T extends VoiceLike>(voices: readonly T[]): VoiceChoice<T> {
  const english = voices.filter((v) => langScore(v.lang) > -1000);
  if (english.length === 0) {
    return {
      voice: null,
      gender: 'unknown',
      note: 'No English voice was found on this device, so Lela cannot speak aloud. Her words are shown on screen. Install an English text-to-speech voice in your device settings.',
    };
  }
  // Never default to a voice that looks male. Female first (Indian English first), then voices whose gender
  // cannot be told from the name. If only male-looking voices exist, stay silent and tell the learner.
  const ranked = [...english].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  const female = ranked.find((v) => guessGender(v) === 'female');
  if (female) {
    return { voice: female, gender: 'female', note: `Lela's voice: ${female.name} (${female.lang}). Press Preview to hear it.` };
  }
  const unknown = ranked.find((v) => guessGender(v) === 'unknown');
  if (unknown) {
    return {
      voice: unknown,
      gender: 'unknown',
      note: `No English voice on this device is clearly a female voice. Lela is using ${unknown.name} (${unknown.lang}), whose gender I cannot tell from its name. Press Preview, and pick another voice below if it does not sound female.`,
    };
  }
  return {
    voice: null,
    gender: 'unknown',
    note: 'No female English voice was found on this device, only male-sounding ones, so Lela stays silent instead of using a male voice. Her words are shown on screen. Install a female English voice in your device text-to-speech settings (for example Google Indian English), or choose one of the voices below yourself.',
  };
}
