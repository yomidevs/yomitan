# Yomichan Permissions

* `<all_urls>` <br>
  Yomichan requires access to all URLs in order to run scripts to scan text and show the definitions popup,
  request audio for playback and download, and connect with Anki.

* `storage` and `unlimitedStorage` <br>
  Yomichan uses storage permissions in order to save extension settings and dictionary data.
  `unlimitedStorage` is used to help prevent web browsers from unexpectedly
  deleting dictionary data.

* `webRequest` and `webRequestBlocking` _(Manifest V2 only)_ <br>
  Yomichan uses these permissions to ensure certain requests have valid and secure headers.
  This sometimes involves removing or changing the `Origin` request header,
  as this can be used to fingerprint browser configuration.

* `declarativeNetRequest` _(Manifest V3 only)_ <br>
  Yomichan uses this permission to ensure certain requests have valid and secure headers.
  This sometimes involves removing or changing the `Origin` request header,
  as this can be used to fingerprint browser configuration.

* `scripting` _(Manifest V3 only)_ <br>
  Yomichan will sometimes need to inject stylesheets into webpages in order to
  properly display the search popup.

* `clipboardWrite` <br>
  Yomichan supports simulating the `Ctrl+C` (copy to clipboard) keyboard shortcut
  when a definitions popup is open and focused.

* `clipboardRead` (optional) <br>
  Yomichan supports automatically opening a search window when Japanese text is copied to the clipboard
  while the browser is running, depending on how certain settings are configured.
  This allows Yomichan to support scanning text from external applications, provided there is a way
  to copy text from those applications to the clipboard.

* `nativeMessaging` (optional on Chrome) <br>
  Yomichan has the ability to communicate with an optional native messaging component in order to support
  parsing large blocks of Japanese text using
  [MeCab](https://en.wikipedia.org/wiki/MeCab).
  The installation of this component is optional and is not included by default.
  This permission is optional on Chrome, but required on Firefox, because Firefox does not permit it to be optional.
