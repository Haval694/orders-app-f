# Orderakan build guide

This project is ready for Expo EAS builds.

- The project root is the directory containing this file, `package.json`, `app.config.ts`, and `eas.json`.
- If connecting a GitHub repository where these files are in a subdirectory, set the EAS Base directory to that subdirectory.
- Android preview APK: choose `Android` and profile `preview`.
- Android/ iOS store builds: choose profile `production`.
- EAS manages signing credentials when prompted.

The app uses local device storage for orders and months; data does not sync between devices.
