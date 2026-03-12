import {performance} from 'node:perf_hooks';
import {expect, test, vi} from 'vitest';
import {DisplayAnki} from './ext/js/display/display-anki.js';
import {setupDomTest} from './test/fixtures/dom-test.js';

vi.mock('./ext/lib/kanji-processor.js', () => ({
    convertVariants: (text) => text,
}));

const {Backend} = await import('./ext/js/background/backend.js');

function createTermEntry() {
    return {
        type: 'term',
        headwords: [{term: 'term', reading: 'reading', sources: [{originalText: 'term', deinflectedText: 'term'}]}],
    };
}

function createFastProbeCardFormat() {
    return {
        type: 'term',
        name: 'Expression',
        deck: 'Deck',
        model: 'Model',
        fields: {
            Front: {value: '{expression}', overwriteMode: 'overwrite'},
        },
        icon: 'big-circle',
    };
}

function setupDocument(document, count) {
    global.chrome = /** @type {typeof chrome} */ ({runtime: {getURL: (path) => path}});
    document.body.innerHTML = `
        <div id="popup-menus"></div>
        <template id="action-button-container-template">
            <div class="action-button-container">
                <button type="button" class="action-button" data-action="save-note">
                    <span class="action-icon icon color-icon" data-icon=""></span>
                </button>
            </div>
        </template>
        <template id="note-action-button-view-note-template">
            <button type="button" class="action-button" data-action="view-note" hidden disabled title="View added note">
                <span class="action-icon icon color-icon" data-icon="view-note"></span>
                <span class="action-button-badge icon"></span>
            </button>
        </template>
        <template id="note-action-button-view-tags-template">
            <button type="button" class="action-button" data-action="view-tags" hidden disabled>
                <span class="action-icon icon" data-icon="tag"></span>
            </button>
        </template>
        <template id="note-action-button-view-flags-template">
            <button type="button" class="action-button" data-action="view-flags" hidden disabled>
                <span class="action-icon icon" data-icon="flag"></span>
            </button>
        </template>
    `;
    const nodes = [];
    for (let i = 0; i < count; ++i) {
        const node = document.createElement('div');
        node.className = 'entry';
        node.innerHTML = '<div class="note-actions-container"></div>';
        document.body.appendChild(node);
        nodes.push(node);
    }
    return nodes;
}

function createNotes(count) {
    const notes = [];
    for (let i = 0; i < count; ++i) {
        notes.push({
            fields: {Front: `term-${i}`, Back: 'x'.repeat(4096)},
            tags: [],
            deckName: 'Deck',
            modelName: 'Model',
            options: {
                allowDuplicate: true,
                duplicateScope: 'collection',
                duplicateScopeOptions: {deckName: null, checkChildren: false, checkAllModels: false},
            },
        });
    }
    return notes;
}

class DuplicateCheckBenchmarkAnki {
    constructor(notesToDuplicate) {
        this._duplicateNoteIds = new Map();
        let noteId = 1;
        for (let i = 0; i < notesToDuplicate.length; i += 2) {
            this._duplicateNoteIds.set(JSON.stringify(Object.entries(notesToDuplicate[i].fields)[0]), noteId);
            noteId += 1;
        }
    }

    async canAddNotesWithErrorDetail(notes) {
        return notes.map((note) => ({
            canAdd: !this._duplicateNoteIds.has(JSON.stringify(Object.entries(note.fields)[0])),
            error: this._duplicateNoteIds.has(JSON.stringify(Object.entries(note.fields)[0])) ? 'cannot create note because it is a duplicate' : null,
        }));
    }

    async findNoteIds(notes) {
        return notes.map((note) => {
            const noteId = this._duplicateNoteIds.get(JSON.stringify(Object.entries(note.fields)[0]));
            return typeof noteId === 'number' ? [noteId] : [];
        });
    }

    async notesInfo(noteIds) {
        return noteIds.map((noteId) => ({noteId, cards: [noteId + 1000], cardsInfo: [], tags: []}));
    }

    async cardsInfo(cardIds) {
        return cardIds.map((cardId) => ({noteId: cardId - 1000, cardState: 0, flags: 0}));
    }
}

