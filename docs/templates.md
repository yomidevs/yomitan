# Templates

## Helpers

Yomichan supports several custom Handlebars helpers for rendering templates.
The source code for these templates can be found [here](../ext/js/templates/sandbox/anki-template-renderer.js).


### `dumpObject`

Converts an object to a pretty-printed JSON string.
This function can be helpful for debugging values when creating templates.

<details>
  <summary>Syntax:</summary>

  <code>{{#dumpObject}}<i>&lt;object&gt;</i>{{/dumpObject}}</code>

  * _`object`_ <br>
    The object to convert.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  <pre>{{#dumpObject}}{{.}}{{/dumpObject}}</pre>
  ```

  Output:
  ```html
  <pre>{
      "key": "value"
  }</pre>
  ```

  Preview:
  ```html
  {
      "key": "value"
  }
  ```
</details>


### `furigana`

Converts a definition or expression/reading pair to its furigana representation.

<details>
  <summary>Syntax:</summary>

  <code>{{#furigana}}<i>&lt;definition&gt;</i>{{/furigana}}</code><br>
  <code>{{#furigana <i>expression</i> <i>reading</i>}}{{/furigana}}</code><br>

  * _`definition`_ <br>
    The definition to convert.
  * _`expression`_ <br>
    The expression to convert.
  * _`reading`_ <br>
    The reading to convert.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#furigana}}{{.}}{{/furigana}}
  {{#furigana "読む" "よむ"}}{{/furigana}}
  ```

  Output:
  ```html
  <ruby>読<rt>よ</rt></ruby>む
  ```

  Preview
  <pre><ruby>読<rt>よ</rt></ruby>む</pre>
</details>


### `furiganaPlain`

Converts a definition or expression/reading pair to its simplified furigana representation.

<details>
  <summary>Syntax:</summary>

  <code>{{#furiganaPlain}}<i>&lt;definition&gt;</i>{{/furigana}}</code>
  <code>{{#furiganaPlain <i>expression</i> <i>reading</i>}}{{/furiganaPlain}}</code><br>

  * _`definition`_ <br>
    The definition to convert.
  * _`expression`_ <br>
    The expression to convert.
  * _`reading`_ <br>
    The reading to convert.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{~#furiganaPlain~}}{{.}}{{~/furiganaPlain~}}
  {{#furiganaPlain "読む" "よむ"}}{{/furiganaPlain}}
  ```

  Output:
  ```html
  読[よ]む
  ```
</details>


### `multiLine`

Replaces newline characters with a forced HTML line break `<br>`.

<details>
  <summary>Syntax:</summary>

  <code>{{#multiLine}}<i>text with multiple lines</i>{{/multiLine}}</code>
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#kanjiLinks~}}
  some
  multiline
  text
  {{~/kanjiLinks}}
  ```

  Output:
  ```html
  some<br>multiline<br>text
  ```

  Preview:
  <pre>some<br>multiline<br>text</pre>
</details>


### `regexReplace`

Uses a [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) to replace a pattern with the specified text.

<details>
  <summary>Syntax:</summary>

  <code>{{#regexReplace <i>regex</i> <i>replacement</i> <i>[flags]</i>}}<i>text-to-modify</i>{{/regexReplace}}</code><br>
  <code>{{#regexReplace <i>regex</i> <i>replacement</i> <i>[flags]</i> <i>[text-to-modify]...</i>}}{{/regexReplace}}</code><br>

  * _`regex`_ <br>
    The raw string used to create the regular expression. This value is passed to the [`RegExp`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/RegExp) constructor.
  * _`replacement`_ <br>
    The text used to replace pattern matches. This supports the standard [special capture group replacements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter) as supported by the web browser.
  * _`flags`_ _(optional)_ <br>
    Optional flags to pass to the [`RegExp`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/RegExp) constructor.
  * _`text-to-modify`_ <br>
    The text that the regular expression is applied to.
    If multiple arguments are present, they are all concatenated.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#regexReplace "\(([^)]*)\)" "$1" "g"~}}Here is (some) (text) (in) (parentheses){{~/regexReplace}}
  ```

  Output:
  ```html
  Here is some text in parentheses
  ```
</details>


### `regexMatch`

Uses a [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) to return only the content that matches the pattern.

<details>
  <summary>Syntax:</summary>

  <code>{{#regexMatch <i>regex</i> <i>[flags]</i>}}<i>text-to-modify</i>{{/regexMatch}}</code><br>
  <code>{{#regexMatch <i>regex</i> <i>[flags]</i> <i>[text-to-modify]...</i>}}{{/regexMatch}}</code><br>

  * _`regex`_ <br>
    The raw string used to create the regular expression. This value is passed to the [`RegExp`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/RegExp) constructor.
  * _`flags`_ _(optional)_ <br>
    Optional flags to pass to the [`RegExp`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/RegExp) constructor.
  * _`text-to-modify`_ <br>
    The text that the regular expression is applied to.
    If multiple arguments are present, they are all concatenated.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#regexMatch "\(([^)]*)\)" "g"~}}Here is (some) (text) (in) (parentheses){{~/regexMatch}}
  ```

  Output:
  ```html
  (some)(text)(in)(parentheses)
  ```
</details>


### `mergeTags`

Creates a set of all unique tags for the definition and returns a text representation of the tags separated by commas.

<details>
  <summary>Syntax:</summary>

  <code>{{#mergeTags <i>definition</i> <i>isGroupMode</i> <i>isMergeMode</i>}}{{/mergeTags}}</code>

  * _`definition`_ <br>
    The root definition object.
  * _`isGroupMode`_ _(optional)_ <br>
    Whether or not the display mode is the 'group' mode.
  * _`isMergeMode`_ <br>
    Whether or not the display mode is the 'merge' mode.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{~#mergeTags definition group merge}}{{/mergeTags~}}
  ```

  Output:
  ```html
  v5m, vt, JMdict (English)
  ```
</details>


### `eachUpTo`

Similar to the built-in `each` function, but iterates up to a maximum count.
If the iterable is falsy or empty, the `else` condition will be used.

<details>
  <summary>Syntax:</summary>

  <code>{{#eachUpTo <i>iterable</i> <i>maxCount</i>}}<i>(modification)</i>{{else}}<i>(else-modification)</i>{{/eachUpTo}}</code>

  * _`iterable`_ <br>
    The object that should be looped over. A JavaScript [`for...of`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of) loop is used, so the object only needs to be iterable.
  * _`maxCount`_ _(optional)_ <br>
    The maximum number of entries to loop over.
  * _`modification`_ <br>
    The template used to modify the value. The context is changed to the current item of iteration.
  * _`else-modification`_ <br>
    The template used in case the iterable is falsy or empty. The context is unchanged.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{~#eachUpTo someArray 5}}{{{.}}}<br>{{else}}Empty{{/mergeTags~}}
  ```

  Output:
  ```html
  someArray[0]<br>someArray[1]<br>someArray[2]<br>someArray[3]<br>someArray[4]<br>
  ```

  Preview:
  <pre>someArray[0]<br>someArray[1]<br>someArray[2]<br>someArray[3]<br>someArray[4]<br></pre>
</details>


### `spread`

Uses the JavaScript [spread](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax) operator to convert one or more iterables into a single array.
This allows it to be used similar to an [`Array.concat`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/concat) operation.

<details>
  <summary>Syntax:</summary>

  <code>{{#spread <i>iterable1</i> <i>iterable2</i> <i>...</i> <i>iterableN</i>}}{{/spread}}</code>

  * _`iterableN`_ <br>
    A variable amount of iterable objects to combine into a single array.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#each (spread array1 array2)}}{{{.}}}<br>{{/each}}
  ```

  Output:
  ```html
  array1[0]<br>array1[1]<br>array2[0]<br>array2[1]<br>
  ```

  Preview:
  <pre>array1[0]<br>array1[1]<br>array2[0]<br>array2[1]<br></pre>
</details>


### `op`

Performs a simple operation on one, two, or three arguments. The operations available are:

* Unary operators: `+`, `-`, `~`, `!`
* Binary operators: `+`, `-`, `/`, `*`, `%`, `**`, `==`, `!=`, `===`, `!==`, `<`, `<=`, `>`, `>=`, `<<`, `>>`, `>>>`, `&`, `|`, `^`, `&&`, `||`
* Ternary operators: `?:`

If an unknown operator is specified, the `undefined` value is returned.

<details>
  <summary>Syntax:</summary>

  <code>{{#op <i>operator</i> <i>operand1</i> <i>[operand2]</i> <i>[operand3]</i>}}{{/op}}</code>

  * _`operator`_ <br>
    One of the unary, binary, or ternary operators.
  * _`operand1`_ <br>
    The first operand of the operation.
  * _`operand2`_ _(Optional)_<br>
    The second operand of the operation.
  * _`operand3`_ _(Optional)_<br>
    The third operand of the operation.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#if (op "===" value1 value2)}}Values are equal{{/op~}}<br>
  {{~#op "-" value1}}{{/op~}}<br>
  {{~#op "?:" value1 "a" "b"}}{{/op}}
  ```

  Output:
  ```html
  Values are equal<br>-32<br>a
  ```

  Preview:
  <pre>Values are equal<br>-32<br>a</pre>
</details>


### `get`

Gets a value from the custom state stack.

<details>
  <summary>Syntax:</summary>

  <code>{{#get <i>name</i>}}{{/get}}</code>

  * _`name`_ <br>
    The name of the variable to get.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#get "some-text"}}{{/get}}
  ```

  Output:
  ```html
  This is the value of some-text!
  ```
</details>


### `set`

Assigns a value to the custom state stack.

<details>
  <summary>Syntax:</summary>

  <code>{{#set <i>name</i>}}<i>value</i>{{/get}}</code><br>
  <code>{{#set <i>name</i> <i>value</i>}}{{/get}}</code><br>

  * _`name`_ <br>
    The name of the variable to assign.
  * _`value`_ <br>
    The value of the variable.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#set "some-text"}}This is the value of some-text!{{/set~}}
  {{~#set "some-number" 32}}{{/set}}
  ```

  Output:
  ```html
  ```
</details>


### `scope`

Pushes a new variable scope to the custom state stack.
Variable assignments are applied to the most recent scope,
and variable lookups will start from the most recent scope and work backwards until a value is found.

<details>
  <summary>Syntax:</summary>

  <code>{{#scope}}<i>content</i>{{/scope}}</code>

  * _`name`_ <br>
    The name of the variable to assign.
  * _`value`_ <br>
    The value of the variable.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{~#set "key" 32}}{{/set~}}
  {{~#get "key"}}{{/get~}},
  {{~#scope~}}
    {{~#get "key"}}{{/get~}},
    {{~#set "key" 64}}{{/set~}}
    {{~#get "key"}}{{/get~}},
  {{~/scope~}}
  {{~#get "key"}}{{/get~}}
  ```

  Output:
  ```html
  32,32,64,32
  ```
</details>


### `property`

Repeatedly gets a property of an object.

<details>
  <summary>Syntax:</summary>

  <code>{{#property <i>object</i> <i>property1</i> <i>property2</i> <i>...</i> <i>propertyN</i>}}{{/property}}</code>

  * _`object`_ <br>
    The initial object to use.
  * _`propertyN`_ <br>
    A chain of property names to get on the object.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{property someObject "field" 0 "toString"}}
  ```

  Output:
  ```html
  function toString() { [native code] }
  ```
</details>


### `noop`

No-op. Returns the inner contents of the template.

<details>
  <summary>Syntax:</summary>

  <code>{{#noop}}<i>content</i>{{/noop}}</code>
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{noop}}Unchanged content{{/noop}}
  ```

  Output:
  ```html
  Unchanged content
  ```
</details>


### `isMoraPitchHigh`

Returns whether or not a mora will have a high pitch, given the index of the mora and the position of the downstep.

<details>
  <summary>Syntax:</summary>

  <code>{{#isMoraPitchHigh <i>index</i> <i>position</i>}}{{/isMoraPitchHigh}}</code>
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#if (isMoraPitchHigh 1 2)}}High pitch{{else}}Low pitch{{/if}}
  ```

  Output:
  ```html
  High pitch
  ```
</details>


### `getKanaMorae`

Returns an array of the mora for a kana string.

<details>
  <summary>Syntax:</summary>

  <code>{{#getKanaMorae <i>kana-string</i>}}{{/getKanaMorae}}</code>
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#each (getKanaMorae "よみちゃん")}}{{{.}}}<br>{{/each}}
  ```

  Output:
  ```html
  よ<br>み<br>ちゃ<br>ん<br>
  ```

  Preview:
  <pre>よ<br>み<br>ちゃ<br>ん<br></pre>
</details>


### `typeof`

Returns the type of a value.

<details>
  <summary>Syntax:</summary>

  <code>{{#typeof <i>value</i>}}{{/typeof}}</code><br>
  <code>{{#typeof}}<i>value</i>{{/typeof}}</code><br>

  * _`value`_ <br>
    The value to check.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#typeof "よみちゃん"}}{{/typeof}}
  {{#typeof 1}}{{/typeof}}
  {{#typeof}}よみちゃん{{/typeof}}
  ```

  Output:
  ```html
  string
  number
  string
  ```
</details>


### `join`

Joins the arguments to a single string with a separator, flattening any arguments that are arrays.

<details>
  <summary>Syntax:</summary>

  <code>{{#join <i>separator</i> <i>value1</i> <i>value2</i> <i>valueN</i>...}}{{/join}}</code><br>

  * _`separator`_ <br>
    The separator string to use between values.
  * _`valueN`_ <br>
    An individual value to join into the resulting string
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#set "index" 32}}{{/set~}}
  {{~#join "_" "yomichan" (get "index") "value"}}{{/join}}
  ```

  Output:
  ```html
  yomichan_32_value
  ```
</details>


### `concat`

Joins the arguments to a single string, without flattening arguments that are arrays.

<details>
  <summary>Syntax:</summary>

  <code>{{#concat <i>value1</i> <i>value1</i> <i>valueN</i>...}}{{/concat}}</code><br>

  * _`valueN`_ <br>
    A value to join into the resulting string
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#set "index" 32}}{{/set~}}
  {{~#concat "yomichan_" (get "index") "_value"}}{{/concat}}
  ```

  Output:
  ```html
  yomichan_32_value
  ```
</details>


### `pitchCategories`

Returns an array representing the different pitch categories for a specific term.

<details>
  <summary>Syntax:</summary>

  <code>{{#pitchCategories @root}}{{/pitchCategories}}</code><br>

  * _`@root`_ <br>
    The argument passed should always be the root data object.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  [{{#each (pitchCategories @root)}}{{.}}{{#unless @last}}, {{/unless}}{{/each}}]
  ```

  Output:
  ```html
  [heiban, kifuku]
  ```
</details>


### `formatGlossary`

Formats a glossary entry to a HTML content string. This helper handles image and
structured-content generation.

<details>
  <summary>Syntax:</summary>

  <code>{{#formatGlossary <i>dictionary</i>}}{{{definitionEntry}}}{{/pitchCategories}}</code><br>

  * _`dictionary`_ <br>
    The dictionary that the glossary entry belongs to.
  * _`definitionEntry`_ <br>
    The definition entry object in raw form.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#each glossary}}{{#formatGlossary ../dictionary}}{{{.}}}{{/formatGlossary}}{{/each}}
  ```

  Output:
  ```html
  Here is the content of a gloss, which may include formatted HTML.
  ```
</details>


### `hasMedia` & `getMedia`

Checks to see if a certain type of media is available for a card and injects the relevant content.
These functions are used together in order to request media and other types of optional asynchronous content.

<details>
  <summary>Syntax:</summary>

  <code>{{#hasMedia <i>type</i> <i>args</i>...}}{{/hasMedia}}</code><br>
  <code>{{#getMedia <i>type</i> <i>args</i>... <i>[escape=true|false]</i>}}{{/getMedia}}</code><br>

  * _`type`_ <br>
    The type of media to check for.
  * _`args`_ <br>
    Additional arguments for the media. The arguments depend on the media type.
  * _`escape`_ _(optional)_ <br>
    Whether or not the resulting text should be HTML-escaped. If omitted, defaults to `true`.

  **Available media types and arguments**

  * <code>"audio"</code>
  * <code>"screenshot"</code>
  * <code>"clipboardImage"</code>
  * <code>"clipboardText"</code>
  * <code>"selectionText"</code>
  * <code>"textFurigana" <i>japaneseText</i> <i>readingMode="default|hiragana|katakana"</i></code>
  * <code>"dictionaryMedia" <i>fileName</i> <i>dictionary="Dictionary Name"</i></code>
</details>
<details>
  <summary>Examples:</summary>

  ```handlebars
  {{#if (hasMedia "audio")}}The audio file name is: {{#getMedia "audio"}}{{/getMedia}}{{/if}}

  {{#if (hasMedia "screenshot")}}The screenshot file name is: {{#getMedia "screenshot"}}{{/getMedia}}{{/if}}

  {{#if (hasMedia "clipboardImage")}}The clipboard image file name is: {{#getMedia "clipboardImage"}}{{/getMedia}}{{/if}}

  {{#if (hasMedia "clipboardText")}}The clipboard text is: {{#getMedia "clipboardText"}}{{/getMedia}}{{/if}}

  {{#if (hasMedia "selectionText")}}The selection text is: {{#getMedia "selectionText"}}{{/getMedia}}{{/if}}

  {{#if (hasMedia "textFurigana" "日本語")}}This is an example of text with generated furigana: {{#getMedia "textFurigana" "日本語" escape=false}}{{/getMedia}}{{/if}}

  {{#if (hasMedia "dictionaryMedia" "image.png" dictionary="Example Dictionary")}}The remapped file name for image.png is: {{#getMedia "dictionaryMedia" "image.png" dictionary="Example Dictionary"}}{{/getMedia}}{{/if}}
  ```

  Output:
  ```html
  The audio file name is: yomichan_audio_にほんご_日本語.mp3

  The screenshot file name is: yomichan_browser_screenshot_にほんご_日本語.png

  The clipboard image file name is: yomichan_clipboard_image_にほんご_日本語.png

  The clipboard text is: This is the clipboard text

  The selection text is: This is the selection text

  The selection text is: This is the selection text

  This is an example of text with generated furigana: <ruby>日本語<rt>にほんご</rt></ruby>

  The remapped file name for image.png is: yomichan_dictionary_media_1_にほんご_日本語.png
  ```
</details>


### `pronunciation`

Converts pronunciation information into a formatted HTML content string. The display layout is the
same as the system used for generating popup and search page dictionary entries.

<details>
  <summary>Syntax:</summary>

  <code>{{#pronunciation <i>format=string</i> <i>reading=string</i> <i>downstepPosition=integer</i> <i>[nasalPositions=array]</i> <i>[devoicePositions=array]</i>}}{{/pronunciation}}</code><br>

  * _`format`_ <br>
    The format of the HTML to generate. This can be any of the following values:
    * `'text'`
    * `'graph'`
    * `'position'`
  * _`reading`_ <br>
    The kana reading of the term.
  * _`downstepPosition`_ <br>
    The mora position of the downstep in the reading.
  * _`nasalPositions`_ _(optional)_ <br>
    An array of indices of mora that have a nasal pronunciation.
  * _`devoicePositions`_ _(optional)_ <br>
    An array of indices of mora that are devoiced.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{~#pronunciation format='text' reading='よむ' downstepPosition=1~}}{{~/pronunciation~}}
  ```
</details>


### `hiragana`

Converts katakana text to hiragana.

<details>
  <summary>Syntax:</summary>

  <code>{{#hiragana <i>value</i> <i>[keepProlongedSoundMarks=true|false]</i>}}{{/hiragana}}</code><br>
  <code>{{#hiragana <i>[keepProlongedSoundMarks=true|false]</i>}}<i>value</i>{{/hiragana}}</code><br>

  * _`value`_ <br>
    The text to convert.
  * _`keepProlongedSoundMarks`_ _(optional)_ <br>
    Whether or not the `ー` character should be kept or converted to a vowel character.
    Defaults to `false` if not specified.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#hiragana "よみちゃん ヨミちゃん ヨミチャン"}}{{/hiragana}}
  {{#hiragana}}よみちゃん ヨミちゃん ヨミチャン{{/hiragana}}
  {{#hiragana}}ローマ字{{/hiragana}}
  {{#hiragana keepProlongedSoundMarks=true}}ローマ字{{/hiragana}}
  ```

  Output:
  ```html
  よみちゃん よみちゃん よみちゃん
  よみちゃん よみちゃん よみちゃん
  ろうま字
  ろーま字
  ```
</details>


### `katakana`

Converts hiragana text to katakana.

<details>
  <summary>Syntax:</summary>

  <code>{{#katakana <i>text</i>}}{{/katakana}}</code><br>
  <code>{{#katakana}}<i>text</i>{{/katakana}}</code><br>

  * _`text`_ <br>
    The text to convert.
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#katakana "よみちゃん ヨミちゃん ヨミチャン"}}{{/katakana}}
  {{#katakana}}よみちゃん ヨミちゃん ヨミチャン{{/katakana}}
  ```

  Output:
  ```html
  ヨミチャン ヨミチャン ヨミチャン
  ヨミチャン ヨミチャン ヨミチャン
  ```
</details>


## Legacy Helpers

Yomichan has historically used Handlebars templates to generate the HTML used on the search page and results popup.
To simplify the and improve Yomichan's capabilities, the HTML elements are now generated directly using a different process.

As such, there are several leftover Handlebars helpers that do not have much utility for Anki templates, but are kept for compatibility purposes.


### `kanjiLinks`

Replaces kanji characters in the text with linkified versions.

<details>
  <summary>Syntax:</summary>

  <code>{{#kanjiLinks}}<i>text</i>{{/kanjiLinks}}</code>
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#kanjiLinks}}読む{{/kanjiLinks}}
  ```

  Output:
  ```html
  <a href="#" class="kanji-link">読</a>む
  ```

  Preview:
  <pre><a href="#" class="kanji-link">読</a>む</pre>
</details>


### `sanitizeCssClass`

Sanitizes text so it can be used as a CSS class name.

<details>
  <summary>Syntax:</summary>

  <code>{{#sanitizeCssClass}}<i>text</i>{{/sanitizeCssClass}}</code>
</details>
<details>
  <summary>Example:</summary>

  ```handlebars
  {{#sanitizeCssClass}}some text with many types of characters !@#$%^ 読む{{/sanitizeCssClass}}
  ```

  Output:
  ```html
  some_text_with_many_types_of_characters________読む
  ```
</details>
