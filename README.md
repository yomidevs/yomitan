# Yomichan #

Yomichan turns your browser into a tool for building Japanese language literacy by helping you to decipher texts which
would be otherwise too difficult tackle. This extension was inspired in part by
[Rikaichan](https://addons.mozilla.org/en-US/firefox/addon/rikaichan/) and
[Rikaikun](https://chrome.google.com/webstore/detail/rikaikun/jipdnfibhldikgcjhfnomkfpcebammhp?hl=en), but it stands
apart in its goal of being a all-encompassing learning tool as opposed to a mere browser-based dictionary. It is the
evolution of the [Yomichan](https://foosoft.net/projects/yomichan-anki) plugin that I developed for Anki when I began studying Japanese.

## Requirements ##

For basic functionality:

*   [Google Chrome](https://www.google.com/chrome/browser/desktop/) (versions 45+)
*   [Mozilla Firefox](https://www.mozilla.org/en-US/firefox/new/) (versions 51+)

For development:

*   [7-Zip](http://www.7-zip.org/)
*   [Git LFS](https://git-lfs.github.com/)
*   [Go](https://golang.org/)
*   [Handlebars](http://handlebarsjs.com/)
*   [Node.js](https://nodejs.org/)

## Installation ##

Yomichan can downloaded free of charge from the [Chrome Web
Store](https://chrome.google.com/webstore/detail/yomichan/ogmnaimimemjmbakcfefmnahgdfhfami). If you find this extension
helpful and appreciate the time that was spent developing it, I would kindly ask that you leave a positive review. Your
support and feedback encourages continued development of this tool.

[![Chrome web store](https://foosoft.net/projects/yomichan/img/store.png)](https://chrome.google.com/webstore/detail/yomichan/ogmnaimimemjmbakcfefmnahgdfhfami)

## Basic Functionality ##

1.  Click on the ![](https://foosoft.net/projects/yomichan/img/logo.png) icon in the browser toolbar to open the Yomichan options page.
2.  Import the dictionaries (bundled or custom) you wish to use for term and Kanji searches.
3.  Hold down <kbd>Shift</kbd> (or the middle mouse button) as you hover over text to see term definitions.
4.  Click on the ![](https://foosoft.net/projects/yomichan/img/play-audio.png) icon to hear the term pronounced by a native speaker (if audio is available).
5.  Click on Kanji in the definition window to view additional information about that character.

## Custom Dictionaries ##

Yomichan supports importing of custom dictionaries including the esoteric but popular
[EPWING](https://ja.wikipedia.org/wiki/EPWING) format. For more information about how to use this feature, please see
the [Yomichan Import](https://foosoft.net/projects/yomichan-import) project page.

## Anki Integration ##

Yomichan features automatic flashcard creation for [Anki](http://ankisrs.net/), a free application designed to help you
retain knowledge. This functionality requires prior installation of the
[AnkiConnect](https://foosoft.net/projects/anki-connect/) plugin. The installation process can be done in three steps:

1.  Open the *Install Add-on* dialog by selecting *Tools* &gt; *Add-ons* &gt; *Browse &amp; Install* in Anki.
2.  Input *2055492159* into the text box labeled *Code* and press the *OK* button to proceed.
3.  Restart Anki when prompted to do so in order to complete the installation of AnkiConnect.

When using AnkiConnect, Anki must be kept running in the background for automatic flashcard creation to function.

### Flashcard Configuration ###

Before flashcards can be automatically created through Yomichan, Anki must be configured as follows:

1.  In Chrome, open the Yomichan options page by right-clicking the ![](https://foosoft.net/projects/yomichan/img/logo.png) icon and selecting *Options*.
2.  Activate the *Terms* or the *Kanji* tab, depending on the type of card template you wish to configure.
3.  Select the Anki deck and model to use when creating new flashcards (see the [Anki Manual](http://ankisrs.net/docs/manual.html) for more details).
4.  Populate the model fields with markup representing contextual properties for the current vocabulary term or Kanji:

    #### Markers for Term Cards ####

    Marker | Description
    -------|------------
    `{audio}` | Audio sample of a native speaker's pronunciation in MP3 format (if available).
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
    `{dictionary}` | Name of the dictionary from which the card is being created.
    `{glossary}` | List of definitions for the Kanji.
    `{kunyomi}` | Kunyomi (Japanese reading) for the Kanji expressed as Katakana.
    `{onyomi}` | Onyomi (Chinese reading) for the Kanji expressed as Hiragana.
    `{url}` | Address of the web page in which the Kanji appeared in.

5.  Click on the ![](https://foosoft.net/projects/yomichan/img/add-expression.png) icon to add the current expression using Kanji (e.g. 食べる). If the icon
    appears grayed out, this means that a new flashcard cannot be created with the current configuration (please verify
    your Anki deck and model settings).
6.  Click on the ![](https://foosoft.net/projects/yomichan/img/add-reading.png) icon to add the current expression using the reading alone (e.g. たべる). If
    the icon appears grayed out, this means that a new flashcard cannot be created with the current configuration
    (please verify your Anki deck and model settings).

## Frequently Asked Questions ##

*   **What happened to AnkiWeb integration? Why was it removed?**

    The author of Anki wants to maintain tight control of AnkiWeb by restricting automated web requests, while at the
    same time not providing an API for adding or removing flash cards. As circumventing these limitations led to account
    restrictions placed on users of this extension, I was forced to remove this feature. Note that it is still possible
    to automatically generate flashcards with the [AnkiConnect](https://foosoft.net/projects/anki-connect) plugin.

*   **Is it possible to use Yomichan with files saved locally on my computer?**

    It in order to be able use Yomichan with local files in Chrome, you must first tick the *Allow access to file URLs*
    checkbox for Yomichan on the Chrome extensions page. Due to restrictions placed on browser extensions by Chrome, it
    will likely never be possible to use Yomichan with PDF files.

*   **When are you going to add support for $MYLANGUAGE?**

    Developing Yomichan required a significant understanding of Japanese sentence structure and grammar. I presently
    have no time to invest in learning yet another language; therefore other languages will not be supported. I will
    also not be accepting pull request containing this functionality, as I will ultimately be the one maintaining your
    code.

## Screenshots ##

[![Term definitions](https://foosoft.net/projects/yomichan/img/term-thumb.png)](https://foosoft.net/projects/yomichan/img/term.png)
[![Kanji information](https://foosoft.net/projects/yomichan/img/kanji-thumb.png)](https://foosoft.net/projects/yomichan/img/kanji.png)
[![General options](https://foosoft.net/projects/yomichan/img/options-general-thumb.png)](https://foosoft.net/projects/yomichan/img/options-general.png)
[![Anki options](https://foosoft.net/projects/yomichan/img/options-anki-thumb.png)](https://foosoft.net/projects/yomichan/img/options-anki.png)

## License ##

GPL
