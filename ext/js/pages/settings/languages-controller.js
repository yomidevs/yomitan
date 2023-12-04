class LanguagesController {

    constructor(settingsController) {
        this._settingsController = settingsController;
        this._languages = [
            {"iso": "ja", "language": "Japanese", "flag": "🇯🇵"}
        ];
    }

    async prepare() {
        this._languages = await yomichan.api.getLanguages();
        this._setSelectElement('language-select');
    }

    _setSelectElement(selectId) {
        this._selectElement = document.getElementById(selectId);
        this._fillSelect();
    }

    _fillSelect() {
        this._languages.forEach((lang) => {
            const option = document.createElement('option');
            option.value = lang.iso;
            option.innerHTML = `<span i18n="settings.language.languages.${lang.language}">${lang.language}</span> ${lang.flag}`;
            this._selectElement.appendChild(option);
        });
    }
}
