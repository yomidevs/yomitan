/*
 * Copyright (C) 2020  Yomichan Authors
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


class TemplateHandler {
    constructor(html) {
        this._templates = new Map();

        const doc = new DOMParser().parseFromString(html, 'text/html');
        for (const template of doc.querySelectorAll('template')) {
            this._setTemplate(template);
        }
    }

    _setTemplate(template) {
        const idMatch = template.id.match(/^([a-z-]+)-template$/);
        if (!idMatch) {
            throw new Error(`Invalid template ID: ${template.id}`);
        }
        this._templates.set(idMatch[1], template);
    }

    instantiate(name) {
        const template = this._templates.get(name);
        return document.importNode(template.content.firstChild, true);
    }

    instantiateFragment(name) {
        const template = this._templates.get(name);
        return document.importNode(template.content, true);
    }
}
