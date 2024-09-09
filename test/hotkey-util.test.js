/*
 * Copyright (C) 2023-2024  Yomitan Authors
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

import {describe, expect, test} from 'vitest';
import {HotkeyUtil} from '../ext/js/input/hotkey-util.js';

describe('HotkeyUtil', () => {
    describe('CommandConversions', () => {
        /* eslint-disable @stylistic/no-multi-spaces */
        /** @type {{os: import('environment').OperatingSystem, command: string, expectedCommand: string, expectedInput: {key: string, modifiers: import('input').Modifier[]}}[]} */
        const data = [
            {command: 'Alt+F', expectedCommand: 'Alt+F', expectedInput: {key: 'KeyF', modifiers: ['alt']}, os: 'win'},
            {command: 'F1', expectedCommand: 'F1',    expectedInput: {key: 'F1', modifiers: []},    os: 'win'},

            {command: 'Ctrl+Alt+Shift+F1', expectedCommand: 'Ctrl+Alt+Shift+F1',    expectedInput: {key: 'F1', modifiers: ['ctrl', 'alt', 'shift']},    os: 'win'},
            {command: 'MacCtrl+Alt+Shift+F1', expectedCommand: 'Ctrl+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['ctrl', 'alt', 'shift']},    os: 'win'},
            {command: 'Command+Alt+Shift+F1', expectedCommand: 'Command+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['meta', 'alt', 'shift']}, os: 'win'},

            {command: 'Ctrl+Alt+Shift+F1', expectedCommand: 'Command+Alt+Shift+F1',    expectedInput: {key: 'F1', modifiers: ['meta', 'alt', 'shift']}, os: 'mac'},
            {command: 'MacCtrl+Alt+Shift+F1', expectedCommand: 'MacCtrl+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['ctrl', 'alt', 'shift']}, os: 'mac'},
            {command: 'Command+Alt+Shift+F1', expectedCommand: 'Command+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['meta', 'alt', 'shift']}, os: 'mac'},

            {command: 'Ctrl+Alt+Shift+F1', expectedCommand: 'Ctrl+Alt+Shift+F1',    expectedInput: {key: 'F1', modifiers: ['ctrl', 'alt', 'shift']},    os: 'linux'},
            {command: 'MacCtrl+Alt+Shift+F1', expectedCommand: 'Ctrl+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['ctrl', 'alt', 'shift']},    os: 'linux'},
            {command: 'Command+Alt+Shift+F1', expectedCommand: 'Command+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['meta', 'alt', 'shift']}, os: 'linux'},
        ];
        /* eslint-enable @stylistic/no-multi-spaces */

        const hotkeyUtil = new HotkeyUtil();
        for (const {command, expectedCommand, expectedInput, os} of data) {
            test(`${command} on ${os} -> ${JSON.stringify(expectedInput)}`, () => {
                hotkeyUtil.os = os;
                const input = structuredClone(hotkeyUtil.convertCommandToInput(command));
                expect(input).toStrictEqual(expectedInput);
                const command2 = hotkeyUtil.convertInputToCommand(input.key, input.modifiers);
                expect(command2).toStrictEqual(expectedCommand);
            });
        }
    });

    describe('DisplayNames', () => {
        /* eslint-disable @stylistic/no-multi-spaces */
        /** @type {{os: import('environment').OperatingSystem, key: ?string, modifiers: import('input').Modifier[], expected: string}[]} */
        const data = [
            {expected: '', key: null,   modifiers: [], os: 'win'},
            {expected: 'F', key: 'KeyF', modifiers: [], os: 'win'},
            {expected: 'F1', key: 'F1',   modifiers: [], os: 'win'},
            {expected: 'Ctrl', key: null,   modifiers: ['ctrl'], os: 'win'},
            {expected: 'Ctrl + F', key: 'KeyF', modifiers: ['ctrl'], os: 'win'},
            {expected: 'Ctrl + F1', key: 'F1',   modifiers: ['ctrl'], os: 'win'},
            {expected: 'Alt', key: null,   modifiers: ['alt'], os: 'win'},
            {expected: 'Alt + F', key: 'KeyF', modifiers: ['alt'], os: 'win'},
            {expected: 'Alt + F1', key: 'F1',   modifiers: ['alt'], os: 'win'},
            {expected: 'Shift', key: null,   modifiers: ['shift'], os: 'win'},
            {expected: 'Shift + F', key: 'KeyF', modifiers: ['shift'], os: 'win'},
            {expected: 'Shift + F1', key: 'F1',   modifiers: ['shift'], os: 'win'},
            {expected: 'Windows', key: null,   modifiers: ['meta'], os: 'win'},
            {expected: 'Windows + F', key: 'KeyF', modifiers: ['meta'], os: 'win'},
            {expected: 'Windows + F1', key: 'F1',   modifiers: ['meta'], os: 'win'},
            {expected: 'Mouse 1', key: null,   modifiers: ['mouse1'], os: 'win'},
            {expected: 'Mouse 1 + F', key: 'KeyF', modifiers: ['mouse1'], os: 'win'},
            {expected: 'Mouse 1 + F1', key: 'F1',   modifiers: ['mouse1'], os: 'win'},

            {expected: '', key: null,   modifiers: [], os: 'mac'},
            {expected: 'F', key: 'KeyF', modifiers: [], os: 'mac'},
            {expected: 'F1', key: 'F1',   modifiers: [], os: 'mac'},
            {expected: 'Ctrl', key: null,   modifiers: ['ctrl'], os: 'mac'},
            {expected: 'Ctrl + F', key: 'KeyF', modifiers: ['ctrl'], os: 'mac'},
            {expected: 'Ctrl + F1', key: 'F1',   modifiers: ['ctrl'], os: 'mac'},
            {expected: 'Opt', key: null,   modifiers: ['alt'], os: 'mac'},
            {expected: 'Opt + F', key: 'KeyF', modifiers: ['alt'], os: 'mac'},
            {expected: 'Opt + F1', key: 'F1',   modifiers: ['alt'], os: 'mac'},
            {expected: 'Shift', key: null,   modifiers: ['shift'], os: 'mac'},
            {expected: 'Shift + F', key: 'KeyF', modifiers: ['shift'], os: 'mac'},
            {expected: 'Shift + F1', key: 'F1',   modifiers: ['shift'], os: 'mac'},
            {expected: 'Cmd', key: null,   modifiers: ['meta'], os: 'mac'},
            {expected: 'Cmd + F', key: 'KeyF', modifiers: ['meta'], os: 'mac'},
            {expected: 'Cmd + F1', key: 'F1',   modifiers: ['meta'], os: 'mac'},
            {expected: 'Mouse 1', key: null,   modifiers: ['mouse1'], os: 'mac'},
            {expected: 'Mouse 1 + F', key: 'KeyF', modifiers: ['mouse1'], os: 'mac'},
            {expected: 'Mouse 1 + F1', key: 'F1',   modifiers: ['mouse1'], os: 'mac'},

            {expected: '', key: null,   modifiers: [], os: 'linux'},
            {expected: 'F', key: 'KeyF', modifiers: [], os: 'linux'},
            {expected: 'F1', key: 'F1',   modifiers: [], os: 'linux'},
            {expected: 'Ctrl', key: null,   modifiers: ['ctrl'], os: 'linux'},
            {expected: 'Ctrl + F', key: 'KeyF', modifiers: ['ctrl'], os: 'linux'},
            {expected: 'Ctrl + F1', key: 'F1',   modifiers: ['ctrl'], os: 'linux'},
            {expected: 'Alt', key: null,   modifiers: ['alt'], os: 'linux'},
            {expected: 'Alt + F', key: 'KeyF', modifiers: ['alt'], os: 'linux'},
            {expected: 'Alt + F1', key: 'F1',   modifiers: ['alt'], os: 'linux'},
            {expected: 'Shift', key: null,   modifiers: ['shift'], os: 'linux'},
            {expected: 'Shift + F', key: 'KeyF', modifiers: ['shift'], os: 'linux'},
            {expected: 'Shift + F1', key: 'F1',   modifiers: ['shift'], os: 'linux'},
            {expected: 'Super', key: null,   modifiers: ['meta'], os: 'linux'},
            {expected: 'Super + F', key: 'KeyF', modifiers: ['meta'], os: 'linux'},
            {expected: 'Super + F1', key: 'F1',   modifiers: ['meta'], os: 'linux'},
            {expected: 'Mouse 1', key: null,   modifiers: ['mouse1'], os: 'linux'},
            {expected: 'Mouse 1 + F', key: 'KeyF', modifiers: ['mouse1'], os: 'linux'},
            {expected: 'Mouse 1 + F1', key: 'F1',   modifiers: ['mouse1'], os: 'linux'},

            {expected: '', key: null,   modifiers: [], os: 'unknown'},
            {expected: 'F', key: 'KeyF', modifiers: [], os: 'unknown'},
            {expected: 'F1', key: 'F1',   modifiers: [], os: 'unknown'},
            {expected: 'Ctrl', key: null,   modifiers: ['ctrl'], os: 'unknown'},
            {expected: 'Ctrl + F', key: 'KeyF', modifiers: ['ctrl'], os: 'unknown'},
            {expected: 'Ctrl + F1', key: 'F1',   modifiers: ['ctrl'], os: 'unknown'},
            {expected: 'Alt', key: null,   modifiers: ['alt'], os: 'unknown'},
            {expected: 'Alt + F', key: 'KeyF', modifiers: ['alt'], os: 'unknown'},
            {expected: 'Alt + F1', key: 'F1',   modifiers: ['alt'], os: 'unknown'},
            {expected: 'Shift', key: null,   modifiers: ['shift'], os: 'unknown'},
            {expected: 'Shift + F', key: 'KeyF', modifiers: ['shift'], os: 'unknown'},
            {expected: 'Shift + F1', key: 'F1',   modifiers: ['shift'], os: 'unknown'},
            {expected: 'Meta', key: null,   modifiers: ['meta'], os: 'unknown'},
            {expected: 'Meta + F', key: 'KeyF', modifiers: ['meta'], os: 'unknown'},
            {expected: 'Meta + F1', key: 'F1',   modifiers: ['meta'], os: 'unknown'},
            {expected: 'Mouse 1', key: null,   modifiers: ['mouse1'], os: 'unknown'},
            {expected: 'Mouse 1 + F', key: 'KeyF', modifiers: ['mouse1'], os: 'unknown'},
            {expected: 'Mouse 1 + F1', key: 'F1',   modifiers: ['mouse1'], os: 'unknown'},
        ];
        /* eslint-enable @stylistic/no-multi-spaces */

        const hotkeyUtil = new HotkeyUtil();

        test.each(data)('$key with $modifiers on $os -> display value $expected', ({expected, key, modifiers, os}) => {
            hotkeyUtil.os = os;
            const displayName = hotkeyUtil.getInputDisplayValue(key, modifiers);
            expect(displayName).toStrictEqual(expected);
        });
    });

    describe('SortModifiers', () => {
        /** @type {{modifiers: import('input').Modifier[], expected: import('input').Modifier[]}[]} */
        const data = [
            {expected: [], modifiers: []},
            {expected: ['meta', 'ctrl', 'alt', 'shift', 'mouse0', 'mouse1', 'mouse4'], modifiers: ['shift', 'alt', 'ctrl', 'mouse4', 'meta', 'mouse1', 'mouse0']},
        ];

        const hotkeyUtil = new HotkeyUtil();
        for (const {expected, modifiers} of data) {
            test(`[${modifiers.join(',')}] -> [${expected.join(',')}]`, () => {
                const modifiers2 = hotkeyUtil.sortModifiers(modifiers);
                expect(modifiers2).toStrictEqual(modifiers);
                expect(modifiers2).toStrictEqual(expected);
            });
        }
    });
});
