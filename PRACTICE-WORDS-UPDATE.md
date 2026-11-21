# My Practice Words – update

This update adds a separate **My Practice Words** screen while keeping the existing dictionary lookup and autocomplete.

- Search a word in **My Dictionary** and use **Add to My Practice Words**.
- Open **My Practice Words** from the home screen or the link in the dictionary.
- Saved words are stored under `lela.my-dictionary.practice.v1` using the existing StorageService, so the dictionary and practice list share the same saved entries.
- Duplicate words are prevented case-insensitively; deleting a word removes it from the saved practice list only.
- Online dictionary result cache remains separate under `lela.my-dictionary.online-cache.v1`.

Online lookup still requires an internet connection. The Angular production build was not run in this environment because dependency installation timed out; run `npm install` followed by `npm run build` in the project folder to verify/build locally.
