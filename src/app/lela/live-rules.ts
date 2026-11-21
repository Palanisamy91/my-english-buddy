/**
 * Pure rules for Live conversation mode (no Angular, easy to test).
 *
 * While Lela speaks, the microphone can stay open so the learner can interrupt her. A microphone
 * also hears Lela's own voice from the loudspeaker, so heard text that is just her own words must
 * NOT count as an interruption. These rules decide that. They are a safeguard, not a guarantee:
 * without headphones some devices still hear her too loudly, so there is always an Interrupt button.
 */

/** Spoken words that only mean "stop / wait": they interrupt Lela but are not sent to her as an answer. */
const COMMAND_WORDS = new Set(['stop', 'wait', 'pause', 'hold', 'sorry', 'excuse', 'listen', 'okay', 'ok', 'one', 'second', 'moment', 'please', 'lela', 'leela']);

export function wordsOf(text: string): string[] {
  return (text.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z]+(?:'[a-z]+)?/g) ?? []).filter((w) => w.length >= 2);
}

/** True when (almost) everything that was heard is something Lela herself is saying. */
export function isEcho(heard: string, spoken: string): boolean {
  const h = wordsOf(heard);
  if (h.length === 0) return true; // nothing recognisable: not a person talking
  const said = new Set(wordsOf(spoken));
  const share = h.filter((w) => said.has(w)).length / h.length;
  return share >= 0.7;
}

/** True when the heard text is the learner talking over Lela. */
export function shouldInterrupt(heard: string, spoken: string): boolean {
  return !isEcho(heard, spoken);
}

/** "Stop", "wait a moment", "sorry"...: interrupts Lela but is not an answer to send to her. */
export function isInterruptOnly(text: string): boolean {
  const w = wordsOf(text);
  return w.length > 0 && w.length <= 4 && w.every((x) => COMMAND_WORDS.has(x));
}

/** After this many quiet listening rounds in a row, live listening pauses (the conversation is kept). */
export const LIVE_PAUSE_AFTER = 8;
/** After this many quiet rounds Lela gently checks in once. */
export const LIVE_CHECKIN_AFTER = 3;
