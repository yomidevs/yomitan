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
*   Support for multiple dictionary formats including [EPWING](https://ja.wikipedia.org/wiki/EPWING) via
    the [Yomichan Import](https://foosoft.net/projects/yomichan-import) tool.
*   Automatic note creation for the [Anki](https://apps.ankiweb.net/) flashcard program via
    the [AnkiConnect](https://foosoft.net/projects/anki-connect) plugin.
*   Clean, modern code makes it easy for developers to [contribute](https://github.com/FooSoft/yomichan) new features.

## Downloads ##

*   **Google Chrome** (versions 45+)

    [![](https://foosoft.net/projects/yomichan/img/chrome-web-store.png)](https://chrome.google.com/webstore/detail/yomichan/ogmnaimimemjmbakcfefmnahgdfhfami)

*   **Mozilla Firefox** (versions 52+)

    [![](https://foosoft.net/projects/yomichan/img/firefox-marketplace.png)](https://addons.mozilla.org/en-US/firefox/addon/yomichan/)

    All extension versions must be reviewed before they are publicly accessible on the Firefox Marketplace. As this
    review process can take several months to complete, the approved version of the extension is often out of date. If
    you are interested in using the latest and greatest version, please consider using the [locally hosted](https://foosoft.net/projects/yomichan/dl/latest.xpi) version instead.

## Dictionaries ##

There are three free Japanese dictionaries available for Yomichan, with two of them having versions with glossaries in
different languages. You must download and import the dictionaries you wish to use in order to enable Yomichan
definition lookups. If you have proprietary EPWING dictionaries that you would like to use, please see the [Yomichan
Import](https://foosoft.net/projects/yomichan-import) page to learn how to convert and import them into Yomichan.

*   **[JMdict](http://www.edrdg.org/enamdict/enamdict_doc.html)** (Japanese vocabulary)
    *   [jmdict_dutch.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_dutch.zip)
    *   [jmdict_english.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_english.zip)
    *   [jmdict_french.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_french.zip)
    *   [jmdict_german.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_german.zip)
    *   [jmdict_hungarian.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_hungarian.zip)
    *   [jmdict_italian.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_italian.zip)
    *   [jmdict_russian.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_russian.zip)
    *   [jmdict_slovenian.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_slovenian.zip)
    *   [jmdict_spanish.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_spanish.zip)
    *   [jmdict_swedish.zip](https://foosoft.net/projects/yomichan/dl/dict/jmdict_swedish.zip)
*   **[JMnedict](http://www.edrdg.org/enamdict/enamdict_doc.html)** (Japanese names)
    *   [jmnedict.zip](https://foosoft.net/projects/yomichan/dl/dict/jmnedict.zip)
*   **[KANJIDIC](http://nihongo.monash.edu/kanjidic2/index.html)** (Japanese Kanji)
    *   [kanjidic_english.zip](https://foosoft.net/projects/yomichan/dl/dict/kanjidic_english.zip)
    *   [kanjidic_french.zip](https://foosoft.net/projects/yomichan/dl/dict/kanjidic_french.zip)
    *   [kanjidic_portuguese.zip](https://foosoft.net/projects/yomichan/dl/dict/kanjidic_portuguese.zip)
    *   [kanjidic_spanish.zip](https://foosoft.net/projects/yomichan/dl/dict/kanjidic_spanish.zip)
*   **[KireiCake](https://kireicake.com/rikaicakes/)** (Japanese slang)
    *   [kireicake.zip](https://foosoft.net/projects/yomichan/dl/dict/kireicake.zip)

## Basic Usage ##

1.  Click on the ![](https://foosoft.net/projects/yomichan/img/yomichan-icon.png) icon in the browser toolbar to open the Yomichan actions dialog.

    [![Actions dialog](https://foosoft.net/projects/yomichan/img/ui-actions-thumb.png)](https://foosoft.net/projects/yomichan/img/ui-actions.png)

2.  Click on the *monkey wrench* icon in the middle to open the options page.

3.  Import the dictionaries you wish to use for term and Kanji searches. If you do not have any dictionaries installed
    (or enabled), Yomichan will warn you that it is not ready for use by displaying an orange exclamation mark over its
    icon. This exclamation mark will disappear once you have installed and enabled at least one dictionary.

    [![Dictionary importer](https://foosoft.net/projects/yomichan/img/ui-import-thumb.png)](https://foosoft.net/projects/yomichan/img/ui-import.png)

4.  Hold down the <kbd>Shift</kbd> key or the middle mouse button as you move your mouse over text to display a popup
    window containing term definitions. This window will only be shown if definitions were found and it can be dismissed
    by clicking anywhere outside of it.

    [![Term search results](https://foosoft.net/projects/yomichan/img/ui-terms-thumb.png)](https://foosoft.net/projects/yomichan/img/ui-terms.png)

5.  Click on the ![](https://foosoft.net/projects/yomichan/img/btn-play-audio.png) icon to hear the term pronounced by a native speaker. If an audio sample is
    not available, you will hear a short click instead.

6.  Click on individual Kanji in the term definition results to view additional information about those characters
    including readings, meanings, and a stroke order diagram.

    [![Kanji search results](https://foosoft.net/projects/yomichan/img/ui-kanji-thumb.png)](https://foosoft.net/projects/yomichan/img/ui-kanji.png)

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

Yomichan features automatic flashcard creation for [Anki](http://ankisrs.net/), a free application designed to help you
retain knowledge. This feature requires the prior installation of an Anki plugin called [AnkiConnect](https://foosoft.net/projects/anki-connect).
Please see the respective project page for more information about how to set up this software.

### Flashcard Configuration ###

Before flashcards can be automatically created, you must configure the templates used to create term and/or Kanji notes.
If you are unfamiliar with Anki deck and model management, this would be a good time to reference the [Anki
Manual](http://ankisrs.net/docs/manual.html). In short, you must specify what information should be included in the
flashcards that Yomichan creates through AnkiConnect.

Flashcard fields can be configured with the following steps:

1.  Open the Yomichan options page and scroll down to the section labeled *Anki Options*.
2.  Tick the checkbox labeled *Enable Anki integration* (Anki must be running with [AnkiConnect](https://foosoft.net/projects/anki-connect) installed).
3.  Select the type of template to configure by clicking on either the *Terms* or *Kanji* tabs.
4.  Select the Anki deck and model to use for new creating new flashcards of this type.
5.  Fill the model fields with markers corresponding to the information you wish to include (several can be used):

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
    `{glossary}` | List of definitions for the term (output format depends on whether running in *grouped* mode).
    `{reading}` | Kana reading for the term (empty for terms where the expression is the reading).
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
    `{sentence}` | Sentence, quote, or phrase in which the character appears in the source content.
    `{url}` | Address of the web page in which the Kanji appeared in.

When creating your model for Yomichan, *please make sure that you pick a unique field to be first*; fields that will
contain `{expression}` or `{character}` are ideal candidates. Anki does not require duplicate flashcards to be added to
a deck and uses the first field in the model to check for duplicates. If, for example, you have `{reading}` configured
to be the first field in your model and already have <ruby>橋<rt>はし</rt></ruby> in your deck, you will not be able to
create a flashcard for <ruby>箸<rt>はし</rt></ruby>, because they share the same reading.

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
*   Follow the conventions and style of the existing code.
*   Write clean, modern ES6 code (`const`/`let`, promises, arrow functions, etc.)
*   Large pull requests without a clear scope will not be merged.
*   Incomplete or non-standalone features will not be merged.

### Templates ###

Yomichan uses [Handlebars](http://handlebarsjs.com/) templates for user interface and Anki note formatting. The source
templates are found in the `tmpl` directory and the compiled version is stored in the `ext/bg/js/templates.js` file. If
you modify the source templates, you will need to also recompile them. If you are developing on Linux or Mac OS X, you
can use the included `build_tmpl.sh` and `build_tmpl_auto.sh` (requires
[inotify-tools](https://github.com/rvoicilas/inotify-tools/wiki)) shell scripts to do this for you. Otherwise, simply
execute `handlebars tmpl/*.html -f ext/bg/js/templates.js` from the project's base directory.

### Dependencies ###

Yomichan relies on several third-party libraries to function. The following are links to homepages and snapshots of the
exact versions used for distribution.

*   Bootstrap Toggle: [homepage](http://www.bootstraptoggle.com/) - [snapshot](https://github.com/minhur/bootstrap-toggle/archive/b76c094.zip)
*   Bootstrap: [homepage](http://getbootstrap.com/) - [snapshot](https://github.com/twbs/bootstrap/releases/download/v3.3.7/bootstrap-3.3.7-dist.zip)
*   Dexie: [homepage](http://dexie.org/) - [snapshot](https://github.com/dfahlander/Dexie.js/archive/v2.0.0-beta.10.zip)
*   Handlebars: [homepage](http://handlebarsjs.com/) - [snapshot](http://builds.handlebarsjs.com.s3.amazonaws.com/handlebars.min-714a4c4.js)
*   JQuery: [homepage](https://blog.jquery.com/) - [snapshot](https://code.jquery.com/jquery-3.2.1.min.js)
*   JSZip: [homepage](http://stuk.github.io/jszip/) - [snapshot](https://raw.githubusercontent.com/Stuk/jszip/de7f52fbcba485737bef7923a83f0fad92d9f5bc/dist/jszip.min.js)
*   WanaKana: [homepage](http://wanakana.com/) - [snapshot](https://raw.githubusercontent.com/WaniKani/WanaKana/7c4a052/gh-pages/assets/js/wanakana.min.js)

## Frequently Asked Questions ##

*   **Will you add support for online dictionaries?**

    Online dictionaries will never be implemented because it is impossible to support them in a robust way. In order to
    perform Japanese deinflection, Yomichan must execute dozens of database queries per every single word. Factoring in
    network latency and the fragility of web scraping, I do not believe that it is possible to realize a good user
    experience.

*   **What happened to AnkiWeb integration? Why was it removed?**

    The author of Anki wants to maintain tight control of AnkiWeb by restricting automated web requests, while at the
    same time not providing an API for adding or removing flash cards. As circumventing these limitations led to account
    restrictions placed on users of this extension, I was forced to remove this feature. Note that it is still possible
    to automatically generate flashcards with the [AnkiConnect](https://foosoft.net/projects/anki-connect) plugin.

*   **Is it possible to use Yomichan with files saved locally on my computer?**

    It in order to be able use Yomichan with local files in Chrome, you must first tick the *Allow access to file URLs*
    checkbox for Yomichan on the Chrome extensions page. Due to restrictions placed on browser extensions by Chrome, it
    will likely never be possible to use Yomichan with PDF files.

*   **Is it possible to delete individual dictionaries without resetting the database?**

    Although it is technically possible to purge specific dictionaries, due to the limitations of the underlying
    database system, this process is *extremely* slow. For example, it can take up to ten minutes to delete a term
    dictionary of moderate size! Instead of including a borderline unusable feature in Yomichan, I disabled dictionary
    deletion entirely.

*   **Why doesn't Yomichan work after being removed and reinstalled on Firefox?**

    Uninstalling Yomichan on Firefox may sometimes leave the dictionary database in an undefined state. Although most of
    the data has been deleted, the metadata describing it appears unchanged. This can make it look like you have
    dictionaries installed when you actually do not. Purge the database and reimport your dictionaries to fix this
    problem.

*   **Why aren't EPWING dictionaries bundled with Yomichan?**

    The vast majority of EPWING dictionaries are proprietary, so unfortunately I am unable to legally include them in
    this extension for copyright reasons.

*   **When are you going to add support for $MYLANGUAGE?**

    Developing Yomichan required a significant understanding of Japanese sentence structure and grammar. I presently
    have no time to invest in learning yet another language; therefore other languages will not be supported. I will
    also not be accepting pull request containing this functionality, as I will ultimately be the one maintaining your
    code.

## Screenshots ##

[![Term definitions](https://foosoft.net/projects/yomichan/img/ss-terms-thumb.png)](https://foosoft.net/projects/yomichan/img/ss-terms.png)
[![Kanji information](https://foosoft.net/projects/yomichan/img/ss-kanji-thumb.png)](https://foosoft.net/projects/yomichan/img/ss-kanji.png)
[![Dictionary options](https://foosoft.net/projects/yomichan/img/ss-dictionaries-thumb.png)](https://foosoft.net/projects/yomichan/img/ss-dictionaries.png)
[![Anki options](https://foosoft.net/projects/yomichan/img/ss-anki-thumb.png)](https://foosoft.net/projects/yomichan/img/ss-anki.png)

## License ##

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.

