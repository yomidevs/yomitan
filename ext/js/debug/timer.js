/*
 * Copyright (C) 2019-2021  Yomichan Authors
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

class Timer {
    constructor(name) {
        this.samples = [];
        this.parent = null;

        this.sample(name);
        const current = Timer.current;
        if (current !== null) {
            current.samples[current.samples.length - 1].children.push(this);
            this.parent = current;
        }
        Timer.current = this;
    }

    sample(name) {
        const time = performance.now();
        this.samples.push({
            name,
            time,
            children: []
        });
    }

    complete(skip) {
        this.sample('complete');

        Timer.current = this.parent;
        if (this.parent === null) {
            if (!skip) {
                console.log(this.toString());
            }
        } else {
            if (skip) {
                const sample = this.parent.samples[this.parent.samples.length - 1];
                sample.children.splice(sample.children.length - 1, 1);
            }
        }
    }

    duration(sampleIndex) {
        const sampleIndexIsValid = (typeof sampleIndex === 'number');
        const startIndex = (sampleIndexIsValid ? sampleIndex : 0);
        const endIndex = (sampleIndexIsValid ? sampleIndex + 1 : this.times.length - 1);
        return (this.times[endIndex].time - this.times[startIndex].time);
    }

    toString() {
        const indent = '  ';
        const name = this.samples[0].name;
        const duration = this.samples[this.samples.length - 1].time - this.samples[0].time;
        const extensionName = chrome.runtime.getManifest().name;
        return `${name} took ${duration.toFixed(8)}ms  [${extensionName}]` + this._indentString(this.getSampleString(), indent);
    }

    getSampleString() {
        const indent = '  ';
        const duration = this.samples[this.samples.length - 1].time - this.samples[0].time;
        let message = '';

        for (let i = 0, ii = this.samples.length - 1; i < ii; ++i) {
            const sample = this.samples[i];
            const sampleDuration = this.samples[i + 1].time - sample.time;
            message += `\nSample[${i}] took ${sampleDuration.toFixed(8)}ms (${((sampleDuration / duration) * 100.0).toFixed(1)}%)  [${sample.name}]`;
            for (const child of sample.children) {
                message += this._indentString(child.getSampleString(), indent);
            }
        }

        return message;
    }

    _indentString(message, indent) {
        return message.replace(/\n/g, `\n${indent}`);
    }
}

Timer.current = null;
