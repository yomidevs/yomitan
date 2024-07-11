# Yomitan Permissions

- `<all_urls>` <br>
  Yomitan requires access to all URLs in order to run scripts to scan text and show the definitions popup,
  request audio for playback and download, and connect with Anki.

- `storage` and `unlimitedStorage` <br>
  Yomitan uses storage permissions in order to save extension settings and dictionary data.
  `unlimitedStorage` is used to help prevent web browsers from unexpectedly
  deleting dictionary data.

- `declarativeNetRequest` <br>
  Yomitan uses this permission to ensure certain requests have valid and secure headers.
  This sometimes involves removing or changing the `Origin` request header,
  as this can be used to fingerprint browser configuration.

- `scripting` <br>
  Yomitan needs to inject content scripts and stylesheets into webpages in order to
  properly display the search popup.

- `contextMenus` <br>
  Yomitan adds a context menu interface that lets you look up highlighted words.

- `offscreen` _(Chrome only)_ <br>
  Yomitan uses this permission to create a secondary backend document that has DOM access, given that Manifest v3
  service workers do not. Service workers can then reach out to out to this document in order to complete
  actions that require access to DOM APIs, such as any that require clipboard access.

- `clipboardWrite` <br>
  Yomitan supports simulating the `Ctrl+C` (copy to clipboard) keyboard shortcut
  when a definitions popup is open and focused.

- `clipboardRead` _(optional)_ <br>
  Yomitan supports automatically opening a search window when Japanese text is copied to the clipboard
  while the browser is running, depending on how certain settings are configured.
  This allows Yomitan to support scanning text from external applications, provided there is a way
  to copy text from those applications to the clipboard.

- `nativeMessaging` _(optional, unavailable on Firefox for Android)_ <br>
  Yomitan has the ability to communicate with an optional native messaging component in order to support
  parsing large blocks of Japanese text using
  [MeCab](https://en.wikipedia.org/wiki/MeCab).
  The installation of this component is optional and is not included by default.
