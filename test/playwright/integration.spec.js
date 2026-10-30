/*
 * Copyright (C) 2023-2026  Yomitan Authors
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

import path from 'path';
import {createDictionaryArchiveData} from '../../dev/dictionary-archive-util.js';
import {deferPromise} from '../../ext/js/core/utilities.js';
import {
    expect,
    getExpectedAddNoteBody,
    getMockModelFields,
    mockAnkiRouteHandler,
    root,
    test,
    writeToClipboardFromPage,
} from './playwright-util.js';

test.beforeEach(async ({context}) => {
    // Wait for the on-install welcome.html tab to load, which becomes the foreground tab
    const welcome = await context.waitForEvent('page');
    await welcome.close(); // Close the welcome tab so our main tab becomes the foreground tab -- otherwise, the screenshot can hang
});

test('search clipboard', async ({page, extensionId}) => {
    await page.goto(`chrome-extension://${extensionId}/search.html`);
    await page.locator('#search-option-clipboard-monitor-container > label').click();
    await page.waitForTimeout(200); // Race

    await writeToClipboardFromPage(page, 'あ');
    await expect(page.locator('#search-textbox')).toHaveValue('あ');
});

for (const combined of [false, true]) {
    test(combined ? 'anki add duplicate and update existing' : 'anki add', async ({context, page, extensionId}, testInfo) => {
        // Mock anki routes
        /** @type {import('core').DeferredPromiseDetails<Record<string, unknown>>} */
        const addNotePromiseDetails = deferPromise();
        const duplicateIds = [10, 20];
        /** @type {Record<string, unknown>[]} */
        const updates = [];
        let adds = 0;
        await context.route(/127.0.0.1:8765\/*/, async (route) => {
            /** @type {unknown} */
            const requestJson = route.request().postDataJSON();
            const body = /** @type {{action: string, params: {notes: unknown[], actions: unknown[], note: Record<string, unknown>}}} */ (requestJson);
            if (body.action === 'addNote') { ++adds; }
            let result;
            if (body.action === 'canAddNotesWithErrorDetail') {
                result = body.params.notes.map(() => (combined ? {canAdd: false, error: 'cannot create note because it is a duplicate'} : {canAdd: true}));
            }
            if (combined) {
                switch (body.action) {
                    case 'multi':
                        result = body.params.actions.map(() => duplicateIds);
                        break;
                    case 'notesInfo':
                        result = duplicateIds.map((noteId) => ({
                            noteId,
                            modelName: 'Mock Model',
                            tags: [],
                            cards: [],
                            fields: {
                                Word: {value: '読む', order: 0},
                                Reading: {value: 'preserved reading', order: 1},
                                Sentence: {value: 'old sentence', order: 2},
                                Audio: {value: 'broken nonempty audio', order: 3},
                            },
                        }));
                        break;
                    case 'cardsInfo': result = []; break;
                    case 'addNote':
                        duplicateIds.push(30);
                        result = 30;
                        break;
                    case 'updateNoteFields':
                        updates.push(body.params.note);
                        result = null;
                        break;
                }
            }
            await (typeof result !== 'undefined' ? route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(result)}) : mockAnkiRouteHandler(route));
            if (body.action === 'addNote') { addNotePromiseDetails.resolve(body); }
        });

        // Open settings
        await page.goto(`chrome-extension://${extensionId}/settings.html`);

        await expect(page.locator('id=dictionaries')).toBeVisible();

        // Load in test dictionary
        const dictionary = await createDictionaryArchiveData(path.join(root, 'test/data/dictionaries/valid-dictionary1'), 'valid-dictionary1');
        await page.locator('input[id="dictionary-import-file-input"]').setInputFiles({
            name: 'valid-dictionary1.zip',
            mimeType: 'application/x-zip',
            buffer: Buffer.from(dictionary),
        });
        await expect(page.locator('id=dictionaries')).toHaveText('Dictionaries (1 installed, 1 enabled)', {timeout: 1 * 60 * 1000});

        // Connect to anki
        await page.locator('.toggle', {has: page.locator('[data-setting="anki.enable"]')}).click();
        await expect(page.locator('#anki-error-message')).toHaveText('Connected');

        if (combined) {
            await page.locator('.toggle', {has: page.locator('[data-setting="general.showAdvanced"]')}).click();
            await page.locator('[data-setting="anki.duplicateBehavior"]').selectOption('new-and-overwrite');
            await page.locator('[data-setting="anki.displayTagsAndFlags"]').selectOption('never');
            await page.locator('.toggle', {has: page.locator('[data-setting="anki.noteDupeCheckFirst"]')}).click();
        }

        // Prep anki deck
        await page.locator('[data-modal-action="show,anki-cards"]').click();
        await page.locator('select.anki-card-deck').selectOption('Mock Deck');
        await page.locator('select.anki-card-model').selectOption('Mock Model');
        const mockFields = getMockModelFields();
        for (const [modelField, value] of mockFields) {
            await page.locator(`[data-setting="anki.cardFormats[0].fields.${modelField}.value"]`).fill(value);
        }
        if (combined) {
            const fieldPolicy = page.locator('[data-setting="anki.cardFormats[0].fields.Sentence.overwriteMode"]');
            await expect(fieldPolicy).toBeVisible();
            await fieldPolicy.selectOption('overwrite');
            for (const index of [1, 3, 4]) {
                if (index > 2) { await page.locator('#anki-cards-new-format button').click(); }
                await page.locator('#anki-cards-tabs .tab', {has: page.locator(`[data-card-format-index="${index}"]`)}).click();
                await page.locator('select.anki-card-deck').selectOption('Mock Deck');
                await page.locator('select.anki-card-model').selectOption('Mock Model');
                await page.locator('select.anki-card-icon').selectOption(index === 1 ? 'small-circle' : (index === 3 ? 'big-square' : 'big-diamond'));
                for (const [modelField, value] of mockFields) {
                    await page.locator(`[data-setting="anki.cardFormats[${index}].fields.${modelField}.value"]`).fill(value);
                }
            }
        }
        await page.locator('#anki-cards-modal > div > div.modal-footer > button:nth-child(2)').click();
        await writeToClipboardFromPage(page, '読むの例文');

        // Add to anki deck
        await page.goto(`chrome-extension://${extensionId}/search.html`);
        await expect(async () => {
            await page.locator('#search-textbox').clear();
            await page.locator('#search-textbox').fill('読む');
            await expect(page.locator('#search-textbox')).toHaveValue('読む');
        }).toPass({timeout: 5000});
        await page.locator('#search-textbox').press('Enter');
        await page.locator('[data-action="add-note"][data-card-format-index="0"]').click();
        const addNoteReqBody = await addNotePromiseDetails.promise;
        expect(addNoteReqBody).toMatchObject(getExpectedAddNoteBody());
        if (combined) {
            const add = page.locator('[data-action="add-note"][data-card-format-index="0"]');
            const update = page.locator('[data-action="update-note"][data-card-format-index="0"]');
            await expect(add).toBeEnabled();
            await expect(update).toBeEnabled();
            expect(adds).toBe(1);
            expect(updates).toHaveLength(0);
            await expect(update).toHaveAttribute('title', /first available compatible duplicate/);
            await expect(page.locator('[data-action="view-note"]').first()).toHaveAttribute('data-note-ids', '10 20 30');
            // Update is reachable by keyboard without changing the add-note shortcut.
            await add.focus();
            await page.keyboard.press('Tab');
            await expect(update).toBeFocused();
            await page.keyboard.press('Enter');
            await expect(update).toBeEnabled();
            expect(updates).toHaveLength(1);
            expect(updates[0]).toMatchObject({id: 10, fields: {Word: '読む', Reading: 'preserved reading', Sentence: '読むの例文', Audio: 'broken nonempty audio'}});
            expect(adds).toBe(1);
            await page.screenshot({path: testInfo.outputPath('anki-actions-desktop.png')});
            await page.setViewportSize({width: 320, height: 640});
            await expect(add).toBeInViewport();
            await expect(update).toBeInViewport();
            const updateButtons = page.locator('.note-actions-container [data-action="update-note"]:visible');
            await expect(updateButtons).toHaveCount(4);
            for (const button of await updateButtons.all()) { await expect(button).toBeInViewport({ratio: 1}); }
            await page.screenshot({path: testInfo.outputPath('anki-actions-narrow.png')});
        }
    });
}
