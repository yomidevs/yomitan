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

- [eslint.config.js](eslint.config.js) rules are used for JavaScript files.
- [.stylelintrc.json](.stylelintrc.json) rules are used for CSS files.
- [.htmlvalidate.json](.htmlvalidate.json) rules are used for HTML files.

In addition, the [Markdown All in One VSCode extension](https://github.com/yzhang-gh/vscode-markdown) is used for formatting markdown files and automatically updating the table of contents.

## Commit Signing

We highly recommend signing your commits in git.

While it's possible to use GPG for this, we recommend using SSH keys for your signing. Furthermore, if you have appropriate hardware support (which most modern machines do), we recommend storing the key in a hardware TPM so it's impossible for malware to steal it off your machine.

### Understanding why

GitHub already requires a key when you connect to it for basic git operations (pull, push, etc.). They call this the "authentication key" and it is an SSH key. You presumably already have one of these if you have ever used GitHub for anything before.

The commit signing key is different, and is used for signing the contents of a commit. This is important because it gives us much more useful git history where we actually have guarentees about who wrote what parts of the code. With no commit signing, it is easy with someone with push access to include commits with fake author names etc., which can be quite troubling when trying to figure out what has happened during a security incident. (See [this article](https://withblue.ink/2020/05/17/how-and-why-to-sign-git-commits.html) for more.)

### Creating the SSH key for signing

- On Mac, you can use [secretive](https://github.com/maxgoedjen/secretive) to have Secure Enclave-backed SSH operations.
- On Linux, you can use [ssh-tpm-agent](https://github.com/Foxboron/ssh-tpm-agent) to use your hardware TPM for SSH operations.
- On any OS, you can use a [YubiKey for SSH operations](https://developers.yubico.com/SSH/Securing_SSH_with_FIDO2.html). A YubiKey is arguably slightly more secure than a normal TPM, especially if you get a YubiKey bio, but in our threat model we consider them to be equivalent so there is no need to buy one if you already have a TPM.
- As a last resort if you're on old hardware and also don't have money to buy a YubiKey, you can create the SSH key on disk as opposed to in a TPM, but it's much more exposed to malware and supply chain attacks (e.g., a malcious npm package that steals SSH keys etc).

When generating the signing key, we recommend requiring user verification (i.e., entering a PIN or presenting a biometric). However for the "authentication key" (the normal SSH key you use to do non-signed operations with GitHub (like pulls)), we do not consider it as important to have user verification as many of those operations are not very sensitive, and it can be annoying to present your verification factor when just doing a pull. Of course it doesn't hurt to have extra user verification security-wise as it's also used for pushes, but the malicious things that could be pushed would be limited since at most the attacker could remove some signed commits, but not create any.

### Exposing your SSH key to git for commit signing

Once you have set up your SSH key (either using the above hardware-backed methods for optimal security, or just a normal on-disk key if you don't have a TPM available in your hardware), you can expose it to git for signing operations as follows:

```
git config --global gpg.format ssh
git config --global user.signingkey /path/to/key
git config --global commit.gpgsign true
```

(Confusingly the option names have 'gpg' in them, but rest assured GPG is not involved once you switch the format to SSH with the first command.)

### Registering your SSH key with GitHub

Go to [https://github.com/settings/keys](https://github.com/settings/keys) and click "Add new SSH key". On the following page, make sure to change "Key type" to "Signing key". Then paste the public key into the textbox.

With this, you are done and your commits should be signed (which you can see on the GitHub interface with the "Verified" green mark next to your commits).
