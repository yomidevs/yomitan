/*
 * Copyright (C) 2020-2021  Yomichan Authors
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

/* global
 * AnkiUtil
 * TemplateRendererProxy
 */

class AnkiNoteBuilder {
    constructor() {
        this._markerPattern = AnkiUtil.cloneFieldMarkerPattern(true);
        this._templateRenderer = new TemplateRendererProxy();
    }

    async createNote({
        definition,
        mode,
        context,
        templates,
        deckName,
        modelName,
        fields,
        tags=[],
        injectedMedia=null,
        checkForDuplicates=true,
        duplicateScope='collection',
        resultOutputMode='split',
        glossaryLayoutMode='default',
        compactTags=false,
        errors=null
    }) {
        let duplicateScopeDeckName = null;
        let duplicateScopeCheckChildren = false;
        if (duplicateScope === 'deck-root') {
            duplicateScope = 'deck';
            duplicateScopeDeckName = AnkiUtil.getRootDeckName(deckName);
            duplicateScopeCheckChildren = true;
        }

        const data = {
            definition,
            mode,
            context,
            resultOutputMode,
            glossaryLayoutMode,
            compactTags,
            injectedMedia
        };
        const formattedFieldValuePromises = [];
        for (const [, fieldValue] of fields) {
            const formattedFieldValuePromise = this._formatField(fieldValue, data, templates, errors);
            formattedFieldValuePromises.push(formattedFieldValuePromise);
        }

        const formattedFieldValues = await Promise.all(formattedFieldValuePromises);
        const noteFields = {};
        for (let i = 0, ii = fields.length; i < ii; ++i) {
            const fieldName = fields[i][0];
            const formattedFieldValue = formattedFieldValues[i];
            noteFields[fieldName] = formattedFieldValue;
        }

        return {
            fields: noteFields,
            tags,
            deckName,
            modelName,
            options: {
                allowDuplicate: !checkForDuplicates,
                duplicateScope,
                duplicateScopeOptions: {
                    deckName: duplicateScopeDeckName,
                    checkChildren: duplicateScopeCheckChildren
                }
            }
        };
    }

    // Private

    async _formatField(field, data, templates, errors=null) {
        return await this._stringReplaceAsync(field, this._markerPattern, async (g0, marker) => {
            try {
                return await this._renderTemplate(templates, data, marker);
            } catch (e) {
                if (errors) {
                    const error = new Error(`Template render error for {${marker}}`);
                    error.data = {error: e};
                    errors.push(error);
                }
                return `{${marker}-render-error}`;
            }
        });
    }

    async _stringReplaceAsync(str, regex, replacer) {
        let match;
        let index = 0;
        const parts = [];
        while ((match = regex.exec(str)) !== null) {
            parts.push(str.substring(index, match.index), replacer(...match, match.index, str));
            index = regex.lastIndex;
        }
        if (parts.length === 0) {
            return str;
        }
        parts.push(str.substring(index));
        return (await Promise.all(parts)).join('');
    }

    async _renderTemplate(template, data, marker) {
        return await this._templateRenderer.render(template, {data, marker}, 'ankiNote');
    }
}
