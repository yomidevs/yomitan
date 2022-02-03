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

const assert = require('assert');
const {testMain} = require('../dev/util');
const {VM} = require('../dev/vm');


function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function createHotkeyUtil() {
    const vm = new VM();
    vm.execute(['js/input/hotkey-util.js']);
    const [HotkeyUtil] = vm.get(['HotkeyUtil']);
    return new HotkeyUtil();
}


function testCommandConversions() {
    const data = [
        {os: 'win', command: 'Alt+F', expectedCommand: 'Alt+F', expectedInput: {key: 'KeyF', modifiers: ['alt']}},
        {os: 'win', command: 'F1',    expectedCommand: 'F1',    expectedInput: {key: 'F1', modifiers: []}},

        {os: 'win', command: 'Ctrl+Alt+Shift+F1',    expectedCommand: 'Ctrl+Alt+Shift+F1',    expectedInput: {key: 'F1', modifiers: ['ctrl', 'alt', 'shift']}},
        {os: 'win', command: 'MacCtrl+Alt+Shift+F1', expectedCommand: 'Ctrl+Alt+Shift+F1',    expectedInput: {key: 'F1', modifiers: ['ctrl', 'alt', 'shift']}},
        {os: 'win', command: 'Command+Alt+Shift+F1', expectedCommand: 'Command+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['meta', 'alt', 'shift']}},

        {os: 'mac', command: 'Ctrl+Alt+Shift+F1',    expectedCommand: 'Command+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['meta', 'alt', 'shift']}},
        {os: 'mac', command: 'MacCtrl+Alt+Shift+F1', expectedCommand: 'MacCtrl+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['ctrl', 'alt', 'shift']}},
        {os: 'mac', command: 'Command+Alt+Shift+F1', expectedCommand: 'Command+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['meta', 'alt', 'shift']}},

        {os: 'linux', command: 'Ctrl+Alt+Shift+F1',    expectedCommand: 'Ctrl+Alt+Shift+F1',    expectedInput: {key: 'F1', modifiers: ['ctrl', 'alt', 'shift']}},
        {os: 'linux', command: 'MacCtrl+Alt+Shift+F1', expectedCommand: 'Ctrl+Alt+Shift+F1',    expectedInput: {key: 'F1', modifiers: ['ctrl', 'alt', 'shift']}},
        {os: 'linux', command: 'Command+Alt+Shift+F1', expectedCommand: 'Command+Alt+Shift+F1', expectedInput: {key: 'F1', modifiers: ['meta', 'alt', 'shift']}}
    ];

    const hotkeyUtil = createHotkeyUtil();
    for (const {command, os, expectedInput, expectedCommand} of data) {
        hotkeyUtil.os = os;
        const input = clone(hotkeyUtil.convertCommandToInput(command));
        assert.deepStrictEqual(input, expectedInput);
        const command2 = hotkeyUtil.convertInputToCommand(input.key, input.modifiers);
        assert.deepStrictEqual(command2, expectedCommand);
    }
}

function testDisplayNames() {
    const data = [
        {os: 'win', key: null,   modifiers: [], expected: ''},
        {os: 'win', key: 'KeyF', modifiers: [], expected: 'F'},
        {os: 'win', key: 'F1',   modifiers: [], expected: 'F1'},
        {os: 'win', key: null,   modifiers: ['ctrl'], expected: 'Ctrl'},
        {os: 'win', key: 'KeyF', modifiers: ['ctrl'], expected: 'Ctrl + F'},
        {os: 'win', key: 'F1',   modifiers: ['ctrl'], expected: 'Ctrl + F1'},
        {os: 'win', key: null,   modifiers: ['alt'], expected: 'Alt'},
        {os: 'win', key: 'KeyF', modifiers: ['alt'], expected: 'Alt + F'},
        {os: 'win', key: 'F1',   modifiers: ['alt'], expected: 'Alt + F1'},
        {os: 'win', key: null,   modifiers: ['shift'], expected: 'Shift'},
        {os: 'win', key: 'KeyF', modifiers: ['shift'], expected: 'Shift + F'},
        {os: 'win', key: 'F1',   modifiers: ['shift'], expected: 'Shift + F1'},
        {os: 'win', key: null,   modifiers: ['meta'], expected: 'Windows'},
        {os: 'win', key: 'KeyF', modifiers: ['meta'], expected: 'Windows + F'},
        {os: 'win', key: 'F1',   modifiers: ['meta'], expected: 'Windows + F1'},
        {os: 'win', key: null,   modifiers: ['mouse1'], expected: 'Mouse 1'},
        {os: 'win', key: 'KeyF', modifiers: ['mouse1'], expected: 'Mouse 1 + F'},
        {os: 'win', key: 'F1',   modifiers: ['mouse1'], expected: 'Mouse 1 + F1'},

        {os: 'mac', key: null,   modifiers: [], expected: ''},
        {os: 'mac', key: 'KeyF', modifiers: [], expected: 'F'},
        {os: 'mac', key: 'F1',   modifiers: [], expected: 'F1'},
        {os: 'mac', key: null,   modifiers: ['ctrl'], expected: 'Ctrl'},
        {os: 'mac', key: 'KeyF', modifiers: ['ctrl'], expected: 'Ctrl + F'},
        {os: 'mac', key: 'F1',   modifiers: ['ctrl'], expected: 'Ctrl + F1'},
        {os: 'mac', key: null,   modifiers: ['alt'], expected: 'Opt'},
        {os: 'mac', key: 'KeyF', modifiers: ['alt'], expected: 'Opt + F'},
        {os: 'mac', key: 'F1',   modifiers: ['alt'], expected: 'Opt + F1'},
        {os: 'mac', key: null,   modifiers: ['shift'], expected: 'Shift'},
        {os: 'mac', key: 'KeyF', modifiers: ['shift'], expected: 'Shift + F'},
        {os: 'mac', key: 'F1',   modifiers: ['shift'], expected: 'Shift + F1'},
        {os: 'mac', key: null,   modifiers: ['meta'], expected: 'Cmd'},
        {os: 'mac', key: 'KeyF', modifiers: ['meta'], expected: 'Cmd + F'},
        {os: 'mac', key: 'F1',   modifiers: ['meta'], expected: 'Cmd + F1'},
        {os: 'mac', key: null,   modifiers: ['mouse1'], expected: 'Mouse 1'},
        {os: 'mac', key: 'KeyF', modifiers: ['mouse1'], expected: 'Mouse 1 + F'},
        {os: 'mac', key: 'F1',   modifiers: ['mouse1'], expected: 'Mouse 1 + F1'},

        {os: 'linux', key: null,   modifiers: [], expected: ''},
        {os: 'linux', key: 'KeyF', modifiers: [], expected: 'F'},
        {os: 'linux', key: 'F1',   modifiers: [], expected: 'F1'},
        {os: 'linux', key: null,   modifiers: ['ctrl'], expected: 'Ctrl'},
        {os: 'linux', key: 'KeyF', modifiers: ['ctrl'], expected: 'Ctrl + F'},
        {os: 'linux', key: 'F1',   modifiers: ['ctrl'], expected: 'Ctrl + F1'},
        {os: 'linux', key: null,   modifiers: ['alt'], expected: 'Alt'},
        {os: 'linux', key: 'KeyF', modifiers: ['alt'], expected: 'Alt + F'},
        {os: 'linux', key: 'F1',   modifiers: ['alt'], expected: 'Alt + F1'},
        {os: 'linux', key: null,   modifiers: ['shift'], expected: 'Shift'},
        {os: 'linux', key: 'KeyF', modifiers: ['shift'], expected: 'Shift + F'},
        {os: 'linux', key: 'F1',   modifiers: ['shift'], expected: 'Shift + F1'},
        {os: 'linux', key: null,   modifiers: ['meta'], expected: 'Super'},
        {os: 'linux', key: 'KeyF', modifiers: ['meta'], expected: 'Super + F'},
        {os: 'linux', key: 'F1',   modifiers: ['meta'], expected: 'Super + F1'},
        {os: 'linux', key: null,   modifiers: ['mouse1'], expected: 'Mouse 1'},
        {os: 'linux', key: 'KeyF', modifiers: ['mouse1'], expected: 'Mouse 1 + F'},
        {os: 'linux', key: 'F1',   modifiers: ['mouse1'], expected: 'Mouse 1 + F1'},

        {os: 'unknown', key: null,   modifiers: [], expected: ''},
        {os: 'unknown', key: 'KeyF', modifiers: [], expected: 'F'},
        {os: 'unknown', key: 'F1',   modifiers: [], expected: 'F1'},
        {os: 'unknown', key: null,   modifiers: ['ctrl'], expected: 'Ctrl'},
        {os: 'unknown', key: 'KeyF', modifiers: ['ctrl'], expected: 'Ctrl + F'},
        {os: 'unknown', key: 'F1',   modifiers: ['ctrl'], expected: 'Ctrl + F1'},
        {os: 'unknown', key: null,   modifiers: ['alt'], expected: 'Alt'},
        {os: 'unknown', key: 'KeyF', modifiers: ['alt'], expected: 'Alt + F'},
        {os: 'unknown', key: 'F1',   modifiers: ['alt'], expected: 'Alt + F1'},
        {os: 'unknown', key: null,   modifiers: ['shift'], expected: 'Shift'},
        {os: 'unknown', key: 'KeyF', modifiers: ['shift'], expected: 'Shift + F'},
        {os: 'unknown', key: 'F1',   modifiers: ['shift'], expected: 'Shift + F1'},
        {os: 'unknown', key: null,   modifiers: ['meta'], expected: 'Meta'},
        {os: 'unknown', key: 'KeyF', modifiers: ['meta'], expected: 'Meta + F'},
        {os: 'unknown', key: 'F1',   modifiers: ['meta'], expected: 'Meta + F1'},
        {os: 'unknown', key: null,   modifiers: ['mouse1'], expected: 'Mouse 1'},
        {os: 'unknown', key: 'KeyF', modifiers: ['mouse1'], expected: 'Mouse 1 + F'},
        {os: 'unknown', key: 'F1',   modifiers: ['mouse1'], expected: 'Mouse 1 + F1'}
    ];

    const hotkeyUtil = createHotkeyUtil();
    for (const {os, key, modifiers, expected} of data) {
        hotkeyUtil.os = os;
        const displayName = hotkeyUtil.getInputDisplayValue(key, modifiers);
        assert.deepStrictEqual(displayName, expected);
    }
}

function testSortModifiers() {
    const data = [
        {modifiers: [], expected: []},
        {modifiers: ['shift', 'alt', 'ctrl', 'mouse4', 'meta', 'mouse1', 'mouse0'], expected: ['meta', 'ctrl', 'alt', 'shift', 'mouse0', 'mouse1', 'mouse4']}
    ];

    const hotkeyUtil = createHotkeyUtil();
    for (const {modifiers, expected} of data) {
        const modifiers2 = hotkeyUtil.sortModifiers(modifiers);
        assert.strictEqual(modifiers2, modifiers);
        assert.deepStrictEqual(modifiers2, expected);
    }
}


function main() {
    testCommandConversions();
    testDisplayNames();
    testSortModifiers();
}


if (require.main === module) { testMain(main); }
