# Yomitan

[![Get Yomitan for Chrome](<https://img.shields.io/chrome-web-store/v/likgccmbimhjbgkjambclfkhldnlhbnn?logo=Google%20Chrome&style=for-the-badge&logoColor=lightblue&color=lightblue&label=get%20yomitan%20for%20chrome%20(stable)>)](https://chrome.google.com/webstore/detail/yomitan/likgccmbimhjbgkjambclfkhldnlhbnn)
[![Get Yomitan for Firefox](<https://img.shields.io/amo/v/yomitan?logo=Firefox&style=for-the-badge&color=orange&label=get%20yomitan%20for%20firefox%20(stable)>)](https://addons.mozilla.org/en-US/firefox/addon/yomitan/)
[![Get Yomitan for Edge](https://img.shields.io/badge/dynamic/json?logo=puzzle&label=get%20yomitan%20for%20edge&style=for-the-badge&query=%24.version&url=https%3A%2F%2Fmicrosoftedge.microsoft.com%2Faddons%2Fgetproductdetailsbycrxid%2Fidelnfbbmikgfiejhgmddlbkfgiifnnn)](https://microsoftedge.microsoft.com/addons/detail/yomitan/idelnfbbmikgfiejhgmddlbkfgiifnnn)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/yomidevs/yomitan/badge?style=for-the-badge)](https://securityscorecards.dev/viewer/?uri=github.com/yomidevs/yomitan)

[![Discord](https://dcbadge.vercel.app/api/server/YkQrXW6TXF?style=for-the-badge)](https://discord.gg/YkQrXW6TXF)

# Visit [yomitan.wiki](https://yomitan.wiki) to learn more!

:wave: **Yomitan is [the successor](https://foosoft.net/posts/passing-the-torch-to-yomitan/) to Yomichan** ([migration guide](./docs/yomichan-migration.md#migrating-from-yomichan)) which was [sunset](https://foosoft.net/posts/sunsetting-the-yomichan-project/) by its owner on Feb 26, 2023. We have made a number of foundational changes to ensure **the project stays alive, works on latest browser versions, and is easy to contribute to**.

📢 **New contributors [welcome](#contributing)!**

📢 **Interested in adding a new language to Yomitan? See [here](./docs/development/language-features.md) for thorough documentation!**

## What is Yomitan?

Yomitan turns your web browser into a tool for building language literacy by helping you **read** texts that would otherwise be too difficult to tackle in [a variety of supported languages](./docs/supported-languages.md).

Yomitan provides powerful features not available in other browser-based dictionaries:

- 💬 Interactive popup definition window for displaying search results.
- 🔊 Built-in native pronunciation audio with the ability to add your own [custom audio sources](./docs/audio.md).
- ✍️ Kanji stroke order diagrams are just a click away.
- 📝 [Automatic flashcard creation](./docs/anki-integration.md#anki-integration) for the [Anki](https://apps.ankiweb.net/) flashcard program via the [AnkiConnect](https://foosoft.net/projects/anki-connect) plugin.
- 🔍 Custom search page for easily executing custom search queries.
- 📖 Support for multiple dictionary formats including [EPWING](https://ja.wikipedia.org/wiki/EPWING) via the [Yomitan Import](https://github.com/yomidevs/yomitan-import) tool.
- ✨ Clean, modern code makes it easy for developers to [contribute](#contributing) new features and languages.

[![Term definitions](img/ss-terms-thumb.png)](img/ss-terms.png)
[![Kanji information](img/ss-kanji-thumb.png)](img/ss-kanji.png)
[![Dictionary options](img/ss-dictionaries-thumb.png)](img/ss-dictionaries.png)
[![Anki options](img/ss-anki-thumb.png)](img/ss-anki.png)

## Documentation/How To

**Please visit the [Yomitan Wiki](https://yomitan.wiki) for the most up-to-date usage documentation.**

### Developer Documentation

- Dictionaries
  - 🛠️ [Making Yomitan Dictionaries](./docs/making-yomitan-dictionaries.md)
- Anki Integration
  - 🔧 [Anki handlebar templates](./docs/templates.md)
- Advanced Features
- Troubleshooting
  - 🕷️ [Known browser bugs](./docs/browser-bugs.md)

## Installation

Yomitan comes in two flavors: _stable_ and _testing_. New changes are initially introduced into the _testing_ version, and after some time spent ensuring that they are relatively bug free, they will be promoted to the _stable_ version. If you are technically savvy and don't mind [submitting issues](https://github.com/yomidevs/yomitan/issues/new/choose) on GitHub, try the _testing_ version; otherwise, the _stable_ version will be your best bet. Check [contributing](#contributing) for more information on how to help.

- **Google Chrome**

  - [stable](https://chrome.google.com/webstore/detail/yomitan/likgccmbimhjbgkjambclfkhldnlhbnn)
  - [testing](https://chrome.google.com/webstore/detail/yomitan-development-build/glnaenfapkkecknnmginabpmgkenenml)

- **Mozilla Firefox**

  - [stable](https://addons.mozilla.org/en-US/firefox/addon/yomitan/)
  - [testing](https://github.com/yomidevs/yomitan/releases) ※

- **Microsoft Edge**
  - [stable](https://microsoftedge.microsoft.com/addons/detail/yomitan/idelnfbbmikgfiejhgmddlbkfgiifnnn)
  - Testing: Coming soon

※ Unlike Chrome, Firefox does not allow extensions meant for testing to be hosted in the marketplace. You will have to download the desired version and side-load it yourself. You only need to do this once, and you will get updates automatically.

## Contributing

🚀 **Dip your toes into contributing by looking at issues with the label [good first issue](https://github.com/yomidevs/yomitan/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22).**

Since this is a distributed effort, we **highly welcome new contributors**! Feel free to browse the [issue tracker](https://github.com/yomidevs/yomitan/issues), and read our [contributing guidelines](./CONTRIBUTING.md).

Here are some ways anyone can help:

- Try using the Yomitan dev build. Not only do you get cutting edge features, but you can help uncover bugs and give feedback to developers early on.
- Document any UI/UX friction in Github Issues. We're looking to make Yomitan more accessible to non-technical users.
- All the issues in `area/bug` older than 2 months need help reproducing. If anything interests you, please try to reproduce it and report your results. We can't easily tell if these issues are one-off, have since been resolved, or are no longer relevant.

> The current active maintainers of Yomitan spend a lot of their time debugging and triaging issues. When someone files a bug report, we need to assess the frequency and severity of the bug. It is extremely helpful if we get multiple reports of people who experience a bug or people who can contribute additional detail to an existing bug report.

If you're looking to code, please let us know what you plan on working on before submitting a Pull Request. This gives the core maintainers an opportunity to provide feedback early on before you dive too deep. You can do this by opening a Github Issue with the proposal.

Some contributions we always appreciate:

- Well-written tests covering different functionalities. This includes [playwright tests](https://github.com/yomidevs/yomitan/tree/master/test/playwright), [benchmark tests](https://github.com/yomidevs/yomitan/tree/master/benches), and unit tests.
- Increasing our type coverage.
- More and better documentation!

Information on how to setup and build the codebase can be found [here](./CONTRIBUTING.md#setup).

If you want to add or improve support for a language, read the documentation on [language features](./docs/development/language-features.md).

Feel free to join us on the [Yomitan Discord](https://discord.gg/YkQrXW6TXF).

## Third-Party Libraries

Yomitan uses several third-party libraries to function.

<!-- The following table is generated using the command `npm run license-report:markdown`. -->

| Name                | Installed version | License type | Link                                             |
| :------------------ | :---------------- | :----------- | :----------------------------------------------- |
| @zip.js/zip.js      | 2.7.32            | BSD-3-Clause | git+https://github.com/gildas-lormeau/zip.js.git |
| dexie               | 3.2.4             | Apache-2.0   | git+https://github.com/dfahlander/Dexie.js.git   |
| dexie-export-import | 4.0.7             | Apache-2.0   | git+https://github.com/dexie/Dexie.js.git        |
| yomitan-handlebars  | 1.0.0             | MIT          | n/a                                              |
| parse5              | 7.1.2             | MIT          | git://github.com/inikulin/parse5.git             |
| wanakana            | 5.3.1             | MIT          | git+ssh://git@github.com/WaniKani/WanaKana.git   |
| hangul.js           | 0.2.6             | MIT          | git+https://github.com/e-/Hangul.js.git          |
