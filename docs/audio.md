### Audio Configuration

Audio playback of terms' pronunciation can be configured in the `Audio` section of the _Settings_ page.

For Japanese terms, Yomitan provides a preconfigured audio source. More audio sources can be added in `Audio` > `Configure audio playback sources`. They will be checked for pronunciations in the order they are listed.

For other languages, there are multiple sources of audio available.

- Yomitan can use your browser's inbuilt text-to-speech (TTS) engine.
  - To enable this, just add a new playback source with the `Text-to-speech` type and choose your desired voice. This is the simplest way to get pronunciation audio, though the voices are supplied by your browser and may not support all languages.
    - We recommend [Microsoft Edge](https://www.microsoft.com/en-us/edge) as it has a wide selection of free Azure neural voices for a wide variety of languages (see [here](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt) for a list of supported languages). We counted **over 300 voices** available in Edge, compared to around 25 in Google Chrome.
  - Note that the TTS voices cannot be sent to Anki; this is a [limitation of the browser SpeechSynthesis API](https://github.com/themoeway/yomitan/issues/864).
- The [Yomichan Forvo Server](https://ankiweb.net/shared/info/580654285) Anki add-on is another way to get pronunciation audio.
  - After installing it, add a `Custom URL (JSON)` audio source with the URL `http://localhost:8770?term={term}&reading={reading}&language=en` (replace `en` with the desired language's ISO code).

With at least one working audio source in place, you can click on the <img src="../ext/images/play-audio.svg" alt="" width="16" height="16"> _speaker_ button to hear the term's pronunciation. When searching for audio, the sources are checked in order until the first valid source is found. Right-clicking the <img src="../ext/images/play-audio.svg" alt="" width="16" height="16"> _speaker_ button allows choosing the source manually. If no audio is found, you will hear a short click instead.
