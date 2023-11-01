/*
 * Copyright (C) 2023  Yomitan Authors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const path = require('path');
const {test: base, chromium} = require('@playwright/test');

export const root = path.join(__dirname, '..', '..');

export const test = base.extend({
    context: async ({ }, use) => {
        const pathToExtension = path.join(root, 'ext');
        const context = await chromium.launchPersistentContext('', {
            // headless: false,
            args: [
                '--headless=new',
                `--disable-extensions-except=${pathToExtension}`,
                `--load-extension=${pathToExtension}`
            ]
        });
        await use(context);
        await context.close();
    },
    extensionId: async ({context}, use) => {
        let [background] = context.serviceWorkers();
        if (!background) {
            background = await context.waitForEvent('serviceworker');
        }

        const extensionId = background.url().split('/')[2];
        await use(extensionId);
    }
});
export const expect = test.expect;

export const mockModelFieldNames = [
    'Word',
    'Reading',
    'Audio',
    'Sentence'
];

export const mockModelFieldsToAnkiValues = {
    'Word': '{expression}',
    'Reading': '{furigana-plain}',
    'Sentence': '{clipboard-text}',
    'Audio': '{audio}'
};

export const mockAnkiRouteHandler = (route) => {
    const reqBody = route.request().postDataJSON();
    const respBody = ankiRouteResponses[reqBody.action];
    if (!respBody) {
        return route.abort();
    }
    route.fulfill(respBody);
};

export const writeToClipboardFromPage = async (page, text) => {
    await page.evaluate(`navigator.clipboard.writeText('${text}')`);
};

export const expectedAddNoteBody = {
    'action': 'addNote',
    'params':
    {
        'note': {
            'fields': {
                'Word': '読む', 'Reading': '読[よ]む', 'Audio': '[sound:mock_audio.mp3]', 'Sentence': '読むの例文'
            },
            'tags': ['yomitan'],
            'deckName': 'Mock Deck',
            'modelName': 'Mock Model',
            'options': {
                'allowDuplicate': false, 'duplicateScope': 'collection', 'duplicateScopeOptions': {
                    'deckName': null, 'checkChildren': false, 'checkAllModels': false
                }
            }
        }
    }, 'version': 2
};

const baseAnkiResp = {
    status: 200,
    contentType: 'text/json'
};

const ankiRouteResponses = {
    'version': Object.assign({body: JSON.stringify(6)}, baseAnkiResp),
    'deckNames': Object.assign({body: JSON.stringify(['Mock Deck'])}, baseAnkiResp),
    'modelNames': Object.assign({body: JSON.stringify(['Mock Model'])}, baseAnkiResp),
    'modelFieldNames': Object.assign({body: JSON.stringify(mockModelFieldNames)}, baseAnkiResp),
    'canAddNotes': Object.assign({body: JSON.stringify([true, true])}, baseAnkiResp),
    'storeMediaFile': Object.assign({body: JSON.stringify('mock_audio.mp3')}, baseAnkiResp),
    'addNote': Object.assign({body: JSON.stringify(102312488912)}, baseAnkiResp)
};