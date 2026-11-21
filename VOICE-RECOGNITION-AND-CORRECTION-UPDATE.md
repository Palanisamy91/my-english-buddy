# Lela voice recognition and sentence correction update

## What changed

- Lela's main conversation now collects multiple speech-recognition sessions and joins the recognised phrases, instead of submitting only the first phrase returned after a short pause.
- The learner can tap **Stop** to finish early. Otherwise, Lela waits for about 3.2 seconds of silence after the last detected speech and then submits the collected sentence.
- The main voice conversation can collect up to 15 recognition segments in one turn, with duplicate/overlapping words removed when segments are joined.
- The standalone Speak input also allows more recognition segments and a slightly longer pause before finishing.
- The Web Speech recogniser requests up to five alternatives where supported.
- Low-confidence words remain in the text sent for correction. They are still marked as uncertain in the review display instead of being silently dropped.
- When Lela finds a grammar correction, she now speaks the corrected sentence aloud before asking the learner to repeat it.

## Important limits

Speech-to-text accuracy depends on the Android speech recognition service installed on the phone, microphone quality, background noise, accent, and internet connectivity. The app cannot guarantee that every spoken word will be recognised correctly. Use a quiet place, speak at a natural pace, and tap Stop after finishing.

The built-in sentence corrector is offline and rule-based. It can fix common grammar mistakes but is not an AI proofreader and will not correct every possible sentence. No paid API key has been added to the app.

## Build

From the folder containing `package.json`:

```bash
npm install
npm run build
npx cap sync android
```

Then build the Android APK using the existing GitHub Actions workflow or Android Gradle project.
