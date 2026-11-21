# Android / Capacitor setup

This Angular project uses Capacitor for the Android APK. Speech input is provided by
`@capacitor-community/speech-recognition`; microphone permissions and the App Settings
shortcut are handled by `capacitor-native-settings`. The existing `SpeechService` keeps
one public API for browser and Android recognition. Its existing speech-output code is
left unchanged.

## 1. Install dependencies

From the project root:

```bash
npm install
```

Capacitor and the native speech plugins are declared in `package.json`:

- `@capacitor/core` 8.x
- `@capacitor/android` 8.x
- `@capacitor/cli` 8.x
- `@capacitor-community/speech-recognition` 7.x
- `capacitor-native-settings` 8.x

Do not install a different major version unless you also update and test the Capacitor
plugins together.

## 2. Create the Android platform (one time only)

The source ZIP contains the Capacitor configuration but does not include generated
Android/Gradle build files. Run this once on the development computer:

```bash
npm run build
npm run android:add
```

This creates the `android/` platform folder. If you already have an Android folder,
do not run `android:add` again.

`capacitor.config.ts` currently uses `com.palanisamy.myenglishbuddy` as the application ID.
If you already distributed an APK, change `appId` to the exact existing Android
`applicationId` before adding/syncing Android; otherwise Android may install it as a
separate app instead of updating the existing one.

## 3. Sync and microphone permission

```bash
npm run android:setup
npm run android:check
npm run android:sync
```

The setup script adds `RECORD_AUDIO`, `INTERNET`, and the Android speech-recognition
service query to `android/app/src/main/AndroidManifest.xml`. It keeps a `.bak` copy before
its first edit.

## 4. Build the debug APK

Windows:

```bash
cd android
gradlew.bat assembleDebug
```

macOS/Linux:

```bash
cd android
./gradlew assembleDebug
```

APK output:

`android/app/build/outputs/apk/debug/app-debug.apk`

## 5. How the speech files connect

- `src/app/core/native-mic.ts`: permission-state helpers and error mapping.
- `src/app/core/native-speech.ts`: Capacitor plugin adapter and Android microphone access.
- `src/app/core/transcript.ts`: transcript selection, duplicate handling and final/interim separation.
- `src/app/services/speech.service.ts`: shared Angular service used by the voice UI and Lela conversation service.

Chat-only mode should not call `SpeechService.listen()` or `SpeechService.speak()`.
The existing voice screen continues using the shared service.

## Notes

- The Android speech service may require the Google app / speech recognition service and
  internet access, depending on the phone and installed language packs.
- Speech recognition accuracy depends on the phone, language model, microphone and
  background noise; code cannot guarantee that every spoken word is recognized.
- Test the microphone permission popup and recognition on a real Android phone.
- The source package includes Capacitor configuration and plugin dependencies, but the
  generated `android/` folder must be created on the computer with the Android toolchain.


## Android speech output (Lela voice)

Lela uses the native Capacitor text-to-speech engine in the Android APK, rather than depending on Android WebView speech synthesis. The app uses the installed Android English voice (prefers Indian English when available). If the phone has no English voice installed, open Android Settings → General management / Language & input → Text-to-speech output, choose Google Speech Services, and install an English (India) voice. Then close and reopen Lela.

After changing speech code or the app icon, rebuild and sync the Android project:

```bash
npm install
npm run build
npx cap sync android
```

The My Dictionary result cards also include a speaker button. It plays the online dictionary audio when available and falls back to the device's English voice for locally stored words.
