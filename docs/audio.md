### Audio Configuration

Audio playback of terms' pronunciation can be configured in the `Audio` section of the _Settings_ page.

For Japanese terms, Yomitan provides a preconfigured audio source. More audio sources can be added in `Audio` > `Configure audio playback sources`. They will be checked for pronunciations in the order they are listed.

For other languages, there are multiple sources of audio available.

- The [Yomichan Forvo Server](https://ankiweb.net/shared/info/580654285) Anki add-on is one way to get pronunciation audio for other languages using the [Forvo](https://forvo.com/) service.
  - It fetches native voices from Forvo, at the cost of a slight delay and with the tradeoff of a lower selection and quality of audio.
  - After installing it, add a `Custom URL (JSON)` audio source with the URL `http://localhost:8770?term={term}&reading={reading}&language=en` (replace `en` with the desired language's ISO code).
- Yomitan can use your browser's inbuilt text-to-speech (TTS) engine.
  - To enable this, just add a new playback source with the `Text-to-speech` type and choose your desired voice. This is the simplest way to get pronunciation audio, though the voices are supplied by your browser and may not support all languages.
    - For instance, [Microsoft Edge](https://www.microsoft.com/en-us/edge) offers a wide selection of free Azure natural voices for a variety of languages. Edge provides over 300 voices, compared to around 25 in Google Chrome (see [here](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt) for a list of supported languages).
  - ⚠️ Note that the TTS voices cannot be sent to Anki; this is a [limitation of the browser SpeechSynthesis API](https://github.com/themoeway/yomitan/issues/864).
  - In addition, TTS audio can be inaccurate for languages with complex pronunciation such as Japanese, where words can have multiple possible readings and pitch accents.

With at least one working audio source in place, you can click on the <img src="../ext/images/play-audio.svg" alt="" width="16" height="16"> _speaker_ button to hear the term's pronunciation. When searching for audio, the sources are checked in order until the first valid source is found. Right-clicking the <img src="../ext/images/play-audio.svg" alt="" width="16" height="16"> _speaker_ button allows choosing the source manually. If no audio is found, you will hear a short click instead.
