/*
 * Copyright (C) 2019-2020  Alex Yatskov <alex@foosoft.net>
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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

class AudioSourceUI {
    static instantiateTemplate(templateSelector) {
        const template = document.querySelector(templateSelector);
        const content = document.importNode(template.content, true);
        return content.firstChild;
    }
}

AudioSourceUI.Container = class Container {
    constructor(audioSources, container, addButton) {
        this.audioSources = audioSources;
        this.container = container;
        this.addButton = addButton;
        this.children = [];

        this.container.textContent = '';

        for (const audioSource of toIterable(audioSources)) {
            this.children.push(new AudioSourceUI.AudioSource(this, audioSource, this.children.length));
        }

        this._clickListener = this.onAddAudioSource.bind(this);
        this.addButton.addEventListener('click', this._clickListener, false);
    }

    cleanup() {
        for (const child of this.children) {
            child.cleanup();
        }

        this.addButton.removeEventListener('click', this._clickListener, false);
        this.container.textContent = '';
        this._clickListener = null;
    }

    save() {
        // Override
    }

    remove(child) {
        const index = this.children.indexOf(child);
        if (index < 0) {
            return;
        }

        child.cleanup();
        this.children.splice(index, 1);
        this.audioSources.splice(index, 1);

        for (let i = index; i < this.children.length; ++i) {
            this.children[i].index = i;
        }
    }

    onAddAudioSource() {
        const audioSource = this.getUnusedAudioSource();
        this.audioSources.push(audioSource);
        this.save();
        this.children.push(new AudioSourceUI.AudioSource(this, audioSource, this.children.length));
    }

    getUnusedAudioSource() {
        const audioSourcesAvailable = [
            'jpod101',
            'jpod101-alternate',
            'jisho',
            'custom'
        ];
        for (const source of audioSourcesAvailable) {
            if (this.audioSources.indexOf(source) < 0) {
                return source;
            }
        }
        return audioSourcesAvailable[0];
    }
};

AudioSourceUI.AudioSource = class AudioSource {
    constructor(parent, audioSource, index) {
        this.parent = parent;
        this.audioSource = audioSource;
        this.index = index;

        this.container = AudioSourceUI.instantiateTemplate('#audio-source-template');
        this.select = this.container.querySelector('.audio-source-select');
        this.removeButton = this.container.querySelector('.audio-source-remove');

        this.select.value = audioSource;

        this._selectChangeListener = this.onSelectChanged.bind(this);
        this._removeClickListener = this.onRemoveClicked.bind(this);

        this.select.addEventListener('change', this._selectChangeListener, false);
        this.removeButton.addEventListener('click', this._removeClickListener, false);

        parent.container.appendChild(this.container);
    }

    cleanup() {
        this.select.removeEventListener('change', this._selectChangeListener, false);
        this.removeButton.removeEventListener('click', this._removeClickListener, false);

        if (this.container.parentNode !== null) {
            this.container.parentNode.removeChild(this.container);
        }
    }

    save() {
        this.parent.save();
    }

    onSelectChanged() {
        this.audioSource = this.select.value;
        this.parent.audioSources[this.index] = this.audioSource;
        this.save();
    }

    onRemoveClicked() {
        this.parent.remove(this);
        this.save();
    }
};
