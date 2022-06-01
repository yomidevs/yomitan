/*
 * Copyright (C) 2020-2022  Yomichan Authors
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
const assert = require('assert');
const readline = require('readline');
const childProcess = require('child_process');
const util = require('./util');
const {getAllFiles, getArgs, testMain} = util;
const {ManifestUtil} = require('./manifest-util');


async function createZip(directory, excludeFiles, outputFileName, sevenZipExes, onUpdate, dryRun) {
    try {
        fs.unlinkSync(outputFileName);
    } catch (e) {
        // NOP
    }

    if (!dryRun) {
        for (const exe of sevenZipExes) {
            try {
                const excludeArguments = excludeFiles.map((excludeFilePath) => `-x!${excludeFilePath}`);
                childProcess.execFileSync(
                    exe,
                    [
                        'a',
                        outputFileName,
                        '.',
                        ...excludeArguments
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
    }
    return await createJSZip(directory, excludeFiles, outputFileName, onUpdate, dryRun);
}

async function createJSZip(directory, excludeFiles, outputFileName, onUpdate, dryRun) {
    const JSZip = util.JSZip;
    const files = getAllFiles(directory);
    removeItemsFromArray(files, excludeFiles);
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

    if (!dryRun) {
        fs.writeFileSync(outputFileName, data, {encoding: null, flag: 'w'});
    }
}

function removeItemsFromArray(array, removeItems) {
    for (const item of removeItems) {
        const index = getIndexOfFilePath(array, item);
        if (index >= 0) {
            array.splice(index, 1);
        }
    }
}

function getIndexOfFilePath(array, item) {
    const pattern = /\\/g;
    const separator = '/';
    item = item.replace(pattern, separator);
    for (let i = 0, ii = array.length; i < ii; ++i) {
        if (array[i].replace(pattern, separator) === item) {
            return i;
        }
    }
    return -1;
}

async function build(buildDir, extDir, manifestUtil, variantNames, manifestPath, dryRun, dryRunBuildZip) {
    const sevenZipExes = ['7za', '7z'];

    // Create build directory
    if (!fs.existsSync(buildDir) && !dryRun) {
        fs.mkdirSync(buildDir, {recursive: true});
    }

    const dontLogOnUpdate = !process.stdout.isTTY;
    const onUpdate = (metadata) => {
        if (dontLogOnUpdate) { return; }

        let message = `Progress: ${metadata.percent.toFixed(2)}%`;
        if (metadata.currentFile) {
            message += ` (${metadata.currentFile})`;
        }

        readline.clearLine(process.stdout);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(message);
    };

    for (const variantName of variantNames) {
        const variant = manifestUtil.getVariant(variantName);
        if (typeof variant === 'undefined' || variant.buildable === false) { continue; }

        const {name, fileName, fileCopies} = variant;
        let {excludeFiles} = variant;
        if (!Array.isArray(excludeFiles)) { excludeFiles = []; }

        process.stdout.write(`Building ${name}...\n`);

        const modifiedManifest = manifestUtil.getManifest(variant.name);

        ensureFilesExist(extDir, excludeFiles);

        if (typeof fileName === 'string') {
            const fileNameSafe = path.basename(fileName);
            const fullFileName = path.join(buildDir, fileNameSafe);
            if (!dryRun) {
                fs.writeFileSync(manifestPath, ManifestUtil.createManifestString(modifiedManifest));
            }

            if (!dryRun || dryRunBuildZip) {
                await createZip(extDir, excludeFiles, fullFileName, sevenZipExes, onUpdate, dryRun);
            }

            if (!dryRun) {
                if (Array.isArray(fileCopies)) {
                    for (const fileName2 of fileCopies) {
                        const fileName2Safe = path.basename(fileName2);
                        fs.copyFileSync(fullFileName, path.join(buildDir, fileName2Safe));
                    }
                }
            }
        }

        process.stdout.write('\n');
    }
}

function ensureFilesExist(directory, files) {
    for (const file of files) {
        assert.ok(fs.existsSync(path.join(directory, file)));
    }
}


async function main(argv) {
    const args = getArgs(argv, new Map([
        ['all', false],
        ['default', false],
        ['manifest', null],
        ['dry-run', false],
        ['dry-run-build-zip', false],
        [null, []]
    ]));

    const dryRun = args.get('dry-run');
    const dryRunBuildZip = args.get('dry-run-build-zip');

    const manifestUtil = new ManifestUtil();

    const rootDir = path.join(__dirname, '..');
    const extDir = path.join(rootDir, 'ext');
    const buildDir = path.join(rootDir, 'builds');
    const manifestPath = path.join(extDir, 'manifest.json');

    try {
        const variantNames = (
            argv.length === 0 || args.get('all') ?
            manifestUtil.getVariants().filter(({buildable}) => buildable !== false).map(({name}) => name) :
            args.get(null)
        );
        await build(buildDir, extDir, manifestUtil, variantNames, manifestPath, dryRun, dryRunBuildZip);
    } finally {
        // Restore manifest
        const manifestName = (!args.get('default') && args.get('manifest') !== null) ? args.get('manifest') : null;
        const restoreManifest = manifestUtil.getManifest(manifestName);
        process.stdout.write('Restoring manifest...\n');
        if (!dryRun) {
            fs.writeFileSync(manifestPath, ManifestUtil.createManifestString(restoreManifest));
        }
    }
}


if (require.main === module) {
    testMain(main, process.argv.slice(2));
}


module.exports = {
    main
};
