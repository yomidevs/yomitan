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
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const childProcess = require('child_process');
const util = require('./yomichan-util');
const {getAllFiles, getDefaultManifestAndVariants, createManifestString} = util;


async function createZip(directory, outputFileName, sevenZipExes=[], onUpdate=null) {
    for (const exe of sevenZipExes) {
        try {
            childProcess.execFileSync(
                exe,
                [
                    'a',
                    outputFileName,
                    '.'
                ],
                {
                    cwd: directory
                }
            );
            return;
        } catch (e) {
            // NOP
        }
    }
    return await createJSZip(directory, outputFileName, onUpdate);
}

async function createJSZip(directory, outputFileName, onUpdate) {
    const JSZip = util.JSZip;
    const files = getAllFiles(directory, directory);
    const zip = new JSZip();
    for (const fileName of files) {
        zip.file(
            fileName.replace(/\\/g, '/'),
            fs.readFileSync(path.join(directory, fileName), {encoding: null, flag: 'r'}),
            {}
        );
    }

    if (typeof onUpdate !== 'function') {
        onUpdate = () => {}; // NOP
    }

    const data = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: {level: 9}
    }, onUpdate);
    process.stdout.write('\n');

    fs.writeFileSync(outputFileName, data, {encoding: null, flag: 'w'});
}

function createModifiedManifest(manifest, modifications) {
    manifest = JSON.parse(JSON.stringify(manifest));

    if (Array.isArray(modifications)) {
        for (const modification of modifications) {
            const {action, path: path2} = modification;
            switch (action) {
                case 'set':
                    {
                        const value = getObjectProperties(manifest, path2, path2.length - 1);
                        const last = path2[path2.length - 1];
                        value[last] = modification.value;
                    }
                    break;
                case 'replace':
                    {
                        const value = getObjectProperties(manifest, path2, path2.length - 1);
                        const regex = new RegExp(modification.pattern, modification.patternFlags);
                        const last = path2[path2.length - 1];
                        let value2 = value[last];
                        value2 = `${value2}`.replace(regex, modification.replacement);
                        value[last] = value2;
                    }
                    break;
                case 'delete':
                    {
                        const value = getObjectProperties(manifest, path2, path2.length - 1);
                        const last = path2[path2.length - 1];
                        delete value[last];
                    }
                    break;
            }
        }
    }

    return manifest;
}

function getObjectProperties(object, path2, count) {
    for (let i = 0; i < count; ++i) {
        object = object[path2[i]];
    }
    return object;
}


async function main() {
    const {manifest, variants} = getDefaultManifestAndVariants();

    const rootDir = path.join(__dirname, '..');
    const extDir = path.join(rootDir, 'ext');
    const buildDir = path.join(rootDir, 'builds');
    const manifestPath = path.join(extDir, 'manifest.json');
    const sevenZipExes = ['7za', '7z'];

    // Create build directory
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, {recursive: true});
    }


    const onUpdate = (metadata) => {
        let message = `Progress: ${metadata.percent.toFixed(2)}%`;
        if (metadata.currentFile) {
            message += ` (${metadata.currentFile})`;
        }

        readline.clearLine(process.stdout);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(message);
    };

    try {
        for (const variant of variants) {
            const {name, fileName, fileCopies, modifications} = variant;
            process.stdout.write(`Building ${name}...\n`);

            const fileNameSafe = path.basename(fileName);
            const modifiedManifest = createModifiedManifest(manifest, modifications);
            const fullFileName = path.join(buildDir, fileNameSafe);
            fs.writeFileSync(manifestPath, createManifestString(modifiedManifest));
            await createZip(extDir, fullFileName, sevenZipExes, onUpdate);

            if (Array.isArray(fileCopies)) {
                for (const fileName2 of fileCopies) {
                    const fileName2Safe = path.basename(fileName2);
                    fs.copyFileSync(fullFileName, path.join(buildDir, fileName2Safe));
                }
            }

            process.stdout.write('\n');
        }
    } finally {
        // Restore manifest
        process.stdout.write('Restoring manifest...\n');
        fs.writeFileSync(manifestPath, createManifestString(manifest));
    }
}


if (require.main === module) { main(); }
