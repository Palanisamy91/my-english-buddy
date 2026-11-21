# My Dictionary and Prepositions update

This update is based on `Lela-Chat-Tenses-1500-Words.zip` and retains the existing 12-tense practice and 1,500-word vocabulary bank.

## New navigation options
- **My Dictionary** (`/dictionary`): searches every vocabulary category listed in `public/data/manifest.json`; exact matches are shown first, followed by partial matches. Shows the stored Tamil meaning, part of speech, pronunciation, example and Tamil example when available.
- **My Practice Words**: add words from the dictionary, save them locally on the device, and delete them after learning. Words not found in the offline bank can be saved with a Tamil meaning entered by the learner.
- **Prepositions** (`/prepositions`): 500 practice example records covering 100 common prepositions and multi-word prepositional phrases, with Tamil meanings and examples.

## Offline dictionary limitation
The dictionary searches the app's bundled vocabulary (currently 6,019 vocabulary records in the source manifest). It does not call a paid translation API. A word that is not in the bundled dictionary is identified as unavailable offline; the learner can enter a Tamil meaning and save it manually.

Saved words use browser/device local storage through the existing `StorageService`. Clearing app storage or uninstalling the app may remove these saved words.