function createBackendHarness() {
    const backend = Object.create(Backend.prototype);
    backend._anki = new DuplicateCheckBenchmarkAnki(createNotes(250));
    return backend;
}

function createDisplayAnki(document, dictionaryEntries, dictionaryEntryNodes, backend, lazy) {
    const api = {
        getAnkiNoteInfo: vi.fn(async (notes, fetchAdditionalInfo, fetchDuplicateNoteIds) => (
            await backend._onApiGetAnkiNoteInfo({notes, fetchAdditionalInfo, fetchDuplicateNoteIds})
        )),
        isAnkiConnected: vi.fn(async () => true),
        getDictionaryInfo: vi.fn(async () => []),
        getDefaultAnkiFieldTemplates: vi.fn(async () => ''),
    };
    const display = {
        application: {api},
        hotkeyHandler: {registerActions: vi.fn()},
        on: vi.fn(),
        displayGenerator: {
            instantiateTemplate(name) {
                const template = document.querySelector(`#${name}-template`);
                return template.content.firstElementChild.cloneNode(true);
            },
            createAnkiNoteErrorsNotificationContent() { return document.createElement('div'); },
        },
        dictionaryEntries,
        dictionaryEntryNodes,
        getOptions: () => ({anki: {enable: true, fieldTemplates: ''}, dictionaries: []}),
        getContentOrigin: () => ({tabId: 1, frameId: 0}),
        getOptionsContext: () => ({}),
        getLanguageSummary: () => ({}),
        createNotification: () => ({setContent: vi.fn(), open: vi.fn(), close: vi.fn()}),
        progressIndicatorVisible: {setOverride: vi.fn(() => 1), clearOverride: vi.fn()},
        _hotkeyHelpController: {setHotkeyLabel: vi.fn(), getHotkeyLabel: vi.fn(() => null), setupNode: vi.fn()},
    };
    const displayAnki = new DisplayAnki(display, {getAnkiNoteMediaAudioDetails: vi.fn(() => ({sources: [], preferredAudioIndex: null, enableDefaultAudioSources: true}))});
    displayAnki._checkForDuplicates = true;
    displayAnki._duplicateBehavior = 'new';
    displayAnki._displayTagsAndFlags = 'never';
    displayAnki._cardFormats = [createFastProbeCardFormat()];
    displayAnki._dictionaryEntryDetails = null;
    displayAnki._dictionaries = [];
    displayAnki._noteContext = {
        url: 'https://example.test',
        sentence: {text: 'term', offset: 0},
        documentTitle: 'title',
        query: 'term',
        fullQuery: 'term',
    };
    if (!lazy) {
        displayAnki._shouldFetchDuplicateNoteIdsLazily = () => false;
    }
    return {displayAnki, api};
}

async function measure(iterations, callback) {
    const startedAt = performance.now();
    for (let i = 0; i < iterations; ++i) {
        await callback();
    }
    return (performance.now() - startedAt) / iterations;
}

test('compare eager and lazy duplicate-id preload', async () => {
    const dictionaryEntries = Array.from({length: 250}, () => createTermEntry());
    const {window, teardown} = await setupDomTest();
    const dictionaryEntryNodes = setupDocument(window.document, dictionaryEntries.length);
    const backend = createBackendHarness();
    try {
        const {displayAnki: eagerDisplayAnki} = createDisplayAnki(window.document, dictionaryEntries, dictionaryEntryNodes, backend, false);
        const {displayAnki: lazyDisplayAnki} = createDisplayAnki(window.document, dictionaryEntries, dictionaryEntryNodes, backend, true);

        const eagerMs = await measure(40, async () => {
            eagerDisplayAnki._dictionaryEntryDetails = null;
            await eagerDisplayAnki._updateDictionaryEntryDetails();
        });
        const lazyMs = await measure(40, async () => {
            lazyDisplayAnki._dictionaryEntryDetails = null;
            await lazyDisplayAnki._updateDictionaryEntryDetails();
        });

        console.log(JSON.stringify({
            eagerInitialPreloadMsPerRun: eagerMs,
            lazyInitialPreloadMsPerRun: lazyMs,
            speedup: eagerMs / lazyMs,
        }, null, 2));
        expect(lazyMs).toBeGreaterThan(0);
    } finally {
        await teardown(global);
    }
});
