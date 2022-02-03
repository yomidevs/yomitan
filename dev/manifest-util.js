/*
 * Copyright (C) 2021-2022  Yomichan Authors
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

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');


function clone(value) {
    return JSON.parse(JSON.stringify(value));
}


class ManifestUtil {
    constructor() {
        const fileName = path.join(__dirname, 'data', 'manifest-variants.json');
        const {manifest, variants, defaultVariant} = JSON.parse(fs.readFileSync(fileName));
        this._manifest = manifest;
        this._variants = variants;
        this._defaultVariant = defaultVariant;
        this._variantMap = new Map();
        for (const variant of variants) {
            this._variantMap.set(variant.name, variant);
        }
    }

    getManifest(variantName) {
        if (typeof variantName === 'string') {
            const variant = this._variantMap.get(variantName);
            if (typeof variant !== 'undefined') {
                return this._createVariantManifest(this._manifest, variant);
            }
        }

        if (typeof this._defaultVariant === 'string') {
            const variant = this._variantMap.get(this._defaultVariant);
            if (typeof variant !== 'undefined') {
                return this._createVariantManifest(this._manifest, variant);
            }
        }

        return clone(this._manifest);
    }

    getVariants() {
        return [...this._variants];
    }

    getVariant(name) {
        return this._variantMap.get(name);
    }

    static createManifestString(manifest) {
        return JSON.stringify(manifest, null, 4) + '\n';
    }

    // Private

    _evaluateModificationCommand(data) {
        const {command, args, trim} = data;
        const {stdout, stderr, status} = childProcess.spawnSync(command, args, {
            cwd: __dirname,
            stdio: 'pipe',
            shell: false
        });
        if (status !== 0) {
            const message = stderr.toString('utf8').trim();
            throw new Error(`Failed to execute ${command} ${args.join(' ')}\nstatus=${status}\n${message}`);
        }
        let result = stdout.toString('utf8');
        if (trim) { result = result.trim(); }
        return result;
    }

    _applyModifications(manifest, modifications) {
        if (Array.isArray(modifications)) {
            for (const modification of modifications) {
                const {action, path: path2} = modification;
                switch (action) {
                    case 'set':
                        {
                            let {value, before, after, command} = modification;
                            const object = this._getObjectProperties(manifest, path2, path2.length - 1);
                            const key = path2[path2.length - 1];

                            let {index} = modification;
                            if (typeof index !== 'number') {
                                index = -1;
                            }
                            if (typeof before === 'string') {
                                index = this._getObjectKeyIndex(object, before);
                            }
                            if (typeof after === 'string') {
                                index = this._getObjectKeyIndex(object, after);
                                if (index >= 0) { ++index; }
                            }
                            if (typeof command === 'object' && command !== null) {
                                value = this._evaluateModificationCommand(command);
                            }

                            this._setObjectKeyAtIndex(object, key, value, index);
                        }
                        break;
                    case 'replace':
                        {
                            const {pattern, patternFlags, replacement} = modification;
                            const value = this._getObjectProperties(manifest, path2, path2.length - 1);
                            const regex = new RegExp(pattern, patternFlags);
                            const last = path2[path2.length - 1];
                            let value2 = value[last];
                            value2 = `${value2}`.replace(regex, replacement);
                            value[last] = value2;
                        }
                        break;
                    case 'delete':
                        {
                            const value = this._getObjectProperties(manifest, path2, path2.length - 1);
                            const last = path2[path2.length - 1];
                            delete value[last];
                        }
                        break;
                    case 'remove':
                        {
                            const {item} = modification;
                            const value = this._getObjectProperties(manifest, path2, path2.length);
                            const index = value.indexOf(item);
                            if (index >= 0) { value.splice(index, 1); }
                        }
                        break;
                    case 'splice':
                        {
                            const {start, deleteCount, items} = modification;
                            const value = this._getObjectProperties(manifest, path2, path2.length);
                            const itemsNew = items.map((v) => clone(v));
                            value.splice(start, deleteCount, ...itemsNew);
                        }
                        break;
                    case 'copy':
                    case 'move':
                        {
                            const {newPath, before, after} = modification;
                            const oldKey = path2[path2.length - 1];
                            const newKey = newPath[newPath.length - 1];
                            const oldObject = this._getObjectProperties(manifest, path2, path2.length - 1);
                            const newObject = this._getObjectProperties(manifest, newPath, newPath.length - 1);
                            const oldObjectIsNewObject = this._arraysAreSame(path2, newPath, -1);
                            const value = oldObject[oldKey];

                            let {index} = modification;
                            if (typeof index !== 'number' || index < 0) {
                                index = (oldObjectIsNewObject && action !== 'copy') ? this._getObjectKeyIndex(oldObject, oldKey) : -1;
                            }
                            if (typeof before === 'string') {
                                index = this._getObjectKeyIndex(newObject, before);
                            }
                            if (typeof after === 'string') {
                                index = this._getObjectKeyIndex(newObject, after);
                                if (index >= 0) { ++index; }
                            }

                            this._setObjectKeyAtIndex(newObject, newKey, value, index);
                            if (action !== 'copy' && (!oldObjectIsNewObject || oldKey !== newKey)) {
                                delete oldObject[oldKey];
                            }
                        }
                        break;
                    case 'add':
                        {
                            const {items} = modification;
                            const value = this._getObjectProperties(manifest, path2, path2.length);
                            const itemsNew = items.map((v) => clone(v));
                            value.push(...itemsNew);
                        }
                        break;
                }
            }
        }

        return manifest;
    }

    _arraysAreSame(array1, array2, lengthOffset) {
        let ii = array1.length;
        if (ii !== array2.length) { return false; }
        ii += lengthOffset;
        for (let i = 0; i < ii; ++i) {
            if (array1[i] !== array2[i]) { return false; }
        }
        return true;
    }

    _getObjectKeyIndex(object, key) {
        return Object.keys(object).indexOf(key);
    }

    _setObjectKeyAtIndex(object, key, value, index) {
        if (index < 0 || typeof key === 'number' || Object.prototype.hasOwnProperty.call(object, key)) {
            object[key] = value;
            return;
        }

        const entries = Object.entries(object);
        index = Math.min(index, entries.length);
        for (let i = index, ii = entries.length; i < ii; ++i) {
            const [key2] = entries[i];
            delete object[key2];
        }
        entries.splice(index, 0, [key, value]);
        for (let i = index, ii = entries.length; i < ii; ++i) {
            const [key2, value2] = entries[i];
            object[key2] = value2;
        }
    }

    _getObjectProperties(object, path2, count) {
        for (let i = 0; i < count; ++i) {
            object = object[path2[i]];
        }
        return object;
    }

    _getInheritanceChain(variant) {
        const visited = new Set();
        const inheritance = [];
        while (true) {
            const {name, inherit} = variant;
            if (visited.has(name)) { break; }

            visited.add(name);
            inheritance.unshift(variant);

            if (typeof inherit !== 'string') { break; }

            const nextVariant = this._variantMap.get(inherit);
            if (typeof nextVariant === 'undefined') { break; }

            variant = nextVariant;
        }
        return inheritance;
    }

    _createVariantManifest(manifest, variant) {
        let modifiedManifest = clone(manifest);
        for (const {modifications} of this._getInheritanceChain(variant)) {
            modifiedManifest = this._applyModifications(modifiedManifest, modifications);
        }
        return modifiedManifest;
    }
}


module.exports = {
    ManifestUtil
};
