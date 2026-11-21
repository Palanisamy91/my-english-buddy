# Dictionary online fallback fix

The dictionary previously called the Tamil translation service only after the English Dictionary API returned a definition. If the English API returned 404 or did not know a word, the app skipped Tamil translation and showed the manual-entry message immediately.

The updated flow now:
1. Checks an exact built-in vocabulary match.
2. Checks the user's own saved dictionary entries.
3. Tries the Free Dictionary API for an English definition, pronunciation and example.
4. Tries the independent free MyMemory English-to-Tamil translation even when the English dictionary has no entry.
5. Displays a translation-only result when Tamil is available, or offers manual Tamil entry when neither source returns a result.
6. Caches successful online results and saves manually entered words locally for future offline lookup.

Online sources still require internet and may have usage limits. The source code was updated, but an Angular build and live Android network test were not run in this environment.
