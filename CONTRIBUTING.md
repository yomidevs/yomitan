# Issues and Features

Issues reported on [GitHub](https://github.com/yomidevs/yomitan/issues) should include information about:

- What the problem, question, or request is.
- What browser is being used.
- What version of Yomitan is being used.
- If applicable, an export of the settings file.

# Development

Contributions are welcome from any developers who would like to help out.
Below are a few guidelines to ensure contributions have a good level of quality and consistency:

- Open GitHub issues to discuss large features before writing code.
- Follow the [conventions and style](#style) of the existing code.
- Test changes using the continuous integration tests included in the repository.
- Write clean, modern ES6 code (`const`/`let`, `async`/`await`, arrow functions, etc.)
- Large pull requests without a clear scope will not be merged.
- Incomplete or non-standalone features will not be merged.

## Setup

Yomitan uses [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) tools for building and testing.
After installing these, the development environment can be set up by running `npm ci` and subsequently `npm run build`.

## Testing

Unit tests, integration tests, and various other tests can be executed by running `npm test`.
Other individual tests can be looked up in the [package.json](package.json) file, and the source for specific tests
can be found in the [test](test) directory

### Playwright

Steps to run [playwright](https://playwright.dev/) tests locally:

1. Run `npx playwright install` to install the headless browsers
2. Copy the dictionary test data located in the `dictionaries` branch to a directory named `dictionaries` via `git clone --branch dictionaries git@github.com:yomidevs/yomitan.git dictionaries` ([source](https://github.com/yomidevs/yomitan/blob/086e043856ad54cf13cb65f9ba4c63afe8a22cc3/.github/workflows/playwright.yml#L52-L57)).
3. Now you can run `npx playwright test`. The first run might produce some benign errors complaining about `Error: A snapshot doesn't exist at ...writing actual.`, but subsequent runs should succeed.

## Building

By default, the development repository is configured for Chrome, and the [ext](ext) directory can be directly
loaded as an unpacked extension by Chrome. This way, development does not require any additional build steps,
and most changes will be automatically updated by the browser. Depending on what files were changed,
the extension may sometimes need to be reloaded before the changes take effect.

There are two scripts to build the extension to a packaged file for various build targets:

- [build.bat](build.bat) on Windows
- [build.sh](build.sh) on Linux

Both of these files are convenience scripts which invoke <code>node [dev/bin/build.js](dev/bin/build.js)</code>.
The build script can produce several different build files based on manifest configurations defined in
[manifest-variants.json](dev/data/manifest-variants.json).
Several command line arguments are available for these scripts:

- `[target]` - Builds a specific target.
- `--all` - Builds all targets specified in [manifest-variants.json](dev/data/manifest-variants.json).
- `--default` - Restores the default manifest file.
- `--manifest <target>` - Overwrites `ext/manifest.json` with the manifest variant for the specified build target.
- `--dryRun` - Runs the full build process (excluding zip building), checking that the configuration is valid.
- `--dryRunBuildZip` - If `--dryRun` is also specified, zip building will also be performed in memory; no files are created.
- `--version <version>` - Sets the version number in the extension manifest. Defaults to 0.0.0.0 if not set.

If no arguments are specified, the command is equivalent to `build.bat --all`.

### Loading an unpacked build into Chromium browsers

After building, you can load the compiled extension into Chromium browsers.

- Navigate to the [extensions page](chrome://extensions/)
- Turn on the toggle on the top right that says "Developer Mode"
- Click "Load Unpacked" on the top left
- Select the `ext` folder.

Immediately you should see the "Welcome" page!

Note: Yomitan may or may not update when you make and save new code changes locally. It depends on what file you've changed. Yomitan runs as collection of two programs. There is the background process called the "service worker" and there is the frontend called the "content_script". The frontend will reload on save, but to update the backend you need to click on the update icon next to the extension in `chrome://extensions/`. If you make changes to the manifest you will need to rerun `npm run build` to regenerate the manifest file.

### Build Tools

The build process can use the [7-zip](https://www.7-zip.org/) archiving tool to create the packed zip builds
if the 7-zip executable (either `7z` or `7za`) is found in the `PATH` environment variable.
Otherwise, the [JSZip](https://stuk.github.io/jszip/) API is used to generate the files.
7-zip typically provides better compression than JSZip, but the files are otherwise equivalent.

## Manifest

Manifest variants for different build targets are specified in [manifest-variants.json](dev/data/manifest-variants.json).
This file is used to generate the `ext/manifest.json` file included in the extension.
The generated `ext/manfiest.json` should not be committed.

## Style

Linting rules are defined for a few types of files, and validation is performed as part of the standard tests
run by `npm test` and the continuous integration process.

- [.eslintrc.json](.eslintrc.json) rules are used for JavaScript files.
- [.stylelintrc.json](.stylelintrc.json) rules are used for CSS files.
- [.htmlvalidate.json](.htmlvalidate.json) rules are used for HTML files.

In addition, the [Markdown All in One VSCode extension](https://github.com/yzhang-gh/vscode-markdown) is used for formatting markdown files and automatically updating the table of contents.
