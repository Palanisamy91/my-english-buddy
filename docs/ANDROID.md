# Android app: microphone setup, build, install and test

## Why there was no microphone popup
Android's WebView (the browser inside the app) has **no speech recognition**, and Android only shows the microphone popup when the app *asks for* the `RECORD_AUDIO` permission. Before this update the app never asked, so nothing happened. Now, inside the Android app:

1. When you tap the microphone, the app **checks** the permission first.
2. If it is not allowed yet, Android's **popup** is shown.
3. If you tap **Deny** once, the app explains why it needs the microphone and has an **Allow microphone** button that asks again.
4. If you chose **Don't ask again** (or turned it off in Settings), Android will not show the popup any more. The app then shows steps and an **Open app settings** button that opens this app's page in Android Settings. When you come back, it checks again by itself.
5. Other problems (no speech service on the phone, no internet, microphone busy) have their own clear messages. Typing always still works.

Speech **input** (the device's recogniser, through the `@capacitor-community/speech-recognition` plugin) and Lela's **spoken voice** (the device's text-to-speech) are separate features.

## One-time setup (on your computer)

Run these in the project folder. Use the **same major version** as your Capacitor (for example, if `npx cap --version` says 7.x, install `@7`):

```bash
npm install
npm install @capacitor/core @capacitor-community/speech-recognition capacitor-native-settings
# (if the plugin's major version does not match your Capacitor, use e.g. @capacitor-community/speech-recognition@^7)
```

Note: if you extracted the new project ZIP over your folder, `package.json` was replaced, so run the second command again even if you installed these before. If your project has no `android` folder yet: `npm install -D @capacitor/cli @capacitor/android`, `npx cap init "My English Buddy" com.example.englishbuddy --web-dir=dist/my-english-buddy/browser`, then `npm run build` and `npx cap add android`.

## Fix the Android manifest

```bash
npm run android:check     # shows what is missing, changes nothing
npm run android:setup     # adds it (keeps AndroidManifest.xml.bak)
```

It makes sure `android/app/src/main/AndroidManifest.xml` contains (inside `<manifest>`):

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<queries>
    <intent>
        <action android:name="android.speech.RecognitionService" />
    </intent>
</queries>
```

(`<queries>` lets Android 11 and newer see the phone's speech service.) You can also paste these lines yourself.

## Build the APK

```bash
npm run android:sync       # builds the web app, checks the manifest, copies everything into the Android project
cd android
./gradlew assembleDebug   # on Windows: gradlew.bat assembleDebug
```

The APK is at `android/app/build/outputs/apk/debug/app-debug.apk`. (Or: `npx cap open android`, then **Build > Build Bundle(s) / APK(s) > Build APK(s)**.)

## Install on a phone

- With a USB cable and **USB debugging** on: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
- Or copy the APK to the phone, open it, and allow "Install unknown apps" when Android asks.
- If an older version of the app is installed and the microphone seems stuck on "blocked", uninstall it first (this also resets the permission).

## Test checklist (do this on the phone)

1. Open the app, go to **Speak & correct** (or **Lela**), tap the microphone. **Android's microphone popup must appear.** Tap Allow. Say a sentence: the live text appears, then the full sentence.
2. Uninstall, install again, tap the microphone, tap **Deny**. A message and an **Allow microphone** button appear; tapping it shows the popup again.
3. Tap the microphone, choose **Don't ask again** (second denial). The **Open app settings** help box appears. Tap the button: Settings > Permissions > Microphone > Allow. Return to the app: the box disappears and the microphone works.
4. Turn off internet and tap the microphone: if your phone's recogniser needs internet, you get a clear message (typing still works).
5. Lela: tap Start. You hear her voice (settings > Voice settings > Preview). Tap the microphone and answer. History, vocabulary and conversations still work.

## What was and was not tested

Tested (in a computer browser with a **simulated** Android plugin that follows Android's real permission rules): the permission check before listening, the popup request, deny once, deny for good, opening App Settings, coming back from Settings, the no-speech-service and network errors, live and final text, and that the browser version is unchanged.

**Not tested:** a real phone, the real plugin, the real Android popup, and building the APK. This was written without an Android SDK, so build and test it as in the checklist above and tell me what happens.
