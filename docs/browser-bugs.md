# Browser Bugs

This page lists several of the browser bugs that have affected Yomichan over the years.

## Audio doesn't work when autoplay=false

- **Browser**: Firefox
- **Date**: 2018-06-17
- **Issue**: [#129](https://github.com/FooSoft/yomichan/issues/129), [Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1466926)

## Ruby text layouts don't always work correctly for certain fonts

- **Browser**: Chrome
- **Date**: 2019-08-11
- **Links**: [#178](https://github.com/FooSoft/yomichan/issues/178), [Report](https://bugs.chromium.org/p/chromium/issues/detail?id=1045755), [Demo](https://github.com/toasted-nutbread/chrome-layout-bug)

## document.execCommand('paste') doesn't work correctly on web extension background page

- **Browser**: Firefox
- **Date**: 2019-12-14
- **Links**: [#307](https://github.com/FooSoft/yomichan/pull/307), [Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1603985), [Demo](https://github.com/toasted-nutbread/firefox-clipboard-paste-bug)

## Touch events can have incorrect position

- **Browser**: Firefox
- **Date**: 2020-01-18
- **Links**: [#316](https://github.com/FooSoft/yomichan/pull/316), [Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1610145), [Demo](https://github.com/toasted-nutbread/firefox-touch-position-bug)

## Triple click doesn't select text properly

- **Browser**: Firefox
- **Date**: 2020-01-30
- **Issue**: [#340](https://github.com/FooSoft/yomichan/pull/340), [Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1612236), [Demo](https://github.com/toasted-nutbread/firefox-text-selection-bug)

## unhandledrejection event doesn't work correctly in content scripts

- **Browser**: Firefox
- **Date**: 2020-04-12
- **Issue**: [#454](https://github.com/FooSoft/yomichan/pull/454), [Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1632270)

## chrome.tabs.sendMessage doesn't work correctly

- **Browser**: Firefox (Nightly)
- **Date**: 2020-06-04
- **Links**: [#588](https://github.com/FooSoft/yomichan/issues/588), [Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1643649), [Demo](https://github.com/toasted-nutbread/firefox-web-extension-send-message-bug)

## CSS animations don't work correctly when using an attribute on the root

- **Browser**: Chrome
- **Date**: 2020-06-05
- **Links**: [Report](https://bugs.chromium.org/p/chromium/issues/detail?id=1087188), [Demo](https://github.com/toasted-nutbread/chrome-animated-text-color-bug)

## Pen pointer events have various issues

- **Browser**: Firefox
- **Date**: 2020-09-12
- **Links**: [#819](https://github.com/FooSoft/yomichan/pull/819), [#820](https://github.com/FooSoft/yomichan/pull/820), [#821](https://github.com/FooSoft/yomichan/pull/821), [#824](https://github.com/FooSoft/yomichan/pull/824), [Report 1](https://bugzilla.mozilla.org/show_bug.cgi?id=1449660), [Report 2](https://bugzilla.mozilla.org/show_bug.cgi?id=1487509), [Report 3](https://bugzilla.mozilla.org/show_bug.cgi?id=1583480), [Report 4](https://bugzilla.mozilla.org/show_bug.cgi?id=1583519), [Report 5](https://bugzilla.mozilla.org/show_bug.cgi?id=1631377)

## Cannot read clipboard from service worker in a MV3 chrome extension

- **Browser**: Chrome
- **Date**: 2020-12-18
- **Links**: [#455](https://github.com/FooSoft/yomichan/issues/455), [#1247](https://github.com/FooSoft/yomichan/issues/1247), [Report](https://bugs.chromium.org/p/chromium/issues/detail?id=1160302)

## Textareas display incorrectly when they have an animated CSS transform

- **Browser**: Chrome
- **Date**: 2021-01-30
- **Links**: [Demo](https://toasted-nutbread.github.io/chrome-textarea-transform-bug/), [Report](https://bugs.chromium.org/p/chromium/issues/detail?id=1172666)

## Chrome extensions using port connections can crash the browser using manifest version 3

- **Browser**: Chrome
- **Date**: 2021-02-13
- **Links**: [Demo](https://github.com/toasted-nutbread/chrome-extension-port-connect-crash), [Report](https://bugs.chromium.org/p/chromium/issues/detail?id=1178179)

## Chrome extension Port.onDisconnect event does not always fire in content scripts

- **Browser**: Chrome
- **Date**: 2021-02-13
- **Links**: [Demo](https://github.com/toasted-nutbread/chrome-extension-port-disconnect-bug), [Report 1](https://bugs.chromium.org/p/chromium/issues/detail?id=1178188) (MV2), [Report 2](https://bugs.chromium.org/p/chromium/issues/detail?id=1178189) (MV3)

## Ruby elements with padding have incorrect layout

- **Browser**: Firefox
- **Date**: 2021-03-05
- **Links**: [Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1696721)

## Focus changes don't preserve caret position for caret browsing

- **Browser**: Chrome
- **Date**: 2021-05-19
- **Links**: [Report](https://bugs.chromium.org/p/chromium/issues/detail?id=1211175)

## CSS :active state on &lt;label&gt; element doesn't match state on inner element

- **Browser**: Chrome
- **Date**: 2021-05-19
- **Links**: [Report](https://bugs.chromium.org/p/chromium/issues/detail?id=1211182)

## Caret browsing doesn't work properly for certain display:none elements

- **Browser**: Firefox
- **Date**: 2021-06-06
- **Links**: [Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1714883)

## IndexedDB writes from a Worker thread do not persist if worker is terminated

- **Browser**: ~~Chrome~~, Firefox _(warning only)_
- **Date**: 2021-08-07
- **Links**: ~~[Chrome Report](https://bugs.chromium.org/p/chromium/issues/detail?id=1237686)~~, [Firefox Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1724602)

## Web extension content scripts don't run on certain about:blank popups

- **Browser**: Firefox
- **Date**: 2021-08-16
- **Links**: [Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1726068)

## Touch events report incorrect clientX on wide pages with writing-mode:vertical-rl

- **Browser**: Chrome
- **Date**: 2022-01-31
- **Links**: [Report](https://bugs.chromium.org/p/chromium/issues/detail?id=1292815)

## Chrome extensions can't auto-play media from an embedded extension frame

- **Browser**: Chrome
- **Date**: 2022-04-03
- **Links**: [Demo](https://github.com/toasted-nutbread/chrome-extension-audio-autoplay-bug), [Report](https://bugs.chromium.org/p/chromium/issues/detail?id=1312816)

## DOMException.data sometimes throws error on assignment

- **Browser**: Firefox
- **Date**: 2022-06-25
- **Links**: [Report](https://bugzilla.mozilla.org/show_bug.cgi?id=1776555)
