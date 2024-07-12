## Anki Integration

Yomitan features automatic flashcard creation for [Anki](https://apps.ankiweb.net/), a free application designed to help you
retain knowledge. This feature requires the prior installation of an Anki plugin called [AnkiConnect](https://foosoft.net/projects/anki-connect).
Check the respective project page for more information about how to set up this software.

### Flashcard Configuration

Before flashcards can be automatically created, you must configure the templates used to create term and/or kanji notes.
If you are unfamiliar with Anki deck and model management, this would be a good time to reference the [Anki
Manual](https://docs.ankiweb.net/#/). In short, you must specify what information should be included in the
flashcards that Yomitan creates through AnkiConnect.

Flashcard fields can be configured with the following steps:

1.  Open the Yomitan options page and scroll down to the section labeled _Anki Options_.
2.  Tick the checkbox labeled _Enable Anki integration_ (Anki must be running with [AnkiConnect](https://foosoft.net/projects/anki-connect) installed).
3.  Select the type of template to configure by clicking on either the _Terms_ or _Kanji_ tabs.
4.  Select the Anki deck and model to use for new creating new flashcards of this type.
5.  Fill the model fields with markers corresponding to the information you wish to include (several can be used at
    once).
6.  _(optional, advanced)_ Users can also configure the actual [Handlebars](https://handlebarsjs.com/) templates used to create
    the flashcard contents.

    #### Markers for Term Cards

    | Marker                                      | Description                                                                                                                                                            |
    | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
    | `{audio}`                                   | Audio of the term's pronunciation from one of the audio sources (if available).                                                                                        |
    | `{clipboard-image}`                         | An image which is stored in the system clipboard, if present.                                                                                                          |
    | `{clipboard-text}`                          | Text which is stored in the system clipboard, if present.                                                                                                              |
    | `{cloze-body}`                              | Raw, inflected term as it appeared before being reduced to dictionary form by Yomitan.                                                                                 |
    | `{cloze-body-kana}`                         | Kana reading for `{cloze-body}`.                                                                                                                                       |
    | `{cloze-prefix}`                            | Fragment of the containing `{sentence}` starting at the beginning of `{sentence}` until the beginning of `{cloze-body}`.                                               |
    | `{cloze-suffix}`                            | Fragment of the containing `{sentence}` starting at the end of `{cloze-body}` until the end of `{sentence}`.                                                           |
    | `{conjugation}`                             | Conjugation path from the raw inflected term to the source term.                                                                                                       |
    | `{dictionary}`                              | Name of the dictionary from which the card is being created (unavailable in _grouped_ mode).                                                                           |
    | `{document-title}`                          | Title of the web page that the term appeared in.                                                                                                                       |
    | `{expression}`                              | Term expressed as kanji (will be displayed in kana if kanji is not available).                                                                                         |
    | `{frequencies}`                             | Frequency information for the term.                                                                                                                                    |
    | `{frequency-harmonic-rank}`                 | The harmonic mean of frequency data for the current term. Defaults to rank 9999999 when frequency data is not found, indicating extremely low rank-based term usage.   |
    | `{frequency-harmonic-occurrence}`           | The harmonic mean of frequency data for the current term. Defaults to 0 occurrences when frequency data is not found, the lowest possible occurrence-based term usage. |
    | `{frequency-average-rank}`                  | The average of frequency data for the current term. Defaults to rank 9999999 when frequency data is not found, indicating extremely low rank-based term usage.         |
    | `{frequency-average-occurrence}`            | The average of frequency data for the current term. Defaults to 0 occurrences when frequency data is not found, the lowest possible occurrence-based term usage.       |
    | `{furigana}`                                | Term expressed as kanji with furigana displayed above it (e.g. <ruby>日本語<rt>にほんご</rt></ruby>).                                                                  |
    | `{furigana-plain}`                          | Term expressed as kanji with furigana displayed next to it in brackets (e.g. 日本語[にほんご]).                                                                        |
    | `{glossary}`                                | List of definitions for the term (output format depends on whether running in _grouped_ mode).                                                                         |
    | `{glossary-brief}`                          | List of definitions for the term in a more compact format.                                                                                                             |
    | `{glossary-no-dictionary}`                  | List of definitions for the term, except the dictionary tag is omitted.                                                                                                |
    | `{glossary-first}`                          | First definition for the term (output format depends on whether running in _grouped_ mode).                                                                            |
    | `{glossary-first-brief}`                    | First definition for the term in a more compact format.                                                                                                                |
    | `{glossary-first-no-dictionary}`            | First definition for the term, except the dictionary tag is omitted.                                                                                                   |
    | `{part-of-speech}`                          | Part of speech information for the term.                                                                                                                               |
    | `{phonetic-transcriptions}`                 | List of phonetic transcriptions for the term.                                                                                                                          |
    | `{pitch-accents}`                           | List of pitch accent downstep notations for the term.                                                                                                                  |
    | `{pitch-accent-graphs}`                     | List of pitch accent graphs for the term.                                                                                                                              |
    | `{pitch-accent-graphs-jj}`                  | List of pitch accent graphs for the term (styled after Jidoujisho).                                                                                                    |
    | `{pitch-accent-positions}`                  | List of accent downstep positions for the term as a number.                                                                                                            |
    | `{pitch-accent-categories}`                 | List of pitch accent categories for the term (e.g. heiban, kifuku, atamadaka, odaka, nakadaka).                                                                        |
    | `{reading}`                                 | Kana reading for the term (empty for terms where the expression is the reading).                                                                                       |
    | `{screenshot}`                              | Screenshot of the web page taken at the time the term was added.                                                                                                       |
    | `{search-query}`                            | The full search query shown on the search page.                                                                                                                        |
    | `{popup-selection-text}`                    | The selected text on the search page or popup.                                                                                                                         |
    | `{sentence}`                                | Sentence, quote, or phrase that the term appears in from the source content.                                                                                           |
    | `{sentence-furigana}`                       | Sentence, quote, or phrase that the term appears in from the source content, with furigana added.                                                                      |
    | `{single-glossary-DICT-NAME}`               | Same as `{glossary}`, but with entries from only a single dictionary. The dictionary name will likely be modified, use the options from the ▼ dropdown.                |
    | `{single-glossary-DICT-NAME-brief}`         | See `{single-glossary-DICT-NAME}` and `{glossary-brief}`.                                                                                                              |
    | `{single-glossary-DICT-NAME-no-dictionary}` | See `{single-glossary-DICT-NAME}` and `{glossary-no-dictionary}`.                                                                                                      |
    | `{tags}`                                    | Grammar and usage tags providing information about the term (unavailable in _grouped_ mode).                                                                           |
    | `{url}`                                     | Address of the web page in which the term appeared in.                                                                                                                 |

    #### Markers for Kanji Cards

    | Marker                            | Description                                                                                                                                                              |
    | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
    | `{character}`                     | Unicode glyph representing the current kanji.                                                                                                                            |
    | `{clipboard-image}`               | An image which is stored in the system clipboard, if present.                                                                                                            |
    | `{clipboard-text}`                | Text which is stored in the system clipboard, if present.                                                                                                                |
    | `{cloze-body}`                    | Raw, inflected parent term as it appeared before being reduced to dictionary form by Yomitan.                                                                            |
    | `{cloze-prefix}`                  | Fragment of the containing `{sentence}` starting at the beginning of `{sentence}` until the beginning of `{cloze-body}`.                                                 |
    | `{cloze-suffix}`                  | Fragment of the containing `{sentence}` starting at the end of `{cloze-body}` until the end of `{sentence}`.                                                             |
    | `{dictionary}`                    | Name of the dictionary from which the card is being created.                                                                                                             |
    | `{document-title}`                | Title of the web page that the kanji appeared in.                                                                                                                        |
    | `{frequencies}`                   | Frequency information for the kanji.                                                                                                                                     |
    | `{frequency-harmonic-rank}`       | The harmonic mean of frequency data for the current kanji. Defaults to rank 9999999 when frequency data is not found, indicating extremely low rank-based kanji usage.   |
    | `{frequency-harmonic-occurrence}` | The harmonic mean of frequency data for the current kanji. Defaults to 0 occurrences when frequency data is not found, the lowest possible occurrence-based kanji usage. |
    | `{frequency-average-rank}`        | The average of frequency data for the current kanji. Defaults to rank 9999999 when frequency data is not found, indicating extremely low rank-based kanji usage.         |
    | `{frequency-average-occurrence}`  | The average of frequency data for the current kanji. Defaults to 0 occurrences when frequency data is not found, the lowest possible occurrence-based kanji usage.       |
    | `{glossary}`                      | List of definitions for the kanji.                                                                                                                                       |
    | `{kunyomi}`                       | Kunyomi (Japanese reading) for the kanji expressed as hiragana.                                                                                                          |
    | `{onyomi}`                        | Onyomi (Chinese reading) for the kanji expressed as katakana.                                                                                                            |
    | `{onyomi-hiragana}`               | Onyomi (Chinese reading) for the kanji expressed as hiragana.                                                                                                            |
    | `{screenshot}`                    | Screenshot of the web page taken at the time the kanji was added.                                                                                                        |
    | `{search-query}`                  | The full search query shown on the search page.                                                                                                                          |
    | `{popup-selection-text}`          | The selected text on the search page or popup.                                                                                                                           |
    | `{sentence}`                      | Sentence, quote, or phrase that the character appears in from the source content.                                                                                        |
    | `{sentence-furigana}`             | Sentence, quote, or phrase that the character appears in from the source content, with furigana added.                                                                   |
    | `{stroke-count}`                  | Number of strokes that the kanji character has.                                                                                                                          |
    | `{url}`                           | Address of the web page in which the kanji appeared in.                                                                                                                  |

When creating your model for Yomitan, _make sure that you pick a unique field to be first_; fields that will
contain `{expression}` or `{character}` are ideal candidates for this. Anki does not allow duplicate flashcards to be
added to a deck by default; it uses the first field in the model to check for duplicates. For example, if you have `{reading}`
configured to be the first field in your model and <ruby>橋<rt>はし</rt></ruby> is already in your deck, you will not
be able to create a flashcard for <ruby>箸<rt>はし</rt></ruby> because they share the same reading.

### Flashcard Creation

Once Yomitan is configured, it becomes trivial to create new flashcards with a single click. You will see the following
icons next to term definitions:

- Clicking ![](../img/btn-add-expression.png) adds the current expression (e.g. 食べる).
- Clicking ![](../img/btn-add-reading.png) adds the current expression's reading (e.g. たべる).

If _Check for card duplicates_ is on, and a card for the current definition already exists in the deck, you will see the book icon.
If _When a duplicate is detected_ is set to `Prevent adding`, the icons will appear grayed out. If set to `Allow adding`, the icons will change to:

- ![](../img/btn-add-duplicate-expression.png): to add the expression
- ![](../img/btn-add-duplicate-reading.png): to add the reading

Below are some troubleshooting tips you can try if you are unable to create new flashcards:

- If all of the buttons appear grayed out, then you should double-check your deck and model configuration settings.
- If no icons appear at all, make sure that Anki is running in the background and that [AnkiConnect](https://foosoft.net/projects/anki-connect) has been installed.

### Anki Note Generation

Using the `Generate Anki Notes (Experimental)...` feature in the settings page it is possible to easily generate and export large amounts of Anki cards.

> [!WARNING]
> This feature is experimental!

First, get a newline separated list of terms. For example:

```
雪
雨
竜巻
```

Enter this list into the large text box in the `Anki Note Generator` popup window.

Next, select either `Send to Anki` or `Export to File`.

**Send to Anki:**

`Send to Anki` will send all the terms to the active Anki deck using the active Anki model specified on the page. To change the active Anki deck or Anki model, edit them in the `Configure Anki card format...` setting.

Make sure to confirm you are exporting to the correct deck and with the correct Anki model. After the notes are sent to Anki there is no way to automatically undo the changes.

To include media in notes sent to Anki, make sure to enable the `Add media to notes` option. Media includes audio, images, and svgs. Exporting with media may take significantly longer than without it.

To prevent duplicate notes being sent to Anki, enable the `Prevent sending duplicate notes` option. This will check for duplicate notes that already exist. The `Check for duplicates across all models` and `Duplicate card scope` settings are used to determine what is considered a duplicate card. **This does not remove duplicates in the term list.**

**Export to File:**

`Export to File` will export all the terms to an Anki deck file using the active Anki card format specified on the page and in Anki's `Notes in plain text (.txt)` format. After exporting completes you will be prompted to save the file. This file can later be imported into Anki.

Media cannot be included when exporting in this format.
