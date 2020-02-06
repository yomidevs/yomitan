# Yomichan #

Yomichan turns your web browser into a tool for building Japanese language literacy by helping you to decipher texts
which would be otherwise too difficult tackle. This extension is similar to
[Rikaichan](https://addons.mozilla.org/en-US/firefox/addon/rikaichan/) for Firefox and
[Rikaikun](https://chrome.google.com/webstore/detail/rikaikun/jipdnfibhldikgcjhfnomkfpcebammhp?hl=en) for Chrome, but it
stands apart in its goal of being a all-encompassing learning tool as opposed to a mere browser-based dictionary.

Yomichan provides advanced features not available in other browser-based dictionaries:

*   Interactive popup definition window for displaying search results.
*   On-demand audio playback for select dictionary definitions.
*   Kanji stroke order diagrams are just a click away for most characters.
*   Custom search page for easily executing custom search queries.
*   Support for multiple dictionary formats including [EPWING](https://ja.wikipedia.org/wiki/EPWING) via the [Yomichan Import](https://foosoft.net/projects/yomichan-import) tool.
*   Automatic note creation for the [Anki](https://apps.ankiweb.net/) flashcard program via the [AnkiConnect](https://foosoft.net/projects/anki-connect) plugin.
*   Clean, modern code makes it easy for developers to [contribute](https://github.com/FooSoft/yomichan) new features.

## Table of Contents ##

*   [Installation](https://foosoft.net/projects/yomichan/#installation)
*   [Dictionaries](https://foosoft.net/projects/yomichan/#dictionaries)
*   [Basic Usage](https://foosoft.net/projects/yomichan/#basic-usage)
*   [Custom Dictionaries](https://foosoft.net/projects/yomichan/#custom-dictionaries)
*   [Anki Integration](https://foosoft.net/projects/yomichan/#anki-integration)
    *   [Flashcard Configuration](https://foosoft.net/projects/yomichan/#flashcard-configuration)
    *   [Flashcard Creation](https://foosoft.net/projects/yomichan/#flashcard-creation)
*   [Keyboard Shortcuts](https://foosoft.net/projects/yomichan/#keyboard-shortcuts)
*   [Development](https://foosoft.net/projects/yomichan/#development)
    *   [Dependencies](https://foosoft.net/projects/yomichan/#dependencies)
*   [Frequently Asked Questions](https://foosoft.net/projects/yomichan/#frequently-asked-questions)
*   [Screenshots](https://foosoft.net/projects/yomichan/#screenshots)
*   [License](https://foosoft.net/projects/yomichan/#license)

## Installation ##

Yomichan comes in two flavors: *stable* and *testing*. Over the years, this extension has evolved to contain many
complex features, which have become increasingly difficult for me to test across different browsers, versions, and
environments. All new changes are initially introduced into the *testing* version, and when I am reasonably confident
that they are bug free, they will get promoted to the *stable* version. If you are technically savvy and don't mind
submitting issues on GitHub, try the *testing* version, otherwise the *stable* version will be your best bet.

*   **Google Chrome**
    ([stable](https://chrome.google.com/webstore/detail/yomichan/ogmnaimimemjmbakcfefmnahgdfhfami) or [testing](https://chrome.google.com/webstore/detail/yomichan-testing/bcknnfebhefllbjhagijobjklocakpdm))

    [![](https://foosoft.net/projects/yomichan/img/chrome-web-store.png)](https://chrome.google.com/webstore/detail/yomichan/ogmnaimimemjmbakcfefmnahgdfhfami)

*   **Mozilla Firefox**
    ([stable](https://addons.mozilla.org/en-US/firefox/addon/yomichan/) or [testing](https://foosoft.net/projects/yomichan/dl/yomichan_testing.xpi))

    [![](https://foosoft.net/projects/yomichan/img/firefox-marketplace.png)](https://addons.mozilla.org/en-US/firefox/addon/yomichan/)

## Dictionaries ##

There are several free Japanese dictionaries available for Yomichan, with two of them having glossaries available in
different languages. You must download and import the dictionaries you wish to use in order to enable Yomichan
definition lookups. If you have proprietary EPWING dictionaries that you would like to use, please see the [Yomichan
Import](https://foosoft.net/projects/yomichan-import) page to learn how to convert and import them into Yomichan.

Please be aware that the non-English dictionaries contain fewer entries than their English counterparts. Even if your
primary language is not English, you may consider also importing the English version for better coverage.

*   **[JMdict](https://www.edrdg.org/enamdict/enamdict_doc.html)** (Japanese vocabulary)
    *   [jmdict\_dutch.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_dutch.zip)
    *   [jmdict\_english.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_english.zip)
    *   [jmdict\_french.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_french.zip)
    *   [jmdict\_german.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_german.zip)
    *   [jmdict\_hungarian.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_hungarian.zip)
    *   [jmdict\_russian.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_russian.zip)
    *   [jmdict\_slovenian.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_slovenian.zip)
    *   [jmdict\_spanish.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_spanish.zip)
    *   [jmdict\_swedish.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_swedish.zip)
*   **[JMnedict](https://www.edrdg.org/enamdict/enamdict_doc.html)** (Japanese names)
    *   [jmnedict.zip](https://foosoft.net/projects/yomichan/dl/dict/jmnedict.zip)
*   **[KireiCake](https://kireicake.com/rikaicakes/)** (Japanese slang)
    *   [kireicake.zip](https://foosoft.net/projects/yomichan/dl/dict/kireicake.zip)
*   **[KANJIDIC](http://nihongo.monash.edu/kanjidic2/index.html)** (Japanese Kanji)
    *   [kanjidic\_english.zip](https://foosoft.net/projects/yomichan/dl/dict/kanjidic_english.zip)
    *   [kanjidic\_french.zip](https://foosoft.net/projects/yomichan/dl/dict/kanjidic_french.zip)
    *   [kanjidic\_portuguese.zip](https://foosoft.net/projects/yomichan/dl/dict/kanjidic_portuguese.zip)
    *   [kanjidic\_spanish.zip](https://foosoft.net/projects/yomichan/dl/dict/kanjidic_spanish.zip)
*   **[Innocent Corpus](https://forum.koohii.com/post-168613.html#pid168613)** (Term and Kanji frequencies across 5000+ novels)
    *   [innocent\_corpus.zip](https://foosoft.net/projects/yomichan/dl/dict/innocent_corpus.zip)

## Basic Usage ##

1.  Click on the ![](https://foosoft.net/projects/yomichan/img/yomichan-icon.png) icon in the browser toolbar to open the Yomichan actions dialog.

    [![](https://foosoft.net/projects/yomichan/img/ui-actions-thumb.png)](https://foosoft.net/projects/yomichan/img/ui-actions.png)

2.  Click on the *spanner/monkey wrench* icon in the middle to open the options page.

3.  Import the dictionaries you wish to use for term and Kanji searches. If you do not have any dictionaries installed
    (or enabled), Yomichan will warn you that it is not ready for use by displaying an orange exclamation mark over its
    icon. This exclamation mark will disappear once you have installed and enabled at least one dictionary.

    [![](https://foosoft.net/projects/yomichan/img/ui-import-thumb.png)](https://foosoft.net/projects/yomichan/img/ui-import.png)

4.  Hold down the <kbd>Shift</kbd> key or the middle mouse button as you move your mouse over text to display a popup
    window containing term definitions. This window will only be shown if definitions were found and it can be dismissed
    by clicking anywhere outside of it.

    [![](https://foosoft.net/projects/yomichan/img/ui-terms-thumb.png)](https://foosoft.net/projects/yomichan/img/ui-terms.png)

5.  Click on the ![](https://foosoft.net/projects/yomichan/img/btn-play-audio.png) icon to hear the term pronounced by a native speaker. If an audio sample is
    not available, you will hear a short click instead. You can configure the sources used to retrieve audio samples in
    the options page.

6.  Click on individual Kanji in the term definition results to view additional information about those characters
    including stroke order diagrams, readings, meanings, as well as other useful data.

    [![](https://foosoft.net/projects/yomichan/img/ui-kanji-thumb.png)](https://foosoft.net/projects/yomichan/img/ui-kanji.png)

## Custom Dictionaries ##

Yomichan supports the use of custom dictionaries including the esoteric but popular
[EPWING](https://ja.wikipedia.org/wiki/EPWING) format. They were often utilized in portable electronic dictionaries
similar to the ones pictured below. These dictionaries are often sought after by language learners for their correctness
and excellent coverage of the Japanese language.

Unfortunately, as most of the dictionaries released in this format are proprietary I am unable to bundle them with
Yomichan. You will need to procure these dictionaries yourself and import them with [Yomichan
Import](https://foosoft.net/projects/yomichan-import). Please see the project page for additional details.

[![Pocket EPWING dictionaries](https://foosoft.net/projects/yomichan/img/epwing-devices-thumb.png)](https://foosoft.net/projects/yomichan/img/epwing-devices.jpg)

## Anki Integration ##

Yomichan features automatic flashcard creation for [Anki](https://apps.ankiweb.net/), a free application designed to help you
retain knowledge. This feature requires the prior installation of an Anki plugin called [AnkiConnect](https://foosoft.net/projects/anki-connect).
Please see the respective project page for more information about how to set up this software.

### Flashcard Configuration ###

Before flashcards can be automatically created, you must configure the templates used to create term and/or Kanji notes.
If you are unfamiliar with Anki deck and model management, this would be a good time to reference the [Anki
Manual](https://apps.ankiweb.net/docs/manual.html). In short, you must specify what information should be included in the
flashcards that Yomichan creates through AnkiConnect.

Flashcard fields can be configured with the following steps:

1.  Open the Yomichan options page and scroll down to the section labeled *Anki Options*.
2.  Tick the checkbox labeled *Enable Anki integration* (Anki must be running with [AnkiConnect](https://foosoft.net/projects/anki-connect) installed).
3.  Select the type of template to configure by clicking on either the *Terms* or *Kanji* tabs.
4.  Select the Anki deck and model to use for new creating new flashcards of this type.
5.  Fill the model fields with markers corresponding to the information you wish to include (several can be used at
    once). Advanced users can also configure the actual [Handlebars](https://handlebarsjs.com/) templates used to create
    the flashcard contents (this is strictly optional).

    #### Markers for Term Cards ####

    Marker | Description
    -------|------------
    `{audio}` | Audio sample of a native speaker's pronunciation in MP3 format (if available).
    `{cloze-body}` | Raw, inflected term as it appeared before being reduced to dictionary form by Yomichan.
    `{cloze-prefix}` | Text for the containing `{sentence}` from the start up to the value of `{cloze-body}`.
    `{cloze-suffix}` | Text for the containing `{sentence}` from the value of `{cloze-body}` to the end.
    `{dictionary}` | Name of the dictionary from which the card is being created (unavailable in *grouped* mode).
    `{expression}` | Term expressed as Kanji (will be displayed in Kana if Kanji is not available).
    `{furigana}` | Term expressed as Kanji with Furigana displayed above it (e.g. <ruby>日本語<rt>にほんご</rt></ruby>).
    `{furigana-plain}` | Term expressed as Kanji with Furigana displayed next to it in brackets (e.g. 日本語[にほんご]).
    `{glossary}` | List of definitions for the term (output format depends on whether running in *grouped* mode).
    `{reading}` | Kana reading for the term (empty for terms where the expression is the reading).
    `{screenshot}` | Screenshot of the web page taken at the time the term was added.
    `{sentence}` | Sentence, quote, or phrase in which the term appears in the source content.
    `{tags}` | Grammar and usage tags providing information about the term (unavailable in *grouped* mode).
    `{url}` | Address of the web page in which the term appeared in.

    #### Markers for Kanji Cards ####

    Marker | Description
    -------|------------
    `{character}` | Unicode glyph representing the current Kanji.
    `{cloze-body}` | Raw, inflected parent term as it appeared before being reduced to dictionary form by Yomichan.
    `{cloze-prefix}` | Text for the containing `{sentence}` from the start up to the value of `{cloze-body}`.
    `{cloze-suffix}` | Text for the containing `{sentence}` from the value of `{cloze-body}` to the end.
    `{dictionary}` | Name of the dictionary from which the card is being created.
    `{glossary}` | List of definitions for the Kanji.
    `{kunyomi}` | Kunyomi (Japanese reading) for the Kanji expressed as Katakana.
    `{onyomi}` | Onyomi (Chinese reading) for the Kanji expressed as Hiragana.
    `{screenshot}` | Screenshot of the web page taken at the time the Kanji was added.
    `{sentence}` | Sentence, quote, or phrase in which the character appears in the source content.
    `{url}` | Address of the web page in which the Kanji appeared in.

When creating your model for Yomichan, *please make sure that you pick a unique field to be first*; fields that will
contain `{expression}` or `{character}` are ideal candidates for this. Anki does not require duplicate flashcards to be
added to a deck and uses the first field in the model to check for duplicates. If, for example, you have `{reading}`
configured to be the first field in your model and already have <ruby>橋<rt>はし</rt></ruby> in your deck, you will not
be able to create a flashcard for <ruby>箸<rt>はし</rt></ruby>, because they share the same reading.

### Flashcard Creation ###

Once Yomichan is configured, it becomes trivial to create new flashcards with a single click. You will see the following
icons next to term definitions.

*   Clicking ![](https://foosoft.net/projects/yomichan/img/btn-add-expression.png) adds the current expression as Kanji (e.g. 食べる).
*   Clicking ![](https://foosoft.net/projects/yomichan/img/btn-add-reading.png) adds the current expression as Hiragana or Katakana (e.g. たべる).

Below are some troubleshooting tips you can try if you are unable to create new flashcards:

*   Individual icons will appear grayed out if a flashcard cannot be created for the current definition (e.g. it already exists in the deck).
*   If all of the buttons appear grayed out then you should double-check your deck and model configuration settings.
*   If no icons appear at all, please make sure that Anki is running in the background and that [AnkiConnect](https://foosoft.net/projects/anki-connect) has been installed.

## Keyboard Shortcuts ##

The following shortcuts are globally available:

Shortcut | Action
---------|-------
<kbd>Alt</kbd> + <kbd>Insert</kbd> | Open search page.
<kbd>Alt</kbd> + <kbd>Delete</kbd> | Toggle extension on/off.

The following shortcuts are available on search results:

Shortcut | Action
---------|-------
<kbd>Esc</kbd> | Cancel current search
<kbd>Alt</kbd> + <kbd>PgUp</kbd> | Page up through results.
<kbd>Alt</kbd> + <kbd>PgDn</kbd> | Page down through results.
<kbd>Alt</kbd> + <kbd>End</kbd> | Go to last result.
<kbd>Alt</kbd> + <kbd>Home</kbd> | Go to first result.
<kbd>Alt</kbd> + <kbd>Up</kbd> | Go to previous result.
<kbd>Alt</kbd> + <kbd>Down</kbd> | Go to next result.
<kbd>Alt</kbd> + <kbd>b</kbd> | Go to back to source term.
<kbd>Alt</kbd> + <kbd>e</kbd> | Add current term as expression to Anki.
<kbd>Alt</kbd> + <kbd>r</kbd> | Add current term as reading to Anki.
<kbd>Alt</kbd> + <kbd>p</kbd> | Play audio for current term.
<kbd>Alt</kbd> + <kbd>k</kbd> | Add current Kanji to Anki.

## Development ##

Working on Yomichan and related tools is very time consuming and I am always on the lookout for code contributions from
other developers who want to help out. I take pride in the high quality of the codebase and ask you to follow the
following basic guidelines when creating pull requests:

*   Please discuss large features before writing code.
*   Follow the [conventions and style](.eslintrc.json) of the existing code.
*   Write clean, modern ES6 code (`const`/`let`, `await`, arrow functions, etc.)
*   Large pull requests without a clear scope will not be merged.
*   Incomplete or non-standalone features will not be merged.

### Dependencies ###

Yomichan uses several third-party libraries to function. Below are links to homepages, snapshots, and licenses of the exact
versions packaged.

*   Bootstrap: [homepage](https://getbootstrap.com/) - [snapshot](https://github.com/twbs/bootstrap/releases/download/v3.3.7/bootstrap-3.3.7-dist.zip) - [license](https://github.com/twbs/bootstrap/blob/v3.3.7/LICENSE)
*   Handlebars: [homepage](https://handlebarsjs.com/) - [snapshot](http://builds.handlebarsjs.com.s3.amazonaws.com/handlebars.min-714a4c4.js) - [license](https://github.com/wycats/handlebars.js/blob/v4.0.6/LICENSE)
*   jQuery: [homepage](https://blog.jquery.com/) - [snapshot](https://code.jquery.com/jquery-3.2.1.min.js) - [license](https://github.com/jquery/jquery/blob/3.2.1/LICENSE.txt)
*   JSZip: [homepage](https://stuk.github.io/jszip/) - [snapshot](https://raw.githubusercontent.com/Stuk/jszip/de7f52fbcba485737bef7923a83f0fad92d9f5bc/dist/jszip.min.js) - [license](https://github.com/Stuk/jszip/blob/v3.1.3/LICENSE.markdown)
*   WanaKana: [homepage](https://wanakana.com/) - [snapshot](https://unpkg.com/wanakana@4.0.2/umd/wanakana.min.js) - [license](https://github.com/WaniKani/WanaKana/blob/4.0.2/LICENSE)

## Frequently Asked Questions ##

**I'm having problems importing dictionaries in Firefox, what do I do?**

Yomichan uses the cross-browser IndexedDB system for storing imported dictionary data into your user profile. Although
everything "just works" in Chrome, depending on settings, Firefox users can run into problems due browser bugs.
Yomichan catches errors and tries to offer suggestions about how to work around Firefox issues, but in general at least
one of the following solutions should work for you:

*   Make sure you have cookies enabled. It appears that disabling them also disables IndexedDB for some reason. You
    can still have cookies be disabled on other sites; just make sure to add the Yomichan extension to the whitelist of
    whatever tool you are using to restrict cookies. You can get the extension "URL" by looking at the address bar when
    you have the search page open.
*   Make sure that you have sufficient disk space available on the drive Firefox uses to store your user profile.
    Firefox limits the amount of space that can be used by IndexedDB to a small fraction of the disk space actually
    available on your computer.
*   Make sure that you have history set to "Remember history" enabled in your privacy settings. When this option is
    set to "Never remember history", IndexedDB access is once again disabled for an inexplicable reason.
*   As a last resort, try using the [Refresh Firefox](https://support.mozilla.org/en-US/kb/reset-preferences-fix-problems)
    feature to reset your user profile. It appears that the Firefox profile system can corrupt itself preventing
    IndexedDB from being accessible to Yomichan.

**Why does the Kanji results page display "No data found" for several fields?**

You are using data from the KANJIDIC dictionary that was exported for an earlier version of Yomichan. It does not
contain the additional information which newer versions of Yofomichan expect. Unfortunately, since major browser
implementations of IndexedDB do not provide reliable means for selective bulk data deletion, you will need purge
your database and install the latest version of the KANJIDIC to see additional information about characters.

**Can I still create cards without HTML formatting? The option for it is gone!**

Developing Yomichan is a constant balance between including useful features and keeping complexity at a minimum.
With the new user-editable card template system, it is possible to create text-only cards without having to double
the number field of templates in the extension itself. If you would like to stop HTML tags from being added to your
cards, simply copy the contents of the <a href="dl/fields.txt">text-only field template</a> into the template box on
the Anki settings page (make sure you have the *Show advanced options* checkbox ticked), making sure to replace the
existing values.

**Will you add support for online dictionaries?**

Online dictionaries will never be implemented because it is impossible to support them in a robust way. In order to
perform Japanese deinflection, Yomichan must execute dozens of database queries per every single word. Factoring in
network latency and the fragility of web scraping, I do not believe that it is possible to realize a good user
experience.

**Is it possible to use Yomichan with files saved locally on my computer with Chrome?**

In order to use Yomichan with local files in Chrome, you must first tick the *Allow access to file URLs* checkbox
for Yomichan on the extensions page. Due to the restrictions placed on browser addons in the WebExtensions model, it
will likely never be possible to use Yomichan with PDF files.

**Is it possible to delete individual dictionaries without purging the database?**

Although it is technically possible to purge specific dictionaries, due to the limitations of the underlying browser
IndexedDB system, this process is *extremely* slow. For example, it can take up to ten minutes to delete a single
moderately-sized term dictionary! Instead of including a borderline unusable feature in Yomichan, I have chosen to
disable dictionary deletion entirely.

**Why aren't EPWING dictionaries bundled with Yomichan?**

The vast majority of EPWING dictionaries are proprietary, so unfortunately I am unable to legally include them in
this extension for copyright reasons.

**When are you going to add support for $MYLANGUAGE?**

Developing Yomichan requires a significant understanding of Japanese sentence structure and grammar. I have no time
to invest in learning yet another language; therefore other languages will not be supported. I will also not accept
pull request containing this functionality, as I will ultimately be the one maintaining your code.

## Screenshots ##

[![Term definitions](https://foosoft.net/projects/yomichan/img/ss-terms-thumb.png)](https://foosoft.net/projects/yomichan/img/ss-terms.png)
[![Kanji information](https://foosoft.net/projects/yomichan/img/ss-kanji-thumb.png)](https://foosoft.net/projects/yomichan/img/ss-kanji.png)
[![Dictionary options](https://foosoft.net/projects/yomichan/img/ss-dictionaries-thumb.png)](https://foosoft.net/projects/yomichan/img/ss-dictionaries.png)
[![Anki options](https://foosoft.net/projects/yomichan/img/ss-anki-thumb.png)](https://foosoft.net/projects/yomichan/img/ss-anki.png)
