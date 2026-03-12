# npm Scripts

This file documents the scripts available in the [package.json](../../package.json) file.
Scripts can be executed by running `npm run <name>`.

- `anki:css-json:write`

  Writes Anki structured content styling json for use when sending stuctured content dictionaries to Anki.

  CSS rules are taken from `ext/css/structured-content.css` and converted into json.

  CSS rule overrides and exclusions can be set in `dev/data/structured-content-overrides.css`.

- `bench`
  Runs performance benchmarks.

- `build`
  Builds packages for all of the primary build targets and outputs them to the builds folder in the root project directory.

- `build:libs`
  Rebuilds all of the third-party dependencies that the extension uses.

- `build:serve:firefox-android`

  > `adb` and `web-ext` are required to be installed on your computer for this command to work!

  Builds for Firefox and then uses `web-ext` to serve the extension through `adb` to Firefox for Android. Prepend the environment variables WEB_EXT_TARGET and WEB_EXT_ADB_DEVICE for the command to succeed (example: `WEB_EXT_TARGET="firefox-android" WEB_EXT_ADB_DEVICE="emulator-5554" npm run build:serve:firefox-android`). WEB_EXT_TARGET will be "firefox-android" for vanilla Firefox, and you can find the value for WEB_EXT_ADB_DEVICE by running the command `adb devices`.

  [Get started debugging Firefox for Android (recommended)](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/#test-and-degug-an-extention)

  [`web-ext run` documentation](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#web-ext-run)

- `build:serve:kiwi-browser`

  > `adb` is required to be installed on your computer for this command to work!

  Builds for Chromium and then uses `adb` to `push` the built zip file over to `/sdcard/yomitan`. You can then open up Kiwi Browser on the target phone and install the extension through that zip file.

- `test`
  Runs all of the tests.

- `test:fast`
  Runs most of the tests that are used more frequently in the typical development process.

- `test:static-analysis`
  Runs all of the static analysis tests (excluding JSON).

- `test:js`
  Runs [eslint](https://eslint.org/) on all of the JavaScript and TypeScript files in the project.

- `test:json`
  Runs all JSON tests.

- `test:json:format`
  Runs eslint on all of the JSON files in the project.

- `test:json:types`
  Performs type checking on all of the JSON files in the project.
  Running this script often takes a long time since it has to validate a lot of files with complex types.

- `test:css`
  Runs [stylelint](https://stylelint.io/) on all of the CSS files in the project.

- `test:html`
  Runs [html-validate](https://html-validate.org/) on all of the HTML files in the project.

- `test:md`
  Runs [prettier](https://prettier.io/) on all of the Markdown files in the project.

- `test:md:write`
  Uses prettier to fix all issues it encounters with files.

- `test:ts`
  Runs [TypeScript](https://www.typescriptlang.org/) validation on all of the JavaScript and TypeScript files in the project.

- `test:ts:main`
  Runs [TypeScript](https://www.typescriptlang.org/) validation on the files in the [ext](../../ext/) folder.

- `test:ts:dev`
  Runs [TypeScript](https://www.typescriptlang.org/) validation on the files in the [dev](../../dev/) folder.

- `test:ts:test`
  Runs [TypeScript](https://www.typescriptlang.org/) validation on the files in the [test](../../test/) folder.

- `test:ts:bench`
  Runs [TypeScript](https://www.typescriptlang.org/) validation on the files in the [benches](../../benches/) folder.

- `test:unit`
  Runs all of the unit tests in the project using [vitest](https://vitest.dev/).

- `test:unit:coverage`
  Runs unit tests with coverage enabled and writes coverage artifacts to `builds/coverage`.
  Includes a console text summary and a `coverage-summary.json` artifact for scripted monitoring.

- `test:unit:write`
  Overwrites the expected test output data for some of the larger tests.
  This usually only needs to be run when something modifies the format of dictionary entries or Anki data.

- `test:unit:options`
  Runs unit tests related to the extension's options and their upgrade process.

- `test:coverage`
  Runs `test:unit:coverage` and then prints a coverage monitor report with overall totals plus the lowest-covered files.
  Optional thresholds can be passed to the monitor script, e.g. `--fail-under=80`.

- `test:playwright`
  Runs Playwright tests.

- `test:playwright:integration`
  Runs Playwright integration tests in Chromium.

- `test:e2e:firefox-extension`
  Runs Firefox extension end-to-end validation for dictionary imports (installs the extension, imports two dictionaries, and verifies both remain installed).
  Prerequisites:

  - Firefox installed
  - geckodriver on `PATH`
  - Node.js 22
  - `selenium-webdriver` installed (`npm install --no-save selenium-webdriver@4.38.0`)
  - a built Firefox `.xpi` at `builds/manabitan-firefox-dev.xpi` (or set `MANABITAN_FIREFOX_XPI` to override)

- `test:e2e:chromium-anki-dedupe`
  Runs the dedicated Chromium Anki deduplication matrix using Playwright and a deterministic local mocked AnkiConnect endpoint.
  Mock-mode behavior:

  - No desktop Anki instance is required.
  - The suite starts a local HTTP mock AnkiConnect server and forces deterministic Anki settings through `optionsGetFull` + `setAllSettings`.
  - The suite imports a minimal deterministic dictionary fixture through runtime API and exercises the full dedupe matrix from the search UI.

  Prerequisites:

  - Chromium available for Playwright extension launch.
  - Node.js 22.
  - `sqlite3` on `PATH` (used to build the deterministic dictionary database fixture).

  Reports:

  - `builds/chromium-e2e-anki-dedupe-report.html` (+ `.json`)
  - `builds/extension-e2e-anki-dedupe-report.html` (combined desktop tabs)

- `test:e2e:firefox-anki-dedupe`
  Runs the dedicated Firefox Anki deduplication matrix using Selenium plus the same deterministic mocked AnkiConnect endpoint and expected-result matrix as Chromium.
  Mock-mode behavior:

  - No desktop Anki instance is required.
  - The suite points extension Anki settings at the local mock endpoint and validates save-button/UI dedupe affordances plus backend write actions.

  Prerequisites:

  - Firefox installed.
  - `geckodriver` on `PATH`.
  - Node.js 22.
  - `selenium-webdriver` installed (`npm install --no-save selenium-webdriver@4.38.0`).
  - built Firefox extension package (`builds/manabitan-firefox-dev.zip` or `.xpi`, or set `MANABITAN_FIREFOX_XPI`).
  - `sqlite3` on `PATH` (used to build the deterministic dictionary database fixture).

  Reports:

  - `builds/firefox-e2e-anki-dedupe-report.html` (+ `.json`)
  - `builds/extension-e2e-anki-dedupe-report.html` (combined desktop tabs)

- `test:e2e:firefox-android-anki-dedupe`
  Runs Firefox Android validation as `web-ext` device smoke plus the same maximal dedupe matrix executed as protocol-level contract checks using the shared mock/state model.
  This lane does not drive Android UI interactions for dedupe; it verifies contract behavior and expected write decisions.

  Prerequisites:

  - `adb` installed and a connected device/emulator.
  - `web-ext` available through `npx web-ext`.
  - Firefox for Android installed on device (or set `MANABITAN_ANDROID_AUTO_INSTALL_FIREFOX=1`).
  - built Firefox Android extension output (`builds/*-firefox-android`), or set `MANABITAN_ANDROID_SOURCE_DIR`.

  Reports:

  - `builds/firefox-android-e2e-anki-dedupe-report.html` (+ `.json`)

- `test:e2e:anki-dedupe`
  Nightly-grade aggregate launcher for the full dedupe coverage lanes:

  - Chromium UI matrix (`test:e2e:chromium-anki-dedupe`)
  - Firefox UI matrix (`test:e2e:firefox-anki-dedupe`)
  - Firefox Android smoke + protocol contract matrix (`test:e2e:firefox-android-anki-dedupe`)

- `test:build`
  Performs a dry run of the build process without generating any files.

- `license-report:html`
  Generates a file containing license information about the third-party dependencies the extension uses.
  The resulting file is located at ext/legal-npm.html.

- `license-report:markdown`
  Generates a Markdown table containing license information about the third-party dependencies the extension uses.
  This table is located in the [README.md](../../README.md#third-party-libraries) file

- `prepare`
  Sets up [husky](https://typicode.github.io/husky/) for some git pre-commit tasks.
