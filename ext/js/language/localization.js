class LocalizationController {
    constructor(settingsController) {
        this._settingsController = settingsController;
        this._locale = "";
        this._translations = {};
    }

    async prepare(options) { 
        this._settingsController?.on('optionsChanged', this._onOptionsChanged.bind(this));
        this._locales = await yomichan.api.getLocales();
        this._setSelectElement('locale-select');
        options ? this._onOptionsChanged({options}) : await this._updateOptions();
    }

    _setSelectElement(selectId) {
        this._selectElement = document.getElementById(selectId);
        if (!this._selectElement) return;
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
            option.innerHTML = `<span i18n="settings.language.languages.${locale.language}">${locale.language}</span> ${locale.flag}`;
            this._selectElement.appendChild(option);
        });
    }

    async _onOptionsChanged({options: {general: {locale}}}) {
        if (locale !== this._locale) {
            this._locale = locale;
            this._translations = await yomichan.api.getTranslations(this._locale);
            this._translateAll();
        }
    }

    async _updateOptions() {
        const options = await this._settingsController.getOptions();
        this._onOptionsChanged({options});
    }

    _translateAll() {
        const translatables = document.querySelectorAll('[i18n], [i18n-title]');
        translatables.forEach((element) => {
            this._translateElement(element);
        });
    }
    
    _translateElement(element) {
      const key = element.getAttribute("i18n");
      const title = element.getAttribute("i18n-title");
      if(key){
          const translation = this.getDeep(this._translations, key);
          element.innerText = translation || element.innerText;
      }
      if(title){
          const translation = this.getDeep(this._translations, title);
          element.setAttribute("title", translation || element.getAttribute("title"));
      }
    }

    getDeep (object, path, defaultValue = null) {
        return path
            .split('.')
            .reduce((o, p) => o ? o[p] : defaultValue, object)
    }
}