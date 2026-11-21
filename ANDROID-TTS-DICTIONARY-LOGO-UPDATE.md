# Lela Android speech, dictionary pronunciation and app icon update

## Changes

- Android APK speech output now uses the Capacitor 8-compatible native text-to-speech plugin. It no longer depends on Android WebView's Web Speech synthesis implementation.
- Native speech loads Android voices, prefers `en-IN`, falls back to an available English voice, supports stop/cancel, and reports a useful message if the phone has no working English TTS engine.
- Android package visibility includes both speech-recognition and text-to-speech service queries.
- My Dictionary result cards have a speaker button. It uses free dictionary audio when available and falls back to the device's English voice.
- Replaced the Lela app icon and web icon with the new purple Lela learning/speech illustration. The GitHub APK workflow now generates Android launcher icon assets.

## Build the APK

```bash
npm install
npm run build
npx cap sync android
```

For a new Android project only, run `npx cap add android` before the sync command. Do not repeat `cap add android` if the `android` folder already exists.

The GitHub Actions workflow also generates the Android project, creates the launcher icon assets, and builds a debug APK.

## If Android has no English voice installed

On the phone, open Settings → Language & input / General management → Text-to-speech output. Select Google Speech Services and install an English (India) voice. Then close and reopen Lela.
