#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const enPath = path.join(root, 'ext', '_locales', 'en', 'messages.json');
const ruPath = path.join(root, 'ext', '_locales', 'ru', 'messages.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));

/** @type {Record<string, [string, string]>} */
const pairs = {
    js_noDictionaryEnabled: ['No dictionary enabled', 'Словарь не включён'],
    js_moreInfo: ['More info', 'Подробнее'],
    js_scanningParser: ['Scanning parser', 'Парсер сканирования'],
    js_image: ['Image', 'Изображение'],
    js_ankiConnected: ['Connected', 'Подключено'],
    js_ankiNotEnabled: ['Not enabled', 'Не включено'],
    js_none: ['None', 'Нет'],
    js_varies: ['Varies', 'Различается'],
    js_notSelected: ['Not selected', 'Не выбрано'],
    js_deletingDictionary: ['Deleting dictionary...', 'Удаление словаря…'],
    js_dictAuthor: ['Author', 'Автор'],
    js_dictUrl: ['URL', 'URL'],
    js_dictDescription: ['Description', 'Описание'],
    js_dictAttribution: ['Attribution', 'Атрибуция'],
    js_dictSourceLanguage: ['Source Language', 'Язык источника'],
    js_dictTargetLanguage: ['Target Language', 'Целевой язык'],
    js_dictTermCount: ['Term Count', 'Число терминов'],
    js_dictTermMetaCount: ['Term Meta Count', 'Число метаданных терминов'],
    js_dictKanjiCount: ['Kanji Count', 'Число кандзи'],
    js_dictKanjiMetaCount: ['Kanji Meta Count', 'Число метаданных кандзи'],
    js_dictTagCount: ['Tag Count', 'Число меток'],
    js_dictMediaCount: ['Media Count', 'Число медиа'],
    js_dictFrequencyMode: ['Frequency Mode', 'Режим частотности'],
    js_dictPrefixWildcards: ['Prefix Wildcards Enabled', 'Подстановочные префиксы включены'],
    js_dictImportSuccess: ['Import Success', 'Импорт успешен'],
    js_dictExpected: ['Expected', 'Ожидалось'],
    js_dictDatabase: ['Database', 'База'],
    js_importInitializing: ['Initializing import', 'Инициализация импорта'],
    js_importLoadingDictionary: ['Loading dictionary', 'Загрузка словаря'],
    js_importLoadingSchemas: ['Loading schemas', 'Загрузка схем'],
    js_importValidatingData: ['Validating data', 'Проверка данных'],
    js_importImportingData: ['Importing data', 'Импорт данных'],
    js_importFinalizing: ['Finalizing import', 'Завершение импорта'],
    js_importDownloading: ['Downloading dictionary', 'Скачивание словаря'],
    js_backupDoneImporting: [
        'Done importing. You will need to re-enable the dictionaries and refresh afterward. If you run into issues, please restart the browser. If it continues to fail, reinstall Yomitan and import dictionaries one-by-one.',
        'Импорт завершён. Снова включите словари и обновите страницу. При проблемах перезапустите браузер. Если не помогает — переустановите Yomitan и импортируйте словари по одному.',
    ],
    js_backupOpInProgress: [
        'An export or import operation is already in progress. Please wait till it is over.',
        'Экспорт или импорт уже выполняется. Дождитесь окончания.',
    ],
    js_backupExportErrors: [
        'Errors encountered while exporting. Please try again. Restart the browser if it continues to fail.',
        'Ошибки при экспорте. Повторите попытку. При повторении перезапустите браузер.',
    ],
    js_backupImportErrors: [
        'Encountered errors when importing. Please restart the browser and try again. If it continues to fail, reinstall Yomitan and import dictionaries one-by-one.',
        'Ошибки при импорте. Перезапустите браузер и попробуйте снова. Если не помогает — переустановите Yomitan и импортируйте словари по одному.',
    ],
    js_optionPrefix: ['Option ', 'Параметр '],
    js_failedToggleOption: ['Failed to toggle option ', 'Не удалось переключить параметр '],
    js_exportingToFile: ['Exporting to File...', 'Экспорт в файл…'],
    js_sendingToAnki: ['Sending to Anki...', 'Отправка в Anki…'],
    js_noUpdates: ['No updates', 'Нет обновлений'],
    js_updatesCount: ['$1$ update', '$1$ обновление'],
    js_updatesCountPlural: ['$1$ updates', '$1$ обновлений'],
    js_importProgress: ['Import Progress: $1$ of $2$ rows completed', 'Прогресс импорта: $1$ из $2$ строк'],
};

for (const [key, [e, r]] of Object.entries(pairs)) {
    en[key] = {message: e, description: 'JS UI string'};
    ru[key] = {message: r, description: 'JS UI string'};
}

en.js_unknownSource = {
    message: 'Unknown source: $1$',
    description: 'JS UI string',
    placeholders: {
        1: {content: '$1', example: 'source'},
    },
};
ru.js_unknownSource = {
    message: 'Неизвестный источник: $1$',
    description: 'JS UI string',
    placeholders: {
        1: {content: '$1', example: 'source'},
    },
};

// placeholder metadata for count strings
for (const key of ['js_updatesCount', 'js_updatesCountPlural']) {
    en[key].placeholders = {1: {content: '$1', example: '2'}};
    ru[key].placeholders = {1: {content: '$1', example: '2'}};
}
en.js_importProgress.placeholders = {
    1: {content: '$1', example: '1'},
    2: {content: '$2', example: '10'},
};
ru.js_importProgress.placeholders = {
    1: {content: '$1', example: '1'},
    2: {content: '$2', example: '10'},
};

/**
 * @param {Record<string, unknown>} obj
 */
function sortObj(obj) {
    /** @type {Record<string, unknown>} */
    const o = {};
    for (const k of Object.keys(obj).sort()) {
        o[k] = obj[k];
    }
    return o;
}

fs.writeFileSync(enPath, `${JSON.stringify(sortObj(en), null, 4)}\n`, 'utf8');
fs.writeFileSync(ruPath, `${JSON.stringify(sortObj(ru), null, 4)}\n`, 'utf8');
console.log('total keys', Object.keys(en).length);
