// Pure helpers for the Android (Capacitor) microphone. No plugin imports here, so they are unit-tested in Node.

/** Permission states the Capacitor speech plugin reports. On Android: never asked = prompt, denied once = prompt-with-rationale,
 *  "Don't ask again" / blocked in settings = denied. */
export type NativePermissionState = 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied';

export type MicPermissionLike = 'granted' | 'denied' | 'prompt';

export function toMicPermission(state: NativePermissionState | string | undefined): MicPermissionLike {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  return 'prompt';
}

/**
 * What to do with the microphone permission before listening:
 *  - granted: listen now.
 *  - ask: show Android's permission popup (never asked, or denied once so Android will still show it).
 *  - settings: Android will not show the popup any more; the learner must allow it in App Settings.
 */
export function permissionPlan(state: NativePermissionState | string | undefined): 'granted' | 'ask' | 'settings' {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'settings';
  return 'ask';
}

/** After the popup was shown: ask again later (the learner just tapped Deny) or go to settings (Don't ask again). */
export function outcomeAfterRequest(after: NativePermissionState | string | undefined): 'granted' | 'ask-again' | 'settings' {
  if (after === 'granted') return 'granted';
  if (after === 'denied') return 'settings';
  return 'ask-again';
}

/** Turns a rejection from the plugin into one of the web-style error codes the app already understands. */
export function nativeErrorCode(err: unknown): string {
  const text = String((err as { message?: string } | null)?.message ?? err ?? '').toLowerCase();
  if (/permission|not.?allowed|denied|record_audio/.test(text)) return 'not-allowed';
  if (/network|internet|connection|offline/.test(text)) return 'network';
  if (/busy|already|in use/.test(text)) return 'busy';
  if (/no match|no speech|nothing|timeout/.test(text)) return 'no-speech';
  if (/not available|unavailable|not supported|no recogni/.test(text)) return 'service-not-allowed';
  if (/audio|microphone|recorder/.test(text)) return 'audio-capture';
  return 'start-failed';
}
