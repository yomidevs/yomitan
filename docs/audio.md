### Audio Configuration

Audio can be configured in the `Audio` section of the _Settings_ page.

For Japanese terms, Yomitan provides a preconfigured audio source. More audio sources can be added in `Audio` > `Configure audio playback sources`. They will be checked for pronunciations in the order they are listed.

For other languages, the [Yomichan Forvo Server](https://ankiweb.net/shared/info/580654285) Anki add-on is one way to get pronunciation audio. After installing it, add a `Custom URL (JSON)` audio source with the URL `http://localhost:8770?term={term}&reading={reading}&language=en` (replace `en` with the desired language's ISO code).

With at least one working audio source in place, you can click on the <img src="../ext/images/play-audio.svg" alt="" width="16" height="16"> _speaker_ button to hear the term's pronunciation. When searching for audio, the sources are checked in order until the first valid source is found. Right-clicking the <img src="../ext/images/play-audio.svg" alt="" width="16" height="16"> _speaker_ button allows choosing the source manually. If no audio is found, you will hear a short click instead.
