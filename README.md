# Yomichan for Chrome #

Yomichan for Chrome turns your browser into a tool for building Japanese language literacy by helping you to decipher
texts which would be otherwise too difficult tackle. This extension was inspired in part by
[Rikaichan](https://addons.mozilla.org/en-US/firefox/addon/rikaichan/) and
[Rikaikun](https://chrome.google.com/webstore/detail/rikaikun/jipdnfibhldikgcjhfnomkfpcebammhp?hl=en), but it stands
apart in its goal of being a all-encompassing learning tool as opposed to a mere browser-based dictionary. It is the
natural evolution of the [Yomichan](https://foosoft.net/projects/yomichan) plugin that I developed for Anki when I began learning Japanese
in early 2011.

<iframe width="800" height="500" src="https://www.youtube.com/embed/90_A1VpTnMk" allowfullscreen></iframe>

## Requirements ##

For basic functionality:

*   [Google Chrome](https://www.google.com/chrome/browser/desktop/)

For automatic flash card creation:

*   [AnkiConnect](https://foosoft.net/projects/anki-connect/)
*   [Anki](http://ankisrs.net/)

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

[![Chrome web store](https://foosoft.net/projects/yomichan-chrome/img/store.png)](https://chrome.google.com/webstore/detail/yomichan/ogmnaimimemjmbakcfefmnahgdfhfami)

## Usage ##

Yomichan can be used as a standalone extension, or in conjunction with [Anki](http://ankisrs.net) via
[AnkiConnect](https://foosoft.net/projects/anki-connect).

### Basic Functionality ###

1.  Left-click on the ![](https://foosoft.net/projects/yomichan-chrome/img/logo.png) icon to enable or disable Yomichan for the current browser instance.
2.  Right-click on the ![](https://foosoft.net/projects/yomichan-chrome/img/logo.png) icon and select *Options* to display the Yomichan options page.
3.  Hold down <kbd>Shift</kbd> (or the middle mouse button) as you hover over text to see term definitions.
4.  Hold down <kbd>Ctrl</kbd> + <kbd>Shift</kbd> (or the middle mouse button) as you hover over text to see Kanji definitions.
5.  Resize the definition window by dragging the bottom-left corner inwards or outwards.
6.  Click on the Kanji links in the definition window to view additional information about those characters.
7.  Click on the ![](https://foosoft.net/projects/yomichan-chrome/img/play-audio.png) icon to hear the term pronounced by a native speaker.

### Anki Integration ###

1.  Open the *Install Add-on* dialog by selecting *Tools* &gt; *Add-ons* &gt; *Browse &amp; Install* in Anki.
2.  Input *2055492159* into the text box labeled *Code* and press the *OK* button to proceed.
3.  Restart Anki when prompted to do so in order to complete the installation of AnkiConnect.
4.  In Chrome, open the Yomichan options page by right-clicking the ![](https://foosoft.net/projects/yomichan-chrome/img/logo.png) icon and selecting *Options*.
5.  Check the *Enable AnkiConnect* checkbox in the *General Options* group.
6.  Activate the *Terms* or the *Kanji* tab, depending on the type of card template you wish to configure.
7.  Select the Anki deck and model to use when creating new cards (see the [Anki Manual](http://ankisrs.net/docs/manual.html) for more details).
8.  Populate the model fields with markup representing contextual properties for the current vocabulary term or Kanji:
    *   **Term Markers**
        *   `{audio}`: Audio sample of a native speaker's pronunciation in MP3 format (if available).
        *   `{expression}`: Term written in Kanji (will be written in Kana if Kanji is not available).
        *   `{glossary-list}`: List of definitions with items expressed as a numbered list.
        *   `{glossary}`: List of definitions with items delimited using semicolons.
        *   `{reading}`: Kana reading for the term (empty for terms where the expression is the reading).
        *   `{sentence}`: Sentence, quote, or phrase in which the term appears in the source content.
        *   `{tags}`: Grammar and usage tags providing additional information about the term.
        *   `{url}`: Address of the web page in which the current vocabulary term appeared in.
    *   **Kanji Markers**
        *   `{character}`: Unicode glyph representing the current Kanji.
        *   `{glossary-list}`: List of definitions with items expressed as a numbered list.
        *   `{glossary}`: List of definitions with items delimited using semicolons.
        *   `{kunyomi}`: Kunyomi (Japanese reading) for the current Kanji expressed in Katakana.
        *   `{onyomi}`: Onyomi (Chinese reading) for the current Kanji expressed in Hiragana.
        *   `{url}`: Address of the web page in which the current vocabulary term appeared in.
9.  Click on the ![](https://foosoft.net/projects/yomichan-chrome/img/add-expression.png) icon to add the current expression using Kanji (e.g. 食べる).
10. Click on the ![](https://foosoft.net/projects/yomichan-chrome/img/add-reading.png) icon to add the current expression using the reading alone (e.g. たべる).

## Frequently Asked Questions ##

*   **When are you going to port Yomichan to $MYBROWSER?**

    I am considering creating a Firefox port once I am satisfied with the feature set of the Chrome extension. I may
    consider other browsers in the future, as long as porting would be trivial and the browser in question runs natively
    on Linux. This is not a high priority Firefox already has good extensions for Japanese learning (and I use Chrome
    exclusively).

*   **When are you going to add support for $MYLANGUAGE?**

    Developing Yomichan required a significant understanding of Japanese sentence structure and grammar. I presently
    have no time to invest in learning yet another language; therefore other languages will not be supported. I will
    also not be accepting pull request containing this functionality, as I will ultimately be the one maintaining your
    code.

*   **When are you going to add support for [EPWING](https://ja.wikipedia.org/wiki/EPWING) J-J dictionaries?**

    This is a long-term goal, and I do not yet have a timeline for this feature. That being said, I believe that I have
    figured out how to make this work in the restrictive Chrome extension environment, and mostly have to develop a new
    tool to support extraction of data from this format.

## Screenshots ##

[![Term definitions](https://foosoft.net/projects/yomichan-chrome/img/term-thumb.png)](https://foosoft.net/projects/yomichan-chrome/img/term.png)
[![Kanji information](https://foosoft.net/projects/yomichan-chrome/img/kanji-thumb.png)](https://foosoft.net/projects/yomichan-chrome/img/kanji.png)
[![General options](https://foosoft.net/projects/yomichan-chrome/img/options-general-thumb.png)](https://foosoft.net/projects/yomichan-chrome/img/options-general.png)
[![Anki options](https://foosoft.net/projects/yomichan-chrome/img/options-anki-thumb.png)](https://foosoft.net/projects/yomichan-chrome/img/options-anki.png)

## License ##

GPL
