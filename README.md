# Yomitan

[![Chrome Release](<https://img.shields.io/chrome-web-store/v/likgccmbimhjbgkjambclfkhldnlhbnn?logo=Google%20Chrome&logoColor=lightblue&color=lightblue&label=chrome%20release%20(stable)>)](https://chrome.google.com/webstore/detail/yomitan/likgccmbimhjbgkjambclfkhldnlhbnn)
[![Firefox Release](<https://img.shields.io/amo/v/yomitan?logo=Firefox&color=orange&label=firefox%20release%20(stable)>)](https://addons.mozilla.org/en-US/firefox/addon/yomitan/)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/themoeway/yomitan/badge)](https://securityscorecards.dev/viewer/?uri=github.com/themoeway/yomitan)
[![Discord](https://dcbadge.vercel.app/api/server/UGNPMDE7zC?style=flat)](https://discord.gg/UGNPMDE7zC)

:wave: **Yomitan is [the successor](https://foosoft.net/posts/passing-the-torch-to-yomitan/) to Yomichan** ([migration guide](./docs/yomichan-migration.md#migrating-from-yomichan)) which was [sunset](https://foosoft.net/posts/sunsetting-the-yomichan-project/) by its owner on Feb 26, 2023. We have made a number of [foundational changes](#changes) to ensure **the project stays alive, works on latest browser versions, and is easy to contribute to**.

📢 **New contributors [welcome](#contributing)!**

📢 **Interested in adding a new language to Yomitan? See [here](./docs/development/language-features.md) for thorough documentation!**

## What is Yomitan?

Yomitan turns your web browser into a tool for building Japanese language literacy by helping you **read** texts that would otherwise be too difficult to tackle.

Yomitan provides powerful features not available in other browser-based dictionaries:

- 💬 Interactive popup definition window for displaying search results.
- 🔊 Built-in native audio sources for Japanese words with the ability to add your own [custom audio sources](./docs/audio.md).
- ✍️ Kanji stroke order diagrams are just a click away.
- 📝 [Automatic flashcard creation](./docs/anki-integration.md#anki-integration) for the [Anki](https://apps.ankiweb.net/) flashcard program via the [AnkiConnect](https://foosoft.net/projects/anki-connect) plugin.
- 🔍 Custom search page for easily executing custom search queries.
- 📖 Support for multiple dictionary formats including [EPWING](https://ja.wikipedia.org/wiki/EPWING) via the [Yomitan Import](https://github.com/themoeway/yomitan-import) tool.
- ✨ Clean, modern code makes it easy for developers to [contribute](#contributing) new features and languages.

[![Term definitions](img/ss-terms-thumb.png)](img/ss-terms.png)
[![Kanji information](img/ss-kanji-thumb.png)](img/ss-kanji.png)
[![Dictionary options](img/ss-dictionaries-thumb.png)](img/ss-dictionaries.png)
[![Anki options](img/ss-anki-thumb.png)](img/ss-anki.png)

## Helpful information

- [Migrating from Yomichan (legacy)](./docs/yomichan-migration.md#migrating-from-yomichan)
- [Frequently asked questions](./docs/faq.md#frequently-asked-questions)
- [Recommended and custom dictionary import guide](./docs/dictionaries.md#dictionaries)
- [Anki integration and flashcard creation guide](./docs/anki-integration.md#anki-integration)
- [Keyboard shortcuts](./docs/keyboard-shortcuts.md)
- [Advanced options, including MeCab](./docs/advanced-options.md#advanced-options)

## Installation

Yomitan comes in two flavors: _stable_ and _testing_. New changes are initially introduced into the _testing_ version, and after some time spent ensuring that they are relatively bug free, they will be promoted to the _stable_ version. If you are technically savvy and don't mind [submitting issues](https://github.com/themoeway/yomitan/issues/new/choose) on GitHub, try the _testing_ version; otherwise, the _stable_ version will be your best bet. Check [contributing](#contributing) for more information on how to help.

- **Google Chrome**

  - [stable](https://chrome.google.com/webstore/detail/yomitan/likgccmbimhjbgkjambclfkhldnlhbnn)
  - [testing](https://chrome.google.com/webstore/detail/yomitan-development-build/glnaenfapkkecknnmginabpmgkenenml)

- **Mozilla Firefox**
  - [stable](https://addons.mozilla.org/en-US/firefox/addon/yomitan/)
  - [testing](https://github.com/themoeway/yomitan/releases) ※

※ Unlike Chrome, Firefox does not allow extensions meant for testing to be hosted in the marketplace. You will have to download the desired version and side-load it yourself. You only need to do this once, and you will get updates automatically.

## Basic Usage

1.  Click the <img src="ext/images/yomitan-icon.svg" width="16" height="16" alt="yomitan icon"> _Yomitan_ button in the browser bar to open the quick-actions popup.

    <img src="resources/images/browser-action-popup1.png" alt="yomitan main popup">

    - The <img src="ext/images/cog.svg" width="16" height="16" alt="cog"> _cog_ button will open the Settings page.
    - The <img src="ext/images/magnifying-glass.svg" width="16" height="16" alt="magnifying glass"> _magnifying glass_ button will open the Search page.
    - The <img src="ext/images/question-mark-circle.svg" width="16" height="16" alt="question mark symbol"> _question mark_ button will open the Information page.
    - The <img src="ext/images/profile.svg" width="16" height="16" alt="profile icon"> _profile_ button will appear when multiple profiles exist, allowing the current profile to be quickly changed.

2.  Import the dictionaries you wish to use for term and kanji searches; head over to the [dictionary docs](./docs/dictionaries.md) to get set up! If you do not have any dictionaries installed or enabled, Yomitan will warn you that it is not ready for use by displaying an orange exclamation mark over its icon. This exclamation mark will disappear once you have installed and enabled at least one dictionary.

    <img src="resources/images/settings-dictionaries-popup.png" width="300" alt="custom dictionaries list">

3.  Webpage text can be scanned by moving the cursor while holding a modifier key, which is <kbd>Shift</kbd> by default. If definitions are found for the text at the cursor position, a popup window containing term definitions will open. This window can be dismissed by clicking anywhere outside of it.

    <img src="resources/images/search-popup-terms.png" width="300" alt="popup with search terms">

4.  Click on the <img src="ext/images/play-audio.svg" width="16" height="16" alt="loudspeaker icon"> _speaker_ button to hear the term pronounced by a native speaker. If an audio sample is not available, you will hear a short click instead. For more options, see [Audio Configuration](./docs/audio.md).

5.  Click on individual kanji in the term definition results to view additional information about those characters, including stroke order diagrams, readings, meanings, and other useful data.

    <img src="resources/images/search-popup-kanji.png" width="300" alt="popup with kanji details">

To further enhance your Yomitan experience, it's worth [integrating with Anki](./docs/anki-integration.md), a spaced-repetition flashcard program to help solidify the words you encounter.

## Changes

> While we have made some substantial changes, the majority of the extension's functionality is thanks to hard work of [FooSoft](https://foosoft.net/) and many other incredible open source contributors from 2016-2023.

Major changes:

- 🌐 Added multi-language support!
- 💪 Completed the Manifest V2 → V3 transition, [read why here](https://developer.chrome.com/blog/resuming-the-transition-to-mv3/).
- ⚡ Switched to using ECMAScript modules and npm-sourced dependencies.
- 🔧 Implemented an end-to-end CI/CD pipeline.
- 🧪 Switched to standard testing frameworks, vitest and playwrights.

In addition, we have made important bug fixes and minor enhancements:

- ⚡ Improved dictionary import speeds by 2x~10x.
- 📚 Added functionality to import/export multiple dictionaries, enabling portability across devices.
- ✨ And [more](https://github.com/themoeway/yomitan/pulls?q=is%3Apr+is%3Amerged+-label%3Aarea%2Fdependencies+-label%3Akind%2Fmeta).

Since the owner requested forks be uniquely named, we have chosen a new name, _Yomitan_ (_-tan_ is an honorific used for anthropomorphic moe characters).

## Contributing

🚀 **Dip your toes into contributing by looking at issues with the label [good-first-issue](https://github.com/themoeway/yomitan/issues?q=is%3Aopen+is%3Aissue+label%3Agood-first-issue).**

Since this is a distributed effort, we **highly welcome new contributors**! Feel free to browse the [issue tracker](https://github.com/themoeway/yomitan/issues), and read our [contributing guidelines](./CONTRIBUTING.md).

Here are some ways anyone can help:

- Try using the Yomitan dev build. Not only do you get cutting edge features, but you can help uncover bugs and give feedback to developers early on.
- Document any UI/UX friction in Github Issues. We're looking to make Yomitan more accessible to non-technical users.
- All the issues in `area/bug` older than 2 months need help reproducing. If anything interests you, please try to reproduce it and report your results. We can't easily tell if these issues are one-off, have since been resolved, or are no longer relevant.

> The current active maintainers of Yomitan spend a lot of their time debugging and triaging issues. When someone files a bug report, we need to assess the frequency and severity of the bug. It is extremely helpful if we get multiple reports of people who experience a bug or people who can contribute additional detail to an existing bug report.

If you're looking to code, please let us know what you plan on working on before submitting a Pull Request. This gives the core maintainers an opportunity to provide feedback early on before you dive too deep. You can do this by opening a Github Issue with the proposal.

Some contributions we always appreciate:

- Well-written tests covering different functionalities. This includes [playwright tests](https://github.com/themoeway/yomitan/tree/master/test/playwright), [benchmark tests](https://github.com/themoeway/yomitan/tree/master/benches), and unit tests.
- Increasing our type coverage.
- More and better documentation!

Information on how to setup and build the codebase can be found [here](./CONTRIBUTING.md#setup).

If you want to add or improve support for a language, read the documentation on [language features](./docs/development/language-features.md).

Feel free to join us on [TheMoeWay Discord 🐇](https://discord.gg/UGNPMDE7zC) at [#yomitan-development](https://discord.com/channels/617136488840429598/1081538711742844980).

## Licenses

Required licensing notices for this project follow below:

- **EDRDG License** \
  This package uses the [EDICT](https://www.edrdg.org/jmdict/edict.html) and
  [KANJIDIC](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) dictionary files. These files are the property of
  the [Electronic Dictionary Research and Development Group](https://www.edrdg.org/), and are used in conformance with
  the Group's [license](https://www.edrdg.org/edrdg/licence.html).

- **Kanjium License** \
  The pitch accent notation, verb particle data, phonetics, homonyms and other additions or modifications to EDICT,
  KANJIDIC or KRADFILE were provided by Uros Ozvatic through his free database.

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
