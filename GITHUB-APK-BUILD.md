# Build the Lela APK with GitHub Actions

1. Extract this project ZIP.
2. Push the complete `my-english-buddy` folder contents to your GitHub repository's `main` branch (keep `.github/workflows/build-android-apk.yml`).
3. Open the repository on GitHub and select **Actions**.
4. Select **Build Lela Android APK** and click **Run workflow**. A push to `main` that changes app files also starts a build.
5. Wait until the workflow finishes successfully. Open the completed run and download **Lela-Android-APK** under **Artifacts**.
6. Extract the artifact ZIP. Install `app-debug.apk` on your Android phone.

The workflow installs npm dependencies, builds Angular, creates the Capacitor Android project, adds INTERNET and RECORD_AUDIO permissions, syncs the app, builds the debug APK, and uploads it as an artifact. The APK is not built locally in this ZIP; GitHub Actions builds it when you run the workflow.
