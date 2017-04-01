/*
 * Copyright (C) 2016  Alex Yatskov <alex@foosoft.net>
 * Author: Alex Yatskov <alex@foosoft.net>
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


window.displayFrame = new class extends Display {
    constructor() {
        super($('#spinner'), $('#content'));
        $(window).on('message', this.onMessage.bind(this));
    }

    definitionAdd(definition, mode) {
        return bgDefinitionAdd(definition, mode);
    }

    definitionsAddable(definitions, modes) {
        return bgDefinitionsAddable(definitions, modes);
    }

    templateRender(template, data) {
        return bgTemplateRender(template, data);
    }

    kanjiFind(character) {
        return bgKanjiFind(character);
    }

    handleError(error) {
        if (window.orphaned) {
            this.showOrphaned();
        } else {
            window.alert(`Error: ${error}`);
        }
    }

    clearSearch() {
        window.parent.postMessage('popupClose', '*');
    }

    selectionCopy() {
        window.parent.postMessage('selectionCopy', '*');
    }

    showOrphaned() {
        $('#content').hide();
        $('#orphan').show();
    }

    onMessage(e) {
        const handlers = {
            showTermDefs: ({definitions, options, context}) => {
                this.showTermDefs(definitions, options, context);
            },

            showKanjiDefs: ({definitions, options, context}) => {
                this.showKanjiDefs(definitions, options, context);
            },

            showOrphaned: () => {
                this.showOrphaned();
            }
        };

        const {action, params} = e.originalEvent.data;
        const handler = handlers[action];
        if (handler) {
            handler(params);
        }
    }

    onKeyDown(e) {
        if (super.onKeyDown(e)) {
            return true;
        }

        const handlers = {
            67: /* c */ () => {
                if (e.ctrlKey) {
                    this.selectionCopy();
                    return true;
                }
            }
        };

        const handler = handlers[e.keyCode];
        if (handler && handler()) {
            e.preventDefault();
            return true;
        }

        return false;
    }
};
