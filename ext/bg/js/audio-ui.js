/*
 * Copyright (C) 2019  Alex Yatskov <alex@foosoft.net>
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


class AudioSourceUI {
    static instantiateTemplate(templateSelector) {
        const template = document.querySelector(templateSelector);
        const content = document.importNode(template.content, true);
        return $(content.firstChild);
    }
}

AudioSourceUI.Container = class Container {
    constructor(audioSources, container, addButton) {
        this.audioSources = audioSources;
        this.container = container;
        this.addButton = addButton;
        this.children = [];

        this.container.empty();

        for (const audioSource of toIterable(audioSources)) {
            this.children.push(new AudioSourceUI.AudioSource(this, audioSource, this.children.length));
        }

        this.addButton.on('click', () => this.onAddAudioSource());
    }

    cleanup() {
        for (const child of this.children) {
            child.cleanup();
        }

        this.addButton.off('click');
        this.container.empty();
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

        this.container = AudioSourceUI.instantiateTemplate('#audio-source-template').appendTo(parent.container);
        this.select = this.container.find('.audio-source-select');
        this.removeButton = this.container.find('.audio-source-remove');

        this.select.val(audioSource);

        this.select.on('change', () => this.onSelectChanged());
        this.removeButton.on('click', () => this.onRemoveClicked());
    }

    cleanup() {
        this.select.off('change');
        this.removeButton.off('click');
        this.container.remove();
    }

    save() {
        this.parent.save();
    }

    onSelectChanged() {
        this.audioSource = this.select.val();
        this.parent.audioSources[this.index] = this.audioSource;
        this.save();
    }

    onRemoveClicked() {
        this.parent.remove(this);
        this.save();
    }
};
