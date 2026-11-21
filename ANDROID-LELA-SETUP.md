# Lela Android app setup

The Android application display name is configured as `Lela` in `capacitor.config.ts`.
The existing application ID is intentionally preserved as `com.palanisamy.myenglishbuddy` so an installed app can be updated rather than installed as a second app.

## Install dependencies

```bash
npm install
```

This project requires `@angular/forms`, Capacitor 8, the Capacitor speech-recognition plugin, and `capacitor-native-settings`.

## Build and create/sync Android

```bash
npm run build
npx cap sync android
```

If the `android` folder does not exist yet, run this once before syncing:

```bash
npx cap add android
```

## Generate the Android launcher icon

The 1024x1024 Leela portrait source is at `resources/icon.png`.
Run:

```bash
npm run android:assets
npx cap sync android
```

## Build debug APK on Windows

```bash
cd android
gradlew.bat assembleDebug
```

APK output:
`android/app/build/outputs/apk/debug/app-debug.apk`

Do not change `appId` if you want this APK to update the previously installed app. Android's display name is `Lela`.
