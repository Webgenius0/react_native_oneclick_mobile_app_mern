# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds application code: `components/`, `pages/`, `helpers/`, `services/`, `store/`, and `translate/`.
- Entry points live at the repo root: `App.js`, `AppNavigator.js`, `index.js`.
- Native projects are in `android/` and `ios/`.
- Tests live in `__tests__/`.
- Patches are managed in `patches/` and applied by `patch-package`.

## Build, Test, and Development Commands
- `yarn start`: start Metro bundler.
- `yarn android`: run the Android app on a device/emulator.
- `yarn ios`: run the iOS app (requires CocoaPods install).
- `yarn test`: run Jest tests.
- `yarn lint`: run ESLint.
- `yarn apk`: build a release APK via Gradle.
- `yarn podinstall`: iOS pods with logger shim (`RUBYOPT=-rlogger`).
- `yarn install`: installs JS deps and applies `patch-package`.

## Coding Style & Naming Conventions
- JavaScript/React Native code with ES modules; prefer existing patterns.
- Formatting follows Prettier (`.prettierrc.js`): single quotes, trailing commas, compact brackets.
- ESLint config extends `@react-native`.
- Use 2-space indentation and semicolons to match existing files.
- Components and screens use `PascalCase` filenames (e.g., `src/pages/Home.js`).
- Hooks and stores use `useX` naming (e.g., `src/store/useUserStore.js`).

## Testing Guidelines
- Jest is configured with the `react-native` preset.
- Test files live in `__tests__/` and use `*.test.js`/`*.test.tsx`.
- No explicit coverage gate; add tests for new logic when practical.

## Commit & Pull Request Guidelines
- Current history only includes “Initial commit”; no established convention.
- Use short, imperative summaries (optionally add scope like `android:` or `src:`).
- PRs should include: summary, platforms tested, and screenshots for UI changes.

## Security & Configuration Tips
- Keep secrets out of the repo; avoid adding new keys to `android/` or `ios/`.
- App configuration is in `config.js` and native configs; keep sensitive data in local configs or CI secrets.
