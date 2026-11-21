# Dictionary Tamil meaning fix

- Added exact local Tamil meanings for common English question words and function words, including `when = எப்போது`, `where = எங்கே`, `why = ஏன்`, `what = என்ன`, `who = யார்`, and `how = எப்படி`.
- Local exact meanings are checked before calling the free online translation service. This avoids depending on the English-only Free Dictionary API for Tamil translations.
- Existing cached dictionary entries are repaired when a reliable local Tamil meaning is available, rather than continuing to show a blank or incorrect Tamil field.
- The existing online definition, example translation, pronunciation/audio, search suggestions, local cache, and My Practice Words features are retained.
- Verified `public/data/prepositions-500.json` contains exactly 500 records with 500 unique IDs.

Validation: `node --test test/data.test.mjs` passes all 9 tests. `node scripts/build-data.mjs --check` reports 8,019 vocabulary entries and 3,640 sentences with no data problems. A full Angular build was not run in this environment because dependencies are not installed and package installation timed out.
