class LocalizationController {
    constructor(settingsController) {
        this._settingsController = settingsController;

        this._locale = "";
        this._translations = {
            "settings_title": "Yezichak Settings",
        };
    }

    async prepare() { 
        this._settingsController.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._locales = await yomichan.api.getLocales();
        this._setSelectElement('locale-select');
        await this._updateOptions();
    }

    _setSelectElement(selectId) {
        this._selectElement = document.getElementById(selectId);
        this._fillSelect();
        this._selectElement.addEventListener('change', this._onSelectChange.bind(this));
    }

    _onSelectChange() {
        this._updateOptions();
    }

    _fillSelect() {
        this._locales.forEach((locale) => {
            const option = document.createElement('option');
            option.value = locale.iso;
            option.textContent = `${locale.language} ${locale.flag}`;
            this._selectElement.appendChild(option);
        });
    }

    async _onOptionsChanged({options}) {
        console.log('options changed', options.general.locale, this._locale);
        if (options.general.locale !== this._locale) {
            this._locale = options.general.locale;
            this._translations = await yomichan.api.getTranslations(this._locale);
            console.log('got translations', this._translations, 'translationg all');
            this._translateAll();
        }
    }

    async _updateOptions() {
        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    _translateAll() {
        const translatables = document.querySelectorAll('[i18n]');
        translatables.forEach((element) => {
            this._translateElement(element);
        });
    }
    
    _translateElement(element) {
      const key = element.getAttribute("i18n");
      const translation = this._translations[key];
      element.innerText = translation || element.innerText;
    }
}